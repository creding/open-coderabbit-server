import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";
import { env } from "../../constants";
import { issueType, ReviewComment, File } from "../../types";
import { retryWithBackoff, isRetryableAIError, RetryableError } from "../../utils/retry";
import { AiProvider } from "./types";
import {
  generateReviewTitlePrompt,
  generateReviewSummaryPrompt,
  generatePrObjectivePrompt,
  generateWalkThroughPrompt,
  performCodeReviewPrompt,
} from "./prompts";

const reviewCommentSchema = z.object({
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

const reviewSummarySchema = z.object({
  summary: z
    .string()
    .describe(
      'A comprehensive, high-level summary of the code review findings, formatted in Markdown.',
    ),
  shortSummary: z
    .string()
    .describe('A very brief, one-sentence summary of the review.'),
});

const prObjectiveSchema = z.object({
  objective: z.string().describe('A concise, one-sentence objective for the pull request.'),
});

const walkThroughSchema = z.object({
  walkThrough: z.string().describe('A high-level, step-by-step walkthrough of the code changes in Markdown format.'),
});

const reviewTitleSchema = z.object({
  title: z.string().describe('A concise, descriptive title for the code changes, like a pull request title.'),
});

export class GoogleProvider implements AiProvider {
  private model: any;

  constructor() {
    const google = createGoogleGenerativeAI({ apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY });
    this.model = google(env.AI_MODEL);
  }

  async generateReviewTitle(files: File[]): Promise<string> {
    const prompt = generateReviewTitlePrompt(files);

    return await retryWithBackoff(async () => {
      try {
        const { object } = await generateObject({
          model: this.model,
          schema: reviewTitleSchema,
          prompt: prompt,
        });
        return object.title;
      } catch (error) {
        throw new RetryableError(`Failed to generate review title: ${error instanceof Error ? error.message : String(error)}`, isRetryableAIError(error));
      }
    });
  }

  async generateReviewSummary(comments: ReviewComment[]): Promise<{ summary: string, shortSummary: string }> {
    if (comments.length === 0) {
      return {
        summary: '✅ Great work! No issues were found in the code.',
        shortSummary: 'No issues found.',
      };
    }

    const prompt = generateReviewSummaryPrompt(comments);

    return await retryWithBackoff(async () => {
      try {
        const { object } = await generateObject({
          model: this.model,
          schema: reviewSummarySchema,
          prompt: prompt,
        });
        return object;
      } catch (error) {
        throw new RetryableError(`Failed to generate review summary: ${error instanceof Error ? error.message : String(error)}`, isRetryableAIError(error));
      }
    });
  }

  async generatePrObjective(files: File[]): Promise<string> {
    const prompt = generatePrObjectivePrompt(files);

    return await retryWithBackoff(async () => {
      try {
        const { object } = await generateObject({
          model: this.model,
          schema: prObjectiveSchema,
          prompt: prompt,
        });
        return object.objective;
      } catch (error) {
        throw new RetryableError(`Failed to generate PR objective: ${error instanceof Error ? error.message : String(error)}`, isRetryableAIError(error));
      }
    });
  }

  async generateWalkThrough(files: File[]): Promise<string> {
    const prompt = generateWalkThroughPrompt(files);

    return await retryWithBackoff(async () => {
      try {
        const { object } = await generateObject({
          model: this.model,
          schema: walkThroughSchema,
          prompt: prompt,
        });
        return object.walkThrough;
      } catch (error) {
        throw new RetryableError(`Failed to generate walkthrough: ${error instanceof Error ? error.message : String(error)}`, isRetryableAIError(error));
      }
    });
  }

  async performCodeReview(files: File[]): Promise<ReviewComment[]> {
    const prompt = performCodeReviewPrompt(files);

    return await retryWithBackoff(async () => {
      try {
        const { object } = await generateObject({
          model: this.model,
          schema: z.array(reviewCommentSchema),
          prompt: prompt,
        });
        return object as ReviewComment[];
      } catch (error) {
        throw new RetryableError(`Failed to perform code review: ${error instanceof Error ? error.message : String(error)}`, isRetryableAIError(error));
      }
    });
  }
}
