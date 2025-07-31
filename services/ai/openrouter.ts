import { AiProvider } from "./types";
import { File, ReviewComment } from "../../types";

export class OpenRouterProvider implements AiProvider {
  constructor() {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("OpenRouter API key is not configured. Please set the OPENROUTER_API_KEY environment variable.");
    }
    // Initialization for OpenRouter would go here
  }

  async performCodeReview(files: File[]): Promise<ReviewComment[]> {
    throw new Error("Method not implemented.");
  }

  async generateReviewSummary(comments: ReviewComment[]): Promise<{ summary: string; shortSummary: string }> {
    throw new Error("Method not implemented.");
  }

  async generateReviewTitle(files: File[]): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async generatePrObjective(files: File[]): Promise<string> {
    throw new Error("Method not implemented.");
  }

  async generateWalkThrough(files: File[]): Promise<string> {
    throw new Error("Method not implemented.");
  }
}
