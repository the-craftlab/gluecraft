#!/usr/bin/env node
/**
 * Simple Connection Test
 * Just test if credentials work - no caching, no retry, no complexity
 */

import chalk from 'chalk';
import dotenv from 'dotenv';
import { JpdClient } from '../clients/jpd-client.js';
import { Octokit } from '@octokit/rest';

dotenv.config();

async function main() {
  console.log(chalk.cyan.bold('\n🔌 Simple Connection Test\n'));

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
    process.exit(1);
  }

  // Test JPD - simple, no retry
  console.log('Testing JPD connection...');
  try {
    const jpd = new JpdClient({
      baseUrl: process.env.JPD_BASE_URL!,
      email: process.env.JPD_EMAIL!,
      apiToken: process.env.JPD_API_KEY!
    });

    // Simple, fast query - just get 1 recent issue from any project
    const result = await jpd.searchIssues('created > -7d order by created DESC', ['key'], 1);
    console.log(chalk.green(`✔ JPD connection works! (found ${result.total || 0} recent issues)`));
  } catch (error: any) {
    console.error(chalk.red('✖ JPD connection failed:'), error.message);
    
    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      console.log(chalk.yellow('\n⚠️  Rate limit hit - this is normal if you tested recently'));
      console.log(chalk.gray('   Wait 2-3 minutes and try again\n'));
    } else {
      console.log(chalk.yellow('\n💡 Check JPD_BASE_URL, JPD_EMAIL, and JPD_API_KEY in .env\n'));
    }
    process.exit(1);
  }

  // Test GitHub
  console.log('Testing GitHub connection...');
  try {
    const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
    const repo = await octokit.repos.get({
      owner: process.env.GITHUB_OWNER!,
      repo: process.env.GITHUB_REPO!
    });
    console.log(chalk.green(`✔ GitHub connection works! (${repo.data.full_name})`));
  } catch (error: any) {
    console.error(chalk.red('✖ GitHub connection failed:'), error.message);
    console.log(chalk.yellow('\n💡 Check GITHUB_TOKEN, GITHUB_OWNER, and GITHUB_REPO in .env\n'));
    process.exit(1);
  }

  console.log(chalk.green.bold('\n✅ All credentials valid!\n'));
  console.log(chalk.gray('Next step: Run sync with:'));
  console.log(chalk.cyan('  pnpm run dev -- --dry-run\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Error:'), error.message);
  process.exit(1);
});

