# CodeRabbit Extension Communication Specification

This document outlines exactly what the VSCode extension sends to the CodeRabbit server during code review requests.

## Overview

The extension communicates with the server via tRPC (TypeScript RPC) over WebSocket connections. All communication follows a structured schema with comprehensive logging for debugging and monitoring.

## Communication Endpoints

### 1. Subscription Endpoint: `subscribeToEvents`

**Purpose**: Establishes a persistent WebSocket connection for receiving real-time review events.

**Request Structure**:

```typescript
{
  clientId: string; // Unique identifier for the extension instance
}
```

**Example**:

```json
{
  "clientId": "ac0028a301a86e86a6b7edb9745dd6b42fb9548c064de0c910720f8552c011cf"
}
```

### 2. Review Request Endpoint: `requestFullReview`

**Purpose**: Initiates a code review by sending file contents and diffs to the server.

**Request Structure**:

```typescript
{
  extensionEvent: {
    reviewId: string,     // Unique identifier for this review
    clientId: string,     // Extension instance identifier
    files: File[]         // Array of files to review
  }
}
```

**File Structure**:

```typescript
interface File {
  filename: string; // Relative path to the file
  fileContent: string; // Complete file content
  diff: string; // Git diff in unified format
}
```

### 3. Stop Review Endpoint: `stopReview`

**Purpose**: Cancels an ongoing review process.

**Request Structure**:

```typescript
{
  extensionEvent: {
    reviewId: string; // ID of the review to stop
  }
}
```

## Real-World Example

Based on actual server logs, here's what the extension sent in a recent request:

### Request Metadata

- **Review ID**: `6a5899c8-4e38-4e07-93ef-a058aaafb7a1`
- **Client ID**: `ac0028a301a86e86a6b7edb9745dd6b42fb9548c064de0c910720f8552c011cf`
- **Timestamp**: `2025-08-01T19:32:27.792Z`
- **Total Files**: 5
- **Total Content Size**: 20,737 characters

### Files Sent

#### File 1: README.md

```json
{
  "filename": "README.md",
  "contentLength": 12394,
  "diffLength": 10333,
  "hasContent": true,
  "hasDiff": true,
  "contentPreview": "# Open CodeRabbit Server\n\nA powerful TypeScript backend server that provides AI-powered code review services for VSCode extensions. CodeRabbit analyzes code changes, generates intelligent comments, an...",
  "diffPreview": "diff --git a/aaaeb51e81c108a09ca9505d58a5d8643388cc47 b/477deac46346775824dfd1c3b3ff166a384025aa\nindex aaaeb51..477deac 100644\n--- a/aaaeb51e81c108a09ca9505d58a5d8643388cc47\n+++ b/477deac46346775824df..."
}
```

#### File 2: docker-compose.dev.yml

```json
{
  "filename": "docker-compose.dev.yml",
  "contentLength": 778,
  "diffLength": 1002,
  "hasContent": true,
  "hasDiff": true,
  "contentPreview": "version: '3.8'\n\nservices:\n  server:\n    build:\n      context: .\n      target: builder # Use the builder stage for development\n    ports:\n      - '5353:5353'\n    env_file:\n      - .env\n    volumes:\n   ...",
  "diffPreview": "diff --git a/80a877daf30fd07c5508931156efedf7fb7ed4fd b/60202aebcfb803db9c24c3973e82587fde830ba8\nindex 80a877d..60202ae 100644\n--- a/80a877daf30fd07c5508931156efedf7fb7ed4fd\n+++ b/60202aebcfb803db9c24..."
}
```

#### File 3: docker-compose.yml

```json
{
  "filename": "docker-compose.yml",
  "contentLength": 464,
  "diffLength": 870,
  "hasContent": true,
  "hasDiff": true,
  "contentPreview": "version: '3.8'\n\nservices:\n  server:\n    build: .\n    ports:\n      - '5353:5353'\n    env_file:\n      - .env\n    environment:\n      - NODE_ENV=production\n      - HOST=0.0.0.0\n    restart: unless-stopped...",
  "diffPreview": "diff --git a/98186964a10969a77413ab6acd2af678bb5db535 b/8871912ff8743544ccd95b70258d62ecae33f668\nindex 9818696..8871912 100644\n--- a/98186964a10969a77413ab6acd2af678bb5db535\n+++ b/8871912ff8743544ccd9..."
}
```

