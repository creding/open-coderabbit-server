import { describe, it, expect } from 'vitest';
import {
  reviewCommentSchema,
  reviewSummarySchema,
  prObjectiveSchema,
  walkThroughSchema,
  reviewTitleSchema,
} from '../../../src/services/ai/schemas';

describe('AI Schemas', () => {
  describe('reviewCommentSchema', () => {
    it('should validate a correct review comment', () => {
      const comment = {
        filename: 'test.ts',
        startLine: 1,
        endLine: 2,
        comment: 'This is a comment',
        type: 'potential_issue',
        suggestions: ['const a = 2;'],
      };
      const result = reviewCommentSchema.safeParse(comment);
      expect(result.success).toBe(true);
    });

    it('should invalidate a comment with a wrong type', () => {
      const comment = {
        filename: 'test.ts',
        startLine: 1,
        endLine: 2,
        comment: 'This is a comment',
        type: 'invalid_type',
      };
      const result = reviewCommentSchema.safeParse(comment);
      expect(result.success).toBe(false);
    });
  });

  describe('reviewSummarySchema', () => {
    it('should validate a correct summary', () => {
      const summary = {
        summary: 'Long summary',
        shortSummary: 'Short summary',
      };
      const result = reviewSummarySchema.safeParse(summary);
      expect(result.success).toBe(true);
    });

    it('should invalidate a summary with missing fields', () => {
      const summary = { summary: 'Long summary' };
      const result = reviewSummarySchema.safeParse(summary);
      expect(result.success).toBe(false);
    });
  });

  describe('prObjectiveSchema', () => {
    it('should validate a correct objective', () => {
      const objective = { objective: 'This is the objective' };
      const result = prObjectiveSchema.safeParse(objective);
      expect(result.success).toBe(true);
    });
  });

  describe('walkThroughSchema', () => {
    it('should validate a correct walkthrough', () => {
      const walkThrough = { walkThrough: 'This is the walkthrough' };
      const result = walkThroughSchema.safeParse(walkThrough);
      expect(result.success).toBe(true);
    });
  });

  describe('reviewTitleSchema', () => {
    it('should validate a correct title', () => {
      const title = { title: 'This is the title' };
      const result = reviewTitleSchema.safeParse(title);
      expect(result.success).toBe(true);
    });
  });
});