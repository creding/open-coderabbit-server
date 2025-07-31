import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getAiProvider } from '../../services/ai/index';
import * as ai from 'ai';
import { env } from '../../constants';
import { reviewCommentSchema, reviewSummarySchema, reviewTitleSchema, prObjectiveSchema, walkThroughSchema } from '../../services/ai/schemas';

vi.mock('ai', () => ({
  generateObject: vi.fn(),
}));

vi.mock('../../constants', () => ({
  env: {
    AI_PROVIDER: 'google',
    AI_MODEL: 'gemini-pro',
    GOOGLE_GENERATIVE_AI_API_KEY: 'test-key',
  },
}));

describe('UnifiedAiProvider', () => {
  let aiProvider;

  beforeEach(() => {
    aiProvider = getAiProvider();
  });

  it('should generate a review title', async () => {
    const mockTitle = { title: 'Test Title' };
    vi.mocked(ai.generateObject).mockResolvedValue({ object: mockTitle });

    const title = await aiProvider.generateReviewTitle([]);
    expect(title).toBe('Test Title');
    expect(ai.generateObject).toHaveBeenCalledWith(expect.objectContaining({ schema: reviewTitleSchema }));
  });

  it('should generate a review summary', async () => {
    const mockSummary = { summary: 'Test Summary', shortSummary: 'Test Short Summary' };
    vi.mocked(ai.generateObject).mockResolvedValue({ object: mockSummary });

    const summary = await aiProvider.generateReviewSummary([{ filename: 'f.ts', startLine: 1, endLine: 1, comment: 'c', type: 'issue'}]);
    expect(summary).toEqual(mockSummary);
    expect(ai.generateObject).toHaveBeenCalledWith(expect.objectContaining({ schema: reviewSummarySchema }));
  });

  it('should generate a PR objective', async () => {
    const mockObjective = { objective: 'Test Objective' };
    vi.mocked(ai.generateObject).mockResolvedValue({ object: mockObjective });

    const objective = await aiProvider.generatePrObjective([]);
    expect(objective).toBe('Test Objective');
    expect(ai.generateObject).toHaveBeenCalledWith(expect.objectContaining({ schema: prObjectiveSchema }));
  });

  it('should generate a walkthrough', async () => {
    const mockWalkthrough = { walkThrough: 'Test Walkthrough' };
    vi.mocked(ai.generateObject).mockResolvedValue({ object: mockWalkthrough });

    const walkthrough = await aiProvider.generateWalkThrough([]);
    expect(walkthrough).toBe('Test Walkthrough');
    expect(ai.generateObject).toHaveBeenCalledWith(expect.objectContaining({ schema: walkThroughSchema }));
  });

  it('should perform a code review', async () => {
    const mockComments = [{ filename: 'f.ts', startLine: 1, endLine: 1, comment: 'c', type: 'issue' }];
    vi.mocked(ai.generateObject).mockResolvedValue({ object: mockComments });

    const comments = await aiProvider.performCodeReview([]);
    expect(comments).toEqual(mockComments);
    expect(ai.generateObject).toHaveBeenCalledWith(expect.objectContaining({ schema: expect.any(Object) }));
  });
});
