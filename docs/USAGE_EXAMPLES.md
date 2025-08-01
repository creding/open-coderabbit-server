# CodeRabbit Server Usage Examples

## Streaming Code Review Examples

### Basic Streaming Usage

The streaming functionality is automatically used by the ReviewService. Here's how it works internally:

```typescript
// Example of how the streaming is consumed in ReviewService
async function performStreamingReview(files: File[]) {
  const comments: ReviewComment[] = [];

  try {
    // Stream comments as they're generated
    for await (const comment of aiProvider.streamCodeReview(files)) {
      comments.push(comment);

      // Send immediately to extension
      await this.processAndSendComments([comment], files);

      console.log(`Streamed comment: ${comment.type} for ${comment.filename}`);
    }
  } catch (error) {
    console.log('Streaming failed, falling back to synchronous review');
    // Automatic fallback to synchronous method
    return await aiProvider.performCodeReview(files);
  }

  return comments;
}
```

### Custom AI Provider Implementation

If you're implementing a custom AI provider, here's how to add streaming support:

```typescript
import { streamObject } from 'ai';
import { z } from 'zod';
import { reviewCommentSchema } from '../schemas';

class CustomAiProvider implements AiProvider {
  async *streamCodeReview(
    files: File[]
  ): AsyncGenerator<ReviewComment, void, unknown> {
    try {
      const stream = await streamObject({
        model: this.model,
        prompt: this.buildPrompt(files),
        schema: z.array(reviewCommentSchema),
        output: 'array',
      });

      for await (const comment of stream.elementStream) {
        // Optional: Add custom processing here
        yield this.processComment(comment);
      }
    } catch (error) {
      console.error('Streaming failed:', error);
      throw error; // Will trigger fallback in ReviewService
    }
  }

  private processComment(comment: ReviewComment): ReviewComment {
    // Add any custom processing logic
    return {
      ...comment,
      timestamp: new Date().toISOString(),
    };
  }
}
```

## Enhanced Logging Examples

### Monitoring Extension Requests

The server now logs detailed information about all extension requests. Here's what you'll see:

```bash
# Subscription logging
[INFO] 📡 Extension subscription initiated {
  "clientId": "vscode-ext-12345",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "connectionInfo": {
    "userAgent": "VSCode/1.85.0",
    "origin": "vscode-webview://webview",
    "host": "localhost:5353"
  }
}

# Review request logging
[INFO] 🔍 Code review request received from extension {
  "clientId": "vscode-ext-12345",
  "filesCount": 3,
  "totalSize": 15420,
  "fileDetails": [
    {
      "filename": "src/components/Button.tsx",
      "contentLength": 1250,
      "diffLength": 180,
      "contentPreview": "import React from 'react';\nimport { ButtonProps } from './types';\n\nexport const Button: React.FC<ButtonProps> = ({\n  children,\n  variant = 'primary',\n  size = 'medium',\n  onClick,\n  disabled = false,\n  ...props\n}) => {\n  return (\n    <button...",
      "diffPreview": "@@ -1,10 +1,12 @@\n import React from 'react';\n import { ButtonProps } from './types';\n \n+// Enhanced button component with better accessibility\n export const Button: React.FC<ButtonProps> = ({\n   children,\n   variant = 'primary',\n   size = 'medium',\n   onClick,\n   disabled = false,\n+  'aria-label': ariaLabel,\n   ...props\n }) => {\n   return ("
    }
  ],
  "timestamp": "2024-01-15T10:30:15.000Z"
}
```

### Log Analysis Scripts

Here's a simple script to analyze the logs:

```bash
#!/bin/bash
# analyze-logs.sh

echo "=== Review Request Analysis ==="
grep "Code review request received" server.log | jq '.filesCount' | awk '{sum+=$1; count++} END {print "Average files per review:", sum/count}'

echo "=== Most Common File Types ==="
grep "Code review request received" server.log | jq -r '.fileDetails[].filename' | sed 's/.*\.//' | sort | uniq -c | sort -nr | head -10

echo "=== Review Timing Analysis ==="
grep -E "(Code review request received|Review completed)" server.log | tail -20
```

## Prompt Engineering Examples

### Understanding Comment Classification

The enhanced prompts now classify comments more accurately. Here are examples:

```typescript
// Examples of improved classification

// ❌ OLD: Would be classified as "refactor_suggestion"
// ✅ NEW: Correctly classified as "verification" or "other"
const tableFormattingComment = {
  type: 'verification', // or "other"
  comment:
    'Table alignment looks good and follows the established formatting pattern.',
};

// ❌ OLD: Would generate trivial formatting comments
// ✅ NEW: No comment generated for consistent formatting

// ✅ GOOD: Actual refactor suggestion
const refactorComment = {
  type: 'refactor_suggestion',
  comment:
    'Consider extracting this repeated validation logic into a reusable utility function to improve maintainability and reduce code duplication.',
  suggestions: ['const validateInput = (input) => { /* validation logic */ };'],
};

// ✅ GOOD: Potential issue identification
const bugComment = {
  type: 'potential_issue',
  comment:
    'This could cause a null pointer exception if user.profile is undefined. Consider adding a null check.',
  suggestions: ["const name = user.profile?.name || 'Unknown';"],
};
```

