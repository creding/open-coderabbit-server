import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff, RetryableError } from '../utils/retry';

describe('retryWithBackoff', () => {
  it('should return the result of the operation if it succeeds on the first try', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry the operation if it fails', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('failure'))
      .mockResolvedValue('success');
    const result = await retryWithBackoff(operation, { baseDelayMs: 1 });
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should throw an error if the operation fails on all retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('failure'));
    await expect(retryWithBackoff(operation, { maxRetries: 2, baseDelayMs: 1 })).rejects.toThrow(
      'failure'
    );
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry if the error is not retryable', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('failure'));
    await expect(
      retryWithBackoff(operation, {
        baseDelayMs: 1,
        retryCondition: () => false,
      })
    ).rejects.toThrow('failure');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should use the provided retry options', async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce(new Error('failure'))
      .mockRejectedValueOnce(new Error('failure'))
      .mockResolvedValue('success');
    const result = await retryWithBackoff(operation, {
      maxRetries: 3,
      baseDelayMs: 1,
    });
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should respect the RetryableError', async () => {
    const operation = vi.fn().mockRejectedValue(new RetryableError('failure', false));
    await expect(retryWithBackoff(operation, { baseDelayMs: 1 })).rejects.toThrow('failure');
    expect(operation).toHaveBeenCalledTimes(1);
  });
});
