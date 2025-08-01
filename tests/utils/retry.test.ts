import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff, RetryableError, isRetryableAIError } from '../../src/utils/retry';

describe('retryWithBackoff', () => {
  it('should return the result on the first successful attempt', async () => {
    const operation = vi.fn().mockResolvedValue('success');
    const result = await retryWithBackoff(operation);
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should retry on failure and succeed on a subsequent attempt', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('failure'))
      .mockResolvedValue('success');
    
    const result = await retryWithBackoff(operation, { baseDelayMs: 10 });
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it('should throw the last error after exhausting all retries', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('persistent failure'));
    await expect(retryWithBackoff(operation, { maxRetries: 2, baseDelayMs: 10 })).rejects.toThrow('persistent failure');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry if the error is a non-retryable RetryableError', async () => {
    const error = new RetryableError('not retryable', false);
    const operation = vi.fn().mockRejectedValue(error);
    await expect(retryWithBackoff(operation)).rejects.toThrow(error);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should use the custom retryCondition', async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error('retry'))
      .mockRejectedValueOnce(new Error('dont-retry'));
    
    const retryCondition = (e: any) => e.message === 'retry';

    await expect(retryWithBackoff(operation, { retryCondition, baseDelayMs: 10 })).rejects.toThrow('dont-retry');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});

describe('isRetryableAIError', () => {
  it('should return true for a generic retryable error', () => {
    const error = new Error('A network error occurred');
    expect(isRetryableAIError(error)).toBe(true);
  });

  it('should return false for a non-retryable error message', () => {
    const error = new Error('Invalid input');
    expect(isRetryableAIError(error)).toBe(false);
  });

  it('should respect the isRetryable flag on RetryableError', () => {
    const retryable = new RetryableError('retry', true);
    const nonRetryable = new RetryableError('dont', false);
    expect(isRetryableAIError(retryable)).toBe(true);
    expect(isRetryableAIError(nonRetryable)).toBe(false);
  });
});