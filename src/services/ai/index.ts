import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, LanguageModel } from 'ai';
import { z } from 'zod';
import { env } from '../../constants';
import { ReviewComment, File } from '../../types';
import {
  retryWithBackoff,
  isRetryableAIError,
  RetryableError,
} from '../../utils/retry';
import { AiProvider } from './types';
import {
  generateReviewTitlePrompt,
  generateReviewSummaryPrompt,
  generatePrObjectivePrompt,
  generateWalkThroughPrompt,
  performCodeReviewPrompt,
} from './prompts';
import {
  prObjectiveSchema,
  reviewCommentSchema,
  reviewSummarySchema,
  reviewTitleSchema,
  walkThroughSchema,
} from './schemas';

class UnifiedAiProvider implements AiProvider {
  private model: LanguageModel;

  constructor() {
    switch (env.AI_PROVIDER) {
      case 'google':
        const google = createGoogleGenerativeAI({
          apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
        });
        this.model = google(env.GOOGLE_AI_MODEL);
        break;
      case 'openai':
        const openai = createOpenAI({
          apiKey: env.OPENAI_API_KEY,
        });
        this.model = openai(env.OPENAI_AI_MODEL);
        break;
      // Add other providers like openrouter here
      default:
        throw new Error(`Unknown AI provider: ${env.AI_PROVIDER}`);
    }
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    errorMessagePrefix: string
  ): Promise<T> {
    return await retryWithBackoff(async () => {
      try {
        return await fn();
      } catch (error) {
        throw new RetryableError(
          `${errorMessagePrefix}: ${
            error instanceof Error ? error.message : String(error)
          }`,
          isRetryableAIError(error)
        );
      }
    });
  }

  async generateReviewTitle(files: File[]): Promise<string> {
    const prompt = generateReviewTitlePrompt(files);
    const { object } = await this.withRetry(
      async () =>
        generateObject({
          model: this.model,
          schema: reviewTitleSchema,
          prompt: prompt,
        }),
      'Failed to generate review title'
    );
    return object.title;
  }

  async generateReviewSummary(
    comments: ReviewComment[]
  ): Promise<{ summary: string; shortSummary: string }> {
    if (comments.length === 0) {
      return {
        summary: '✅ Great work! No issues were found in the code.',
        shortSummary: 'No issues found.',
      };
    }

    const prompt = generateReviewSummaryPrompt(comments);
    const { object } = await this.withRetry(
      async () =>
        generateObject({
          model: this.model,
          schema: reviewSummarySchema,
          prompt: prompt,
        }),
      'Failed to generate review summary'
    );
    return object;
  }

  async generatePrObjective(files: File[]): Promise<string> {
    const prompt = generatePrObjectivePrompt(files);
    const { object } = await this.withRetry(
      async () =>
        generateObject({
          model: this.model,
          schema: prObjectiveSchema,
          prompt: prompt,
        }),
      'Failed to generate PR objective'
    );
    return object.objective;
  }

  async generateWalkThrough(files: File[]): Promise<string> {
    const prompt = generateWalkThroughPrompt(files);
    const { object } = await this.withRetry(
      async () =>
        generateObject({
          model: this.model,
          schema: walkThroughSchema,
          prompt: prompt,
        }),
      'Failed to generate walkthrough'
    );
    return object.walkThrough;
  }

  async performCodeReview(files: File[]): Promise<ReviewComment[]> {
    const prompt = performCodeReviewPrompt(files);
    const { object } = await this.withRetry(
      async () =>
        generateObject({
          model: this.model,
          schema: z.object({
            comments: z.array(reviewCommentSchema),
          }),
          prompt: prompt,
        }),
      'Failed to perform code review'
    );
    return object.comments;
  }
}

const aiProvider = new UnifiedAiProvider();

export function getAiProvider(): AiProvider {
  return aiProvider;
}
