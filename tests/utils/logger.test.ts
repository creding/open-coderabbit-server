import { describe, it, expect, vi, afterEach } from 'vitest';

// Mock dotenv to prevent it from loading .env files and causing issues
vi.mock('dotenv', () => ({
  default: {
    config: vi.fn(), // Mock the config function to do nothing
  },
}));

describe('Logger', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules(); // Reset modules after each test to ensure fresh imports
  });

  it('should log debug messages when the level is set to debug', async () => {
    // Directly manipulate process.env for this specific test
    process.env = { LOG_LEVEL: 'debug', GOOGLE_GENERATIVE_AI_API_KEY: 'test-key' };

    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    // Dynamically import the logger to apply the mock
    const { Logger } = await import('../../src/utils/logger');
    const logger = new Logger();

    logger.debug('test debug message');

    expect(spy).toHaveBeenCalledWith(expect.stringContaining('test debug message'));
  });

  it('should not log debug messages when the level is set to info', async () => {
    // Directly manipulate process.env for this specific test
    process.env = { LOG_LEVEL: 'info', GOOGLE_GENERATIVE_AI_API_KEY: 'test-key' };

    const spy = vi.spyOn(console, 'debug').mockImplementation(() => {});

    // Dynamically import the logger to apply the mock
    const { Logger } = await import('../../src/utils/logger');
    const logger = new Logger();

    logger.debug('this should not be logged');

    expect(spy).not.toHaveBeenCalled();
  });
});