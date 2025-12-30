#!/usr/bin/env node
/**
 * Config Validation Tool
 * 
 * Validates sync configuration before running
 */

import chalk from 'chalk';
import ora from 'ora';
import { ConfigLoader } from '../config/config-loader.js';
import { FieldValidator } from '../validation/field-validator.js';
import { JpdClient } from '../clients/jpd-client.js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

async function main() {
  console.log(chalk.cyan.bold('\n✅ Configuration Validator\n'));

  const configPath = process.argv[2] || process.env.CONFIG_PATH || './config/gluecraft.yaml';
  
  console.log(chalk.gray(`Validating: ${configPath}\n`));

  // Step 1: Check file exists
  const spinner = ora('Checking config file...').start();
  try {
    const fs = await import('fs');
    if (!fs.existsSync(configPath)) {
      spinner.fail(chalk.red(`Config file not found: ${configPath}`));
      console.log(chalk.yellow('\n💡 Run "pnpm run setup" to create a config file.\n'));
      process.exit(1);
    }
    spinner.succeed(chalk.green('Config file found'));
  } catch (error: any) {
    spinner.fail(chalk.red('Error checking file'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }

  // Step 2: Validate YAML syntax and schema
  const yamlSpinner = ora('Validating YAML syntax and schema...').start();
  let config;
  try {
    config = ConfigLoader.load(configPath);
    yamlSpinner.succeed(chalk.green('YAML syntax and schema valid'));
  } catch (error: any) {
    yamlSpinner.fail(chalk.red('Config validation failed'));
    console.error(chalk.red('\n❌ Error:'), error.message);
    console.log(chalk.yellow('\n💡 Check your YAML syntax and required fields.\n'));
    process.exit(1);
  }

  // Step 3: Check environment variables
  const envSpinner = ora('Checking environment variables...').start();
  const missing = [];
  if (!process.env.JPD_BASE_URL) missing.push('JPD_BASE_URL');
  if (!process.env.JPD_EMAIL) missing.push('JPD_EMAIL');
  if (!process.env.JPD_API_KEY) missing.push('JPD_API_KEY');
  if (!process.env.GITHUB_TOKEN) missing.push('GITHUB_TOKEN');
  if (!process.env.GITHUB_OWNER) missing.push('GITHUB_OWNER');
  if (!process.env.GITHUB_REPO) missing.push('GITHUB_REPO');

  if (missing.length > 0) {
    envSpinner.fail(chalk.red('Missing environment variables'));
    console.log(chalk.red('\n❌ Missing:'));
    missing.forEach(v => console.log(chalk.red(`  - ${v}`)));
    console.log(chalk.yellow('\n💡 Run "pnpm run setup" to configure environment.\n'));
    process.exit(1);
  }
  envSpinner.succeed(chalk.green('All environment variables present'));

  // Step 4: Validate field definitions (if present)
  if (config.fields && config.fields.length > 0) {
    const fieldSpinner = ora('Validating JPD custom fields...').start();
    try {
      // Extract project key
      const jql = config.sync.jql || '';
      const projectMatch = jql.match(/project\s*=\s*([A-Z]+)/i);
      if (!projectMatch) {
        fieldSpinner.warn(chalk.yellow('Could not extract project key from JQL - skipping field validation'));
      } else {
        const projectKey = projectMatch[1];
        
        const jpd = new JpdClient({
          baseUrl: process.env.JPD_BASE_URL!,
          email: process.env.JPD_EMAIL!,
          apiToken: process.env.JPD_API_KEY!
        });

        const validator = new FieldValidator(jpd, config.fields);
        const result = await validator.validate(projectKey);

        if (result.valid) {
          fieldSpinner.succeed(chalk.green(`All ${config.fields.filter((f: any) => f.required).length} required fields validated`));
          if (result.warnings.length > 0) {
            console.log(chalk.yellow('\n⚠️  Warnings:'));
            result.warnings.forEach((w: string) => console.log(chalk.yellow(`  - ${w}`)));
          }
        } else {
          fieldSpinner.fail(chalk.red('Field validation failed'));
          console.error(validator.generateErrorReport(result));
          process.exit(1);
        }
      }
    } catch (error: any) {
      fieldSpinner.fail(chalk.red('Field validation error'));
      console.error(chalk.red('\n❌ Error:'), error.message);
      process.exit(1);
    }
  } else {
    console.log(chalk.gray('  ℹ️  No field validation configured (skipped)'));
  }

  // Step 5: Check mappings
  const mappingSpinner = ora('Checking field mappings...').start();
  if (!config.mappings || config.mappings.length === 0) {
    mappingSpinner.warn(chalk.yellow('No field mappings configured'));
  } else {
    mappingSpinner.succeed(chalk.green(`${config.mappings.length} field mappings configured`));
  }

  // Success!
  console.log(chalk.green.bold('\n✅ Configuration is valid!\n'));
  console.log(chalk.gray('You can now run:'));
  console.log(chalk.cyan('  pnpm run dev -- --dry-run  ') + chalk.gray('# Test sync'));
  console.log(chalk.cyan('  pnpm run dev               ') + chalk.gray('# Run actual sync\n'));
}

main().catch(error => {
  console.error(chalk.red('\n❌ Unexpected error:'), error);
  process.exit(1);
});

