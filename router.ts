import { initTRPC } from "@trpc/server";
import { z } from "zod";
import { observable } from "@trpc/server/observable";
import * as diff from "diff";
import { EventEmitter } from "events";
import {
  performCodeReview,
  generateReviewSummary,
  generateReviewTitle,
  generatePrObjective,
  generateWalkThrough,
} from "./services/ai";
import {
  serverEvent,
  reviewStatus,
  ServerEvent,
  ReviewComment,
  AdditionalDetailsPayload,
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
type ExtensionEvent = z.infer<typeof extensionEventSchema>;

// Define the structure of events sent to the client
interface ReviewEvent {
  type: ServerEvent;
  payload: any;
  reviewId: string;
  clientId: string;
  endedAt?: string;
  error?: string;
}

// 3. tRPC Initialization
const t = initTRPC.create();
const eventEmitter = new EventEmitter();

// 4. Routers
const accessTokenRouter = t.router({
  // ... (keeping this brief as it's not the focus)
});

const organizationsRouter = t.router({
  // ...
});

const reviewsRouter = t.router({
  // ...
});

const testingRouter = t.router({
  // ...
});

const vsCodeRouter = t.router({
  subscribeToEvents: t.procedure
    .input(z.object({ clientId: z.string() }))
    .subscription(({ input }) => {
      return observable<ReviewEvent>((emit) => {
        const onReviewEvent = (data: ReviewEvent) => {
          if (data.clientId === input.clientId) {
            console.log(
              `📡 Sending event to client ${data.clientId}: ${data.type}`
            );
            console.log(
              `📡 Event payload:`,
              JSON.stringify(data.payload, null, 2)
            );
            console.log(`📡 Full event:`, JSON.stringify(data, null, 2));
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

      // Ensure files are valid before proceeding
      const reviewFiles: File[] = files || [];
      if (reviewFiles.length === 0) {
        console.log("No files to review.");
        return {
          success: false,
          message: "No files provided for review.",
          reviewId,
        };
      }

      // Immediately send an in_progress update
      eventEmitter.emit("reviewEvent", {
        type: serverEvent.STATE_UPDATE,
        payload: { status: reviewStatus.IN_PROGRESS },
        reviewId,
        clientId,
      });

      // Notify client that file analysis is starting
      eventEmitter.emit("reviewEvent", {
        type: serverEvent.REVIEW_STATUS,
        payload: { reviewStatus: "summarizing" },
        reviewId,
        clientId,
      });

      try {
        // Thinking update: Generating title
        eventEmitter.emit("reviewEvent", {
          type: serverEvent.THINKING_UPDATE,
          payload: { message: "Generating a title for your review..." },
          reviewId,
          clientId,
        });

        // Generate and send the title first
        try {
          const title = await generateReviewTitle(reviewFiles);
          eventEmitter.emit("reviewEvent", {
            type: serverEvent.PR_TITLE,
            payload: title,
            reviewId,
            clientId,
          });
        } catch (titleError) {
          console.error("Error generating review title:", titleError);
          // Don't fail the review if title generation fails
        }

        // Thinking update: Generating PR Objective
        eventEmitter.emit("reviewEvent", {
          type: serverEvent.THINKING_UPDATE,
          payload: { message: "Formulating the objective..." },
          reviewId,
          clientId,
        });

        // Generate and send the PR Objective
        try {
          const objective = await generatePrObjective(reviewFiles);
          eventEmitter.emit("reviewEvent", {
            type: serverEvent.PR_OBJECTIVE,
            payload: objective,
            reviewId,
            clientId,
          });
        } catch (objectiveError) {
          console.error("Error generating PR objective:", objectiveError);
        }

        // Thinking update: Generating Walkthrough
        eventEmitter.emit("reviewEvent", {
          type: serverEvent.THINKING_UPDATE,
          payload: { message: "Preparing a walkthrough..." },
          reviewId,
          clientId,
        });

        // Generate and send the Walkthrough
        try {
          const walkThrough = await generateWalkThrough(reviewFiles);
          eventEmitter.emit("reviewEvent", {
            type: serverEvent.WALK_THROUGH,
            payload: walkThrough,
            reviewId,
            clientId,
          });
        } catch (walkThroughError) {
          console.error("Error generating walkthrough:", walkThroughError);
        }

        // Notify client that file review is starting
        eventEmitter.emit("reviewEvent", {
          type: serverEvent.REVIEW_STATUS,
          payload: { reviewStatus: "reviewing" },
          reviewId,
          clientId,
        });

        // Start the AI review process (this is now blocking until the AI responds)
        const comments = await performCodeReview(reviewFiles);

        // Sort comments by line number (highest first) to prevent line number conflicts
        // when multiple suggestions are applied sequentially
        comments.sort((a, b) => b.startLine - a.startLine);

        // First, process and send each comment individually for the main list UI
        for (const comment of comments) {
          let suggestionDiff: string | undefined = undefined;

          if (comment.suggestions && comment.suggestions.length > 0) {
            const file = reviewFiles.find(
              (f) => f.filename === comment.filename
            );
            if (file) {
              const fileLines = file.fileContent.split("\n");
              const originalCodeBlock = fileLines
                .slice(comment.startLine - 1, comment.endLine)
                .join("\n");
              const suggestedCode = comment.suggestions[0];
              const patch = diff.createPatch(
                comment.filename,
                originalCodeBlock,
                suggestedCode,
                "Original",
                "Suggested"
              );
              const patchLines = patch.split("\n");
              const diffStartIndex = patchLines.findIndex((line) =>
                line.startsWith("@@")
              );
              const diffLines =
                diffStartIndex !== -1 ? patchLines.slice(diffStartIndex) : [];
              suggestionDiff = "```diff\n" + diffLines.join("\n") + "\n```";
            }
          }

          let commentWithDiff = comment.comment;
          if (suggestionDiff) {
            commentWithDiff += "\n\n" + suggestionDiff;
          }

          const payload = {
            ...comment,
            comment: commentWithDiff,
            indicatorTypes: [comment.type],
            suggestionDiff,
            codegenInstructions: comment.codegenInstructions,
          };

          eventEmitter.emit("reviewEvent", {
            type: serverEvent.REVIEW_COMMENT,
            payload: payload,
            reviewId,
            clientId,
          });
        }

        // Second, send the categorized details for the structured UI
        try {
          // 1. Create a map of changed line numbers for each file
          const changedLinesMap = new Map<string, Set<number>>();
          for (const file of reviewFiles) {
            const changedLines = new Set<number>();
            const diffLines = file.diff.split("\n");
            let currentNewLine = 0;
            for (const line of diffLines) {
              if (line.startsWith("@@")) {
                const match = /^@@ -\d+(,\d+)? \+(\d+)(,\d+)? @@/.exec(line);
                if (match && match[2]) {
                  currentNewLine = parseInt(match[2], 10);
                } else {
                  currentNewLine = 0; // Reset if hunk header is weird
                }
              } else if (line.startsWith("+")) {
                changedLines.add(currentNewLine);
                currentNewLine++;
              } else if (line.startsWith(" ")) {
                currentNewLine++;
              } else if (line.startsWith("-")) {
                // This line does not exist in the new file, so the line counter does not advance
              }
            }
            changedLinesMap.set(file.filename, changedLines);
          }

          // 2. Categorize comments
          const assertiveComments: ReviewComment[] = [];
          const additionalComments: ReviewComment[] = [];
          const outsideDiffRangeComments: ReviewComment[] = [];

          for (const comment of comments) {
            const changedLines = changedLinesMap.get(comment.filename);
            let inDiff = false;
            if (changedLines) {
              for (let i = comment.startLine; i <= comment.endLine; i++) {
                if (changedLines.has(i)) {
                  inDiff = true;
                  break;
                }
              }
            }

            if (!inDiff) {
              outsideDiffRangeComments.push(comment);
            } else if (
              comment.type === "potential_issue" ||
              comment.type === "refactor_suggestion"
            ) {
              assertiveComments.push(comment);
            } else {
              additionalComments.push(comment);
            }
          }

          // 3. Create payload and emit event
          const payload: AdditionalDetailsPayload = {
            counts: {
              assertive: assertiveComments.length,
              additional: additionalComments.length,
              outside_diff: outsideDiffRangeComments.length,
            },
            assertiveComments,
            additionalComments,
            outsideDiffRangeComments,
          };

          console.log(`📤 Sending ADDITIONAL_DETAILS:`);
          console.log(JSON.stringify(payload, null, 2));

          eventEmitter.emit("reviewEvent", {
            type: serverEvent.ADDITIONAL_DETAILS,
            payload,
            reviewId,
            clientId,
          });
        } catch (categorizationError) {
          console.error(
            "Error during comment categorization:",
            categorizationError
          );
          // If categorization fails, we can fall back to sending individual comments (or just log the error)
          // For now, we'll just log it and the review will continue to the summary step.
        }

        // Thinking update: Generating summary
        eventEmitter.emit("reviewEvent", {
          type: serverEvent.THINKING_UPDATE,
          payload: { message: "Generating a summary of the review..." },
          reviewId,
          clientId,
        });

        // Generate and send the review summary
        try {
          const summary = await generateReviewSummary(comments);

          // Send the short summary
          eventEmitter.emit("reviewEvent", {
            type: serverEvent.SHORT_SUMMARY,
            payload: { summary: summary.shortSummary },
            reviewId,
            clientId,
          });

          // Send the full summary comment
          eventEmitter.emit("reviewEvent", {
            type: serverEvent.SUMMARY_COMMENT,
            payload: { summary: summary.summary },
            reviewId,
            clientId,
          });
        } catch (summaryError) {
          console.error("Error generating review summary:", summaryError);
          // Don't fail the whole review if summary generation fails
        }

        // Signal that the review is complete
        console.log("📤 Sending REVIEW_COMPLETED:", {
          status: reviewStatus.COMPLETED,
        });
        eventEmitter.emit("reviewEvent", {
          type: serverEvent.REVIEW_COMPLETED,
          payload: { status: reviewStatus.COMPLETED },
          reviewId,
          clientId,
          endedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error("Error during AI code review:", error);

        // Default error message
        let errorMessage = "Failed to process AI review.";
        let eventType: ServerEvent = serverEvent.ERROR;

        // Check for specific Vercel AI SDK errors
        if (error instanceof Error && "cause" in error) {
          const cause = error.cause as any;
          if (
            cause?.isRetryable === true &&
            cause?.responseBody?.includes("overloaded")
          ) {
            errorMessage = "The model is overloaded. Please try again later.";
            eventType = serverEvent.RATE_LIMIT_EXCEEDED;
          }
        }

        // The definitive, 3-step error handling sequence based on client-side code:

        // 1. Send the error message for the UI to display.
        // The client only has a handler for 'rate_limit_exceeded', so we use it for all errors.
        eventEmitter.emit("reviewEvent", {
          type: serverEvent.RATE_LIMIT_EXCEEDED,
          payload: { message: errorMessage },
          reviewId,
          clientId,
        });

        // 2. Update the UI state to 'failed'.
        eventEmitter.emit("reviewEvent", {
          type: serverEvent.STATE_UPDATE,
          payload: { status: reviewStatus.FAILED },
          reviewId,
          clientId,
        });

        // 3. Send the final terminal event to stop the review process.
        eventEmitter.emit("reviewEvent", {
          type: serverEvent.REVIEW_COMPLETED,
          payload: {},
          reviewId,
          clientId,
        });
      }

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
      });
      return {
        status: "success",
        message: `Review process stopped for ${reviewId}.`,
      };
    }),
});

// 5. Export the main router
export const appRouter = t.router({
  accessToken: accessTokenRouter,
  organizations: organizationsRouter,
  reviews: reviewsRouter,
  testing: testingRouter,
  vsCode: vsCodeRouter,
});

export type AppRouter = typeof appRouter;
