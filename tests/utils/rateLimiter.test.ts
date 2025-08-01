import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RateLimiter, RateLimitConfig } from '../../src/utils/rateLimiter';

describe('RateLimiter', () => {
  let limiter: RateLimiter;
  const config: RateLimitConfig = {
    maxRequests: 3,
    windowMs: 1000,
  };

  beforeEach(() => {
    vi.useFakeTimers();
    limiter = new RateLimiter(config);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should allow the first request', () => {
    const result = limiter.check('client-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should allow multiple requests up to the limit', () => {
    limiter.check('client-1');
    limiter.check('client-1');
    const result = limiter.check('client-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it('should block requests exceeding the limit', () => {
    limiter.check('client-1');
    limiter.check('client-1');
    limiter.check('client-1');
    const result = limiter.check('client-1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.retryAfter).toBe(1);
  });

  it('should reset the limit after the window expires', () => {
    limiter.check('client-1');
    limiter.check('client-1');
    limiter.check('client-1');

    vi.advanceTimersByTime(1001);

    const result = limiter.check('client-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should handle multiple clients independently', () => {
    const result1 = limiter.check('client-1');
    const result2 = limiter.check('client-2');

    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(2);
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(2);
  });

  it(`should reset a client's limit manually`, () => {
    limiter.check('client-1');
    limiter.reset('client-1');
    const result = limiter.check('client-1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it('should clean up expired entries', () => {
    limiter.check('client-1');
    vi.advanceTimersByTime(60001); // Wait for cleanup interval + window
    // @ts-expect-error - access private method for testing
    limiter.cleanup();
    // @ts-expect-error - accessing private property for testing
    expect(limiter.clients.has('client-1')).toBe(false);
  });
});
