# tRPC Events Specification for CodeRabbit Extension

This document provides a comprehensive overview of all tRPC events used in the CodeRabbit VSCode extension, their payloads, handlers, and current implementation status.

## Table of Contents

- [WebSocket Subscription Events](#websocket-subscription-events)
- [HTTP tRPC Client Methods](#http-trpc-client-methods)
- [Telemetry Events](#telemetry-events)
- [Event Support Status](#event-support-status)

## WebSocket Subscription Events

The extension uses a single WebSocket subscription to receive real-time events from the server:

### Primary Subscription

- **Method**: `wsClient.vsCode.subscribeToEvents.subscribe()`
- **Purpose**: Main event subscription for real-time communication
- **Client ID**: Uses `vscode.env.machineId` for unique client identification
- **Status**: ✅ **FULLY SUPPORTED**

#### Subscription Configuration

```typescript
{
  clientId: vscode.env.machineId,
  onData: (data) => { /* Handle incoming events */ },
  onError: (error) => { /* Handle subscription errors */ },
  onComplete: () => { /* Handle subscription completion */ },
  onStopped: () => { /* Handle subscription stop */ }
}
```

## Server Events (Received via WebSocket Subscription)

### 1. review_completed

- **Type**: `serverEvent.review_completed`
- **Handler**: `reviewCompletedHandler()`
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Triggered when a code review process is completed
- **Payload**:
  ```typescript
  {
    type: "review_completed",
    reviewId: string,
    // Handler adds:
    endedAt: Date
  }
  ```

### 2. review_comment

- **Type**: `serverEvent.review_comment`
- **Handler**: `reviewCommentHandler()`
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Handles individual review comments as they are generated during streaming
- **Payload**:
  ```typescript
  {
    type: "review_comment",
    reviewId: string,
    payload: ReviewComment // Comment data structure
  }
  ```

### 3. state_update

- **Type**: `serverEvent.state_update`
- **Handler**: `stateUpdateHandler()`
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Updates review state and progress information
- **Payload**:
  ```typescript
  {
    type: "state_update",
    reviewId: string,
    payload: ReviewData // Review state data
  }
  ```

### 4. pr_title

- **Type**: `serverEvent.pr_title`
- **Handler**: `stateUpdateHandler()`
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Updates the pull request title during review
- **Payload**:
  ```typescript
  {
    type: "pr_title",
    reviewId: string,
    payload: string // The PR title
  }
  ```

### 5. review_status

- **Type**: `serverEvent.review_status`
- **Handler**: `stateUpdateHandler()` + special handling for "review_skipped"
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Updates review status, handles cancellation scenarios
- **Payload**:
  ```typescript
  {
    type: "review_status",
    reviewId: string,
    payload: {
      reviewStatus: string, // e.g., "review_skipped"
      reason?: string // Cancellation reason if applicable
    }
  }
  ```

### 6. rate_limit_exceeded

- **Type**: `serverEvent.rate_limit_exceeded`
- **Handler**: `handleRateLimitExceeded()`
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Handles API rate limit exceeded scenarios
- **Payload**:
  ```typescript
  {
    type: "rate_limit_exceeded",
    reviewId: string,
    payload: RateLimitDetails // Rate limit information
  }
  ```

### 7. additional_details

- **Type**: `serverEvent.additional_details`
- **Handler**: `stateUpdateHandler()`
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Provides additional review details and comment categorization
- **Payload**:
  ```typescript
  {
    type: "additional_details",
    reviewId: string,
    payload: {
      counts: CommentCounts,
      assertiveComments: ReviewComment[],
      additionalComments: ReviewComment[],
      outsideDiffRangeComments: ReviewComment[],
      duplicateComments: ReviewComment[]
    }
  }
  ```

### 8. product_settings

- **Type**: `serverEvent.product_settings`
- **Handler**: `stateUpdateHandler()`
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Updates product settings (e.g., paid user status)
- **Payload**:
  ```typescript
  {
    type: "product_settings",
    reviewId: string,
    payload: {
      isPaidUser: boolean
    }
  }
  ```

## Server Events (Defined but Not Currently Handled)

The following events are defined in `serverEvent` but do not have active handlers in the current subscription:

### 9. summary_comment

- **Type**: `serverEvent.summary_comment`
- **Status**: ❌ **NOT IMPLEMENTED**
- **Purpose**: Likely for summary comments during review
- **Handler**: None

### 10. pr_objective

- **Type**: `serverEvent.pr_objective`
- **Status**: ❌ **NOT IMPLEMENTED**
- **Purpose**: Likely for PR objective/description updates
- **Handler**: None

### 11. walk_through

- **Type**: `serverEvent.walk_through`
- **Status**: ❌ **NOT IMPLEMENTED**
- **Purpose**: Likely for code walkthrough functionality
- **Handler**: None

### 12. short_summary

- **Type**: `serverEvent.short_summary`
- **Status**: ❌ **NOT IMPLEMENTED**
- **Purpose**: Likely for short summary generation
- **Handler**: None

### 13. review_comment_reply

- **Type**: `serverEvent.review_comment_reply`
- **Status**: ❌ **NOT IMPLEMENTED**
- **Purpose**: Likely for handling replies to review comments
- **Handler**: None

### 14. shell_command

- **Type**: `serverEvent.shell_command`
- **Status**: ❌ **NOT IMPLEMENTED**
- **Purpose**: Likely for executing shell commands
- **Handler**: None

### 15. thinking_update

- **Type**: `serverEvent.thinking_update`
- **Status**: ❌ **NOT IMPLEMENTED**
- **Purpose**: Likely for AI thinking process updates
- **Handler**: None

### 16. error

- **Type**: `serverEvent.error`
- **Status**: ❌ **NOT IMPLEMENTED**
- **Purpose**: Likely for error event handling
- **Handler**: None

## HTTP tRPC Client Methods

These are standard HTTP-based tRPC calls used for various operations:

### Authentication & Access Management

#### 1. getAccessAndRefreshToken

- **Method**: `trpcClient.accessToken.getAccessAndRefreshToken.query()`
- **Type**: Query
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Retrieves access and refresh tokens for authentication
- **Parameters**: Authentication credentials

#### 2. refreshToken

- **Method**: `tempClient.accessToken.refreshToken.query()`
- **Type**: Query
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Refreshes expired access tokens
- **Parameters**: Refresh token data

### Organization Management

#### 3. getAllOrgs

- **Method**: `trpcClient.organizations.getAllOrgs.query()`
- **Type**: Query
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Fetches all organizations for the authenticated user
- **Returns**: `{ data: Organization[] }`

### Analytics & Tracking

#### 4. identifyUser

- **Method**: `trpcClient.analytics.identifyUser.mutate()`
- **Type**: Mutation
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Identifies user for analytics tracking
- **Parameters**: User identification data

#### 5. trackEvent

- **Method**: `trpcClient.analytics.trackEvent.mutate()`
- **Type**: Mutation
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Tracks user events for analytics
- **Parameters**: Event data and metadata

### Feedback Management

#### 6. submitFeedback

- **Method**: `trpcClient.feedback.submitFeedback.mutate()`
- **Type**: Mutation
- **Status**: ✅ **FULLY SUPPORTED**
- **Purpose**: Submits user feedback to the system
- **Parameters**: Feedback content and metadata

## Telemetry Events

The extension defines various telemetry events for tracking user interactions:

### Review Events

- **CODE_REVIEW_COMPLETED**: `"code_review_completed"`
- **CODE_REVIEW_STARTED**: `"code_review_started"`
- **Status**: ✅ **FULLY SUPPORTED**

### Extension Events

- **CODE_REVIEW_TRIGGERED**: `"code_review_triggered"`
- **CODE_REVIEW_STOP_CLICKED**: `"code_review_stop_clicked"`
- **EXTENSION_UNINSTALLED**: `"extension_uninstalled"`
- **EXTENSION_INSTALLED**: `"extension_installed"`
- **CODE_REVIEW_SUGGESTION_APPLIED**: `"code_review_suggestion_applied"`
- **AGENT_HANDOFF**: `"agent_handoff"`
- **EXTENSION_LOGIN_FAILED**: `"extension_login_failed"`
- **IDE_EXTENSION_INSTALL**: `"ide_extension_install"`
- **IDE_EXTENSION_UNINSTALL**: `"ide_extension_uninstall"`
- **Status**: ✅ **FULLY SUPPORTED**

### Auth Events

- **USER_LOGGED_IN**: `"user_logged_in"`
- **EMAIL_LOGIN_LINK_SENT**: `"email_login_link_sent"`
- **SIGN_UP_COMPLETED**: `"sign_up_completed"`
- **Status**: ✅ **FULLY SUPPORTED**

## Event Support Status Summary

### ✅ Fully Supported (14 events)

1. WebSocket subscription (`subscribeToEvents`)
2. `review_completed`
3. `review_comment`
4. `state_update`
5. `pr_title`
6. `review_status`
7. `rate_limit_exceeded`
8. `additional_details`
9. `product_settings`
10. HTTP tRPC methods (6 methods)
11. All telemetry events (11 events)

### ❌ Not Yet Implemented (8 events)

1. `summary_comment`
2. `pr_objective`
3. `walk_through`
4. `short_summary`
5. `review_comment_reply`
6. `shell_command`
7. `thinking_update`
8. `error`

## Implementation Notes

### Error Handling

- All subscription events include comprehensive error handling
- Failed event processing logs errors but doesn't break the subscription
- Subscription includes `onError`, `onComplete`, and `onStopped` handlers

### Event Processing

- Events are processed asynchronously to avoid blocking the subscription
- Each event type has dedicated handler functions
- State updates are batched and optimized for UI performance

### Future Considerations

- The 8 unimplemented server events suggest planned features
- Consider implementing error event handling for better debugging
- Shell command execution would require security considerations
- Comment reply functionality would enhance user interaction

## Related Files

- **Extension Source**: `/extension/extension.js` (compiled)
- **Server Router**: `/src/router.ts`
- **Event Types**: `/src/typings/reviewState.ts`
- **Telemetry**: `/packages/telemetry/dist/events.js`
