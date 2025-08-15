import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateObject, streamObject } from 'ai';
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
    vi.mocked(streamObject).mockClear();
    aiProvider = getAiProvider();
  });

  const mockFiles: File[] = [
    {
      filename: 'file1.ts',
      fileContent: 'content',
      diff: 'diff',
      newFile: false,
      renamedFile: false,
      deletedFile: false,
    },
  ];

  it('should generate a review title', async () => {
    const expectedTitle = 'Test Title';
    vi.mocked(generateObject).mockResolvedValue({
      object: { title: expectedTitle },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5 },
    } as any);
    const title = await aiProvider.generateReviewTitle(mockFiles);
    expect(title).toBe(expectedTitle);
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: prompts.generateReviewTitlePrompt(mockFiles),
      })
    );
  });

  it('should generate a review summary', async () => {
    const mockComments: ReviewComment[] = [
      {
        filename: 'file1.ts',
        startLine: 1,
        endLine: 1,
        comment: 'comment',
        type: 'refactor_suggestion',
      },
    ];
    const expectedSummary = {
      summary: 'Long summary',
      shortSummary: 'Short summary',
    };
    vi.mocked(generateObject).mockResolvedValue({
      object: expectedSummary,
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5 },
    } as any);
    const summary = await aiProvider.generateReviewSummary(mockComments);
    expect(summary).toEqual(expectedSummary);
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: prompts.generateReviewSummaryPrompt(mockComments),
      })
    );
  });

  it('should return a default summary when there are no comments', async () => {
    const summary = await aiProvider.generateReviewSummary([]);
    expect(summary.summary).toContain('No issues were found');
    expect(generateObject).not.toHaveBeenCalled();
  });

  it('should perform a code review', async () => {
    const expectedComments: ReviewComment[] = [
      {
        filename: 'file1.ts',
        startLine: 1,
        endLine: 1,
        comment: 'A comment',
        type: 'refactor_suggestion',
      },
    ];
    vi.mocked(generateObject).mockResolvedValue({
      object: expectedComments,
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5 },
    } as any);
    const comments = await aiProvider.performCodeReview(mockFiles);
    expect(comments).toEqual(expectedComments);
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: prompts.performCodeReviewPrompt(mockFiles),
      })
    );
  });

  it('should retry on failure', async () => {
    vi.mocked(generateObject)
      .mockRejectedValueOnce(new Error('network error'))
      .mockResolvedValue({
        object: { title: 'Success' },
        finishReason: 'stop',
        usage: { promptTokens: 10, completionTokens: 5 },
      } as any);

    const title = await aiProvider.generateReviewTitle(mockFiles);
    expect(title).toBe('Success');
    expect(generateObject).toHaveBeenCalledTimes(2);
  });

  it('should generate a PR objective', async () => {
    const expectedObjective = 'Test Objective';
    vi.mocked(generateObject).mockResolvedValue({
      object: { objective: expectedObjective },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5 },
    } as any);
    const objective = await aiProvider.generatePrObjective(mockFiles);
    expect(objective).toBe(expectedObjective);
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: prompts.generatePrObjectivePrompt(mockFiles),
      })
    );
  });

  it('should generate a walkthrough', async () => {
    const expectedWalkThrough = 'Test Walkthrough';
    vi.mocked(generateObject).mockResolvedValue({
      object: { walkThrough: expectedWalkThrough },
      finishReason: 'stop',
      usage: { promptTokens: 10, completionTokens: 5 },
    } as any);
    const walkThrough = await aiProvider.generateWalkThrough(mockFiles);
    expect(walkThrough).toBe(expectedWalkThrough);
    expect(generateObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: prompts.generateWalkThroughPrompt(mockFiles),
      })
    );
  });

  it('should stream code review comments', async () => {
    const mockComments: ReviewComment[] = [
      {
        filename: 'file1.ts',
        startLine: 1,
        endLine: 1,
        comment: 'First comment',
        type: 'refactor_suggestion',
      },
      {
        filename: 'file1.ts',
        startLine: 2,
        endLine: 2,
        comment: 'Second comment',
        type: 'potential_issue',
      },
    ];

    // Mock the streamObject function to return an async iterator
    const mockElementStream = (async function* () {
      for (const comment of mockComments) {
        yield comment;
      }
    })();

    vi.mocked(streamObject).mockReturnValue({
      elementStream: mockElementStream,
      warnings: [],
    } as any);

    const comments: ReviewComment[] = [];
    for await (const comment of aiProvider.streamCodeReview(mockFiles)) {
      comments.push(comment);
    }

    expect(comments).toEqual(mockComments);
    expect(streamObject).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: prompts.performCodeReviewPrompt(mockFiles),
        system: prompts.codeReviewSystemPrompt,
      })
    );
  });
});
