/**
 * Error Handling Utilities
 * 
 * Provides comprehensive error handling with:
 * - Graceful degradation
 * - Contextual error messages
 * - Retry logic for transient errors
 * - Error classification and recovery strategies
 */

import { Logger } from './logger.js';

export interface ErrorContext {
  operation: string;
  jpdKey?: string;
  githubNumber?: number;
  fieldId?: string;
  details?: Record<string, any>;
}

export enum ErrorType {
  NETWORK = 'network',
  RATE_LIMIT = 'rate_limit',
  AUTHENTICATION = 'authentication',
  VALIDATION = 'validation',
  NOT_FOUND = 'not_found',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

export interface ClassifiedError {
  type: ErrorType;
  message: string;
  recoverable: boolean;
  retryable: boolean;
  suggestedAction?: string;
  originalError: any;
}

export class ErrorHandler {
  private logger: Logger;
  private retryAttempts: Map<string, number> = new Map();

  constructor(logger?: Logger) {
    this.logger = logger || new Logger();
  }

  /**
   * Classify an error and determine recovery strategy
   */
  classify(error: any, context: ErrorContext): ClassifiedError {
    const message = error?.message || String(error);
    const statusCode = error?.status || error?.statusCode;

    // Network errors (transient, retryable)
    if (
      message.includes('ECONNREFUSED') ||
      message.includes('ETIMEDOUT') ||
      message.includes('ENOTFOUND') ||
      message.includes('timeout') ||
      statusCode === 502 ||
      statusCode === 503 ||
      statusCode === 504
    ) {
      return {
        type: ErrorType.NETWORK,
        message: `Network error during ${context.operation}`,
        recoverable: true,
        retryable: true,
        suggestedAction: 'Check network connectivity and retry',
        originalError: error
      };
    }

    // Rate limit errors (retryable with backoff)
    if (
      statusCode === 429 ||
      message.includes('rate limit') ||
      message.includes('too many requests')
    ) {
      return {
        type: ErrorType.RATE_LIMIT,
        message: `Rate limit exceeded during ${context.operation}`,
        recoverable: true,
        retryable: true,
        suggestedAction: 'Wait and retry, or reduce sync frequency',
        originalError: error
      };
    }

    // Authentication errors (not retryable, needs fix)
    if (
      statusCode === 401 ||
      statusCode === 403 ||
      message.includes('authentication') ||
      message.includes('unauthorized') ||
      message.includes('forbidden')
    ) {
      return {
        type: ErrorType.AUTHENTICATION,
        message: `Authentication failed during ${context.operation}`,
        recoverable: false,
        retryable: false,
        suggestedAction: 'Check API credentials and permissions',
        originalError: error
      };
    }

    // Not found errors (may be recoverable depending on context)
    if (statusCode === 404 || message.includes('not found')) {
      return {
        type: ErrorType.NOT_FOUND,
        message: `Resource not found during ${context.operation}`,
        recoverable: true,
        retryable: false,
        suggestedAction: 'Verify the resource exists and IDs are correct',
        originalError: error
      };
    }

    // Validation errors (not retryable, needs config fix)
    if (
      statusCode === 400 ||
      message.includes('validation') ||
      message.includes('invalid') ||
      message.includes('required field')
    ) {
      return {
        type: ErrorType.VALIDATION,
        message: `Validation error during ${context.operation}`,
        recoverable: false,
        retryable: false,
        suggestedAction: 'Check configuration and field mappings',
        originalError: error
      };
    }

    // Unknown error (may be retryable)
    return {
      type: ErrorType.UNKNOWN,
      message: `Error during ${context.operation}: ${message}`,
      recoverable: true,
      retryable: true,
      suggestedAction: 'Check logs for details and retry',
      originalError: error
    };
  }

