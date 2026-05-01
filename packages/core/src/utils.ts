/**
 * Shared utilities
 */

/**
 * Generate a unique ID for requests
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  // Set version 4
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  // Set version
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

/**
 * Sleep for a given number of milliseconds
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries: number;
    baseDelayMs: number;
    maxDelayMs: number;
  },
): Promise<T> {
  let lastError: Error | undefined;
  const { maxRetries, baseDelayMs, maxDelayMs } = options;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
        await sleep(delay);
      }
    }
  }

  throw lastError;
}

/**
 * Measure execution time of a function
 */
export async function measureTime<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; durationMs: number }> {
  const start = performance.now();
  const result = await fn();
  const durationMs = Math.round(performance.now() - start);
  return { result, durationMs };
}

/**
 * Get current ISO timestamp
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Truncate a string to a maximum length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength - 3)}...`;
}

/**
 * Redact sensitive information from an object
 */
export function redactSensitiveData(
  obj: Record<string, unknown>,
  keys: string[] = ['password', 'token', 'secret', 'key', 'authorization'],
): Record<string, unknown> {
  const result: Record<string, unknown> = { ...obj };

  for (const key of keys) {
    if (key in result) {
      result[key] = '[REDACTED]';
    }
  }

  return result;
}

/**
 * Calculate percentile from a sorted array of numbers
 */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower] ?? 0;
  const weight = index - lower;
  return (sorted[lower] ?? 0) * (1 - weight) + (sorted[upper] ?? 0) * weight;
}

/**
 * Check if a URL is valid
 */
export function isValidURL(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Check if URL is a private/localhost address (SSRF protection)
 */
export function isPrivateURL(value: string): boolean {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return true;
    }

    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
      /^192\.168\./,
      /^169\.254\./,
      /^fc00:/,
      /^fe80:/,
    ];

    return privateRanges.some((regex) => regex.test(hostname));
  } catch {
    return false;
  }
}

/**
 * Calculate statistics from an array of numbers
 */
export function calculateStats(values: number[]): {
  min: number;
  max: number;
  mean: number;
  p50: number;
  p90: number;
  p99: number;
} {
  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, p50: 0, p90: 0, p99: 0 };
  }

  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);

  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    mean: sum / values.length,
    p50: percentile(sorted, 50),
    p90: percentile(sorted, 90),
    p99: percentile(sorted, 99),
  };
}
