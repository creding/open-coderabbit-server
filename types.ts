// This file serves as the single source of truth for types shared between the server and the extension.

export const serverEvent = {
  REVIEW_COMPLETED: 'review_completed',
  REVIEW_COMMENT: 'review_comment',
  STATE_UPDATE: 'state_update',
  ERROR: 'error',
  RATE_LIMIT_EXCEEDED: 'rate_limit_exceeded',
  REVIEW_STATUS: 'review_status',
  SUMMARY_COMMENT: 'summary_comment',
  SHORT_SUMMARY: 'short_summary',
  THINKING_UPDATE: 'thinking_update',
  WALK_THROUGH: 'walk_through',
  PR_OBJECTIVE: 'pr_objective',
  PR_TITLE: 'pr_title',
  ADDITIONAL_DETAILS: 'additional_details',
} as const;

export type ServerEvent = typeof serverEvent[keyof typeof serverEvent];

export const reviewStatus = {
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  FAILED: 'failed',
  IN_PROGRESS: 'in_progress',
  PENDING: 'pending',
} as const;

export type ReviewStatus = typeof reviewStatus[keyof typeof reviewStatus];

export const issueType = {
  POTENTIAL_ISSUE: 'potential_issue',
  REFACTOR_SUGGESTION: 'refactor_suggestion',
  NITPICK: 'nitpick',
  VERIFICATION: 'verification',
  OTHER: 'other',
} as const;

export type IssueType = typeof issueType[keyof typeof issueType];

export interface ReviewComment {
  filename: string;
  startLine: number;
  endLine: number;
  comment: string;
  type: IssueType;
  suggestions?: string[];
  suggestionDiff?: string;
  codegenInstructions?: string;
}

export interface AdditionalDetailsPayload {
  counts: Record<string, number>;
  assertiveComments: ReviewComment[];
  additionalComments: ReviewComment[];
  outsideDiffRangeComments: ReviewComment[];
}
