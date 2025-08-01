import { z } from 'zod';

// 1. Zod Schemas
export const fileSchema = z.object({
  filename: z.string(),
  diff: z.string(),
  newFile: z.boolean(),
  renamedFile: z.boolean(),
  deletedFile: z.boolean(),
  fileContent: z.string(),
});

export const extensionEventSchema = z.object({
  userId: z.string(),
  userName: z.string(),
  email: z.string(),
  clientId: z.string(),
  eventType: z.string(),
  reviewId: z.string(),
  files: z.array(fileSchema).optional(),
  hostUrl: z.string(),
  provider: z.string(),
  providerUserId: z.string(),
  remoteUrl: z.string().optional(),
  host: z.string(),
  version: z.string(),
  headCommitId: z.string().optional(),
  baseCommitId: z.string().optional(),
  allFiles: z.array(fileSchema).optional(),
});

export type File = z.infer<typeof fileSchema>;
export type ExtensionEvent = z.infer<typeof extensionEventSchema>;

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
  isNitpick: z.boolean().optional(),
});

export type ReviewComment = z.infer<typeof reviewCommentSchema>;

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
export type ProductSettingsPayload = { isPaidUser: boolean };

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
  | ProductSettingsPayload
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  | {};

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
  PRODUCT_SETTINGS: 'product_settings',
  ERROR: 'error',
} as const;

export type ServerEvent = (typeof serverEvent)[keyof typeof serverEvent];

export const reviewStatus = {
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type ReviewStatus = (typeof reviewStatus)[keyof typeof reviewStatus];

export const additionalDetailsPayloadSchema = z.object({
  counts: z.record(z.string(), z.number()),
  assertiveComments: z.record(z.string(), z.array(reviewCommentSchema)),
  additionalComments: z.record(z.string(), z.array(reviewCommentSchema)),
  outsideDiffRangeComments: z.array(reviewCommentSchema),
  duplicateComments: z
    .record(z.string(), z.array(reviewCommentSchema))
    .optional(),
});

export type AdditionalDetailsPayload = z.infer<
  typeof additionalDetailsPayloadSchema
>;

export type ReviewEvent = {
  type: ServerEvent;
  payload: EventPayload;
  reviewId: string;
  clientId: string;
  endedAt?: string;
  error?: string;
};
