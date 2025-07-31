import { File, ReviewComment } from "../../types";

export interface AiProvider {
  performCodeReview(files: File[]): Promise<ReviewComment[]>;
  generateReviewSummary(comments: ReviewComment[]): Promise<{ summary: string; shortSummary: string }>;
  generateReviewTitle(files: File[]): Promise<string>;
  generatePrObjective(files: File[]): Promise<string>;
  generateWalkThrough(files: File[]): Promise<string>;
}
