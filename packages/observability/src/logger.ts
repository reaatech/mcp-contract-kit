/**
 * Structured logging with pino
 * Provides JSON logging with request ID tracking and PII redaction
 */

import pino from 'pino';

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'key',
  'authorization',
  'api_key',
  'employee_id',
  'session_id',
];

/**
 * Redact sensitive fields from log data
 */
function redactSensitiveData(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSensitiveData(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Create a pino logger instance
 */
export function createLogger(options?: { level?: string; requestId?: string }): {
  info: (msg: string, data?: Record<string, unknown>) => void;
  warn: (msg: string, data?: Record<string, unknown>) => void;
  error: (msg: string, data?: Record<string, unknown>) => void;
  debug: (msg: string, data?: Record<string, unknown>) => void;
  child: (bindings: Record<string, unknown>) => ReturnType<typeof createLogger>;
} {
  const level = options?.level ?? process.env.LOG_LEVEL ?? 'info';
  const requestId = options?.requestId;

  const baseLogger = pino({
    level,
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });

  // Add request ID to all logs if provided
  const logger = requestId ? baseLogger.child({ request_id: requestId }) : baseLogger;

  // Wrap methods to redact sensitive data
  const originalInfo = logger.info.bind(logger);
  const originalWarn = logger.warn.bind(logger);
  const originalError = logger.error.bind(logger);
  const originalDebug = logger.debug.bind(logger);

  return {
    info: (msg: string, data?: Record<string, unknown>) => {
      originalInfo({ ...redactSensitiveData(data ?? {}) }, msg);
    },
    warn: (msg: string, data?: Record<string, unknown>) => {
      originalWarn({ ...redactSensitiveData(data ?? {}) }, msg);
    },
    error: (msg: string, data?: Record<string, unknown>) => {
      originalError({ ...redactSensitiveData(data ?? {}) }, msg);
    },
    debug: (msg: string, data?: Record<string, unknown>) => {
      originalDebug({ ...redactSensitiveData(data ?? {}) }, msg);
    },
    child: (bindings: Record<string, unknown>) => {
      return createLogger({ level, requestId: bindings.request_id as string });
    },
  };
}

/** Default logger instance */
export const logger = createLogger();
