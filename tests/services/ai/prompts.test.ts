import { describe, it, expect } from 'vitest';
import {
  generateReviewTitlePrompt,
  generateReviewSummaryPrompt,
  generatePrObjectivePrompt,
  generateWalkThroughPrompt,
  performCodeReviewPrompt,
} from '../../../src/services/ai/prompts';
import { File, ReviewComment } from '../../../src/types';

describe('AI Prompts', () => {
  const mockFiles: File[] = [
    {
      filename: 'src/test.ts',
      fileContent: 'const a = 1;\nconst b = 2;',
      diff: '@@ -1,2 +1,2 @@\n-const a = 1;\n+const a = 3;',
      newFile: false,
      deletedFile: false,
      lines: [],
    },
  ];

  const mockComments: ReviewComment[] = [
    {
      filename: 'src/test.ts',
      startLine: 1,
      endLine: 1,
      comment: 'Use let instead of const',
      type: 'refactor_suggestion',
    },
  ];

  it('should generate a review title prompt', () => {
    const prompt = generateReviewTitlePrompt(mockFiles);
    expect(prompt).toContain('generate a concise and descriptive title');
    expect(prompt).toContain('File: src/test.ts');
    expect(prompt).toContain(
      'Diff: @@ -1,2 +1,2 @@\n-const a = 1;\n+const a = 3;'
    );
  });

  it('should generate a review summary prompt', () => {
    const prompt = generateReviewSummaryPrompt(mockComments);
    expect(prompt).toContain('provide a high-level summary');
    expect(prompt).toContain(JSON.stringify(mockComments, null, 2));
  });

  it('should return a simple message for an empty summary prompt', () => {
    const prompt = generateReviewSummaryPrompt([]);
    expect(prompt).toBe('No issues found.');
  });

  it('should generate a PR objective prompt', () => {
    const prompt = generatePrObjectivePrompt(mockFiles);
    expect(prompt).toContain('generate a concise, one-sentence objective');
    expect(prompt).toContain('File: src/test.ts');
  });

  it('should generate a walkthrough prompt', () => {
    const prompt = generateWalkThroughPrompt(mockFiles);
    expect(prompt).toContain('generate a high-level, step-by-step walkthrough');
    expect(prompt).toContain('File: src/test.ts');
  });

  it('should generate a code review prompt', () => {
    const prompt = performCodeReviewPrompt(mockFiles);
    expect(prompt).toContain('You are an expert code reviewer');
    expect(prompt).toContain('File: src/test.ts');
    expect(prompt).toContain('Full Content with Line Numbers:');
    expect(prompt).toContain('1: const a = 1;');
  });
});
