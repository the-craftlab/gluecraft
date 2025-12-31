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

  const spinner = ora(`Fetching field metadata...`).start();

  try {
    const jpd = new JpdClient({
      baseUrl: process.env.JPD_BASE_URL,
      email: process.env.JPD_EMAIL,
      apiToken: process.env.JPD_API_KEY
    });

    // Step 1: Fetch field metadata from Jira API
    spinner.text = 'Fetching field definitions...';
    const allFields = await jpd.getFields();
    const fieldMetadata = new Map(
      allFields
        .filter((f: any) => f.id && f.id.startsWith('customfield_'))
        .map((f: any) => [
          f.id,
          {
            name: f.name || f.id,
            schema: f.schema?.type || 'unknown',
            custom: f.schema?.custom || null
          }
        ])
    );

    // Step 2: Fetch sample issues to find populated values
    spinner.text = `Sampling issues from ${projectKey}...`;
    const result = await jpd.searchIssues(`project = ${projectKey}`, ['*all'], 20);
    
    if (!result.issues || result.issues.length === 0) {
      spinner.fail(chalk.red(`No issues found in project ${projectKey}`));
      console.log(chalk.yellow('\n💡 Create at least one issue in JPD first, then try again.\n'));
      process.exit(1);
    }

    // Step 3: Merge field metadata with sample data from all issues
    const fieldSamples = new Map<string, any>();
    for (const issue of result.issues) {
      const fields = issue.fields || {};
      for (const [id, value] of Object.entries(fields)) {
        if (id.startsWith('customfield_') && value !== null && value !== undefined) {
          // Store first non-null value we find
          if (!fieldSamples.has(id)) {
            fieldSamples.set(id, value);
          }
        }
      }
    }

    // Step 4: Combine metadata and samples
    const customFields = Array.from(fieldMetadata.entries())
      .map(([id, meta]) => {
        const sampleValue = fieldSamples.get(id);
        return {
          id,
          name: meta.name,
          schemaType: meta.schema,
          type: sampleValue ? detectFieldType(sampleValue) : meta.schema,
          populated: fieldSamples.has(id),
          sample: sampleValue ? formatSampleValue(sampleValue) : null
        };
      })
      .sort((a, b) => {
        // Sort: populated first, then by name
        if (a.populated && !b.populated) return -1;
        if (!a.populated && b.populated) return 1;
        return a.name.localeCompare(b.name);
      });

    const populatedCount = customFields.filter(f => f.populated).length;
    spinner.succeed(chalk.green(`Found ${customFields.length} custom fields (${populatedCount} populated) from ${result.issues.length} sample issues`));

    // Display in table
    console.log('\n');
    const table = new Table({
      head: [
        chalk.cyan('Field Name'),
        chalk.cyan('Field ID'),
        chalk.cyan('Type'),
        chalk.cyan('Status'),
        chalk.cyan('Sample Value')
      ],
      colWidths: [30, 20, 15, 12, 40],
      wordWrap: true
    });

    customFields.forEach(field => {
      table.push([
        field.name,
        field.id,
        field.type,
        field.populated ? chalk.green('✓ Set') : chalk.gray('Empty'),
        field.populated ? field.sample : chalk.gray('(not in samples)')
      ]);
    });

    console.log(table.toString());

    // Show config snippet
    const populatedFields = customFields.filter(f => f.populated);
    if (populatedFields.length === 0) {
      console.log(chalk.yellow('\n⚠️  Warning: No populated custom fields found in sampled issues.'));
      console.log(chalk.gray('   Try populating some custom fields in your JPD issues first.\n'));
    } else {
      console.log(chalk.cyan.bold('\n📝 Config Snippet (copy to gluecraft.yaml):\n'));
      console.log(chalk.gray('fields:'));
      populatedFields.slice(0, 5).forEach(field => {
        console.log(chalk.gray(`  - id: "${field.id}"`));
        console.log(chalk.gray(`    name: "${field.name}"`));
        console.log(chalk.gray(`    type: "${field.type}"`));
        console.log(chalk.gray(`    required: ${['number', 'select', 'multiselect'].includes(field.type)}`));
        console.log(chalk.gray(`    description: "Auto-discovered ${field.type} field"\n`));
      });

      if (populatedFields.length > 5) {
        console.log(chalk.gray(`  # ... ${populatedFields.length - 5} more fields\n`));
      }
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

/**
 * Export the main function for CLI router integration
 * @param projectKey - JPD project key to discover fields for
 */
export async function discoverFields(projectKey: string) {
  // Set projectKey in argv for the main function
  process.argv[2] = projectKey;
  await main();
}

// Support direct execution for development
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error(chalk.red('\nError:'), error.message);
    process.exit(1);
  });
}

