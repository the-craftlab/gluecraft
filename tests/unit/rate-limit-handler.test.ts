/**
 * Unit tests for RateLimitHandler
 * 
 * Tests retry logic, backoff calculation, and rate limit header parsing.
 * Critical for preventing production failures from API throttling.
 * 
 * @group unit
 * @group rate-limit
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RateLimitHandler } from '../../src/utils/rate-limit-handler.js';

describe('RateLimitHandler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe('Exponential Backoff Calculation', () => {
    it('should use initial delay on first retry', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          throw { status: 429, message: 'Rate limit' };
        }
        return 'success';
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 1000,
        maxRetries: 1
      });

      // Fast-forward through first retry delay
      await vi.advanceTimersByTimeAsync(1500); // 1000ms + jitter

      const result = await promise;
      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should apply exponential backoff: 2s, 4s, 8s', async () => {
      let attempts = 0;
      const delays: number[] = [];
      
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts <= 3) {
          throw { status: 429, message: 'Rate limit' };
        }
        return 'success';
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 2000,
        backoffFactor: 2,
        maxRetries: 3,
        onRetry: (attempt, delay) => {
          delays.push(delay);
        }
      });

      // Advance through retries
      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(10000); // Enough for any delay + jitter
      }

      await promise;
      
      // Check that delays roughly follow exponential pattern
      expect(delays[0]).toBeGreaterThanOrEqual(2000); // ~2s + jitter
      expect(delays[0]).toBeLessThan(3000);
      
      expect(delays[1]).toBeGreaterThanOrEqual(4000); // ~4s + jitter
      expect(delays[1]).toBeLessThan(6000);
      
      expect(delays[2]).toBeGreaterThanOrEqual(8000); // ~8s + jitter
      expect(delays[2]).toBeLessThan(12000);
    });

    it('should respect max delay cap', async () => {
      let attempts = 0;
      const delays: number[] = [];
      
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts <= 5) {
          throw { status: 429, message: 'Rate limit' };
        }
        return 'success';
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 10000,
        backoffFactor: 4,
        maxDelay: 20000,
        maxRetries: 5,
        onRetry: (attempt, delay) => {
          delays.push(delay);
        }
      });

      for (let i = 0; i < 5; i++) {
        await vi.advanceTimersByTimeAsync(30000);
      }

      await promise;
      
      // All delays should be capped at maxDelay
      delays.forEach(delay => {
        expect(delay).toBeLessThanOrEqual(20000);
      });
    });

    it('should add jitter to prevent thundering herd', async () => {
      const delays: number[] = [];
      
      for (let i = 0; i < 10; i++) {
        let attempts = 0;
        const fn = async () => {
          attempts++;
          if (attempts === 1) {
            throw { status: 429, message: 'Rate limit' };
          }
          return 'success';
        };

        const promise = RateLimitHandler.withRetry(fn, {
          initialDelay: 2000,
          maxRetries: 1,
          onRetry: (_, delay) => {
            delays.push(delay);
          }
        });

        await vi.advanceTimersByTimeAsync(3000);
        await promise;
      }

      // Delays should vary due to jitter (±30%)
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1); // Not all the same
      
      delays.forEach(delay => {
        expect(delay).toBeGreaterThanOrEqual(2000 * 0.7); // Within jitter range
        expect(delay).toBeLessThanOrEqual(2000 * 1.3);
      });
    });

    it('should have jitter within acceptable range (±30%)', async () => {
      const delays: number[] = [];
      const baseDelay = 5000;
      
      for (let i = 0; i < 20; i++) {
        let attempts = 0;
        const fn = async () => {
          attempts++;
          if (attempts === 1) {
            throw { status: 429 };
          }
          return 'ok';
        };

        const promise = RateLimitHandler.withRetry(fn, {
          initialDelay: baseDelay,
          maxRetries: 1,
          onRetry: (_, delay) => {
            delays.push(delay);
          }
        });

        await vi.advanceTimersByTimeAsync(7000);
        await promise;
      }

      delays.forEach(delay => {
        // Jitter is ±30% of delay
        const minExpected = baseDelay;
        const maxExpected = baseDelay * 1.3;
        expect(delay).toBeGreaterThanOrEqual(minExpected);
        expect(delay).toBeLessThanOrEqual(maxExpected);
      });
    });
  });

  describe('Retry Logic', () => {
    it('should retry on 429 response', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          throw { status: 429, message: 'Too many requests' };
        }
        return 'success';
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 1
      });

      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 500 response', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          throw { status: 500, message: 'Internal server error' };
        }
        return 'success';
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 1
      });

      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on 503 response (Service Unavailable)', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          throw { status: 503, message: 'Service unavailable' };
        }
        return 'success';
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 1
      });

      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on network timeout', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('Request timeout');
        }
        return 'success';
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 1
      });

      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should retry on ECONNRESET', async () => {
      let attempts = 0;
      const fn = vi.fn(async () => {
        attempts++;
        if (attempts === 1) {
          throw new Error('socket hang up ECONNRESET');
        }
        return 'success';
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 1
      });

      await vi.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result).toBe('success');
    });

    it('should NOT retry on 401 (Unauthorized)', async () => {
      const fn = vi.fn(async () => {
        throw { status: 401, message: 'Unauthorized' };
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 3
      });

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should NOT retry on 403 (Forbidden)', async () => {
      const fn = vi.fn(async () => {
        throw { status: 403, message: 'Forbidden' };
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 3
      });

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 400 (Bad Request)', async () => {
      const fn = vi.fn(async () => {
        throw { status: 400, message: 'Bad request' };
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 3
      });

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should NOT retry on 404 (Not Found)', async () => {
      const fn = vi.fn(async () => {
        throw { status: 404, message: 'Not found' };
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 3
      });

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it('should respect max retry limit', async () => {
      const fn = vi.fn(async () => {
        throw { status: 429, message: 'Rate limit' };
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 3
      });

      // Advance through all retries
      for (let i = 0; i < 4; i++) {
        await vi.advanceTimersByTimeAsync(1000);
      }

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
    });

    it('should throw after max retries exceeded', async () => {
      const fn = vi.fn(async () => {
        throw { status: 429, message: 'Rate limit exceeded' };
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 2
      });

      for (let i = 0; i < 3; i++) {
        await vi.advanceTimersByTimeAsync(500);
      }

      await expect(promise).rejects.toMatchObject({
        status: 429,
        message: 'Rate limit exceeded'
      });
    });

    it('should return immediately on success (no retry)', async () => {
      const fn = vi.fn(async () => 'success');

      const result = await RateLimitHandler.withRetry(fn, {
        initialDelay: 1000,
        maxRetries: 3
      });

      expect(result).toBe('success');
      expect(fn).toHaveBeenCalledTimes(1);
      // No timers should have been used
    });
  });

  describe('Retry-After Header Parsing', () => {
    it('should parse Retry-After header (seconds)', () => {
      const error = {
        status: 429,
        headers: { 'retry-after': '60' }
      };

      const delay = RateLimitHandler.getRetryAfter(error);

      expect(delay).toBe(60000); // 60 seconds in ms
    });

    it('should parse Retry-After header (HTTP date)', () => {
      const futureDate = new Date(Date.now() + 120000); // 2 minutes from now
      const error = {
        status: 429,
        headers: { 'retry-after': futureDate.toUTCString() }
      };

      const delay = RateLimitHandler.getRetryAfter(error);

      expect(delay).toBeGreaterThan(110000); // ~2 minutes
      expect(delay).toBeLessThan(130000);
    });

    it('should handle missing Retry-After header', () => {
      const error = {
        status: 429,
        headers: {}
      };

      const delay = RateLimitHandler.getRetryAfter(error);

      expect(delay).toBeNull();
    });

    it('should parse from response.headers', () => {
      const error = {
        status: 429,
        response: {
          headers: { 'retry-after': '30' }
        }
      };

      const delay = RateLimitHandler.getRetryAfter(error);

      expect(delay).toBe(30000);
    });

    it('should handle invalid Retry-After value', () => {
      const error = {
        status: 429,
        headers: { 'retry-after': 'invalid' }
      };

      const delay = RateLimitHandler.getRetryAfter(error);

      expect(delay).toBeNull();
    });

    it('should handle past date in Retry-After', () => {
      const pastDate = new Date(Date.now() - 60000); // 1 minute ago
      const error = {
        status: 429,
        headers: { 'retry-after': pastDate.toUTCString() }
      };

      const delay = RateLimitHandler.getRetryAfter(error);

      expect(delay).toBe(0); // Should be clamped to 0
    });
  });

  describe('Rate Limit Detection', () => {
    it('should detect rate limit from status code 429', async () => {
      const fn = vi.fn(async () => {
        throw { status: 429 };
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 1
      });

      await vi.advanceTimersByTimeAsync(200);
      
      // Should retry
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should detect rate limit from message "rate limit"', async () => {
      const fn = vi.fn(async () => {
        throw new Error('GraphQL: Rate limit exceeded');
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 1
      });

      await vi.advanceTimersByTimeAsync(200);
      
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('should detect rate limit from message "too many requests"', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Too many requests, please slow down');
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 1
      });

      await vi.advanceTimersByTimeAsync(200);
      
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('onRetry Callback', () => {
    it('should call onRetry callback with attempt and delay', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts <= 2) {
          throw { status: 429 };
        }
        return 'success';
      };

      const onRetry = vi.fn();

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 2,
        onRetry
      });

      await vi.advanceTimersByTimeAsync(1000);
      await promise;

      expect(onRetry).toHaveBeenCalledTimes(2);
      
      // First retry
      expect(onRetry).toHaveBeenNthCalledWith(
        1,
        1,
        expect.any(Number),
        expect.objectContaining({ status: 429 })
      );

      // Second retry
      expect(onRetry).toHaveBeenNthCalledWith(
        2,
        2,
        expect.any(Number),
        expect.objectContaining({ status: 429 })
      );
    });

    it('should not call onRetry on successful first attempt', async () => {
      const fn = async () => 'success';
      const onRetry = vi.fn();

      await RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 3,
        onRetry
      });

      expect(onRetry).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors without status property', async () => {
      const fn = vi.fn(async () => {
        throw new Error('Unknown error');
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 1
      });

      await expect(promise).rejects.toThrow('Unknown error');
      expect(fn).toHaveBeenCalledTimes(1); // No retry for unknown errors
    });

    it('should handle null error message', async () => {
      const fn = vi.fn(async () => {
        const error: any = new Error();
        error.message = null;
        error.status = 401;
        throw error;
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 3
      });

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1); // No retry on 401
    });

    it('should handle zero maxRetries', async () => {
      const fn = vi.fn(async () => {
        throw { status: 429 };
      });

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 100,
        maxRetries: 0
      });

      await expect(promise).rejects.toThrow();
      expect(fn).toHaveBeenCalledTimes(1); // No retries
    });

    it('should handle very large backoff factors', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts <= 2) {
          throw { status: 429 };
        }
        return 'success';
      };

      const promise = RateLimitHandler.withRetry(fn, {
        initialDelay: 1000,
        backoffFactor: 100,
        maxDelay: 5000, // Should cap at this
        maxRetries: 2
      });

      await vi.advanceTimersByTimeAsync(20000);
      const result = await promise;

      expect(result).toBe('success');
    });

    it('should handle concurrent retry operations', async () => {
      const fn1 = vi.fn(async () => {
        throw { status: 429 };
      });

      const fn2 = vi.fn(async () => {
        throw { status: 429 };
      });

      const promise1 = RateLimitHandler.withRetry(fn1, {
        initialDelay: 100,
        maxRetries: 1
      });

      const promise2 = RateLimitHandler.withRetry(fn2, {
        initialDelay: 200,
        maxRetries: 1
      });

      await vi.advanceTimersByTimeAsync(500);

      await expect(promise1).rejects.toThrow();
      await expect(promise2).rejects.toThrow();
      
      expect(fn1).toHaveBeenCalledTimes(2);
      expect(fn2).toHaveBeenCalledTimes(2);
    });
  });
});
