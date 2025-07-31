import { z } from 'zod';
import { env } from '../constants';

export interface ServerConfig {
  server: {
    port: number;
    host: string;
    ssl: boolean;
    timeout: number;
  };
  ai: {
    provider: 'google';
    model: string;
    apiKey: string;
    maxRetries: number;
    timeoutMs: number;
  };
  files: {
    maxSize: number;
    maxFiles: number;
    maxTotalSize: number;
    allowedExtensions: string[];
  };
  rateLimit: {
    maxRequests: number;
    windowMs: number;
    skipSuccessfulRequests: boolean;
    skipFailedRequests: boolean;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    toFile: boolean;
    structured: boolean;
  };
  features: {
    healthCheck: boolean;
    metrics: boolean;
    gracefulShutdown: boolean;
    requestValidation: boolean;
  };
}

export class ConfigManager {
  private config: ServerConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): ServerConfig {
    return {
      server: {
        port: parseInt(env.PORT, 10),
        host: env.HOST,
        ssl: env.SSL === 'true',
        timeout: parseInt(env.REVIEW_TIMEOUT_MS, 10),
      },
      ai: {
        provider: 'google',
        model: env.AI_MODEL,
        apiKey: env.GOOGLE_GENERATIVE_AI_API_KEY,
        maxRetries: 3,
        timeoutMs: 30000,
      },
      files: {
        maxSize: parseInt(env.MAX_FILE_SIZE, 10),
        maxFiles: parseInt(env.MAX_FILES_PER_REVIEW, 10),
        maxTotalSize: parseInt(env.MAX_TOTAL_SIZE, 10),
        allowedExtensions: [
          '.ts',
          '.tsx',
          '.js',
          '.jsx',
          '.mjs',
          '.cjs',
          '.py',
          '.java',
          '.go',
          '.rs',
          '.cpp',
          '.c',
          '.h',
          '.php',
          '.rb',
          '.swift',
          '.kt',
          '.cs',
          '.vb',
          '.html',
          '.css',
          '.scss',
          '.sass',
          '.less',
          '.json',
          '.xml',
          '.yaml',
          '.yml',
          '.toml',
          '.md',
          '.txt',
          '.sh',
          '.bat',
          '.ps1',
          '.sql',
          '.graphql',
          '.proto',
          '.dockerfile',
        ],
      },
      rateLimit: {
        maxRequests: parseInt(env.RATE_LIMIT_REQUESTS, 10),
        windowMs: parseInt(env.RATE_LIMIT_WINDOW_MS, 10),
        skipSuccessfulRequests: false,
        skipFailedRequests: false,
      },
      logging: {
        level: env.LOG_LEVEL as 'error' | 'warn' | 'info' | 'debug',
        toFile: env.LOG_TO_FILE === 'true',
        structured: true,
      },
      features: {
        healthCheck: true,
        metrics: true,
        gracefulShutdown: true,
        requestValidation: true,
      },
    };
  }

  private validateConfig(): void {
    const configSchema = z.object({
      server: z.object({
        port: z.number().min(1).max(65535),
        host: z.string().min(1),
        ssl: z.boolean(),
        timeout: z.number().min(1000).max(600000), // 1s to 10min
      }),
      ai: z.object({
        provider: z.literal('google'),
        model: z.string().min(1),
        apiKey: z.string().min(1),
        maxRetries: z.number().min(0).max(10),
        timeoutMs: z.number().min(1000).max(120000), // 1s to 2min
      }),
      files: z.object({
        maxSize: z
          .number()
          .min(1024)
          .max(100 * 1024 * 1024), // 1KB to 100MB
        maxFiles: z.number().min(1).max(1000),
        maxTotalSize: z
          .number()
          .min(1024)
          .max(1024 * 1024 * 1024), // 1KB to 1GB
        allowedExtensions: z.array(z.string()).min(1),
      }),
      rateLimit: z.object({
        maxRequests: z.number().min(1).max(1000),
        windowMs: z.number().min(1000).max(3600000), // 1s to 1hour
        skipSuccessfulRequests: z.boolean(),
        skipFailedRequests: z.boolean(),
      }),
      logging: z.object({
        level: z.enum(['error', 'warn', 'info', 'debug']),
        toFile: z.boolean(),
        structured: z.boolean(),
      }),
      features: z.object({
        healthCheck: z.boolean(),
        metrics: z.boolean(),
        gracefulShutdown: z.boolean(),
        requestValidation: z.boolean(),
      }),
    });

    try {
      configSchema.parse(this.config);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const issues = error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join(', ');
        throw new Error(`Configuration validation failed: ${issues}`);
      }
      throw error;
    }
  }

  getConfig(): ServerConfig {
    return { ...this.config };
  }

  getServerConfig() {
    return this.config.server;
  }

  getAIConfig() {
    return this.config.ai;
  }

  getFileConfig() {
    return this.config.files;
  }

  getRateLimitConfig() {
    return this.config.rateLimit;
  }

  getLoggingConfig() {
    return this.config.logging;
  }

  getFeatureConfig() {
    return this.config.features;
  }

  isFeatureEnabled(feature: keyof ServerConfig['features']): boolean {
    return this.config.features[feature];
  }

  // Runtime configuration updates (for future extensibility)
  updateConfig(updates: Partial<ServerConfig>): void {
    this.config = { ...this.config, ...updates };
    this.validateConfig();
  }

  // Get configuration summary for logging
  getConfigSummary(): Record<string, any> {
    return {
      server: {
        ...this.config.server,
        // Don't log sensitive data
      },
      ai: {
        provider: this.config.ai.provider,
        model: this.config.ai.model,
        maxRetries: this.config.ai.maxRetries,
        timeoutMs: this.config.ai.timeoutMs,
        // Don't log API key
      },
      files: this.config.files,
      rateLimit: this.config.rateLimit,
      logging: this.config.logging,
      features: this.config.features,
    };
  }
}

// Default configuration manager instance
export const configManager = new ConfigManager();
