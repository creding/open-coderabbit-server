import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Logger, LogLevel } from '../src/utils/logger';
import { env } from '../src/constants';

vi.mock('../constants', () => ({
  env: {
    LOG_LEVEL: 'debug',
    LOG_TO_FILE: 'false',
  },
}));

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = new Logger();
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should log an error message', () => {
    logger.error('test error');
    expect(console.error).toHaveBeenCalled();
  });

  it('should log a warning message', () => {
    logger.warn('test warning');
    expect(console.warn).toHaveBeenCalled();
  });

  it('should log an info message', () => {
    logger.info('test info');
    expect(console.info).toHaveBeenCalled();
  });

  it('should log a debug message', () => {
    logger.debug('test debug');
    expect(console.debug).toHaveBeenCalled();
  });

  it('should not log a message if the level is too low', () => {
    env.LOG_LEVEL = 'info';
    logger = new Logger();
    logger.debug('test debug');
    expect(console.debug).not.toHaveBeenCalled();
  });

  it('should log structured data', () => {
    logger.info('test info', { key: 'value' });
    expect(console.info).toHaveBeenCalledWith(
      expect.stringContaining('{"key":"value"}')
    );
  });
});
