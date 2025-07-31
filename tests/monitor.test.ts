import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Monitor } from '../utils/monitor';
import { logger } from '../utils/logger';

vi.mock('../utils/logger', () => ({
  logger: {
    reviewStarted: vi.fn(),
    reviewCompleted: vi.fn(),
    reviewFailed: vi.fn(),
    aiRequest: vi.fn(),
  },
}));

describe('Monitor', () => {
  let monitor: Monitor;

  beforeEach(() => {
    monitor = new Monitor();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should record a successful request', () => {
    monitor.recordRequest(true);
    const metrics = monitor.getMetrics();
    expect(metrics.requests.total).toBe(1);
    expect(metrics.requests.successful).toBe(1);
    expect(metrics.requests.failed).toBe(0);
  });

  it('should record a failed request', () => {
    monitor.recordRequest(false);
    const metrics = monitor.getMetrics();
    expect(metrics.requests.total).toBe(1);
    expect(metrics.requests.successful).toBe(0);
    expect(metrics.requests.failed).toBe(1);
  });

  it('should start a review', () => {
    monitor.startReview('review1', 'client1', 5);
    const metrics = monitor.getMetrics();
    expect(metrics.reviews.total).toBe(1);
    expect(metrics.reviews.inProgress).toBe(1);
    expect(logger.reviewStarted).toHaveBeenCalledWith('review1', 'client1', 5);
  });

  it('should complete a review', () => {
    monitor.startReview('review1', 'client1', 5);
    monitor.completeReview('review1', 10);
    const metrics = monitor.getMetrics();
    expect(metrics.reviews.completed).toBe(1);
    expect(metrics.reviews.inProgress).toBe(0);
    expect(logger.reviewCompleted).toHaveBeenCalled();
  });

  it('should fail a review', () => {
    monitor.startReview('review1', 'client1', 5);
    monitor.failReview('review1', 'error');
    const metrics = monitor.getMetrics();
    expect(metrics.reviews.failed).toBe(1);
    expect(metrics.reviews.inProgress).toBe(0);
    expect(logger.reviewFailed).toHaveBeenCalled();
  });

  it('should complete an AI operation', () => {
    monitor.startAIOperation('test');
    monitor.completeAIOperation('test', true);
    const metrics = monitor.getMetrics();
    expect(metrics.ai.requests).toBe(1);
    expect(metrics.ai.successful).toBe(1);
    expect(logger.aiRequest).toHaveBeenCalled();
  });

  it('should add and remove a connection', () => {
    monitor.addConnection();
    let metrics = monitor.getMetrics();
    expect(metrics.connections.active).toBe(1);
    monitor.removeConnection();
    metrics = monitor.getMetrics();
    expect(metrics.connections.active).toBe(0);
  });

  it('should return a healthy status', () => {
    const health = monitor.getHealthStatus();
    expect(health.status).toBe('healthy');
  });

  it('should return a degraded status for high memory usage', () => {
    const metrics = monitor.getMetrics();
    metrics.system.memoryUsage.heapUsed = 800;
    metrics.system.memoryUsage.heapTotal = 1000;
    const health = monitor.getHealthStatus();
    expect(health.status).toBe('degraded');
  });

  it('should return an unhealthy status for very high memory usage', () => {
    const metrics = monitor.getMetrics();
    metrics.system.memoryUsage.heapUsed = 950;
    metrics.system.memoryUsage.heapTotal = 1000;
    const health = monitor.getHealthStatus();
    expect(health.status).toBe('unhealthy');
  });
});
