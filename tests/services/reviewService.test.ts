import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';
import { ReviewService } from '../../src/services/reviewService';
import { getAiProvider } from '../../src/services/ai/index';
import {
  File,
  ReviewComment,
  serverEvent,
  reviewStatus,
} from '../../src/types';

vi.mock('../../src/services/ai/index');

describe('ReviewService - Core Review Functionality', () => {
  let reviewService: ReviewService;
  let eventEmitter: EventEmitter;
  let mockAiProvider: any;

  const reviewId = 'test-review';
  const clientId = 'test-client';

  beforeEach(() => {
    eventEmitter = new EventEmitter();
    mockAiProvider = {
      generateReviewTitle: vi.fn().mockResolvedValue('Test Title'),
      generatePrObjective: vi.fn().mockResolvedValue('Test Objective'),
      generateWalkThrough: vi.fn().mockResolvedValue('Test Walkthrough'),
      performCodeReview: vi.fn().mockResolvedValue([]),
      generateReviewSummary: vi
        .fn()
        .mockResolvedValue({ shortSummary: 'Short', summary: 'Long' }),
    };
    (getAiProvider as vi.Mock).mockReturnValue(mockAiProvider);
    reviewService = new ReviewService(eventEmitter, reviewId, clientId);
  });

  const mockFiles: File[] = [
    {
      filename: 'file1.ts',
      fileContent: 'const a = 1;',
      diff: 'diff1',
      newFile: false,
      renamedFile: false,
      deletedFile: false,
    },
  ];

  it('should run a full review successfully', async () => {
    const emitSpy = vi.spyOn(eventEmitter, 'emit');
    const mockComments: ReviewComment[] = [
      {
        filename: 'file1.ts',
        startLine: 1,
        endLine: 1,
        comment: 'A comment',
        type: 'suggestion',
      },
    ];
    mockAiProvider.performCodeReview.mockResolvedValue(mockComments);

    await reviewService.run(mockFiles);

    expect(mockAiProvider.generateReviewTitle).toHaveBeenCalledWith(mockFiles);
    expect(mockAiProvider.performCodeReview).toHaveBeenCalledWith(mockFiles);
    expect(mockAiProvider.generateReviewSummary).toHaveBeenCalledWith(
      mockComments
    );

    // Check for key events
    expect(emitSpy).toHaveBeenCalledWith(
      'reviewEvent',
      expect.objectContaining({ type: serverEvent.PR_TITLE })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      'reviewEvent',
      expect.objectContaining({ type: serverEvent.REVIEW_COMMENT })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      'reviewEvent',
      expect.objectContaining({ type: serverEvent.SUMMARY_COMMENT })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      'reviewEvent',
      expect.objectContaining({
        type: serverEvent.REVIEW_COMPLETED,
        payload: { status: reviewStatus.COMPLETED },
      })
    );
  });

  it('should handle an error during the review process', async () => {
    const emitSpy = vi.spyOn(eventEmitter, 'emit');
    const error = new Error('AI Provider Failed');
    mockAiProvider.performCodeReview.mockRejectedValue(error);

    await reviewService.run(mockFiles);

    expect(emitSpy).toHaveBeenCalledWith(
      'reviewEvent',
      expect.objectContaining({ type: serverEvent.ERROR })
    );
    expect(emitSpy).toHaveBeenCalledWith(
      'reviewEvent',
      expect.objectContaining({
        type: serverEvent.REVIEW_COMPLETED,
        payload: { status: reviewStatus.FAILED },
      })
    );
  });
});
