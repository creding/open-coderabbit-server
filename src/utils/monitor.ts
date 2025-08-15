import { logger } from './logger';

export interface Metrics {
  requests: {
    total: number;
    successful: number;
    failed: number;
    rateLimited: number;
  };
  reviews: {
    total: number;
    completed: number;
    failed: number;
    inProgress: number;
    averageDuration: number;
    averageFileCount: number;
    averageCommentCount: number;
  };
  ai: {
    requests: number;
    successful: number;
    failed: number;
    averageDuration: number;
    retries: number;
  };
  connections: {
    active: number;
    total: number;
  };
  system: {
    uptime: number;
    memoryUsage: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  };
}

export interface ReviewMetrics {
  reviewId: string;
  clientId: string;
  startTime: number;
  endTime?: number;
  fileCount: number;
  commentCount?: number;
  status: 'in_progress' | 'completed' | 'failed';
  error?: string;
}

export interface AIMetrics {
  operation: string;
  startTime: number;
  endTime?: number;
  success: boolean;
  retryCount: number;
  error?: string;
}

export class Monitor {
  private metrics: Metrics;
  private activeReviews = new Map<string, ReviewMetrics>();
  private aiOperations: AIMetrics[] = [];
  private startTime: number;
  private lastCpuUsage?: NodeJS.CpuUsage;

  constructor() {
    this.startTime = Date.now();
    this.metrics = this.initializeMetrics();

    // Update CPU usage periodically
    this.lastCpuUsage = process.cpuUsage();
    setInterval(() => {
      this.updateSystemMetrics();
    }, 30000); // Every 30 seconds
  }

  private initializeMetrics(): Metrics {
    return {
      requests: {
        total: 0,
        successful: 0,
        failed: 0,
        rateLimited: 0,
      },
      reviews: {
        total: 0,
        completed: 0,
        failed: 0,
        inProgress: 0,
        averageDuration: 0,
        averageFileCount: 0,
        averageCommentCount: 0,
      },
      ai: {
        requests: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0,
        retries: 0,
      },
      connections: {
        active: 0,
        total: 0,
      },
      system: {
        uptime: 0,
        memoryUsage: process.memoryUsage(),
      },
    };
  }

  // Request tracking
  recordRequest(success: boolean, rateLimited: boolean = false): void {
    this.metrics.requests.total++;
    if (rateLimited) {
      this.metrics.requests.rateLimited++;
    } else if (success) {
      this.metrics.requests.successful++;
    } else {
      this.metrics.requests.failed++;
    }
  }

  // Review tracking
  startReview(reviewId: string, clientId: string, fileCount: number): void {
    const reviewMetrics: ReviewMetrics = {
      reviewId,
      clientId,
      startTime: Date.now(),
      fileCount,
      status: 'in_progress',
    };

    this.activeReviews.set(reviewId, reviewMetrics);
    this.metrics.reviews.total++;
    this.metrics.reviews.inProgress++;

    logger.reviewStarted(reviewId, clientId, fileCount);
  }

  completeReview(reviewId: string, commentCount: number): void {
    const review = this.activeReviews.get(reviewId);
    if (!review) return;

    const duration = Date.now() - review.startTime;
    review.endTime = Date.now();
    review.commentCount = commentCount;
    review.status = 'completed';

    this.metrics.reviews.completed++;
    this.metrics.reviews.inProgress--;
    this.updateReviewAverages(duration, review.fileCount, commentCount);

    this.activeReviews.delete(reviewId);
    logger.reviewCompleted(reviewId, review.clientId, duration, commentCount);
  }

  failReview(reviewId: string, error: string): void {
    const review = this.activeReviews.get(reviewId);
    if (!review) return;

    const duration = Date.now() - review.startTime;
    review.endTime = Date.now();
    review.status = 'failed';
    review.error = error;

    this.metrics.reviews.failed++;
    this.metrics.reviews.inProgress--;

    this.activeReviews.delete(reviewId);
    logger.reviewFailed(reviewId, review.clientId, error, duration);
  }

  private updateReviewAverages(
    duration: number,
    fileCount: number,
    commentCount: number
  ): void {
    const completed = this.metrics.reviews.completed;

    // Update running averages
    this.metrics.reviews.averageDuration =
      (this.metrics.reviews.averageDuration * (completed - 1) + duration) /
      completed;

    this.metrics.reviews.averageFileCount =
      (this.metrics.reviews.averageFileCount * (completed - 1) + fileCount) /
      completed;

    this.metrics.reviews.averageCommentCount =
      (this.metrics.reviews.averageCommentCount * (completed - 1) +
        commentCount) /
      completed;
  }

