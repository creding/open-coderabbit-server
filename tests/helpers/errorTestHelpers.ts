import { expect } from 'vitest';

export const testErrorScenarios = {
  async expectToThrowWithMessage(
    fn: () => Promise<any> | any,
    expectedMessage: string | RegExp,
    expectedErrorType?: new (...args: any[]) => Error
  ) {
    try {
      await fn();
      expect.fail('Expected function to throw an error');
    } catch (error) {
      expect(error).toBeInstanceOf(expectedErrorType || Error);
      if (typeof expectedMessage === 'string') {
        expect((error as Error).message).toContain(expectedMessage);
      } else {
        expect((error as Error).message).toMatch(expectedMessage);
      }
    }
  },

  createNetworkError: () => new Error('Network request failed'),
  createTimeoutError: () => new Error('Request timeout'),
  createValidationError: (field: string) =>
    new Error(`Validation failed: ${field}`),
};

export const mockErrorScenarios = {
  intermittentFailure: (mockFn: any, successValue: any, failureCount = 2) => {
    let callCount = 0;
    mockFn.mockImplementation(() => {
      callCount++;
      if (callCount <= failureCount) {
        throw testErrorScenarios.createNetworkError();
      }
      return Promise.resolve(successValue);
    });
  },
};
