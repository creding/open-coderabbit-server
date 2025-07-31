import { z } from "zod";
import { issueType } from "../../types";

export const reviewCommentSchema = z.object({
  filename: z.string().describe("The name of the file being reviewed."),
  startLine: z
    .number()
    .describe("The starting line number of the code being commented on."),
  endLine: z
    .number()
    .describe("The ending line number of the code being commented on."),
  comment: z.string().describe("The review comment in Markdown format."),
  type: z
    .enum([
      issueType.POTENTIAL_ISSUE,
      issueType.REFACTOR_SUGGESTION,
      issueType.NITPICK,
      issueType.VERIFICATION,
      issueType.OTHER,
    ])
    .describe("The category of the review comment."),
  suggestions: z
    .array(z.string())
    .optional()
    .describe(
      'An optional array containing a single string with the suggested code change. This should be the full, complete code block that replaces the original.',
    ),
  codegenInstructions: z
    .string()
    .optional()
    .describe(
      'For complex changes, provide a high-level instruction for an AI agent to perform the task (e.g., "Refactor this function to be asynchronous and handle errors gracefully.").',
    ),
});

export const reviewSummarySchema = z.object({
  summary: z
    .string()
    .describe(
      'A comprehensive, high-level summary of the code review findings, formatted in Markdown.',
    ),
  shortSummary: z
    .string()
    .describe('A very brief, one-sentence summary of the review.'),
});

export const prObjectiveSchema = z.object({
  objective: z.string().describe('A concise, one-sentence objective for the pull request.'),
});

export const walkThroughSchema = z.object({
  walkThrough: z.string().describe('A high-level, step-by-step walkthrough of the code changes in Markdown format.'),
});

export const reviewTitleSchema = z.object({
  title: z.string().describe('A concise, descriptive title for the code changes, like a pull request title.'),
});
