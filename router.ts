import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { observable } from "@trpc/server/observable";
import { EventEmitter } from "events";
import { ReviewService } from "./services/reviewService";
import {
  serverEvent,
  reviewStatus,
  ServerEvent,
  EventPayload,
  ReviewEvent,
} from "./types";

// 1. Zod Schemas: Define the shape of our data
const fileSchema = z.object({
  filename: z.string(),
  diff: z.string(),
  newFile: z.boolean(),
  renamedFile: z.boolean(),
  deletedFile: z.boolean(),
  fileContent: z.string(),
});

const extensionEventSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  email: z.string(),
  clientId: z.string(),
  eventType: z.string(),
  reviewId: z.string(),
  files: z.array(fileSchema).optional(),
  hostUrl: z.string(),
  provider: z.string(),
  providerUserId: z.string(),
  remoteUrl: z.string().optional(),
  host: z.string(),
  version: z.string(),
  headCommitId: z.string().optional(),
  baseCommitId: z.string().optional(),
  allFiles: z.array(fileSchema).optional(),
});

// 2. Inferred Types: Create TypeScript types from Zod schemas
type File = z.infer<typeof fileSchema>;

// 3. tRPC Initialization
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

      // Non-blocking call to the review service
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
        clientId: "*", // Broadcast to all clients
        endedAt: new Date().toISOString(),
      });
      return {
        success: true,
        message: `Review process stopped for ${reviewId}.`,
      };
    }),
});

// 5. Export the main router
export const appRouter = t.router({
  vsCode: vsCodeRouter,
});

export type AppRouter = typeof appRouter;
