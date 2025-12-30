#!/usr/bin/env node
/**
 * JPD Field Discovery Tool
 * 
 * Standalone tool to discover and display JPD custom fields
 */

import chalk from 'chalk';
import ora from 'ora';
import { JpdClient } from '../clients/jpd-client.js';
import dotenv from 'dotenv';
import Table from 'cli-table3';

dotenv.config();

async function main() {
  console.log(chalk.cyan.bold('\n🔍 JPD Field Discovery Tool\n'));

  // Validate env vars
  if (!process.env.JPD_BASE_URL || !process.env.JPD_EMAIL || !process.env.JPD_API_KEY) {
    console.error(chalk.red('❌ Missing JPD credentials in .env file\n'));
    console.log(chalk.gray('Required environment variables:'));
    console.log(chalk.gray('  - JPD_BASE_URL'));
    console.log(chalk.gray('  - JPD_EMAIL'));
    console.log(chalk.gray('  - JPD_API_KEY\n'));
    console.log(chalk.yellow('💡 Run "pnpm run setup" to configure these.\n'));
    process.exit(1);
  }

  // Get project key from args or prompt
  const projectKey = process.argv[2];
  if (!projectKey) {
    console.error(chalk.red('❌ Project key required\n'));
    console.log(chalk.gray('Usage: pnpm run discover-fields PROJECT_KEY\n'));
    console.log(chalk.gray('Example: pnpm run discover-fields MTT\n'));
    process.exit(1);
  }

  const spinner = ora(`Fetching fields from ${projectKey}...`).start();

  try {
    const jpd = new JpdClient({
      baseUrl: process.env.JPD_BASE_URL,
      email: process.env.JPD_EMAIL,
      apiToken: process.env.JPD_API_KEY
    });

    // Fetch sample issue
    const result = await jpd.searchIssues(`project = ${projectKey}`, ['*all'], 1);
    
    if (!result.issues || result.issues.length === 0) {
      spinner.fail(chalk.red(`No issues found in project ${projectKey}`));
      console.log(chalk.yellow('\n💡 Create at least one issue in JPD first, then try again.\n'));
      process.exit(1);
    }

    const issue = result.issues[0];
    const fields = issue.fields || {};

    // Extract custom fields
    const customFields = Object.entries(fields)
      .filter(([key]) => key.startsWith('customfield_'))
      .map(([id, value]) => ({
        id,
        type: detectFieldType(value),
        populated: value !== null && value !== undefined,
        sample: formatSampleValue(value)
      }))
      .sort((a, b) => {
        // Sort: populated first, then by ID
        if (a.populated && !b.populated) return -1;
        if (!a.populated && b.populated) return 1;
        return a.id.localeCompare(b.id);
      });

    spinner.succeed(chalk.green(`Found ${customFields.length} custom fields in ${projectKey}-${issue.key}`));

    // Display in table
    console.log('\n');
    const table = new Table({
      head: [
        chalk.cyan('Field ID'),
        chalk.cyan('Type'),
        chalk.cyan('Status'),
        chalk.cyan('Sample Value')
      ],
      colWidths: [25, 15, 12, 50],
      wordWrap: true
    });

    customFields.forEach(field => {
      table.push([
        field.id,
        field.type,
        field.populated ? chalk.green('✓ Set') : chalk.gray('Empty'),
        field.populated ? field.sample : chalk.gray('(null)')
      ]);
    });

    console.log(table.toString());

    // Show config snippet
    const populatedFields = customFields.filter(f => f.populated);
    console.log(chalk.cyan.bold('\n📝 Config Snippet (copy to gluecraft.yaml):\n'));
    console.log(chalk.gray('fields:'));
    populatedFields.slice(0, 5).forEach(field => {
      console.log(chalk.gray(`  - id: "${field.id}"`));
      console.log(chalk.gray(`    name: "Field ${field.id.replace('customfield_', '')}"`));
      console.log(chalk.gray(`    type: "${field.type}"`));
      console.log(chalk.gray(`    required: ${['number', 'select', 'multiselect'].includes(field.type)}`));
      console.log(chalk.gray(`    description: "Auto-discovered ${field.type} field"\n`));
    });

    if (populatedFields.length > 5) {
      console.log(chalk.gray(`  # ... ${populatedFields.length - 5} more fields\n`));
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to discover fields'));
    console.error(chalk.red('\n❌ Error:'), error.message);
    process.exit(1);
  }
}

function detectFieldType(value: any): string {
  if (value === null || value === undefined) return 'unknown';
  if (Array.isArray(value)) return 'multiselect';
  if (typeof value === 'number') return 'number';
  if (typeof value === 'string') return 'text';
  if (typeof value === 'boolean') return 'boolean';
  if (value.value !== undefined) return 'select';
  if (value.name && value.key) return 'user';
  return 'object';
}

function formatSampleValue(value: any): string {
  if (!value) return '';
  if (Array.isArray(value)) {
    const values = value.map((v: any) => v.value || v.name || String(v)).slice(0, 2);
    return values.join(', ') + (value.length > 2 ? '...' : '');
  }
  if (value.value !== undefined) return String(value.value);
  if (value.name !== undefined) return String(value.name);
  if (typeof value === 'object') return JSON.stringify(value).substring(0, 40) + '...';
  return String(value).substring(0, 40);
}

main();

