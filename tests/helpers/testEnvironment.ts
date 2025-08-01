import { vi } from 'vitest';

export class TestEnvironment {
  private originalEnv: NodeJS.ProcessEnv;

  constructor() {
    this.originalEnv = { ...process.env };
  }

  setEnv(env: Record<string, string>) {
    process.env = { ...this.originalEnv, ...env };
  }

  resetEnv() {
    process.env = { ...this.originalEnv };
  }

  mockEnv(env: Record<string, string>) {
    this.setEnv(env);
    return () => this.resetEnv();
  }
}

export const createTestEnv = () => new TestEnvironment();

export const defaultTestEnv = {
  HOST: '0.0.0.0',
  PORT: '8080',
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

// Helper to mock dotenv consistently across tests
export const mockDotenv = () => {
  vi.mock('dotenv', () => ({
    default: {
      config: vi.fn(),
    },
  }));
};