  /**
   * Handle an error with appropriate recovery strategy
   */
  async handle<T>(
    operation: () => Promise<T>,
    context: ErrorContext,
    maxRetries: number = 3
  ): Promise<T | null> {
    const operationKey = `${context.operation}-${context.jpdKey || context.githubNumber || 'unknown'}`;
    const currentAttempts = this.retryAttempts.get(operationKey) || 0;

    try {
      const result = await operation();
      // Success - reset retry counter
      this.retryAttempts.delete(operationKey);
      return result;
    } catch (error: any) {
      const classified = this.classify(error, context);

      // Log with context
      this.logError(classified, context, currentAttempts);

      // Check if should retry
      if (classified.retryable && currentAttempts < maxRetries) {
        this.retryAttempts.set(operationKey, currentAttempts + 1);
        
        // Calculate backoff delay
        const delay = this.calculateBackoff(currentAttempts);
        this.logger.info(`Retrying in ${delay}ms (attempt ${currentAttempts + 1}/${maxRetries})`);
        
        await this.sleep(delay);
        return this.handle(operation, context, maxRetries);
      }

      // Can't retry or max retries reached
      if (currentAttempts >= maxRetries) {
        this.logger.error(`Max retries (${maxRetries}) exceeded for ${context.operation}`);
      }

      // Clean up retry counter
      this.retryAttempts.delete(operationKey);

      // Return null for recoverable errors (graceful degradation)
      if (classified.recoverable) {
        this.logger.warn(`Skipping ${context.operation} due to error`);
        return null;
      }

      // Throw for non-recoverable errors
      throw new Error(`${classified.message}. ${classified.suggestedAction || ''}`);
    }
  }

  /**
   * Log error with full context
   */
  private logError(error: ClassifiedError, context: ErrorContext, attempt: number): void {
    const contextStr = [
      context.jpdKey ? `JPD: ${context.jpdKey}` : null,
      context.githubNumber ? `GitHub: #${context.githubNumber}` : null,
      context.fieldId ? `Field: ${context.fieldId}` : null,
    ].filter(Boolean).join(', ');

    this.logger.error(
      `[${error.type.toUpperCase()}] ${error.message}` +
      (contextStr ? ` (${contextStr})` : '') +
      (attempt > 0 ? ` [Attempt ${attempt + 1}]` : '')
    );

    if (error.suggestedAction) {
      this.logger.warn(`💡 ${error.suggestedAction}`);
    }

    if (context.details) {
      this.logger.debug('Error context:', context.details);
    }
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    const baseDelay = 1000;
    const maxDelay = 30000; // Cap at 30 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
    
    // Add jitter to avoid thundering herd
    const jitter = Math.random() * 0.3 * delay;
    return Math.floor(delay + jitter);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Wrap multiple operations with error handling
   */
  async handleBatch<T>(
    operations: Array<{ fn: () => Promise<T>; context: ErrorContext }>,
    continueOnError: boolean = true
  ): Promise<Array<{ result: T | null; error?: ClassifiedError }>> {
    const results: Array<{ result: T | null; error?: ClassifiedError }> = [];

    for (const { fn, context } of operations) {
      try {
        const result = await this.handle(fn, context);
        results.push({ result });
      } catch (error: any) {
        const classified = this.classify(error, context);
        results.push({ result: null, error: classified });
        
        if (!continueOnError) {
          throw error;
        }
      }
    }

    return results;
  }

  /**
   * Create a user-friendly error message
   */
  formatUserError(error: ClassifiedError, context: ErrorContext): string {
    const parts = [
      `❌ ${error.message}`,
      '',
      'Details:',
      `  Operation: ${context.operation}`,
    ];

    if (context.jpdKey) {
      parts.push(`  JPD Issue: ${context.jpdKey}`);
    }
    if (context.githubNumber) {
      parts.push(`  GitHub Issue: #${context.githubNumber}`);
    }
    if (context.fieldId) {
      parts.push(`  Field: ${context.fieldId}`);
    }

    parts.push('');
    parts.push(`Type: ${error.type}`);
    parts.push(`Recoverable: ${error.recoverable ? 'Yes' : 'No'}`);
    
    if (error.suggestedAction) {
      parts.push('');
      parts.push(`💡 Suggested Action:`);
      parts.push(`   ${error.suggestedAction}`);
    }

    return parts.join('\n');
  }

  /**
   * Get error statistics
   */
  getStats(): {
    totalRetries: number;
    activeRetries: number;
    operations: Array<{ operation: string; attempts: number }>;
  } {
    const operations = Array.from(this.retryAttempts.entries()).map(([op, attempts]) => ({
      operation: op,
      attempts
    }));

    return {
      totalRetries: operations.reduce((sum, op) => sum + op.attempts, 0),
      activeRetries: this.retryAttempts.size,
      operations
    };
  }
}

