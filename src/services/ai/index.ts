import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject, streamObject, LanguageModel } from 'ai';
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
  codeReviewSystemPrompt,
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

  private async callObject<TSchema extends z.ZodTypeAny>(
    schema: TSchema,
    prompt: string,
    system?: string,
    errorMessagePrefix?: string
  ): Promise<z.infer<TSchema>> {
    const result = await this.withRetry(
      async () =>
        generateObject({
          model: this.model,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          schema: schema as any,
          ...(system ? { system } : {}),
          prompt,
        }) as unknown,
      errorMessagePrefix ?? 'AI request failed'
    );
    const { object } = result as { object: z.infer<TSchema> };
    return object;
  }

  async generateReviewTitle(files: File[]): Promise<string> {
    const prompt = generateReviewTitlePrompt(files);
    const obj = await this.callObject(
      reviewTitleSchema,
      prompt,
      undefined,
      'Failed to generate review title'
    );
    return obj.title;
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
    const obj = await this.callObject(
      reviewSummarySchema,
      prompt,
      undefined,
      'Failed to generate review summary'
    );
    return obj;
  }

  async generatePrObjective(files: File[]): Promise<string> {
    const prompt = generatePrObjectivePrompt(files);
    const obj = await this.callObject(
      prObjectiveSchema,
      prompt,
      undefined,
      'Failed to generate PR objective'
    );
    return obj.objective;
  }

  async generateWalkThrough(files: File[]): Promise<string> {
    const prompt = generateWalkThroughPrompt(files);
    const obj = await this.callObject(
      walkThroughSchema,
      prompt,
      undefined,
      'Failed to generate walkthrough'
    );
    return obj.walkThrough;
  }

  async performCodeReview(files: File[]): Promise<ReviewComment[]> {
    const userPrompt = performCodeReviewPrompt(files);
    const result = (await this.callObject(
      z.array(reviewCommentSchema),
      userPrompt,
      codeReviewSystemPrompt,
      'Failed to perform code review'
    )) as unknown;

    // Backward-compat handling: some callers/tests may wrap comments in { comments: [...] }
    if (Array.isArray(result)) {
      return result as ReviewComment[];
    }
    if (
      result &&
      typeof result === 'object' &&
      Array.isArray((result as { comments?: unknown }).comments)
    ) {
      return (result as { comments: ReviewComment[] }).comments;
    }
    // Fallback to empty array if shape is unexpected
    return [];
  }

  async *streamCodeReview(
    files: File[]
  ): AsyncGenerator<ReviewComment, void, unknown> {
    const userPrompt = performCodeReviewPrompt(files);

    try {
      const { elementStream } = streamObject({
        model: this.model,
        output: 'array',
        schema: reviewCommentSchema,
        system: codeReviewSystemPrompt,
        prompt: userPrompt,
      });

      for await (const comment of elementStream) {
        yield comment;
      }
    } catch (error) {
      throw new RetryableError(
        `Failed to stream code review: ${
          error instanceof Error ? error.message : String(error)
        }`,
        isRetryableAIError(error)
      );
    }
  }
}

const aiProvider = new UnifiedAiProvider();

export function getAiProvider(): AiProvider {
  return aiProvider;
}
