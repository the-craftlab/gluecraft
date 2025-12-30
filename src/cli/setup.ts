#!/usr/bin/env node
/**
 * Interactive Setup CLI for JPD to GitHub Connector
 * 
 * Guides users through the complete setup process:
 * - Environment configuration
 * - Connection testing
 * - Field discovery
 * - Config generation
 */

import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs';
import path from 'path';
import { JpdClient } from '../clients/jpd-client.js';
import { Octokit } from '@octokit/rest';
import { RateLimitHandler } from '../utils/rate-limit-handler.js';
import YAML from 'yaml';

interface SetupState {
  jpdBaseUrl?: string;
  jpdEmail?: string;
  jpdApiKey?: string;
  githubToken?: string;
  githubOwner?: string;
  githubRepo?: string;
  jpdProjectKey?: string;
  customFields?: Array<{
    id: string;
    name: string;
    type: string;
    value: any;
  }>;
}

export class SetupCLI {
  private state: SetupState = {};

  async run() {
    console.log(chalk.cyan.bold('\n╔═══════════════════════════════════════════════════════════════╗'));
    console.log(chalk.cyan.bold('║                                                               ║'));
    console.log(chalk.cyan.bold('║       🚀 JPD to GitHub Connector - Setup Wizard 🚀           ║'));
    console.log(chalk.cyan.bold('║                                                               ║'));
    console.log(chalk.cyan.bold('╚═══════════════════════════════════════════════════════════════╝\n'));

    console.log(chalk.gray('This wizard will guide you through setting up your JPD ↔ GitHub sync.\n'));

    try {
      // Step 1: Check for existing config
      await this.checkExistingSetup();

      // Step 2: Gather credentials
      await this.gatherCredentials();

      // Step 3: Test connections
      await this.testConnections();

      // Step 4: Discover JPD fields
      await this.discoverJpdFields();

      // Step 5: Select fields to sync
      await this.selectFieldsToSync();

      // Step 6: Generate config
      await this.generateConfig();

      // Step 7: Save .env
      await this.saveEnvFile();

      // Step 8: Test sync
      await this.offerTestSync();

      console.log(chalk.green.bold('\n✅ Setup complete! You\'re ready to sync.\n'));
      console.log(chalk.gray('Next steps:'));
      console.log(chalk.gray('  1. Review your config: config/gluecraft.yaml'));
      console.log(chalk.gray('  2. Test sync: pnpm run dev -- --dry-run'));
      console.log(chalk.gray('  3. Run actual sync: pnpm run dev\n'));

    } catch (error: any) {
      console.error(chalk.red('\n❌ Setup failed:'), error.message);
      process.exit(1);
    }
  }

  private async checkExistingSetup() {
    const hasEnv = fs.existsSync('.env');
    const hasConfig = fs.existsSync('config/gluecraft.yaml');

    if (hasEnv || hasConfig) {
      console.log(chalk.yellow('⚠️  Existing setup detected:\n'));
      if (hasEnv) console.log(chalk.gray('  - .env file found'));
      if (hasConfig) console.log(chalk.gray('  - config/gluecraft.yaml found\n'));

      const { overwrite } = await inquirer.prompt([
        {
          type: 'confirm',
          name: 'overwrite',
          message: 'Do you want to overwrite existing configuration?',
          default: false
        }
      ]);

      if (!overwrite) {
        console.log(chalk.gray('\nSetup cancelled. Existing config preserved.'));
        process.exit(0);
      }
    }
  }

