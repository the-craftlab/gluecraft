#!/usr/bin/env node
/**
 * Gluecraft Unified CLI
 * 
 * Single entry point for all Gluecraft commands with subcommand routing.
 * 
 * This file provides a modern CLI experience with git-style subcommands,
 * replacing the previous separate executable approach. All commands route
 * through this entry point using Commander.js for argument parsing and help.
 */

import { Command } from 'commander';
import { SetupCLI } from './cli/setup.js';
import chalk from 'chalk';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file if present
dotenv.config();

const program = new Command();

program
  .name('gluecraft')
  .description('Gluecraft JPD: Bidirectional sync between Jira Product Discovery and GitHub Issues')
  .version('0.0.2');

// Sync command (default when no subcommand specified)
program
  .command('sync', { isDefault: true })
  .description('Run bidirectional sync between JPD and GitHub')
  .option('--dry-run', 'Preview changes without applying them')
  .option('--config <path>', 'Path to config file', 'config/gluecraft.yaml')
  .action(async (options) => {
    try {
      console.log('\n' + '='.repeat(60));
      console.log('  JPD ↔ GitHub Sync Engine');
      console.log('='.repeat(60) + '\n');

      if (options.dryRun) {
        console.log('⚠️  DRY RUN MODE - No changes will be made\n');
      }

      // Validate environment variables
      if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
      if (!process.env.JPD_API_KEY) throw new Error('JPD_API_KEY is required');

      const configPath = path.resolve(process.cwd(), options.config);
      const { SyncEngine } = await import('./sync-engine.js');
      const engine = new SyncEngine(configPath, options.dryRun);
      await engine.run();
      
      console.log('\n' + '='.repeat(60));
      console.log('  ✅ Sync Complete');
      console.log('='.repeat(60) + '\n');
    } catch (error: any) {
      console.log('\n' + '='.repeat(60));
      console.log('  ❌ Sync Failed');
      console.log('='.repeat(60));
      console.error(chalk.red('\nError:'), error.message);
      process.exit(1);
    }
  });

// Setup command
program
  .command('setup')
  .description('Interactive setup wizard for configuration')
  .action(async () => {
    try {
      const cli = new SetupCLI();
      await cli.run();
    } catch (error: any) {
      console.error(chalk.red('\nSetup failed:'), error.message);
      process.exit(1);
    }
  });

// Discover command
program
  .command('discover <projectKey>')
  .description('Discover JPD custom fields for a project')
  .action(async (projectKey) => {
    try {
      const { discoverFields } = await import('./cli/discover-fields.js');
      await discoverFields(projectKey);
    } catch (error: any) {
      console.error(chalk.red('\nDiscovery failed:'), error.message);
      process.exit(1);
    }
  });

// Health check
program
  .command('health')
  .description('Check connection health to JPD and GitHub')
  .action(async () => {
    try {
      const { healthCheck } = await import('./cli/health-check.js');
      await healthCheck();
    } catch (error: any) {
      console.error(chalk.red('\nHealth check failed:'), error.message);
      process.exit(1);
    }
  });

// Validate config
program
  .command('validate')
  .description('Validate configuration file')
  .option('--config <path>', 'Path to config file', 'config/gluecraft.yaml')
  .action(async (options) => {
    try {
      const { validateConfig } = await import('./cli/validate-config.js');
      await validateConfig(options.config);
    } catch (error: any) {
      console.error(chalk.red('\nValidation failed:'), error.message);
      process.exit(1);
    }
  });

// Setup labels
program
  .command('setup-labels')
  .description('Setup GitHub labels from configuration')
  .option('--preview', 'Preview labels without creating them')
  .action(async (options) => {
    try {
      const { setupLabels } = await import('./cli/setup-labels.js');
      await setupLabels(options.preview);
    } catch (error: any) {
      console.error(chalk.red('\nLabel setup failed:'), error.message);
      process.exit(1);
    }
  });

// Show help if no command specified
if (process.argv.length === 2) {
  program.help();
}

program.parse();

