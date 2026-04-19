/**
 * Unit tests for utilities
 */

import { describe, it, expect } from 'vitest';
import {
  generateId,
  generateUUID,
  sleep,
  retry,
  measureTime,
  now,
  truncate,
  redactSensitiveData,
  percentile,
  calculateStats,
  isValidURL,
  isPrivateURL,
} from '../../src/utils/index.js';

describe('utils', () => {
  describe('generateId', () => {
    it('should generate a unique ID', () => {
      const id1 = generateId();
      const id2 = generateId();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^\d+-[a-z0-9]+$/);
    });
  });

  describe('generateUUID', () => {
    it('should generate a valid UUID v4', () => {
      const uuid = generateUUID();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    });

    it('should generate unique UUIDs', () => {
      const uuids = new Set([generateUUID(), generateUUID(), generateUUID()]);
      expect(uuids.size).toBe(3);
    });
  });

  describe('sleep', () => {
    it('should wait for the specified duration', async () => {
      const start = Date.now();
      await sleep(50);
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThanOrEqual(40);
    });
  });

  describe('retry', () => {
    it('should return result on first success', async () => {
      const result = await retry(() => Promise.resolve('success'), {
        maxRetries: 3,
        baseDelayMs: 10,
        maxDelayMs: 100,
      });
      expect(result).toBe('success');
    });

    it('should retry on failure and succeed', async () => {
      let attempts = 0;
      const result = await retry(
        () => {
          attempts++;
          if (attempts < 3) {
            return Promise.reject(new Error('temporary error'));
          }
          return Promise.resolve('success');
        },
        {
          maxRetries: 3,
          baseDelayMs: 10,
          maxDelayMs: 100,
        },
      );
      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max retries', async () => {
      await expect(
        retry(() => Promise.reject(new Error('persistent error')), {
          maxRetries: 3,
          baseDelayMs: 10,
          maxDelayMs: 100,
        }),
      ).rejects.toThrow('persistent error');
    });
  });

  describe('measureTime', () => {
    it('should measure execution time', async () => {
      const { result, durationMs } = await measureTime(async () => {
        await sleep(50);
        return 'done';
      });
      expect(result).toBe('done');
      expect(durationMs).toBeGreaterThanOrEqual(45);
    });
  });

  describe('now', () => {
    it('should return ISO timestamp', () => {
      const timestamp = now();
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/);
    });
  });

  describe('truncate', () => {
    it('should not truncate short strings', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should truncate long strings', () => {
      expect(truncate('hello world', 8)).toBe('hello...');
    });
  });

  describe('redactSensitiveData', () => {
    it('should redact sensitive keys', () => {
      const obj = { password: 'secret', token: 'abc123', name: 'public' };
      const result = redactSensitiveData(obj);
      expect(result).toEqual({
        password: '[REDACTED]',
        token: '[REDACTED]',
        name: 'public',
      });
    });

    it('should accept custom keys', () => {
      const obj = { apiKey: 'secret', data: 'public' };
      const result = redactSensitiveData(obj, ['apiKey']);
      expect(result).toEqual({
        apiKey: '[REDACTED]',
        data: 'public',
      });
    });
  });

  describe('percentile', () => {
    it('should calculate percentile correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      expect(percentile(values, 50)).toBe(5.5);
      expect(percentile(values, 90)).toBe(9.1);
      expect(percentile(values, 99)).toBe(9.91);
    });

    it('should return 0 for empty array', () => {
      expect(percentile([], 50)).toBe(0);
    });
  });

  describe('calculateStats', () => {
    it('should calculate statistics correctly', () => {
      const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const stats = calculateStats(values);
      expect(stats.min).toBe(1);
      expect(stats.max).toBe(10);
      expect(stats.mean).toBe(5.5);
      expect(stats.p50).toBe(5.5);
    });

    it('should return zeros for empty array', () => {
      const stats = calculateStats([]);
      expect(stats).toEqual({
        min: 0,
        max: 0,
        mean: 0,
        p50: 0,
        p90: 0,
        p99: 0,
      });
    });
  });

  describe('isValidURL', () => {
    it('should validate HTTP URLs', () => {
      expect(isValidURL('http://example.com')).toBe(true);
    });

    it('should validate HTTPS URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidURL('not-a-url')).toBe(false);
      expect(isValidURL('ftp://example.com')).toBe(false);
    });
  });

  describe('isPrivateURL', () => {
    it('should detect localhost', () => {
      expect(isPrivateURL('https://localhost:8080')).toBe(true);
      expect(isPrivateURL('https://127.0.0.1')).toBe(true);
    });

    it('should detect private IP ranges', () => {
      expect(isPrivateURL('https://192.168.1.1')).toBe(true);
      expect(isPrivateURL('https://10.0.0.1')).toBe(true);
      expect(isPrivateURL('https://172.16.0.1')).toBe(true);
    });

    it('should not flag public URLs', () => {
      expect(isPrivateURL('https://example.com')).toBe(false);
      expect(isPrivateURL('https://8.8.8.8')).toBe(false);
    });
  });
});
