/**
 * Rate Limit Handler
 * 
 * Handles API rate limiting with exponential backoff and retry logic
 */

import { Logger } from './logger.js';

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
  onRetry?: (attempt: number, delay: number, error: any) => void;
}

export class RateLimitHandler {
  /**
   * Execute a function with automatic retry on rate limit errors
   */
  static async withRetry<T>(
    fn: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 2000,
      maxDelay = 30000,
      backoffFactor = 2,
      onRetry
    } = options;

    let lastError: any;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if it's a rate limit error
        const isRateLimit = this.isRateLimitError(error);
        const isRetryable = isRateLimit || this.isRetryableError(error);

        // Don't retry on last attempt or non-retryable errors
        if (attempt >= maxRetries || !isRetryable) {
          throw error;
        }

        // Calculate delay (with jitter to avoid thundering herd)
        const jitter = Math.random() * 0.3 * delay; // ±30% jitter
        const actualDelay = Math.min(delay + jitter, maxDelay);

        // Notify about retry
        if (onRetry) {
          onRetry(attempt + 1, actualDelay, error);
        } else {
          Logger.warn(`Rate limit hit, retrying in ${Math.round(actualDelay / 1000)}s (attempt ${attempt + 1}/${maxRetries})...`);
        }

        // Wait before retrying
        await this.sleep(actualDelay);

        // Exponential backoff
        delay = Math.min(delay * backoffFactor, maxDelay);
      }
    }

    throw lastError;
  }

  /**
   * Check if error is a rate limit error
   */
  private static isRateLimitError(error: any): boolean {
    const message = error.message?.toLowerCase() || '';
    const statusCode = error.status || error.statusCode;

    return (
      statusCode === 429 ||
      message.includes('rate limit') ||
      message.includes('too many requests')
    );
  }

  /**
   * Check if error is retryable (rate limit or temporary network issue)
   */
  private static isRetryableError(error: any): boolean {
    const statusCode = error.status || error.statusCode;
    const message = error.message?.toLowerCase() || '';

    // Rate limits
    if (this.isRateLimitError(error)) return true;

    // Temporary server errors
    if (statusCode >= 500 && statusCode < 600) return true;

    // Network errors
    if (
      message.includes('timeout') ||
      message.includes('econnreset') ||
      message.includes('enotfound')
    ) {
      return true;
    }

    return false;
  }

  /**
   * Sleep for specified milliseconds
   */
  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Parse retry-after header (if present in error)
   */
  static getRetryAfter(error: any): number | null {
    const retryAfter = error.headers?.['retry-after'] || error.response?.headers?.['retry-after'];
    
    if (!retryAfter) return null;

    // Parse as seconds or as date
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000; // Convert to ms
    }

    // Try parsing as date
    const date = new Date(retryAfter);
    if (!isNaN(date.getTime())) {
      return Math.max(0, date.getTime() - Date.now());
    }

    return null;
  }
}

