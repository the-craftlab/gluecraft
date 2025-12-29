/**
 * Enhanced Logger with Structured Logging and Metrics
 * 
 * Features:
 * - Multiple log levels (ERROR, WARN, INFO, DEBUG)
 * - JSON output mode for log aggregation
 * - Contextual logging with metadata
 * - Performance metrics tracking
 * - Configurable via environment variables
 * 
 * Environment Variables:
 * - LOG_LEVEL: error|warn|info|debug (default: info)
 * - LOG_FORMAT: json|human (default: human)
 * - DEBUG: true|false (legacy, overrides LOG_LEVEL to debug)
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3
}

export interface LogContext {
  operation?: string;
  jpdKey?: string;
  githubNumber?: number;
  duration?: number;
  [key: string]: any;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
}

export interface Metrics {
  syncDuration: number;
  issuesSynced: number;
  issuesCreated: number;
  issuesUpdated: number;
  issuesSkipped: number;
  errors: number;
  warnings: number;
  apiCalls: number;
  startTime: number;
  endTime?: number;
}

export class Logger {
  private static currentLevel: LogLevel = Logger.parseLogLevel();
  private static format: 'json' | 'human' = Logger.parseLogFormat();
  private static metrics: Metrics = Logger.initMetrics();

  /**
   * Parse log level from environment
   */
  private static parseLogLevel(): LogLevel {
    // Legacy DEBUG flag
    if (process.env.DEBUG === 'true' || process.env.DEBUG === '1') {
      return LogLevel.DEBUG;
    }

    const level = (process.env.LOG_LEVEL || 'info').toLowerCase();
    switch (level) {
      case 'error': return LogLevel.ERROR;
      case 'warn': return LogLevel.WARN;
      case 'info': return LogLevel.INFO;
      case 'debug': return LogLevel.DEBUG;
      default: return LogLevel.INFO;
    }
  }

  /**
   * Parse log format from environment
   */
  private static parseLogFormat(): 'json' | 'human' {
    const format = (process.env.LOG_FORMAT || 'human').toLowerCase();
    return format === 'json' ? 'json' : 'human';
  }

  /**
   * Initialize metrics
   */
  private static initMetrics(): Metrics {
    return {
      syncDuration: 0,
      issuesSynced: 0,
      issuesCreated: 0,
      issuesUpdated: 0,
      issuesSkipped: 0,
      errors: 0,
      warnings: 0,
      apiCalls: 0,
      startTime: Date.now()
    };
  }

  /**
   * Log at ERROR level
   */
  static error(message: string, context?: LogContext) {
    if (this.currentLevel >= LogLevel.ERROR) {
      this.metrics.errors++;
      this.log(LogLevel.ERROR, message, context);
    }
  }

  /**
   * Log at WARN level
   */
  static warn(message: string, context?: LogContext) {
    if (this.currentLevel >= LogLevel.WARN) {
      this.metrics.warnings++;
      this.log(LogLevel.WARN, message, context);
    }
  }

  /**
   * Log at INFO level
   */
  static info(message: string, context?: LogContext) {
    if (this.currentLevel >= LogLevel.INFO) {
      this.log(LogLevel.INFO, message, context);
    }
  }

  /**
   * Log at DEBUG level
   */
  static debug(message: string, context?: LogContext) {
    if (this.currentLevel >= LogLevel.DEBUG) {
      this.log(LogLevel.DEBUG, message, context);
    }
  }

  /**
   * Log success message (INFO level with icon)
   */
  static success(message: string, context?: LogContext) {
    if (this.format === 'human') {
      this.info(`✅ ${message}`, context);
    } else {
      this.info(message, { ...context, success: true });
    }
  }

  /**
   * Log section header (human format only)
   */
  static section(title: string) {
    if (this.format === 'human' && this.currentLevel >= LogLevel.INFO) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log(`  ${title}`);
      console.log(`${'─'.repeat(60)}`);
    } else {
      this.info(`=== ${title} ===`);
    }
  }

  /**
   * Core logging method
   */
  private static log(level: LogLevel, message: string, context?: LogContext) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      message,
      context
    };

    if (this.format === 'json') {
      this.logJson(entry);
    } else {
      this.logHuman(level, message, context);
    }
  }

  /**
   * Output JSON format
   */
  private static logJson(entry: LogEntry) {
    console.log(JSON.stringify(entry));
  }

  /**
   * Output human-readable format
   */
  private static logHuman(level: LogLevel, message: string, context?: LogContext) {
    const timestamp = new Date().toLocaleTimeString();
    const icon = this.getLevelIcon(level);
    const color = this.getLevelColor(level);
    
    let output = `${color}[${timestamp}] ${icon} ${message}\x1b[0m`;
    
    if (context && Object.keys(context).length > 0) {
      const contextStr = Object.entries(context)
        .map(([key, value]) => `${key}=${JSON.stringify(value)}`)
        .join(', ');
      output += `\x1b[90m (${contextStr})\x1b[0m`;
    }

    switch (level) {
      case LogLevel.ERROR:
        console.error(output);
        break;
      case LogLevel.WARN:
        console.warn(output);
        break;
      default:
        console.log(output);
    }
  }

  /**
   * Get icon for log level
   */
  private static getLevelIcon(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '❌';
      case LogLevel.WARN: return '⚠️';
      case LogLevel.INFO: return 'ℹ️';
      case LogLevel.DEBUG: return '🔍';
      default: return '';
    }
  }

  /**
   * Get color code for log level
   */
  private static getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.ERROR: return '\x1b[31m'; // Red
      case LogLevel.WARN: return '\x1b[33m'; // Yellow
      case LogLevel.INFO: return '\x1b[0m';  // Default
      case LogLevel.DEBUG: return '\x1b[90m'; // Gray
      default: return '\x1b[0m';
    }
  }

  /**
   * Metrics tracking
   */
  static trackMetric(metric: keyof Metrics, value: number = 1) {
    if (typeof this.metrics[metric] === 'number') {
      (this.metrics[metric] as number) += value;
    }
  }

  static incrementIssuesSynced() { this.trackMetric('issuesSynced'); }
  static incrementIssuesCreated() { this.trackMetric('issuesCreated'); }
  static incrementIssuesUpdated() { this.trackMetric('issuesUpdated'); }
  static incrementIssuesSkipped() { this.trackMetric('issuesSkipped'); }
  static incrementApiCalls() { this.trackMetric('apiCalls'); }

  /**
   * Get current metrics
   */
  static getMetrics(): Metrics {
    return {
      ...this.metrics,
      syncDuration: Date.now() - this.metrics.startTime,
      endTime: Date.now()
    };
  }

  /**
   * Reset metrics
   */
  static resetMetrics() {
    this.metrics = this.initMetrics();
  }

  /**
   * Log metrics summary
   */
  static logMetrics() {
    const metrics = this.getMetrics();
    const duration = (metrics.syncDuration / 1000).toFixed(2);

    if (this.format === 'json') {
      this.info('sync_complete', {
        duration_seconds: parseFloat(duration),
        issues_synced: metrics.issuesSynced,
        issues_created: metrics.issuesCreated,
        issues_updated: metrics.issuesUpdated,
        issues_skipped: metrics.issuesSkipped,
        errors: metrics.errors,
        warnings: metrics.warnings,
        api_calls: metrics.apiCalls
      });
    } else {
      console.log('\n' + '═'.repeat(60));
      console.log('  📊 Sync Metrics');
      console.log('═'.repeat(60));
      console.log(`Duration:        ${duration}s`);
      console.log(`Issues Synced:   ${metrics.issuesSynced}`);
      console.log(`  - Created:     ${metrics.issuesCreated}`);
      console.log(`  - Updated:     ${metrics.issuesUpdated}`);
      console.log(`  - Skipped:     ${metrics.issuesSkipped}`);
      console.log(`Errors:          ${metrics.errors}`);
      console.log(`Warnings:        ${metrics.warnings}`);
      console.log(`API Calls:       ${metrics.apiCalls}`);
      console.log('═'.repeat(60) + '\n');
    }
  }

  /**
   * Performance timing utility
   */
  static async time<T>(
    operation: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    this.debug(`Starting: ${operation}`);
    
    try {
      const result = await fn();
      const duration = Date.now() - start;
      this.debug(`Completed: ${operation}`, { duration_ms: duration });
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      this.error(`Failed: ${operation}`, { duration_ms: duration });
      throw error;
    }
  }

  // Instance methods (delegate to static methods with instance context)
  private context: LogContext = {};

  constructor(defaultContext?: LogContext) {
    this.context = defaultContext || {};
  }

  info(message: string, additionalContext?: LogContext) {
    Logger.info(message, { ...this.context, ...additionalContext });
  }

  warn(message: string, additionalContext?: LogContext) {
    Logger.warn(message, { ...this.context, ...additionalContext });
  }

  error(message: string, additionalContext?: LogContext) {
    Logger.error(message, { ...this.context, ...additionalContext });
  }

  debug(message: string, additionalContext?: LogContext) {
    Logger.debug(message, { ...this.context, ...additionalContext });
  }

  success(message: string, additionalContext?: LogContext) {
    Logger.success(message, { ...this.context, ...additionalContext });
  }
}

