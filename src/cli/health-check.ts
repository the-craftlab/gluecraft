#!/usr/bin/env node
/**
 * Health Check CLI - Test JPD and GitHub connectivity
 * 
 * This command validates:
 * - Environment configuration
 * - JPD API connectivity and authentication
 * - GitHub API connectivity and authentication
 * - Config file validity
 * - Rate limit status
 * 
 * Usage:
 *   pnpm run health-check
 *   pnpm run health-check --json  # JSON output for monitoring
 */

import { JpdClient } from '../clients/jpd-client.js';
import { GitHubClient } from '../clients/github-client.js';
import { Logger } from '../utils/logger.js';
import { ConfigLoader } from '../config/config-loader.js';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    env: CheckResult;
    config: CheckResult;
    jpd: CheckResult;
    github: CheckResult;
    rateLimits: CheckResult;
  };
  timestamp: string;
}

interface CheckResult {
  status: 'pass' | 'warn' | 'fail';
  message: string;
  details?: any;
}

class HealthCheck {
  private logger: Logger;
  private jsonOutput: boolean = false;

  constructor() {
    this.logger = new Logger();
    this.jsonOutput = process.argv.includes('--json');
  }

  async run(): Promise<void> {
    const result: HealthCheckResult = {
      status: 'healthy',
      checks: {
        env: await this.checkEnvironment(),
        config: await this.checkConfig(),
        jpd: await this.checkJpdConnectivity(),
        github: await this.checkGitHubConnectivity(),
        rateLimits: await this.checkRateLimits()
      },
      timestamp: new Date().toISOString()
    };

    // Determine overall health
    const statuses = Object.values(result.checks).map(c => c.status);
    if (statuses.includes('fail')) {
      result.status = 'unhealthy';
    } else if (statuses.includes('warn')) {
      result.status = 'degraded';
    }

    if (this.jsonOutput) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      this.printHumanReadable(result);
    }

