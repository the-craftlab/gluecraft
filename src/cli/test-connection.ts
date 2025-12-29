#!/usr/bin/env node
/**
 * Connection Test Tool
 * 
 * Quick test of JPD and GitHub connections using .env credentials
 */

import chalk from 'chalk';
import ora from 'ora';
import dotenv from 'dotenv';
import { JpdClient } from '../clients/jpd-client.js';
import { Octokit } from '@octokit/rest';
import { RateLimitHandler } from '../utils/rate-limit-handler.js';
import { ConnectionCache } from '../utils/connection-cache.js';

dotenv.config();

// Force fresh test if --force flag is passed
const forceTest = process.argv.includes('--force');

async function main() {
  console.log(chalk.cyan.bold('\n🔌 Connection Test\n'));

  // Check env vars
  const missing = [];
  if (!process.env.JPD_BASE_URL) missing.push('JPD_BASE_URL');
  if (!process.env.JPD_EMAIL) missing.push('JPD_EMAIL');
  if (!process.env.JPD_API_KEY) missing.push('JPD_API_KEY');
  if (!process.env.GITHUB_TOKEN) missing.push('GITHUB_TOKEN');
  if (!process.env.GITHUB_OWNER) missing.push('GITHUB_OWNER');
  if (!process.env.GITHUB_REPO) missing.push('GITHUB_REPO');

  if (missing.length > 0) {
    console.error(chalk.red('❌ Missing environment variables:\n'));
    missing.forEach(v => console.log(chalk.red(`  - ${v}`)));
    console.log(chalk.yellow('\n💡 Create a .env file or run "pnpm run setup"\n'));
    process.exit(1);
  }

  // Test JPD
  const jpdCreds = {
    baseUrl: process.env.JPD_BASE_URL!,
    email: process.env.JPD_EMAIL!,
    apiToken: process.env.JPD_API_KEY!
  };

  // Check cache first
  const jpdCached = !forceTest && ConnectionCache.isValid('jpd', jpdCreds);
  if (jpdCached) {
    const age = ConnectionCache.getAge('jpd');
    console.log(chalk.green(`✔ JPD connection verified (cached, ${age}s ago)`));
  } else {
    const jpdSpinner = ora('Testing JPD connection...').start();
    try {
      const jpd = new JpdClient(jpdCreds);

      // Fast, lightweight test query - just get 1 recent issue
      const result = await RateLimitHandler.withRetry(
        () => jpd.searchIssues('created > -7d order by created DESC', ['key'], 1),
        {
          maxRetries: 2,
          initialDelay: 3000,
          onRetry: (attempt, delay, error) => {
            const waitSec = Math.round(delay / 1000);
            jpdSpinner.text = `Rate limit hit, waiting ${waitSec}s before retry ${attempt}/2...`;
          }
        }
      );

      ConnectionCache.markSuccess('jpd', jpdCreds);
      jpdSpinner.succeed(chalk.green(`JPD connection successful (found ${result.total || 0} recent issues)`));
    } catch (error: any) {
      jpdSpinner.fail(chalk.red('JPD connection failed'));
      
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        console.error(chalk.red('\n❌ Rate limit exceeded'));
        console.log(chalk.yellow('💡 JPD has strict rate limits. Try again in a minute, or use:'));
        console.log(chalk.cyan('     pnpm run validate-config ') + chalk.gray('(validates without API calls)\n'));
      } else {
        console.error(chalk.red('\n❌ Error:'), error.message);
        console.log(chalk.yellow('\n💡 Check your credentials in .env file\n'));
      }
      process.exit(1);
    }
  }

  // Test GitHub
  const ghCreds = {
    token: process.env.GITHUB_TOKEN!,
    owner: process.env.GITHUB_OWNER!,
    repo: process.env.GITHUB_REPO!
  };

  const ghCached = !forceTest && ConnectionCache.isValid('github', ghCreds);
  if (ghCached) {
    const age = ConnectionCache.getAge('github');
    console.log(chalk.green(`✔ GitHub connection verified (cached, ${age}s ago)`));
  } else {
    const ghSpinner = ora('Testing GitHub connection...').start();
    try {
      const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
      
      const repo = await RateLimitHandler.withRetry(
        () => octokit.repos.get({
          owner: process.env.GITHUB_OWNER!,
          repo: process.env.GITHUB_REPO!
        }),
        {
          maxRetries: 2,
          initialDelay: 2000
        }
      );

      ConnectionCache.markSuccess('github', ghCreds);
      ghSpinner.succeed(chalk.green(`GitHub connection successful (${repo.data.full_name})`));
    } catch (error: any) {
      ghSpinner.fail(chalk.red('GitHub connection failed'));
      console.error(chalk.red('\n❌ Error:'), error.message);
      console.log(chalk.yellow('\n💡 Check your GitHub token and repo access\n'));
      process.exit(1);
    }
  }

  console.log(chalk.green.bold('\n✅ All connections successful!\n'));
  
  if (jpdCached || ghCached) {
    console.log(chalk.gray('💡 Tip: Connection results are cached for 5 minutes.'));
    console.log(chalk.gray('   Use --force to skip cache: ') + chalk.cyan('pnpm run test-connection --force\n'));
  }
  
  console.log(chalk.gray('You can now run:'));
  console.log(chalk.cyan('  pnpm run dev -- --dry-run  ') + chalk.gray('# Test sync'));
  console.log(chalk.cyan('  pnpm run dev               ') + chalk.gray('# Run actual sync\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Unexpected error:'), error);
  process.exit(1);
});

