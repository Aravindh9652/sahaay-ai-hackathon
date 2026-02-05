/**
 * Centralized logging utility for Sahaay AI
 */

import winston from 'winston';
import { config } from '@/config/environment';

// Custom log format
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    
    if (stack) {
      log += `\n${stack}`;
    }
    
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Create logger instance
export const logger = winston.createLogger({
  level: config.logLevel,
  format: logFormat,
  defaultMeta: { service: 'sahaay-ai' },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        logFormat
      ),
    }),
  ],
});

// Add file transport for production
if (config.nodeEnv === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
  
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Privacy-aware logging helper
export const logWithPrivacy = {
  info: (message: string, meta?: Record<string, unknown>): void => {
    logger.info(message, sanitizeLogData(meta));
  },
  
  warn: (message: string, meta?: Record<string, unknown>): void => {
    logger.warn(message, sanitizeLogData(meta));
  },
  
  error: (message: string, error?: Error, meta?: Record<string, unknown>): void => {
    logger.error(message, { error: error?.message, stack: error?.stack, ...sanitizeLogData(meta) });
  },
  
  debug: (message: string, meta?: Record<string, unknown>): void => {
    logger.debug(message, sanitizeLogData(meta));
  },
};

/**
 * Sanitize log data to remove sensitive information
 */
function sanitizeLogData(data?: Record<string, unknown>): Record<string, unknown> | undefined {
  if (!data) return undefined;
  
  const sensitiveKeys = [
    'password',
    'token',
    'apiKey',
    'aadhaar',
    'aadhar',
    'pan',
    'bankAccount',
    'phone',
    'mobile',
    'email',
  ];
  
  const sanitized = { ...data };
  
  for (const key of Object.keys(sanitized)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}