#### File 4: src/router.ts

```json
{
  "filename": "src/router.ts",
  "contentLength": 7020,
  "diffLength": 3984,
  "hasContent": true,
  "hasDiff": true,
  "contentPreview": "import { initTRPC, TRPCError } from '@trpc/server';\nimport { z } from 'zod';\nimport { observable } from '@trpc/server/observable';\nimport { EventEmitter } from 'events';\nimport { ReviewService } from ...",
  "diffPreview": "diff --git a/f387919ee0eb3ec8e75862a19935f7e78c885a77 b/221f8cd7b9049fd1125b0afbded793d82a0476a5\nindex f387919..221f8cd 100644\n--- a/f387919ee0eb3ec8e75862a19935f7e78c885a77\n+++ b/221f8cd7b9049fd1125b..."
}
```

#### File 5: vitest.config.js

```json
{
  "filename": "vitest.config.js",
  "contentLength": 81,
  "diffLength": 344,
  "hasContent": true,
  "hasDiff": true,
  "contentPreview": "module.exports = {\n  test: {\n    globals: true,\n    environment: 'node',\n  },\n};\n",
  "diffPreview": "diff --git a/7af122e68d0d008843ad717a7a4cd86fd8b0c8df b/c83dd0a0543b63e85e77f5ae5279030a9fdc79da\nindex 7af122e..c83dd0a 100644\n--- a/7af122e68d0d008843ad717a7a4cd86fd8b0c8df\n+++ b/c83dd0a0543b63e85e77..."
}
```

## Data Characteristics

### File Content

- **Complete file content**: Extension sends the entire file content, not just changed lines
- **UTF-8 encoded**: All content is sent as UTF-8 strings
- **Preserved formatting**: Line breaks, indentation, and whitespace are maintained

### Git Diffs

- **Unified diff format**: Standard Git diff format with headers
- **Complete context**: Includes file hashes, line numbers, and context lines
- **Change indicators**: Uses `+` for additions, `-` for deletions, ` ` for context

### Identifiers

- **Review ID**: UUID v4 format (e.g., `6a5899c8-4e38-4e07-93ef-a058aaafb7a1`)
- **Client ID**: SHA-256 hash format for unique extension identification
- **Filenames**: Relative paths from repository root

## Server Response Flow

1. **Immediate Response**: Server acknowledges request with rate limit info
2. **Event Stream**: Server sends real-time events via WebSocket:
   - `REVIEW_STATUS`: Status updates (summarizing, reviewing)
   - `THINKING_UPDATE`: Progress messages
   - `PR_TITLE`: Generated review title
   - `PR_OBJECTIVE`: Generated objective
   - `WALK_THROUGH`: Generated walkthrough
   - `REVIEW_COMMENT`: Individual code comments (streamed)
   - `ADDITIONAL_DETAILS`: Categorized comments
   - `REVIEW_SUMMARY`: Final summary
   - `REVIEW_COMPLETED`: Review completion

## Error Handling

### Rate Limiting

- **Limit**: Configurable requests per time window
- **Response**: `TOO_MANY_REQUESTS` with retry information

### File Validation

- **Size limits**: Maximum file size and total request size
- **File type validation**: Supported file extensions
- **Content validation**: UTF-8 encoding requirements

### AI Provider Errors

- **Retry logic**: Automatic retries with exponential backoff
- **Fallback**: Graceful degradation for streaming failures

## Security Considerations

- **Client identification**: Unique client IDs prevent cross-client data leakage
- **Content sanitization**: File content is validated before processing
- **Rate limiting**: Prevents abuse and resource exhaustion
- **SSL/TLS**: All communication encrypted in production

## Monitoring and Debugging

The server logs comprehensive information for each request:

- Complete request payload (with size limits for large content)
- File-by-file breakdown with metadata
- Processing timestamps and durations
- Error details and retry attempts
- Client connection lifecycle events

This logging enables full traceability of extension-server communication for debugging and performance optimization.
