import { env } from '../constants';

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  meta?: Record<string, unknown>;
  requestId?: string;
  clientId?: string;
}

export class Logger {
  private level: LogLevel;
  private logToFile: boolean;

  constructor() {
    this.level = this.parseLogLevel(env.LOG_LEVEL);
    this.logToFile = env.LOG_TO_FILE === 'true';
  }

  private parseLogLevel(level: string): LogLevel {
    switch (level.toLowerCase()) {
      case 'error':
        return LogLevel.ERROR;
      case 'warn':
        return LogLevel.WARN;
      case 'info':
        return LogLevel.INFO;
      case 'debug':
        return LogLevel.DEBUG;
      default:
        return LogLevel.INFO;
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level <= this.level;
  }

  private formatMessage(
    level: string,
    message: string,
    meta?: Record<string, unknown>
  ): string {
    const timestamp = new Date().toISOString();
    const emoji = this.getLogEmoji(level);

    let formatted = `${timestamp} ${emoji} [${level.toUpperCase()}] ${message}`;

    if (meta) {
      formatted += ` ${JSON.stringify(meta)}`;
    }

    return formatted;
  }

  private getLogEmoji(level: string): string {
    switch (level.toLowerCase()) {
      case 'error':
        return '❌';
      case 'warn':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'debug':
        return '🔍';
      default:
        return '📝';
    }
  }

  private log(
    level: LogLevel,
    levelName: string,
    message: string,
    meta?: Record<string, unknown>
  ): void {
    if (!this.shouldLog(level)) return;

    const formatted = this.formatMessage(levelName, message, meta);

    // Always log to console
    switch (level) {
      case LogLevel.ERROR:
        console.error(formatted);
        break;
      case LogLevel.WARN:
        console.warn(formatted);
        break;
      case LogLevel.INFO:
        console.info(formatted);
        break;
      case LogLevel.DEBUG:
        console.debug(formatted);
        break;
    }

    // TODO: Add file logging if needed
    if (this.logToFile) {
      // For now, just use console. In production, you might want to use a proper logging library
    }
  }

  error(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, 'error', message, meta);
  }

  warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, 'warn', message, meta);
  }

  info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, 'info', message, meta);
  }

  debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, 'debug', message, meta);
  }

  // Structured logging methods for specific use cases
  reviewStarted(reviewId: string, clientId: string, fileCount: number): void {
    this.info('Review started', {
      reviewId,
      clientId,
      fileCount,
      event: 'review_started',
    });
  }

  reviewCompleted(
    reviewId: string,
    clientId: string,
    duration: number,
    commentCount: number
  ): void {
    this.info('Review completed', {
      reviewId,
      clientId,
      duration,
      commentCount,
      event: 'review_completed',
    });
  }

  reviewFailed(
    reviewId: string,
    clientId: string,
    error: string,
    duration?: number
  ): void {
    this.error('Review failed', {
      reviewId,
      clientId,
      error,
      duration,
      event: 'review_failed',
    });
  }

  rateLimitHit(clientId: string, endpoint: string): void {
    this.warn('Rate limit exceeded', {
      clientId,
      endpoint,
      event: 'rate_limit_exceeded',
    });
  }

  aiRequest(
    operation: string,
    duration: number,
    success: boolean,
    error?: string
  ): void {
    const level = success ? 'info' : 'error';
    this[level](`AI ${operation} ${success ? 'completed' : 'failed'}`, {
      operation,
      duration,
      success,
      error,
      event: 'ai_request',
    });
  }

  fileValidationFailed(
    clientId: string,
    error: string,
    fileCount: number
  ): void {
    this.warn('File validation failed', {
      clientId,
      error,
      fileCount,
      event: 'file_validation_failed',
    });
  }

  serverStarted(port: number, host: string, ssl: boolean): void {
    this.info('Server started', {
      port,
      host,
      ssl,
      event: 'server_started',
    });
  }

  connectionEstablished(clientId: string): void {
    this.debug('WebSocket connection established', {
      clientId,
      event: 'connection_established',
    });
  }

  connectionClosed(clientId: string): void {
    this.debug('WebSocket connection closed', {
      clientId,
      event: 'connection_closed',
    });
  }
}

// Default logger instance
export const logger = new Logger();
