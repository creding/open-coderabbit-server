import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dotenv to prevent it from loading .env files and causing issues
vi.mock('dotenv', () => ({
  default: {
    config: vi.fn(), // Mock the config function to do nothing
  },
}));

const baseEnv = {
  HOST: '0.0.0.0',
  SSL: 'false',
  REVIEW_TIMEOUT_MS: '120000',
  AI_PROVIDER: 'google',
  AI_MODEL: 'gemini-pro',
  GOOGLE_GENERATIVE_AI_API_KEY: 'test-api-key',
  MAX_FILE_SIZE: '1048576',
  MAX_FILES_PER_REVIEW: '50',
  MAX_TOTAL_SIZE: '10485760',
  RATE_LIMIT_REQUESTS: '100',
  RATE_LIMIT_WINDOW_MS: '60000',
  LOG_LEVEL: 'info',
  LOG_TO_FILE: 'false',
};

describe('ConfigManager', () => {
  beforeEach(() => {
    vi.resetModules(); // Ensure a clean state for modules before each test
  });

  it('should load configuration correctly with valid data', async () => {
    // Directly assign the complete mocked environment object to process.env
    process.env = { ...baseEnv, PORT: '8080' };

    // Dynamically import ConfigManager AFTER process.env is set
    const { ConfigManager } = await import('../../src/utils/config');
    const configManager = new ConfigManager();
    expect(configManager.getServerConfig().port).toBe(8080);
  });

  it('should throw an error for invalid configuration', async () => {
    // Directly assign the complete mocked environment object with invalid data
    process.env = { ...baseEnv, PORT: 'invalid' };

    // Expect the import to throw an error due to invalid configuration
    try {
      await import('../../src/utils/config');
      // If we get here, the import didn't throw, so fail the test
      expect.fail('Expected config module import to throw an error');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /^Configuration validation failed/
      );
    }
  });
});
