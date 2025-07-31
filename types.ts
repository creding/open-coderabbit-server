import { z } from 'zod';

// This file serves as the single source of truth for types shared between the server and the extension.

export const issueType = {
  POTENTIAL_ISSUE: 'potential_issue',
  REFACTOR_SUGGESTION: 'refactor_suggestion',
  NITPICK: 'nitpick',
  VERIFICATION: 'verification',
  OTHER: 'other',
} as const;

export const reviewCommentSchema = z.object({
  filename: z.string(),
  startLine: z.number(),
  endLine: z.number(),
  comment: z.string(),
  type: z.nativeEnum(issueType),
  suggestions: z.array(z.string()).optional(),
  codegenInstructions: z.string().optional(),
});

export type ReviewComment = z.infer<typeof reviewCommentSchema>;

export const fileSchema = z.object({
  filename: z.string(),
  diff: z.string(),
  newFile: z.boolean(),
  renamedFile: z.boolean(),
  deletedFile: z.boolean(),
  fileContent: z.string(),
});

export type File = z.infer<typeof fileSchema>;

// 4. Strongly-typed Payloads
export type ReviewStatusUpdatePayload = { reviewStatus: string };
export type ThinkingUpdatePayload = { message: string };
export type PrTitlePayload = string;
export type PrObjectivePayload = string;
export type WalkThroughPayload = string;
export type ShortSummaryPayload = { summary: string };
export type SummaryCommentPayload = { summary: string };
export type StateUpdatePayload = { status: ReviewStatus };
export type ErrorPayload = { message: string };
export type RateLimitExceededPayload = { message: string };
export type ReviewCompletedPayload = { status?: ReviewStatus };

export type EventPayload =
  | ReviewStatusUpdatePayload
  | ThinkingUpdatePayload
  | PrTitlePayload
  | PrObjectivePayload
  | WalkThroughPayload
  | ReviewComment
  | AdditionalDetailsPayload
  | ShortSummaryPayload
  | SummaryCommentPayload
  | StateUpdatePayload
  | ErrorPayload
  | RateLimitExceededPayload
  | ReviewCompletedPayload
  | {}; // For empty payloads


export const serverEvent = {
  REVIEW_COMPLETED: 'review_completed',
  SHORT_SUMMARY: 'short_summary',
  SUMMARY_COMMENT: 'summary_comment',
  PR_TITLE: 'pr_title',
  PR_OBJECTIVE: 'pr_objective',
  WALK_THROUGH: 'walk_through',
  REVIEW_COMMENT: 'review_comment',
  ADDITIONAL_DETAILS: 'additional_details',
  THINKING_UPDATE: 'thinking_update',
  REVIEW_STATUS: 'review_status',
  STATE_UPDATE: 'state_update',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  ERROR: 'error',
} as const;

export type ServerEvent = typeof serverEvent[keyof typeof serverEvent];

export const reviewStatus = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type ReviewStatus = typeof reviewStatus[keyof typeof reviewStatus];


export interface AdditionalDetailsPayload {
  counts: Record<string, number>;
  assertiveComments: ReviewComment[];
  additionalComments: ReviewComment[];
  outsideDiffRangeComments: ReviewComment[];
}
