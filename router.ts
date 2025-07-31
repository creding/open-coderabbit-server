import { initTRPC } from "@trpc/server";
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

const t = initTRPC.create();
const eventEmitter = new EventEmitter();

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
        `Received review request ${reviewId} for ${files?.length} file(s).`
      );

      const reviewFiles: File[] = files || [];
      if (reviewFiles.length === 0) {
        return {
          success: false,
          message: "No files provided for review.",
          reviewId,
        };
      }

      const reviewService = new ReviewService(eventEmitter, reviewId, clientId);
      reviewService.run(reviewFiles);

      return {
        success: true,
        message: "Review request received and is being processed.",
        reviewId,
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
