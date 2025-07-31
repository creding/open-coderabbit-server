import { describe, it, expect, beforeEach } from 'vitest';
import { RateLimiter } from '../src/utils/rateLimiter';

describe('RateLimiter', () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({ maxRequests: 2, windowMs: 1000 });
  });

  it('should allow requests within the limit', () => {
    const result1 = rateLimiter.check('client1');
    expect(result1.allowed).toBe(true);
    expect(result1.remaining).toBe(1);

    const result2 = rateLimiter.check('client1');
    expect(result2.allowed).toBe(true);
    expect(result2.remaining).toBe(0);
  });

  it('should block requests exceeding the limit', () => {
    rateLimiter.check('client1');
    rateLimiter.check('client1');
    const result = rateLimiter.check('client1');
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('should reset the limit after the window', async () => {
    rateLimiter.check('client1');
    rateLimiter.check('client1');

    await new Promise((resolve) => setTimeout(resolve, 1100));

    const result = rateLimiter.check('client1');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(1);
  });
});
