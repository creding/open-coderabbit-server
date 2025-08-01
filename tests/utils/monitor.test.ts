import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Monitor } from '../../src/utils/monitor';

describe('Monitor', () => {
  let monitor: Monitor;

  beforeEach(() => {
    vi.useFakeTimers();
    monitor = new Monitor();
  });

  afterEach(() => {
    vi.useRealTimers();
    monitor.reset();
  });

  it('should initialize with zeroed metrics', () => {
    const metrics = monitor.getMetrics();
    expect(metrics.requests.total).toBe(0);
    expect(metrics.reviews.total).toBe(0);
    expect(metrics.ai.requests).toBe(0);
    expect(metrics.connections.active).toBe(0);
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

  it('should track a review lifecycle', () => {
    monitor.startReview('review-1', 'client-1', 5);
    let metrics = monitor.getMetrics();
    expect(metrics.reviews.total).toBe(1);
    expect(metrics.reviews.inProgress).toBe(1);

    vi.advanceTimersByTime(5000);
    monitor.completeReview('review-1', 10);
    metrics = monitor.getMetrics();
    expect(metrics.reviews.completed).toBe(1);
    expect(metrics.reviews.inProgress).toBe(0);
    expect(metrics.reviews.averageDuration).toBe(5000);
    expect(metrics.reviews.averageFileCount).toBe(5);
    expect(metrics.reviews.averageCommentCount).toBe(10);
  });

  it('should track a failed review', () => {
    monitor.startReview('review-2', 'client-2', 3);
    monitor.failReview('review-2', 'AI error');
    const metrics = monitor.getMetrics();
    expect(metrics.reviews.failed).toBe(1);
    expect(metrics.reviews.inProgress).toBe(0);
  });

  it('should track an AI operation', () => {
    monitor.startAIOperation('summarize');
    vi.advanceTimersByTime(1000);
    monitor.completeAIOperation('summarize', true, 0);
    const metrics = monitor.getMetrics();
    expect(metrics.ai.requests).toBe(1);
    expect(metrics.ai.successful).toBe(1);
    expect(metrics.ai.averageDuration).toBe(1000);
  });

  it('should track connections', () => {
    monitor.addConnection();
    let metrics = monitor.getMetrics();
    expect(metrics.connections.active).toBe(1);
    expect(metrics.connections.total).toBe(1);

    monitor.removeConnection();
    metrics = monitor.getMetrics();
    expect(metrics.connections.active).toBe(0);
  });

  it('should return a healthy status', () => {
    const health = monitor.getHealthStatus();
    expect(health.status).toBe('healthy');
    expect(health.issues).toHaveLength(0);
  });

  it('should return a degraded status for elevated AI failures', () => {
    monitor.startAIOperation('op1');
    monitor.completeAIOperation('op1', false);
    monitor.startAIOperation('op2');
    monitor.completeAIOperation('op2', true);
    monitor.startAIOperation('op3');
    monitor.completeAIOperation('op3', true);
    // 33% failure rate
    const health = monitor.getHealthStatus();
    expect(health.status).toBe('degraded');
    expect(health.issues).toContain('Elevated AI failure rate');
  });

  it('should reset metrics', () => {
    monitor.recordRequest(true);
    monitor.reset();
    const metrics = monitor.getMetrics();
    expect(metrics.requests.total).toBe(0);
  });
});