import { AiProvider } from "./types";
import { File, ReviewComment } from "../../types";

export class OpenAiProvider implements AiProvider {
  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured. Please set the OPENAI_API_KEY environment variable.");
    }
    // Initialization for OpenAI would go here
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
