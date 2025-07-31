import { EventEmitter } from "events";
import * as diff from "diff";
import {
  performCodeReview,
  generateReviewSummary,
  generateReviewTitle,
  generatePrObjective,
  generateWalkThrough,
} from "./ai";
import {
  serverEvent,
  reviewStatus,
  File,
  ReviewComment,
  AdditionalDetailsPayload,
  ServerEvent,
  EventPayload,
  ReviewStatus,
} from "../types";

export class ReviewService {
  constructor(
    private eventEmitter: EventEmitter,
    private reviewId: string,
    private clientId: string
  ) {}

  private emitEvent(type: ServerEvent, payload: EventPayload, endedAt?: string) {
    console.log(`📡 Emitting ${type} for review ${this.reviewId}`);
    this.eventEmitter.emit("reviewEvent", {
      type,
      payload,
      reviewId: this.reviewId,
      clientId: this.clientId,
      endedAt,
    });
  }

  private sendStatusUpdate(status: 'summarizing' | 'reviewing') {
    this.emitEvent(serverEvent.REVIEW_STATUS, { reviewStatus: status });
  }

  private async generatePrDetails(files: File[]) {
    this.emitEvent(serverEvent.THINKING_UPDATE, { message: "Generating a title for your review..." });
    try {
      const title = await generateReviewTitle(files);
      this.emitEvent(serverEvent.PR_TITLE, title);
    } catch (error) {
      console.error("Error generating review title:", error);
    }

    this.emitEvent(serverEvent.THINKING_UPDATE, { message: "Formulating the objective..." });
    try {
      const objective = await generatePrObjective(files);
      this.emitEvent(serverEvent.PR_OBJECTIVE, objective);
    } catch (error) {
      console.error("Error generating PR objective:", error);
    }

    this.emitEvent(serverEvent.THINKING_UPDATE, { message: "Preparing a walkthrough..." });
    try {
      const walkThrough = await generateWalkThrough(files);
      this.emitEvent(serverEvent.WALK_THROUGH, walkThrough);
    } catch (error) {
      console.error("Error generating walkthrough:", error);
    }
  }

  private async processAndSendComments(comments: ReviewComment[], files: File[]) {
    for (const comment of comments) {
      let suggestionDiff: string | undefined = undefined;
      if (comment.suggestions && comment.suggestions.length > 0) {
        const file = files.find((f) => f.filename === comment.filename);
        if (file) {
          const fileLines = file.fileContent.split("\n");
          const originalCodeBlock = fileLines.slice(comment.startLine - 1, comment.endLine).join("\n");
          const suggestedCode = comment.suggestions[0];
          const patch = diff.createPatch(comment.filename, originalCodeBlock, suggestedCode, "Original", "Suggested");
          const patchLines = patch.split("\n");
          const diffStartIndex = patchLines.findIndex((line) => line.startsWith("@@"));
          const diffLines = diffStartIndex !== -1 ? patchLines.slice(diffStartIndex) : [];
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

      this.emitEvent(serverEvent.REVIEW_COMMENT, payload);
    }
  }

  private async categorizeAndSendDetails(comments: ReviewComment[], files: File[]) {
     try {
          const changedLinesMap = new Map<string, Set<number>>();
          for (const file of files) {
            const changedLines = new Set<number>();
            const diffLines = file.diff.split("\n");
            let currentNewLine = 0;
            for (const line of diffLines) {
              if (line.startsWith("@@")) {
                const match = /^@@ -\d+(,\d+)? \+(\d+)(,\d+)? @@/.exec(line);
                if (match && match[2]) {
                  currentNewLine = parseInt(match[2], 10);
                } else {
                  currentNewLine = 0;
                }
              } else if (line.startsWith("+")) {
                changedLines.add(currentNewLine);
                currentNewLine++;
              } else if (line.startsWith(" ")) {
                currentNewLine++;
              }
            }
            changedLinesMap.set(file.filename, changedLines);
          }

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
            } else if (comment.type === "potential_issue" || comment.type === "refactor_suggestion") {
              assertiveComments.push(comment);
            } else {
              additionalComments.push(comment);
            }
          }

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

          this.emitEvent(serverEvent.ADDITIONAL_DETAILS, payload);
        } catch (error) {
          console.error("Error during comment categorization:", error);
        }
  }

  private async generateAndSendSummary(comments: ReviewComment[]) {
    this.emitEvent(serverEvent.THINKING_UPDATE, { message: "Generating a summary of the review..." });
    try {
      const summary = await generateReviewSummary(comments);
      this.emitEvent(serverEvent.SHORT_SUMMARY, { summary: summary.shortSummary });
      this.emitEvent(serverEvent.SUMMARY_COMMENT, { summary: summary.summary });
    } catch (error) {
      console.error("Error generating review summary:", error);
    }
  }

  private sendCompletionEvent(status: ReviewStatus) {
    this.emitEvent(
      serverEvent.REVIEW_COMPLETED,
      { status },
      new Date().toISOString()
    );
  }

  private handleError(error: unknown) {
    let errorMessage = "Failed to process AI review.";
    let eventType: ServerEvent = serverEvent.ERROR;

    if (error instanceof Error && "cause" in error) {
      const cause = error.cause as any;
      if (cause?.isRetryable === true && cause?.responseBody?.includes("overloaded")) {
        errorMessage = "The model is overloaded. Please try again later.";
        eventType = serverEvent.RATE_LIMIT_EXCEEDED;
      }
    }

    // 1. Send the specific error event to the client.
    this.emitEvent(eventType, { message: errorMessage });

    // 2. Update the UI state to 'failed'.
    this.emitEvent(serverEvent.STATE_UPDATE, { status: reviewStatus.FAILED });

    // 3. Send the final terminal event to stop the review process.
    this.sendCompletionEvent(reviewStatus.FAILED);
  }

  public async run(files: File[]) {
    try {
      this.emitEvent(serverEvent.STATE_UPDATE, { status: reviewStatus.IN_PROGRESS });
      this.sendStatusUpdate("summarizing");
      await this.generatePrDetails(files);
      this.sendStatusUpdate("reviewing");
      const comments = await performCodeReview(files);
      comments.sort((a, b) => b.startLine - a.startLine);
      await this.processAndSendComments(comments, files);
      await this.categorizeAndSendDetails(comments, files);
      await this.generateAndSendSummary(comments);
      this.sendCompletionEvent(reviewStatus.COMPLETED);
    } catch (error) {
      console.error("Error during AI code review:", error);
      this.handleError(error);
    }
  }
}
