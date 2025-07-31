import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";
import { ReviewService } from "./services/reviewService";
import {
  serverEvent,
  reviewStatus,
  ReviewEvent,
  File,
  extensionEventSchema,
} from "./types";
import { env } from "./constants";
import { RateLimiter } from "./utils/rateLimiter";
import { defaultFileValidator, FileValidationError } from "./utils/fileValidator";
import { logger } from "./utils/logger";
import { monitor } from "./utils/monitor";

const t = initTRPC.create();
const eventEmitter = new EventEmitter();

// Initialize rate limiter
const rateLimiter = new RateLimiter({
  maxRequests: parseInt(env.RATE_LIMIT_REQUESTS, 10),
  windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
});

const vsCodeRouter = t.router({
  subscribeToEvents: t.procedure
    .input(z.object({ clientId: z.string() }))
    .subscription(({ input }) => {
      return observable<ReviewEvent>((emit) => {
        const onReviewEvent = (data: ReviewEvent) => {
          if (data.clientId === input.clientId) {
            emit.next(data);
          }
        };
        eventEmitter.on("reviewEvent", onReviewEvent);
        return () => {
          eventEmitter.off("reviewEvent", onReviewEvent);
        };
      });
    }),

  requestFullReview: t.procedure
    .input(z.object({ extensionEvent: extensionEventSchema }))
    .mutation(async ({ input }) => {
      const { reviewId, files, clientId } = input.extensionEvent;
      console.log(
        `Received review request ${reviewId} for ${files?.length} file(s) from client ${clientId}.`
      );

      // Rate limiting check
      const rateLimitResult = rateLimiter.check(clientId);
      if (!rateLimitResult.allowed) {
        monitor.recordRequest(false, true);
        logger.rateLimitHit(clientId, 'requestFullReview');
        throw new TRPCError({
          code: 'TOO_MANY_REQUESTS',
          message: `Rate limit exceeded. Try again in ${rateLimitResult.retryAfter} seconds.`,
          cause: {
            retryAfter: rateLimitResult.retryAfter,
            resetTime: rateLimitResult.resetTime,
          },
        });
      }

      const reviewFiles: File[] = files || [];
      
      // File validation
      try {
        defaultFileValidator.validateFiles(reviewFiles);
      } catch (error) {
        if (error instanceof FileValidationError) {
          monitor.recordRequest(false, false);
          logger.fileValidationFailed(clientId, error.message, reviewFiles.length);
          throw new TRPCError({
            code: 'BAD_REQUEST',
            message: error.message,
            cause: {
              code: error.code,
              type: 'FILE_VALIDATION_ERROR',
            },
          });
        }
        throw error;
      }

      logger.debug('Rate limit check passed', { clientId, remaining: rateLimitResult.remaining });
      logger.debug('File validation passed', { clientId, fileCount: reviewFiles.length });

      // Start monitoring the review
      monitor.startReview(reviewId, clientId, reviewFiles.length);
      monitor.recordRequest(true, false);

      const reviewService = new ReviewService(eventEmitter, reviewId, clientId);
      
      // Run review in background
      const reviewPromise = reviewService.run(reviewFiles);
      
      // Don't await - let it run in background
      reviewPromise.catch((error) => {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error('Review failed', { reviewId, clientId, error: errorMessage });
        monitor.failReview(reviewId, errorMessage);
        // The ReviewService will handle error emission to client
      });

      return {
        success: true,
        message: "Review request received and is being processed.",
        reviewId,
        rateLimitInfo: {
          remaining: rateLimitResult.remaining,
          resetTime: rateLimitResult.resetTime,
        },
      };
    }),

  stopReview: t.procedure
    .input(z.object({ extensionEvent: z.object({ reviewId: z.string() }) }))
    .mutation(({ input }) => {
      const { reviewId } = input.extensionEvent;
      eventEmitter.emit("reviewEvent", {
        type: serverEvent.REVIEW_COMPLETED,
        payload: { status: reviewStatus.CANCELLED },
        reviewId,
        clientId: "*",
        endedAt: new Date().toISOString(),
      });
      return {
        success: true,
        message: `Review process stopped for ${reviewId}.`,
      };
    }),
});

export const appRouter = t.router({
  vsCode: vsCodeRouter,
});

export type AppRouter = typeof appRouter;