    // Exit with appropriate code
    process.exit(result.status === 'unhealthy' ? 1 : 0);
  }

  private async checkEnvironment(): Promise<CheckResult> {
    const required = ['JPD_BASE_URL', 'JPD_EMAIL', 'JPD_API_KEY', 'GITHUB_TOKEN'];
    const missing = required.filter(v => !process.env[v]);

    if (missing.length === 0) {
      return {
        status: 'pass',
        message: 'All required environment variables present'
      };
    }

    return {
      status: 'fail',
      message: `Missing environment variables: ${missing.join(', ')}`,
      details: { missing }
    };
  }

  private async checkConfig(): Promise<CheckResult> {
    try {
      const configPath = process.env.CONFIG_PATH || 'config/gluecraft.yaml';
      const config = ConfigLoader.load(configPath);

      const warnings: string[] = [];

      // Check if JQL is configured
      if (!config.sync.jql) {
        warnings.push('No JQL query configured');
      }

      // Check if mappings are configured
      if (!config.mappings || config.mappings.length === 0) {
        warnings.push('No field mappings configured');
      }

      // Check if statuses are configured
      if (!config.statuses || Object.keys(config.statuses).length === 0) {
        warnings.push('No status mappings configured');
      }

      if (warnings.length > 0) {
        return {
          status: 'warn',
          message: 'Config loaded with warnings',
          details: { warnings }
        };
      }

      return {
        status: 'pass',
        message: 'Configuration valid',
        details: {
          path: configPath,
          mappings: config.mappings.length,
          statuses: config.statuses ? Object.keys(config.statuses).length : 0
        }
      };
    } catch (error: any) {
      return {
        status: 'fail',
        message: `Config validation failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  private async checkJpdConnectivity(): Promise<CheckResult> {
    try {
      const jpd = new JpdClient({
        baseUrl: process.env.JPD_BASE_URL!,
        email: process.env.JPD_EMAIL!,
        apiToken: process.env.JPD_API_KEY!
      });

      // Test connectivity with a simple search for any issue (limit 1)
      // Use a basic JQL query that won't be unbounded
      const projectKey = process.env.JPD_PROJECT_KEY || 'TEST';
      const result = await jpd.searchIssues(`project = ${projectKey}`, ['key'], 1);
      
      return {
        status: 'pass',
        message: 'JPD API connection successful',
        details: {
          baseUrl: process.env.JPD_BASE_URL,
          email: process.env.JPD_EMAIL,
          projectKey
        }
      };
    } catch (error: any) {
      return {
        status: 'fail',
        message: `JPD connection failed: ${error.message}`,
        details: {
          error: error.message,
          baseUrl: process.env.JPD_BASE_URL
        }
      };
    }
  }

  private async checkGitHubConnectivity(): Promise<CheckResult> {
    try {
      const github = new GitHubClient(
        process.env.GITHUB_TOKEN!,
        this.logger,
        false,
        process.env.GITHUB_OWNER,
        process.env.GITHUB_REPO
      );

      // Test connectivity by listing a single issue
      // This verifies both authentication and repo access
      const owner = process.env.GITHUB_OWNER || 'test';
      const repo = process.env.GITHUB_REPO || 'test';
      
      await github.getAllIssues(owner, repo);

      return {
        status: 'pass',
        message: 'GitHub API connection successful',
        details: {
          owner,
          repo
        }
      };
    } catch (error: any) {
      return {
        status: 'fail',
        message: `GitHub connection failed: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  private async checkRateLimits(): Promise<CheckResult> {
    try {
      // Use Octokit directly for rate limit check
      const { Octokit } = await import('@octokit/rest');
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN! });
      
      const { data } = await octokit.rateLimit.get();
      const core = data.resources.core;
      const percentUsed = ((core.limit - core.remaining) / core.limit) * 100;

      if (core.remaining < 100) {
        return {
          status: 'warn',
          message: 'GitHub rate limit low',
          details: {
            remaining: core.remaining,
            limit: core.limit,
            reset: new Date(core.reset * 1000).toISOString()
          }
        };
      }

      return {
        status: 'pass',
        message: 'Rate limits healthy',
        details: {
          remaining: core.remaining,
          limit: core.limit,
          percentUsed: percentUsed.toFixed(1) + '%'
        }
      };
    } catch (error: any) {
      return {
        status: 'warn',
        message: `Could not check rate limits: ${error.message}`,
        details: { error: error.message }
      };
    }
  }

  private printHumanReadable(result: HealthCheckResult): void {
    console.log(chalk.bold('\n🏥 Health Check Report\n'));
    console.log(chalk.gray(`Timestamp: ${result.timestamp}\n`));

    // Overall status
    const statusIcon = result.status === 'healthy' ? '✅' : result.status === 'degraded' ? '⚠️' : '❌';
    const statusColor = result.status === 'healthy' ? chalk.green : result.status === 'degraded' ? chalk.yellow : chalk.red;
    console.log(statusColor.bold(`${statusIcon} Overall Status: ${result.status.toUpperCase()}\n`));

    // Individual checks
    console.log(chalk.bold('Checks:\n'));

    const checks = [
      { name: 'Environment Variables', key: 'env' },
      { name: 'Configuration File', key: 'config' },
      { name: 'JPD Connectivity', key: 'jpd' },
      { name: 'GitHub Connectivity', key: 'github' },
      { name: 'Rate Limits', key: 'rateLimits' }
    ];

    checks.forEach(({ name, key }) => {
      const check = result.checks[key as keyof typeof result.checks];
      const icon = check.status === 'pass' ? '✓' : check.status === 'warn' ? '⚠' : '✗';
      const color = check.status === 'pass' ? chalk.green : check.status === 'warn' ? chalk.yellow : chalk.red;
      
      console.log(color(`  ${icon} ${name}`));
      console.log(chalk.gray(`     ${check.message}`));
      
      if (check.details) {
        const details = JSON.stringify(check.details, null, 2)
          .split('\n')
          .map(line => chalk.gray(`       ${line}`))
          .join('\n');
        console.log(details);
      }
      console.log('');
    });

    // Suggestions
    if (result.status !== 'healthy') {
      console.log(chalk.bold('\n💡 Suggestions:\n'));
      
      if (result.checks.env.status === 'fail') {
        console.log(chalk.gray('  • Set missing environment variables in .env file'));
      }
      if (result.checks.config.status === 'fail') {
        console.log(chalk.gray('  • Fix configuration errors in config/gluecraft.yaml'));
      }
      if (result.checks.jpd.status === 'fail') {
        console.log(chalk.gray('  • Check JPD credentials and base URL'));
        console.log(chalk.gray('  • Verify network connectivity to JPD'));
      }
      if (result.checks.github.status === 'fail') {
        console.log(chalk.gray('  • Check GitHub token permissions'));
        console.log(chalk.gray('  • Verify token has not expired'));
      }
      if (result.checks.rateLimits.status === 'warn') {
        console.log(chalk.gray('  • GitHub rate limit is low, consider waiting or using a different token'));
      }
      console.log('');
    }
  }
}

// Run health check
const healthCheck = new HealthCheck();
healthCheck.run().catch(error => {
  console.error(chalk.red('Health check failed:'), error.message);
  process.exit(1);
});

