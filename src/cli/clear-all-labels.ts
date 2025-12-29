#!/usr/bin/env node
/**
 * Clear All Labels from JPD-Synced Issues
 * 
 * Simple utility to remove all labels from synced issues.
 * 
 * Usage:
 *   pnpm tsx src/cli/clear-all-labels.ts --dry-run
 *   pnpm tsx src/cli/clear-all-labels.ts --keep-synced
 *   pnpm tsx src/cli/clear-all-labels.ts
 */

import { Octokit } from '@octokit/rest';
import * as dotenv from 'dotenv';
import { Logger } from '../utils/logger.js';

dotenv.config();

interface ClearOptions {
  dryRun: boolean;
  owner: string;
  repo: string;
}

class AllLabelsCleaner {
  private octokit: Octokit;
  private logger: Logger;
  private options: ClearOptions;
  
  constructor(token: string, options: ClearOptions) {
    this.octokit = new Octokit({ auth: token });
    this.logger = new Logger('clear-all-labels');
    this.options = options;
  }

  async getIssues(): Promise<any[]> {
    const { owner, repo } = this.options;
    const query = `repo:${owner}/${repo} is:issue "jpd-sync-metadata"`;
    
    this.logger.info(`Searching: ${query}`);
    
    const { data } = await this.octokit.search.issuesAndPullRequests({
      q: query,
      per_page: 100
    });
    
    return data.items;
  }

  async processIssue(issue: any): Promise<void> {
    const currentLabels = issue.labels.map((l: any) => l.name || l);
    
    if (currentLabels.length === 0) {
      return; // No labels to remove
    }
    
    const newLabels: string[] = []; // Remove all labels - sync tracked via hidden metadata
    
    this.logger.info(`Issue #${issue.number}: "${issue.title}"`);
    this.logger.info(`  Current: ${currentLabels.join(', ')}`);
    this.logger.info(`  After: ${newLabels.length > 0 ? newLabels.join(', ') : '(none)'}`);
    
    if (this.options.dryRun) {
      this.logger.info(`  [DRY RUN]`);
      return;
    }
    
    try {
      await this.octokit.issues.update({
        owner: this.options.owner,
        repo: this.options.repo,
        issue_number: issue.number,
        labels: newLabels
      });
      this.logger.success(`  ✓ Updated`);
    } catch (error: any) {
      this.logger.error(`  ✗ Failed: ${error.message}`);
    }
  }

  async run(): Promise<void> {
    this.logger.info('='.repeat(60));
    this.logger.info('Clear All Labels from JPD-Synced Issues');
    this.logger.info('='.repeat(60));
    this.logger.info(`Repository: ${this.options.owner}/${this.options.repo}`);
    this.logger.info(`Mode: ${this.options.dryRun ? 'DRY RUN' : 'LIVE'}`);
    this.logger.info('Note: Sync tracking via hidden metadata (no labels needed)');
    this.logger.info('='.repeat(60));
    this.logger.info('');
    
    const issues = await this.getIssues();
    
    if (issues.length === 0) {
      this.logger.warn('No JPD-synced issues found (searched for hidden metadata)');
      return;
    }
    
    this.logger.info(`Found ${issues.length} issues\n`);
    
    for (const issue of issues) {
      await this.processIssue(issue);
    }
    
    this.logger.info('');
    this.logger.info('='.repeat(60));
    this.logger.info(`Summary: Processed ${issues.length} issues`);
    
    if (this.options.dryRun) {
      this.logger.info('');
      this.logger.info('This was a DRY RUN. Run without --dry-run to apply.');
    }
    
    this.logger.info('='.repeat(60));
  }
}

function parseArgs(): ClearOptions | null {
  const args = process.argv.slice(2);
  
  let dryRun = false;
  let repo: string | undefined;
  
  for (const arg of args) {
    if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg.startsWith('--repo=')) {
      repo = arg.split('=')[1];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Clear All Labels from JPD-Synced Issues

Removes all labels from issues tracked by JPD sync.
Sync tracking is maintained via hidden metadata in issue bodies.

Usage:
  pnpm tsx src/cli/clear-all-labels.ts [options]

Options:
  --dry-run         Preview changes without applying
  --repo=owner/repo Override repo from env
  --help, -h        Show this help
      `);
      return null;
    }
  }
  
  let owner: string;
  let repoName: string;
  
  if (repo) {
    // --repo flag provided as owner/repo
    const parts = repo.split('/');
    if (parts.length !== 2) {
      console.error('Error: Invalid repo format. Expected: owner/repo');
      return null;
    }
    [owner, repoName] = parts;
  } else {
    // Try combined format first, then separate vars
    const combined = process.env.GITHUB_REPO;
    if (combined && combined.includes('/')) {
      [owner, repoName] = combined.split('/');
    } else {
      // Use separate GITHUB_OWNER and GITHUB_REPO
      owner = process.env.GITHUB_OWNER || '';
      repoName = combined || process.env.GITHUB_REPO || '';
    }
  }
  
  if (!owner || !repoName) {
    console.error('Error: GITHUB_OWNER and GITHUB_REPO not set in .env');
    return null;
  }
  
  return {
    dryRun,
    owner,
    repo: repoName
  };
}

async function main() {
  const options = parseArgs();
  
  if (!options) {
    process.exit(1);
  }
  
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    console.error('Error: GITHUB_TOKEN not set');
    process.exit(1);
  }
  
  const cleaner = new AllLabelsCleaner(token, options);
  
  try {
    await cleaner.run();
  } catch (error: any) {
    console.error(`Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

