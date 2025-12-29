#!/usr/bin/env node
/**
 * Clear GitHub Labels Matching Pattern
 * 
 * Utility to remove labels from GitHub issues that match a specified pattern.
 * Useful for cleaning up old sync labels or resetting status labels.
 * 
 * Usage:
 *   pnpm tsx src/cli/clear-labels.ts --pattern "epic:" --dry-run
 *   pnpm tsx src/cli/clear-labels.ts --pattern "status:" 
 *   pnpm tsx src/cli/clear-labels.ts --pattern "type:" --only-synced
 * 
 * Options:
 *   --pattern <string>    Pattern to match (prefix match, e.g., "epic:" matches "epic:MTT-123")
 *   --regex <string>      Use regex pattern instead (e.g., "^(epic|story):")
 *   --dry-run            Show what would be removed without making changes
 *   --only-synced        Only process issues with jpd-synced label
 *   --repo <owner/repo>  Override repo from config
 */

import { Octokit } from '@octokit/rest';
import * as dotenv from 'dotenv';
import { Logger } from '../utils/logger.js';

dotenv.config();

interface ClearLabelsOptions {
  pattern?: string;
  regex?: string;
  dryRun: boolean;
  onlySynced: boolean;
  owner: string;
  repo: string;
}

class LabelCleaner {
  private octokit: Octokit;
  private logger: Logger;
  private options: ClearLabelsOptions;
  
  constructor(token: string, options: ClearLabelsOptions) {
    this.octokit = new Octokit({ auth: token });
    this.logger = new Logger('label-cleaner');
    this.options = options;
  }

  /**
   * Get all issues to process
   */
  async getIssues(): Promise<any[]> {
    const { owner, repo, onlySynced } = this.options;
    
    // Build search query
    let query = `repo:${owner}/${repo} is:issue`;
    
    if (onlySynced) {
      query += ' label:jpd-synced';
    }
    
    this.logger.info(`Searching for issues: ${query}`);
    
    const { data } = await this.octokit.search.issuesAndPullRequests({
      q: query,
      per_page: 100
    });
    
    this.logger.info(`Found ${data.items.length} issues`);
    return data.items;
  }

  /**
   * Check if a label matches the pattern
   */
  private matchesPattern(label: string): boolean {
    const { pattern, regex } = this.options;
    
    if (regex) {
      const re = new RegExp(regex);
      return re.test(label);
    }
    
    if (pattern) {
      return label.startsWith(pattern);
    }
    
    return false;
  }

  /**
   * Get labels to remove from an issue
   */
  private getLabelsToRemove(labels: any[]): string[] {
    return labels
      .map(l => typeof l === 'string' ? l : l.name || '')
      .filter(label => this.matchesPattern(label));
  }

  /**
   * Get labels to keep for an issue
   */
  private getLabelsToKeep(labels: any[]): string[] {
    return labels
      .map(l => typeof l === 'string' ? l : l.name || '')
      .filter(label => !this.matchesPattern(label));
  }

  /**
   * Process a single issue
   */
  async processIssue(issue: any): Promise<void> {
    const labelsToRemove = this.getLabelsToRemove(issue.labels);
    
    if (labelsToRemove.length === 0) {
      return;
    }
    
    const labelsToKeep = this.getLabelsToKeep(issue.labels);
    
    this.logger.info(`Issue #${issue.number}: "${issue.title}"`);
    this.logger.info(`  Current labels: ${issue.labels.map((l: any) => l.name || l).join(', ')}`);
    this.logger.info(`  Will remove: ${labelsToRemove.join(', ')}`);
    this.logger.info(`  Will keep: ${labelsToKeep.join(', ')}`);
    
    if (this.options.dryRun) {
      this.logger.info(`  [DRY RUN] Would update labels`);
      return;
    }
    
    // Update the issue with new labels
    try {
      await this.octokit.issues.update({
        owner: this.options.owner,
        repo: this.options.repo,
        issue_number: issue.number,
        labels: labelsToKeep
      });
      this.logger.success(`  ✓ Updated labels`);
    } catch (error: any) {
      this.logger.error(`  ✗ Failed to update: ${error.message}`);
    }
  }

