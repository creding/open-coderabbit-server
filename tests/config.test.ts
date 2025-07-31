import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConfigManager } from '../src/utils/config';
import { env } from '../src/constants';

vi.mock('../constants', () => ({
  env: {
    PORT: '8080',
    HOST: 'localhost',
    SSL: 'false',
    REVIEW_TIMEOUT_MS: '60000',
    AI_PROVIDER: 'google',
    AI_MODEL: 'gemini-pro',
    GOOGLE_GENERATIVE_AI_API_KEY: 'test-key',
    MAX_FILE_SIZE: '1048576',
    MAX_FILES_PER_REVIEW: '10',
    MAX_TOTAL_SIZE: '10485760',
    RATE_LIMIT_REQUESTS: '100',
    RATE_LIMIT_WINDOW_MS: '60000',
    LOG_LEVEL: 'info',
    LOG_TO_FILE: 'false',
  },
}));

describe('ConfigManager', () => {
  let configManager: ConfigManager;

  beforeEach(() => {
    configManager = new ConfigManager();
  });

  it('should load the configuration correctly', () => {
    const config = configManager.getConfig();
    expect(config.server.port).toBe(8080);
    expect(config.ai.model).toBe('gemini-pro');
  });

  it('should return the server configuration', () => {
    const serverConfig = configManager.getServerConfig();
    expect(serverConfig.port).toBe(8080);
  });

  it('should return the AI configuration', () => {
    const aiConfig = configManager.getAIConfig();
    expect(aiConfig.model).toBe('gemini-pro');
  });

  it('should return the file configuration', () => {
    const fileConfig = configManager.getFileConfig();
    expect(fileConfig.maxSize).toBe(1048576);
  });

  it('should return the rate limit configuration', () => {
    const rateLimitConfig = configManager.getRateLimitConfig();
    expect(rateLimitConfig.maxRequests).toBe(100);
  });

  it('should return the logging configuration', () => {
    const loggingConfig = configManager.getLoggingConfig();
    expect(loggingConfig.level).toBe('info');
  });

  it('should return the feature configuration', () => {
    const featureConfig = configManager.getFeatureConfig();
    expect(featureConfig.healthCheck).toBe(true);
  });

  it('should check if a feature is enabled', () => {
    expect(configManager.isFeatureEnabled('healthCheck')).toBe(true);
  });

  it('should throw an error for invalid configuration', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {}); // Suppress console.error
    env.PORT = 'invalid';
    expect(() => new ConfigManager()).toThrow();
    env.PORT = '8080'; // Reset for other tests
  });
});
