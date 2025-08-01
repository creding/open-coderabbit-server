import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateObject } from 'ai';
import { getAiProvider } from '../../../src/services/ai/index';
import { AiProvider } from '../../../src/services/ai/types';
import { File, ReviewComment } from '../../../src/types';
import * as prompts from '../../../src/services/ai/prompts';

vi.mock('ai');
vi.mock('@ai-sdk/google', () => ({
  createGoogleGenerativeAI: vi.fn(() => vi.fn()),
}));

describe('UnifiedAiProvider', () => {
  let aiProvider: AiProvider;

  beforeEach(() => {
    vi.mocked(generateObject).mockClear();
    aiProvider = getAiProvider();
  });

  const mockFiles: File[] = [
    { filename: 'file1.ts', fileContent: 'content', diff: 'diff', newFile: false, deletedFile: false, lines: [] },
  ];

  it('should generate a review title', async () => {
    const expectedTitle = 'Test Title';
    vi.mocked(generateObject).mockResolvedValue({ object: { title: expectedTitle } } as any);
    const title = await aiProvider.generateReviewTitle(mockFiles);
    expect(title).toBe(expectedTitle);
    expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
      prompt: prompts.generateReviewTitlePrompt(mockFiles),
    }));
  });

  it('should generate a review summary', async () => {
    const mockComments: ReviewComment[] = [{ filename: 'file1.ts', startLine: 1, endLine: 1, comment: 'comment', type: 'suggestion' }];
    const expectedSummary = { summary: 'Long summary', shortSummary: 'Short summary' };
    vi.mocked(generateObject).mockResolvedValue({ object: expectedSummary } as any);
    const summary = await aiProvider.generateReviewSummary(mockComments);
    expect(summary).toEqual(expectedSummary);
    expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
      prompt: prompts.generateReviewSummaryPrompt(mockComments),
    }));
  });

  it('should return a default summary when there are no comments', async () => {
    const summary = await aiProvider.generateReviewSummary([]);
    expect(summary.summary).toContain('No issues were found');
    expect(generateObject).not.toHaveBeenCalled();
  });

  it('should perform a code review', async () => {
    const expectedComments: ReviewComment[] = [
      { filename: 'file1.ts', startLine: 1, endLine: 1, comment: 'A comment', type: 'suggestion' },
    ];
    vi.mocked(generateObject).mockResolvedValue({ object: expectedComments } as any);
    const comments = await aiProvider.performCodeReview(mockFiles);
    expect(comments).toEqual(expectedComments);
    expect(generateObject).toHaveBeenCalledWith(expect.objectContaining({
      prompt: prompts.performCodeReviewPrompt(mockFiles),
    }));
  });

  it('should retry on failure', async () => {
    vi.mocked(generateObject)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue({ object: { title: 'Success' } } as any);
    
    const title = await aiProvider.generateReviewTitle(mockFiles);
    expect(title).toBe('Success');
    expect(generateObject).toHaveBeenCalledTimes(2);
  });
});