  /**
   * Run the label cleaning process
   */
  async run(): Promise<void> {
    this.logger.info('='.repeat(60));
    this.logger.info('GitHub Label Cleaner');
    this.logger.info('='.repeat(60));
    
    if (this.options.pattern) {
      this.logger.info(`Pattern (prefix): "${this.options.pattern}"`);
    }
    
    if (this.options.regex) {
      this.logger.info(`Pattern (regex): "${this.options.regex}"`);
    }
    
    this.logger.info(`Repository: ${this.options.owner}/${this.options.repo}`);
    this.logger.info(`Mode: ${this.options.dryRun ? 'DRY RUN' : 'LIVE'}`);
    this.logger.info(`Filter: ${this.options.onlySynced ? 'JPD-synced only' : 'All issues'}`);
    this.logger.info('='.repeat(60));
    this.logger.info('');
    
    // Get all issues
    const issues = await this.getIssues();
    
    if (issues.length === 0) {
      this.logger.warn('No issues found');
      return;
    }
    
    // Process each issue
    let processed = 0;
    let updated = 0;
    
    for (const issue of issues) {
      const labelsToRemove = this.getLabelsToRemove(issue.labels);
      
      if (labelsToRemove.length > 0) {
        await this.processIssue(issue);
        updated++;
      }
      
      processed++;
    }
    
    this.logger.info('');
    this.logger.info('='.repeat(60));
    this.logger.info(`Summary:`);
    this.logger.info(`  Processed: ${processed} issues`);
    this.logger.info(`  Updated: ${updated} issues`);
    
    if (this.options.dryRun) {
      this.logger.info('');
      this.logger.info('This was a DRY RUN. No changes were made.');
      this.logger.info('Run without --dry-run to apply changes.');
    }
    
    this.logger.info('='.repeat(60));
  }
}

// Parse command line arguments
function parseArgs(): ClearLabelsOptions | null {
  const args = process.argv.slice(2);
  
  let pattern: string | undefined;
  let regex: string | undefined;
  let dryRun = false;
  let onlySynced = false;
  let repo: string | undefined;
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--pattern' && args[i + 1]) {
      pattern = args[++i];
    } else if (arg === '--regex' && args[i + 1]) {
      regex = args[++i];
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--only-synced') {
      onlySynced = true;
    } else if (arg === '--repo' && args[i + 1]) {
      repo = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Clear GitHub Labels Matching Pattern

Usage:
  pnpm tsx src/cli/clear-labels.ts --pattern "epic:" --dry-run
  pnpm tsx src/cli/clear-labels.ts --regex "^(epic|story):" 
  pnpm tsx src/cli/clear-labels.ts --pattern "type:" --only-synced

Options:
  --pattern <string>    Pattern to match (prefix match)
  --regex <string>      Use regex pattern instead
  --dry-run            Show what would be removed without making changes
  --only-synced        Only process issues with jpd-synced label
  --repo <owner/repo>  Override repo (default: from GITHUB_REPO env)
  --help, -h           Show this help message
      `);
      return null;
    }
  }
  
  if (!pattern && !regex) {
    console.error('Error: Must specify either --pattern or --regex');
    console.error('Use --help for usage information');
    return null;
  }
  
  // Get repo from args or env
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
    pattern,
    regex,
    dryRun,
    onlySynced,
    owner,
    repo: repoName
  };
}

// Main execution
async function main() {
  const options = parseArgs();
  
  if (!options) {
    process.exit(1);
  }
  
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    console.error('Error: GITHUB_TOKEN not set in .env');
    process.exit(1);
  }
  
  const cleaner = new LabelCleaner(token, options);
  
  try {
    await cleaner.run();
  } catch (error: any) {
    console.error(`Fatal error: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

main();

