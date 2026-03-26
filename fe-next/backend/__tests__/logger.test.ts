import { logger, socketLogger, lifecycleLogger, httpLogger, redisLogger, cronLogger } from '../../server/logger';

describe('server/logger', () => {
  it('exports a root pino logger', () => {
    expect(logger).toBeDefined();
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.fatal).toBe('function');
    expect(typeof logger.child).toBe('function');
  });

  it.each([
    ['socketLogger', socketLogger, 'socket'],
    ['lifecycleLogger', lifecycleLogger, 'lifecycle'],
    ['httpLogger', httpLogger, 'http'],
    ['redisLogger', redisLogger, 'redis'],
    ['cronLogger', cronLogger, 'cron'],
  ])('%s is a pino child logger with module=%s', (_name, childLogger, module) => {
    expect(childLogger).toBeDefined();
    expect(typeof childLogger.info).toBe('function');
    expect(typeof childLogger.error).toBe('function');
    // Pino child loggers store bindings internally
    const bindings = childLogger.bindings();
    expect(bindings.module).toBe(module);
  });
});