### Custom Prompt Templates

If you need to customize the prompts, here's how to extend them:

```typescript
// Custom prompt extension
export const customCodeReviewPrompt = (
  files: File[],
  options: CustomOptions
): string => {
  const basePrompt = performCodeReviewPrompt(files);

  const customInstructions = `
    ADDITIONAL CUSTOM RULES:
    - Focus on ${options.focusArea} (e.g., "security", "performance", "accessibility")
    - Use company-specific coding standards from: ${options.standardsUrl}
    - Consider the project context: ${options.projectContext}
  `;

  return basePrompt + customInstructions;
};
```

## Testing Examples

### Manual Testing Script

```javascript
// test-improvements.js
const WebSocket = require('ws');

async function testStreamingReview() {
  const ws = new WebSocket('ws://localhost:5353');

  ws.on('open', () => {
    console.log('Connected to server');

    // Send review request
    ws.send(
      JSON.stringify({
        type: 'review',
        clientId: 'test-client-123',
        files: [
          {
            filename: 'test.js',
            fileContent: 'const x = 1;\nconst y = 2;\nconsole.log(x + y);',
            diff: '+const x = 1;\n+const y = 2;\n+console.log(x + y);',
          },
        ],
      })
    );
  });

  ws.on('message', (data) => {
    const message = JSON.parse(data.toString());
    console.log('Received:', message.type, message.data);

    if (message.type === 'comment') {
      console.log('✅ Streaming comment received:', message.data.comment);
    }
  });
}

testStreamingReview();
```

### Integration Test Example

```typescript
// integration.test.ts
import { ReviewService } from '../src/services/reviewService';
import { UnifiedAiProvider } from '../src/services/ai';

describe('Streaming Integration', () => {
  it('should stream comments and fallback gracefully', async () => {
    const aiProvider = new UnifiedAiProvider();
    const reviewService = new ReviewService(aiProvider);

    const files = [
      {
        filename: 'test.ts',
        fileContent: 'function test() { return "hello"; }',
        diff: '+function test() { return "hello"; }',
      },
    ];

    const comments = [];

    // Mock event emission to capture streamed comments
    reviewService.on('comment', (comment) => {
      comments.push(comment);
    });

    await reviewService.run('test-client', files);

    expect(comments.length).toBeGreaterThan(0);
    expect(comments[0]).toHaveProperty('type');
    expect(comments[0]).toHaveProperty('comment');
  });
});
```

## Performance Monitoring

### Metrics Collection

```typescript
// metrics.ts
export class ReviewMetrics {
  private static streamingSuccessRate = 0;
  private static averageCommentLatency = 0;

  static recordStreamingAttempt(success: boolean, latency: number) {
    // Update success rate
    this.streamingSuccessRate =
      (this.streamingSuccessRate + (success ? 1 : 0)) / 2;

    // Update average latency
    this.averageCommentLatency = (this.averageCommentLatency + latency) / 2;

    console.log(
      `Streaming metrics: ${this.streamingSuccessRate * 100}% success, ${this.averageCommentLatency}ms avg latency`
    );
  }
}
```

### Health Check Enhancement

```typescript
// Enhanced health check with streaming status
app.get('/health', (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    features: {
      streaming: true,
      enhancedLogging: true,
      improvedPrompts: true,
    },
    metrics: {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      streamingSuccessRate: ReviewMetrics.getStreamingSuccessRate(),
    },
  };

  res.json(health);
});
```

## Troubleshooting Examples

### Common Issues and Solutions

```typescript
// Debug streaming issues
if (process.env.NODE_ENV === 'development') {
  aiProvider.on('streamingError', (error) => {
    console.error('Streaming debug info:', {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      fallbackTriggered: true,
    });
  });
}

// Monitor prompt classification accuracy
const classificationDebug = (comments: ReviewComment[]) => {
  const typeDistribution = comments.reduce(
    (acc, comment) => {
      acc[comment.type] = (acc[comment.type] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  console.log('Comment type distribution:', typeDistribution);

  // Flag potential misclassifications
  const suspiciousPatterns = comments.filter(
    (comment) =>
      comment.type === 'refactor_suggestion' &&
      comment.comment.toLowerCase().includes('formatting')
  );

  if (suspiciousPatterns.length > 0) {
    console.warn(
      'Potential misclassified formatting comments:',
      suspiciousPatterns
    );
  }
};
```

These examples demonstrate how to effectively use and extend the improved CodeRabbit server functionality. The streaming capabilities, enhanced logging, and improved prompts work together to provide a more responsive and accurate code review experience.
