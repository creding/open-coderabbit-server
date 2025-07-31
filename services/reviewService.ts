import { EventEmitter } from 'events';
import { getAiProvider } from './ai/index';
import { AiProvider } from './ai/types';
import {
  serverEvent,
  reviewStatus,
  ReviewComment,
  File,
  AdditionalDetailsPayload,
  ServerEvent,
  EventPayload,
  ReviewStatus,
} from '../types';
import * as diff from 'diff';
import { logger } from '../utils/logger';
import { monitor } from '../utils/monitor';

export class ReviewService {
  private aiProvider: AiProvider;

  constructor(
    private eventEmitter: EventEmitter,
    private reviewId: string,
    private clientId: string
  ) {
    this.aiProvider = getAiProvider();
  }

  private emitEvent(
    type: ServerEvent,
    payload: EventPayload,
    endedAt?: string
  ) {
    logger.debug(`Emitting ${type}`, {
      reviewId: this.reviewId,
      clientId: this.clientId,
    });
    this.eventEmitter.emit('reviewEvent', {
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
    this.emitEvent(serverEvent.THINKING_UPDATE, {
      message: 'Generating a title for your review...',
    });
    try {
      const title = await this.aiProvider.generateReviewTitle(files);
      this.emitEvent(serverEvent.PR_TITLE, title);
    } catch (error) {
      logger.error('Error generating review title', {
        reviewId: this.reviewId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.emitEvent(serverEvent.THINKING_UPDATE, {
      message: 'Formulating the objective...',
    });
    try {
      const objective = await this.aiProvider.generatePrObjective(files);
      this.emitEvent(serverEvent.PR_OBJECTIVE, objective);
    } catch (error) {
      logger.error('Error generating PR objective', {
        reviewId: this.reviewId,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    this.emitEvent(serverEvent.THINKING_UPDATE, {
      message: 'Preparing a walkthrough...',
    });
    try {
      const walkThrough = await this.aiProvider.generateWalkThrough(files);
      this.emitEvent(serverEvent.WALK_THROUGH, walkThrough);
    } catch (error) {
      logger.error('Error generating walkthrough', {
        reviewId: this.reviewId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async processAndSendComments(
    comments: ReviewComment[],
    files: File[]
  ) {
    for (const comment of comments) {
      let suggestionDiff: string | undefined = undefined;
      if (comment.suggestions && comment.suggestions.length > 0) {
        const file = files.find((f) => f.filename === comment.filename);
        if (file) {
          const fileLines = file.fileContent.split('\n');
          const originalCodeBlock = fileLines
            .slice(comment.startLine - 1, comment.endLine)
            .join('\n');
          const suggestedCode = comment.suggestions[0];
          const patch = diff.createPatch(
            comment.filename,
            originalCodeBlock,
            suggestedCode,
            'Original',
            'Suggested'
          );
          const patchLines = patch.split('\n');
          const diffStartIndex = patchLines.findIndex((line) =>
            line.startsWith('@@')
          );
          const diffLines =
            diffStartIndex !== -1 ? patchLines.slice(diffStartIndex) : [];
          suggestionDiff = '```diff\n' + diffLines.join('\n') + '\n```';
        }
      }

      let commentWithDiff = comment.comment;
      if (suggestionDiff) {
        commentWithDiff += '\n\n' + suggestionDiff;
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

  private async categorizeAndSendDetails(
    comments: ReviewComment[],
    files: File[]
  ) {
    try {
      const changedLinesMap = new Map<string, Set<number>>();
      for (const file of files) {
        const changedLines = new Set<number>();
        const diffLines = file.diff.split('\n');
        let currentNewLine = 0;
        for (const line of diffLines) {
          if (line.startsWith('@@')) {
            const match = /^@@ -\d+(,\d+)? \+(\d+)(,\d+)? @@/.exec(line);
            if (match && match[2]) {
              currentNewLine = parseInt(match[2], 10);
            } else {
              currentNewLine = 0;
            }
          } else if (line.startsWith('+')) {
            changedLines.add(currentNewLine);
            currentNewLine++;
          } else if (line.startsWith(' ')) {
            currentNewLine++;
          }
        }
        changedLinesMap.set(file.filename, changedLines);
      }

      const assertiveFileReviewMap: Record<string, ReviewComment[]> = {};
      const fileReviewMap: Record<string, ReviewComment[]> = {};
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

        if (comment.type === 'nitpick') {
          // Nitpicks always go to the assertive map, regardless of diff.
          if (!assertiveFileReviewMap[comment.filename]) {
            assertiveFileReviewMap[comment.filename] = [];
          }
          assertiveFileReviewMap[comment.filename].push(comment);
        } else {
          // Other comments are categorized based on diff location.
          if (inDiff) {
            if (!fileReviewMap[comment.filename]) {
              fileReviewMap[comment.filename] = [];
            }
            fileReviewMap[comment.filename].push(comment);
          } else {
            outsideDiffRangeComments.push(comment);
          }
        }
      }

      const assertiveCommentsCount = Object.values(
        assertiveFileReviewMap
      ).reduce((acc, val) => acc + val.length, 0);
      const additionalCommentsCount = Object.values(fileReviewMap).reduce(
        (acc, val) => acc + val.length,
        0
      );

      const payload: AdditionalDetailsPayload = {
        counts: {
          assertive: assertiveCommentsCount,
          additional: additionalCommentsCount,
          outside_diff: outsideDiffRangeComments.length,
        },
        assertiveComments: assertiveFileReviewMap,
        additionalComments: fileReviewMap,
        outsideDiffRangeComments,
        duplicateComments: {},
      };

      this.emitEvent(serverEvent.ADDITIONAL_DETAILS, payload);
    } catch (error) {
      logger.error('Error during comment categorization', {
        reviewId: this.reviewId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private async generateAndSendSummary(comments: ReviewComment[]) {
    this.emitEvent(serverEvent.THINKING_UPDATE, {
      message: 'Generating a summary of the review...',
    });
    try {
      const summary = await this.aiProvider.generateReviewSummary(comments);
      this.emitEvent(serverEvent.SHORT_SUMMARY, {
        summary: summary.shortSummary,
      });
      this.emitEvent(serverEvent.SUMMARY_COMMENT, { summary: summary.summary });
    } catch (error) {
      logger.error('Error generating review summary', {
        reviewId: this.reviewId,
        error: error instanceof Error ? error.message : String(error),
      });
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
    let errorMessage = 'Failed to process AI review.';
    let eventType: ServerEvent = serverEvent.ERROR;

    if (error instanceof Error && 'cause' in error) {
      const cause = error.cause as any;
      if (
        cause?.isRetryable === true &&
        cause?.responseBody?.includes('overloaded')
      ) {
        errorMessage = 'The model is overloaded. Please try again later.';
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
    const startTime = Date.now();

    try {
      logger.info('Starting code review', {
        reviewId: this.reviewId,
        clientId: this.clientId,
        fileCount: files.length,
        totalSize: files.reduce((sum, f) => sum + f.fileContent.length, 0),
      });

      this.emitEvent(serverEvent.STATE_UPDATE, {
        status: reviewStatus.IN_PROGRESS,
      });
      this.sendStatusUpdate('summarizing');

      // Generate PR details with monitoring
      const prStartTime = Date.now();
      await this.generatePrDetails(files);
      logger.debug('PR details generated', {
        reviewId: this.reviewId,
        duration: Date.now() - prStartTime,
      });

      this.sendStatusUpdate('reviewing');

      // Perform code review with monitoring
      const reviewStartTime = Date.now();
      const allComments = await this.aiProvider.performCodeReview(files);
      logger.debug('Code review completed', {
        reviewId: this.reviewId,
        commentCount: allComments.length,
        duration: Date.now() - reviewStartTime,
      });

      allComments.sort(
        (a: ReviewComment, b: ReviewComment) => b.startLine - a.startLine
      );
      await this.processAndSendComments(allComments, files);
      await this.categorizeAndSendDetails(allComments, files);
      await this.generateAndSendSummary(allComments);

      const totalDuration = Date.now() - startTime;
      monitor.completeReview(this.reviewId, allComments.length);

      logger.info('Review completed successfully', {
        reviewId: this.reviewId,
        clientId: this.clientId,
        duration: totalDuration,
        commentCount: allComments.length,
      });

      this.sendCompletionEvent(reviewStatus.COMPLETED);
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      logger.error('Review failed', {
        reviewId: this.reviewId,
        clientId: this.clientId,
        error: errorMessage,
        duration,
      });

      monitor.failReview(this.reviewId, errorMessage);
      this.handleError(error);
    }
  }
}
