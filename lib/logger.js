'use strict';

const pino = require('pino');

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
          messageFormat: '{msg}',
        },
      }
    : undefined,
  // In production, output structured JSON for log aggregators
  base: isDev ? undefined : { pid: process.pid },
  timestamp: pino.stdTimeFunctions.isoTime,
});

module.exports = logger;
