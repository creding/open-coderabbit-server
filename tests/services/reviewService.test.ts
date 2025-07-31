import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReviewService } from '../../src/services/reviewService';
import { EventEmitter } from 'events';
import { getAiProvider } from '../../src/services/ai/index';
import { logger } from '../../src/utils/logger';
import { monitor } from '../../src/utils/monitor';
import { serverEvent, reviewStatus } from '../../src/types';

vi.mock('../../services/ai/index', () => ({
  getAiProvider: vi.fn(),
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../utils/monitor', () => ({
  monitor: {
    startReview: vi.fn(),
    completeReview: vi.fn(),
    failReview: vi.fn(),
  },
}));

describe('ReviewService', () => {
  let reviewService: ReviewService;
  let eventEmitter: EventEmitter;
  let mockAiProvider;

  beforeEach(() => {
    eventEmitter = new EventEmitter();
    mockAiProvider = {
      generateReviewTitle: vi.fn().mockResolvedValue('Test Title'),
      generatePrObjective: vi.fn().mockResolvedValue('Test Objective'),
      generateWalkThrough: vi.fn().mockResolvedValue('Test Walkthrough'),
      performCodeReview: vi.fn().mockResolvedValue([]),
      generateReviewSummary: vi
        .fn()
        .mockResolvedValue({ summary: 's', shortSummary: 'ss' }),
    };
    vi.mocked(getAiProvider).mockReturnValue(mockAiProvider);
    reviewService = new ReviewService(eventEmitter, 'review1', 'client1');
  });

  it('should run a review successfully', async () => {
    const emitSpy = vi.spyOn(eventEmitter, 'emit');
    await reviewService.run([]);

    expect(mockAiProvider.generateReviewTitle).toHaveBeenCalled();
    expect(mockAiProvider.generatePrObjective).toHaveBeenCalled();
    expect(mockAiProvider.generateWalkThrough).toHaveBeenCalled();
    expect(mockAiProvider.performCodeReview).toHaveBeenCalled();
    expect(mockAiProvider.generateReviewSummary).toHaveBeenCalled();

    expect(emitSpy).toHaveBeenCalledWith(
      'reviewEvent',
      expect.objectContaining({
        type: serverEvent.REVIEW_COMPLETED,
        payload: { status: reviewStatus.COMPLETED },
      })
    );
  });

  it('should handle errors during a review', async () => {
    const emitSpy = vi.spyOn(eventEmitter, 'emit');
    const error = new Error('AI Error');
    mockAiProvider.performCodeReview.mockRejectedValue(error);

    await reviewService.run([]);

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