  // AI operation tracking
  startAIOperation(operation: string): string {
    const operationId = `${operation}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const aiMetrics: AIMetrics = {
      operation,
      startTime: Date.now(),
      success: false,
      retryCount: 0,
    };

    this.aiOperations.push(aiMetrics);
    this.metrics.ai.requests++;

    return operationId;
  }

  completeAIOperation(
    operation: string,
    success: boolean,
    retryCount: number = 0,
    error?: string
  ): void {
    const aiOp = this.aiOperations.find(
      (op) => op.operation === operation && !op.endTime
    );

    if (!aiOp) return;

    const duration = Date.now() - aiOp.startTime;
    aiOp.endTime = Date.now();
    aiOp.success = success;
    aiOp.retryCount = retryCount;
    aiOp.error = error;

    if (success) {
      this.metrics.ai.successful++;
    } else {
      this.metrics.ai.failed++;
    }

    this.metrics.ai.retries += retryCount;
    this.updateAIAverages(duration);

    logger.aiRequest(operation, duration, success, error);
  }

  private updateAIAverages(duration: number): void {
    const total = this.metrics.ai.successful + this.metrics.ai.failed;
    this.metrics.ai.averageDuration =
      (this.metrics.ai.averageDuration * (total - 1) + duration) / total;
  }

  // Connection tracking
  addConnection(): void {
    this.metrics.connections.active++;
    this.metrics.connections.total++;
  }

  removeConnection(): void {
    this.metrics.connections.active = Math.max(
      0,
      this.metrics.connections.active - 1
    );
  }

  // System metrics
  private updateSystemMetrics(): void {
    this.metrics.system.uptime = Date.now() - this.startTime;
    this.metrics.system.memoryUsage = process.memoryUsage();

    if (this.lastCpuUsage) {
      this.metrics.system.cpuUsage = process.cpuUsage(this.lastCpuUsage);
      this.lastCpuUsage = process.cpuUsage();
    }
  }

  // Get current metrics
  getMetrics(): Metrics {
    this.updateSystemMetrics();
    return { ...this.metrics };
  }

  // Get health status
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
  } {
    const issues: string[] = [];
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    // Refresh system metrics to ensure up-to-date readings
    this.updateSystemMetrics();

    // If there's been no activity yet, consider the system healthy regardless of host memory state.
    const hasActivity =
      this.metrics.requests.total > 0 ||
      this.metrics.reviews.total > 0 ||
      this.metrics.ai.requests > 0 ||
      this.metrics.connections.active > 0;

    if (!hasActivity) {
      return { status: 'healthy', issues };
    }

    // Check memory usage
    const memUsage = this.metrics.system.memoryUsage;
    const memUsagePercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    if (memUsagePercent > 90) {
      issues.push('High memory usage');
      status = 'unhealthy';
    } else if (memUsagePercent > 75) {
      issues.push('Elevated memory usage');
      status = status === 'healthy' ? 'degraded' : status;
    }

    // Check AI failure rate
    const aiFailureRate =
      this.metrics.ai.requests > 0
        ? (this.metrics.ai.failed / this.metrics.ai.requests) * 100
        : 0;

    if (aiFailureRate > 50) {
      issues.push('High AI failure rate');
      status = 'unhealthy';
    } else if (aiFailureRate > 25) {
      issues.push('Elevated AI failure rate');
      status = status === 'healthy' ? 'degraded' : status;
    }

    // Check review failure rate
    const reviewFailureRate =
      this.metrics.reviews.total > 0
        ? (this.metrics.reviews.failed / this.metrics.reviews.total) * 100
        : 0;

    if (reviewFailureRate > 30) {
      issues.push('High review failure rate');
      status = 'unhealthy';
    } else if (reviewFailureRate > 15) {
      issues.push('Elevated review failure rate');
      status = status === 'healthy' ? 'degraded' : status;
    }

    // Check for stuck reviews
    const stuckReviews = Array.from(this.activeReviews.values()).filter(
      (review) => Date.now() - review.startTime > 600000 // 10 minutes
    );

    if (stuckReviews.length > 0) {
      issues.push(`${stuckReviews.length} stuck review(s)`);
      status = status === 'healthy' ? 'degraded' : status;
    }

    return { status, issues };
  }

  // Reset metrics (useful for testing)
  reset(): void {
    this.metrics = this.initializeMetrics();
    this.activeReviews.clear();
    this.aiOperations.length = 0;
    this.startTime = Date.now();
  }
}

// Default monitor instance
export const monitor = new Monitor();