  private async gatherCredentials() {
    console.log(chalk.cyan.bold('\n📝 Step 1: Credentials\n'));

    // JPD Credentials
    const jpdAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'jpdBaseUrl',
        message: 'JPD Base URL (e.g., https://your-company.atlassian.net):',
        validate: (input) => input.startsWith('https://') || 'Must start with https://'
      },
      {
        type: 'input',
        name: 'jpdEmail',
        message: 'JPD Email:',
        validate: (input) => input.includes('@') || 'Must be a valid email'
      },
      {
        type: 'password',
        name: 'jpdApiKey',
        message: 'JPD API Token (from https://id.atlassian.com/manage-profile/security/api-tokens):',
        validate: (input) => input.length > 0 || 'API token required'
      }
    ]);

    this.state = { ...this.state, ...jpdAnswers };

    // GitHub Credentials
    const githubAnswers = await inquirer.prompt([
      {
        type: 'password',
        name: 'githubToken',
        message: 'GitHub Personal Access Token (from https://github.com/settings/tokens):',
        validate: (input) => input.length > 0 || 'GitHub token required'
      },
      {
        type: 'input',
        name: 'githubOwner',
        message: 'GitHub Repository Owner (username or org):',
        validate: (input) => input.length > 0 || 'Owner required'
      },
      {
        type: 'input',
        name: 'githubRepo',
        message: 'GitHub Repository Name:',
        validate: (input) => input.length > 0 || 'Repo name required'
      }
    ]);

    this.state = { ...this.state, ...githubAnswers };
  }

  private async testConnections() {
    console.log(chalk.cyan.bold('\n🔌 Step 2: Testing Connections\n'));

    // Test JPD
    const jpdSpinner = ora('Testing JPD connection...').start();
    try {
      const jpd = new JpdClient({
        baseUrl: this.state.jpdBaseUrl!,
        email: this.state.jpdEmail!,
        apiToken: this.state.jpdApiKey!
      });

      // Try to search for recent issues with retry logic
      await RateLimitHandler.withRetry(
        () => jpd.searchIssues('created > -7d order by created DESC', ['key'], 1),
        {
          maxRetries: 2,
          initialDelay: 3000,
          onRetry: (attempt, delay) => {
            const waitSec = Math.round(delay / 1000);
            jpdSpinner.text = `Rate limit detected, waiting ${waitSec}s (retry ${attempt}/2)...`;
          }
        }
      );
      jpdSpinner.succeed(chalk.green('JPD connection successful'));
    } catch (error: any) {
      jpdSpinner.fail(chalk.red('JPD connection failed'));
      
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        throw new Error(`JPD rate limit exceeded. Please wait a minute and try again.`);
      }
      throw new Error(`JPD Error: ${error.message}`);
    }

    // Test GitHub
    const ghSpinner = ora('Testing GitHub connection...').start();
    try {
      const octokit = new Octokit({ auth: this.state.githubToken });
      await octokit.repos.get({
        owner: this.state.githubOwner!,
        repo: this.state.githubRepo!
      });
      ghSpinner.succeed(chalk.green('GitHub connection successful'));
    } catch (error: any) {
      ghSpinner.fail(chalk.red('GitHub connection failed'));
      throw new Error(`GitHub Error: ${error.message}`);
    }
  }

  private async discoverJpdFields() {
    console.log(chalk.cyan.bold('\n🔍 Step 3: Discovering JPD Custom Fields\n'));

    // Ask for project key
    const { projectKey } = await inquirer.prompt([
      {
        type: 'input',
        name: 'projectKey',
        message: 'Enter your JPD Project Key (e.g., MTT):',
        validate: (input) => /^[A-Z]+$/.test(input) || 'Must be uppercase letters only'
      }
    ]);

    this.state.jpdProjectKey = projectKey;

    // Fetch sample issue
    const spinner = ora('Fetching custom fields from JPD...').start();
    try {
      const jpd = new JpdClient({
        baseUrl: this.state.jpdBaseUrl!,
        email: this.state.jpdEmail!,
        apiToken: this.state.jpdApiKey!
      });

      const result = await jpd.searchIssues(`project = ${projectKey}`, ['*all'], 1);
      
      if (!result.issues || result.issues.length === 0) {
        spinner.fail(chalk.yellow('No issues found in project'));
        throw new Error(`Project ${projectKey} has no issues. Create at least one issue first.`);
      }

      const issue = result.issues[0];
      const fields = issue.fields || {};

      // Extract custom fields (customfield_*)
      const customFields = Object.entries(fields)
        .filter(([key]) => key.startsWith('customfield_'))
        .map(([id, value]) => ({
          id,
          name: this.guessFieldName(id, value),
          type: this.detectFieldType(value),
          value
        }))
        .filter(f => f.value !== null && f.value !== undefined); // Only populated fields

      this.state.customFields = customFields;
      spinner.succeed(chalk.green(`Found ${customFields.length} populated custom fields`));

    } catch (error: any) {
      spinner.fail(chalk.red('Failed to discover fields'));
      throw error;
    }
  }

  private guessFieldName(id: string, value: any): string {
    // Try to extract name from value structure
    if (Array.isArray(value) && value.length > 0 && value[0].value) {
      return `MultiSelect_${id.replace('customfield_', '')}`;
    }
    if (value && typeof value === 'object' && value.value) {
      return `Select_${id.replace('customfield_', '')}`;
    }
    if (typeof value === 'number') {
      return `Number_${id.replace('customfield_', '')}`;
    }
    return `Field_${id.replace('customfield_', '')}`;
  }

  private detectFieldType(value: any): string {
    if (value === null || value === undefined) return 'unknown';
    if (Array.isArray(value)) return 'multiselect';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'string') return 'text';
    if (typeof value === 'boolean') return 'boolean';
    if (value.value !== undefined) return 'select';
    return 'object';
  }

  private async selectFieldsToSync() {
    console.log(chalk.cyan.bold('\n✅ Step 4: Select Fields to Sync\n'));

    if (!this.state.customFields || this.state.customFields.length === 0) {
      console.log(chalk.yellow('No custom fields found to select.'));
      return;
    }

    console.log(chalk.gray('Select which fields you want to sync to GitHub:\n'));

    // Show field details
    this.state.customFields.forEach((field, i) => {
      const sample = this.formatSampleValue(field.value);
      console.log(chalk.gray(`  ${i + 1}. ${chalk.white(field.id)} - ${field.type}`));
      console.log(chalk.gray(`     Sample: ${sample}\n`));
    });

    const { selectedFields } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedFields',
        message: 'Select fields to sync:',
        choices: this.state.customFields.map(f => ({
          name: `${f.id} (${f.type})`,
          value: f.id,
          checked: ['multiselect', 'select', 'number'].includes(f.type) // Auto-select common types
        }))
      }
    ]);

    this.state.customFields = this.state.customFields.filter(f => 
      selectedFields.includes(f.id)
    );

    console.log(chalk.green(`\n✓ Selected ${this.state.customFields.length} fields to sync`));
  }

  private formatSampleValue(value: any): string {
    if (Array.isArray(value)) {
      return value.map((v: any) => v.value || v).join(', ');
    }
    if (value && typeof value === 'object' && value.value) {
      return value.value;
    }
    return String(value);
  }

  private async generateConfig() {
    console.log(chalk.cyan.bold('\n⚙️  Step 5: Generating Configuration\n'));

    const spinner = ora('Creating gluecraft.yaml from template...').start();

    try {
      // Read the minimal config template
      const templatePath = path.resolve('config/gluecraft.minimal.yaml');
      const templateContent = fs.readFileSync(templatePath, 'utf8');
      
      // Replace placeholders with actual values
      let configContent = templateContent
        .replace(/YOUR_JPD_PROJECT_KEY/g, this.state.jpdProjectKey || 'YOUR_PROJECT')
        .replace(/project = YOUR_JPD_PROJECT_KEY/g, `project = ${this.state.jpdProjectKey}`);
      
      // Add discovered custom field mappings as comments
      if (this.state.customFields && this.state.customFields.length > 0) {
        const fieldMappings = this.state.customFields.map(field => {
          if (field.type === 'multiselect' || field.type === 'select') {
            const accessor = field.type === 'multiselect' ? `[0].value` : `.value`;
            return `  # - jpd: "fields.${field.id}${accessor}"  # ${field.name}\n  #   github: "labels"\n  #   template: "{{value | slugify}}"`;
          }
          return `  # - jpd: "fields.${field.id}"  # ${field.name}\n  #   github: "body_section"`;
        }).join('\n');
        
        // Insert discovered fields as commented examples
        configContent = configContent.replace(
          /# Example: Map a JPD custom field to a GitHub label/,
          `# Discovered custom fields from your project:\n${fieldMappings}\n\n  # Example: Map a JPD custom field to a GitHub label`
        );
      }
      
      spinner.succeed('Configuration generated from generic template');
      
      const config = {
        _note: 'Config generated from gluecraft.minimal.yaml template',
        _template_used: true,
        content: configContent
      },
      hierarchy: {
        parent_field_in_body: true,
        use_github_parent_issue: true
      },
      fields: this.state.customFields?.map(field => ({
        id: field.id,
        name: field.name,
        type: field.type,
        required: ['number', 'select', 'multiselect'].includes(field.type),
        description: `Auto-discovered ${field.type} field`
      })) || []
    };

    // Save config (write the template content directly)
    const configPath = path.join(process.cwd(), 'config', 'gluecraft.yaml');
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    
    // Write the template content with replacements, not a YAML object
    fs.writeFileSync(configPath, config.content);

    spinner.succeed(chalk.green('Configuration created from generic template: config/gluecraft.yaml'));
    console.log(chalk.gray('\n  📝 Your config was generated from config/gluecraft.minimal.yaml'));
    console.log(chalk.gray('  📋 Discovered custom fields are included as commented examples'));
    console.log(chalk.gray('  ✏️  Uncomment and customize the field mappings you need\n'));
  }

  private async saveEnvFile() {
    console.log(chalk.cyan.bold('\n💾 Step 6: Saving Environment Variables\n'));

    const envContent = `# JPD Configuration
JPD_BASE_URL=${this.state.jpdBaseUrl}
JPD_EMAIL=${this.state.jpdEmail}
JPD_API_KEY=${this.state.jpdApiKey}

# GitHub Configuration
GITHUB_TOKEN=${this.state.githubToken}
GITHUB_OWNER=${this.state.githubOwner}
GITHUB_REPO=${this.state.githubRepo}

# Optional: Override config path
# CONFIG_PATH=./config/gluecraft.yaml

# Optional: Enable debug logging
# DEBUG=1
`;

    fs.writeFileSync('.env', envContent);
    console.log(chalk.green('✓ Saved credentials to .env'));
    console.log(chalk.yellow('\n⚠️  Important: Add .env to your .gitignore!'));
  }

  private async offerTestSync() {
    console.log(chalk.cyan.bold('\n🧪 Step 7: Test Sync\n'));

    const { runTest } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'runTest',
        message: 'Would you like to run a test sync now (dry-run)?',
        default: true
      }
    ]);

    if (runTest) {
      console.log(chalk.gray('\nRunning dry-run sync...\n'));
      const { spawn } = await import('child_process');
      
      return new Promise<void>((resolve) => {
        const proc = spawn('pnpm', ['run', 'dev', '--', '--dry-run'], {
          stdio: 'inherit',
          shell: true
        });

        proc.on('close', (code) => {
          if (code === 0) {
            console.log(chalk.green('\n✅ Test sync completed successfully!'));
          } else {
            console.log(chalk.yellow('\n⚠️  Test sync had issues. Review the output above.'));
          }
          resolve();
        });
      });
    }
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const cli = new SetupCLI();
  cli.run().catch(error => {
    console.error(chalk.red('\nUnexpected error:'), error);
    process.exit(1);
  });
}

