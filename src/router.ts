import { initTRPC, TRPCError } from '@trpc/server';
import { z } from 'zod';
import { observable } from '@trpc/server/observable';
import { EventEmitter } from 'events';
import { ReviewService } from './services/reviewService';
import {
  serverEvent,
  reviewStatus,
  ReviewEvent,
  File,
  extensionEventSchema,
} from './types';
import { env } from './constants';
import { RateLimiter } from './utils/rateLimiter';
import {
  defaultFileValidator,
  FileValidationError,
} from './utils/fileValidator';
import { logger } from './utils/logger';
import { monitor } from './utils/monitor';

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
      logger.debug('Extension subscription started', {
        clientId: input.clientId,
        timestamp: new Date().toISOString(),
      });

      return observable<ReviewEvent>((emit) => {
        const onReviewEvent = (data: ReviewEvent) => {
          if (data.clientId === input.clientId) {
            logger.debug('Sending event to extension', {
              clientId: input.clientId,
              eventType: data.type,
              reviewId: data.reviewId,
            });
            emit.next(data);
          }
        };
        eventEmitter.on('reviewEvent', onReviewEvent);
        return () => {
          logger.debug('Extension subscription ended', {
            clientId: input.clientId,
            timestamp: new Date().toISOString(),
          });
          eventEmitter.off('reviewEvent', onReviewEvent);
        };
      });
    }),

  requestFullReview: t.procedure
    .input(z.object({ extensionEvent: extensionEventSchema }))
    .mutation(async ({ input }) => {
      const { reviewId, files, clientId } = input.extensionEvent;

      // Log complete extension event data
      logger.debug('=== EXTENSION REQUEST START ===', {
        reviewId,
        clientId,
        timestamp: new Date().toISOString(),
      });

      logger.debug('Extension Event Details:', {
        reviewId,
        clientId,
        fileCount: files?.length || 0,
        extensionEvent: JSON.stringify(input.extensionEvent, null, 2),
      });

      // Log each file in detail
      if (files && files.length > 0) {
        logger.debug('Files received from extension:', {
          reviewId,
          totalFiles: files.length,
        });

        files.forEach((file, index) => {
          const contentPreview =
            file.fileContent?.substring(0, 200) +
            (file.fileContent?.length > 200 ? '...' : '');
          const diffPreview =
            file.diff?.substring(0, 200) +
            (file.diff?.length > 200 ? '...' : '');

          logger.debug(`File ${index + 1}/${files.length}:`, {
            reviewId,
            filename: file.filename,
            contentLength: file.fileContent?.length || 0,
            diffLength: file.diff?.length || 0,
            hasContent: !!file.fileContent,
            hasDiff: !!file.diff,
            contentPreview,
            diffPreview,
          });
        });
      } else {
        logger.warn('No files received from extension', { reviewId, clientId });
      }

      logger.debug('=== EXTENSION REQUEST END ===', { reviewId });

      logger.debug('Received review request', {
        reviewId,
        fileCount: files?.length || 0,
        clientId,
      });

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
          logger.fileValidationFailed(
            clientId,
            error.message,
            reviewFiles.length
          );
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

      logger.debug('Rate limit check passed', {
        clientId,
        remaining: rateLimitResult.remaining,
      });
      logger.debug('File validation passed', {
        clientId,
        fileCount: reviewFiles.length,
      });

      // Start monitoring the review
      monitor.startReview(reviewId, clientId, reviewFiles.length);
      monitor.recordRequest(true, false);

      const reviewService = new ReviewService(eventEmitter, reviewId, clientId);

      // Run review in background
      const reviewPromise = reviewService.run(reviewFiles);

      // Don't await - let it run in background
      reviewPromise.catch((error) => {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error('Review failed', {
          reviewId,
          clientId,
          error: errorMessage,
        });
        monitor.failReview(reviewId, errorMessage);
        // The ReviewService will handle error emission to client
      });

      return {
        success: true,
        message: 'Review request received and is being processed.',
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

      logger.debug('=== EXTENSION STOP REQUEST ===', {
        reviewId,
        timestamp: new Date().toISOString(),
        extensionEvent: JSON.stringify(input.extensionEvent, null, 2),
      });

      eventEmitter.emit('reviewEvent', {
        type: serverEvent.REVIEW_COMPLETED,
        payload: { status: reviewStatus.CANCELLED },
        reviewId,
        clientId: '*',
        endedAt: new Date().toISOString(),
      });

      logger.debug('Stop review event emitted', { reviewId });

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
