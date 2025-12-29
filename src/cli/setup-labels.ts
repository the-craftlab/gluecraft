import { ConfigLoader } from '../config/config-loader.js';
import { GitHubClient } from '../clients/github-client.js';
import { Logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import chalk from 'chalk';

dotenv.config();

const CONFIG_PATH = process.env.CONFIG_PATH || path.resolve(process.cwd(), 'config', 'sync-config.yaml');

interface LabelDefinition {
  name: string;
  color: string;
  description?: string;
}

async function setupLabels() {
  Logger.section('GitHub Label Setup');
  console.log(`Config: ${CONFIG_PATH}\n`);

  // Check environment variables
  const requiredEnv = ['GITHUB_TOKEN', 'GITHUB_OWNER', 'GITHUB_REPO'];
  const missingEnv = requiredEnv.filter(env => !process.env[env]);
  if (missingEnv.length > 0) {
    Logger.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
    process.exit(1);
  }

  // Load config
  let config: any;
  try {
    config = ConfigLoader.load(CONFIG_PATH);
  } catch (error: any) {
    Logger.error(`Failed to load config: ${error.message}`);
    process.exit(1);
  }

  // Check if labels are defined in config
  if (!config.labels) {
    Logger.warn('No labels defined in config');
    console.log('\nAdd a "labels" section to your config file:');
    console.log(chalk.gray(`
labels:
  hierarchy:
    - name: "epic"
      color: "0052CC"
      description: "High-level initiative"
    - name: "story"
      color: "2684FF"
      description: "Deliverable unit of work"
    - name: "task"
      color: "B3D4FF"
      description: "Implementation step"
`));
    process.exit(1);
  }

  // Collect all label definitions
  const allLabels: LabelDefinition[] = [
    ...(config.labels.hierarchy || []),
    ...(config.labels.types || []),
    ...(config.labels.priorities || []),
    ...(config.labels.statuses || []),
    ...(config.labels.custom || [])
  ];

  if (allLabels.length === 0) {
    Logger.warn('No labels defined in config');
    process.exit(1);
  }

  console.log(chalk.blue(`Found ${allLabels.length} labels to create:\n`));

  // Group labels by category for display
  const labelGroups = [
    { name: 'Hierarchy', labels: config.labels.hierarchy || [] },
    { name: 'Types', labels: config.labels.types || [] },
    { name: 'Priorities', labels: config.labels.priorities || [] },
    { name: 'Statuses', labels: config.labels.statuses || [] },
    { name: 'Custom', labels: config.labels.custom || [] }
  ].filter(g => g.labels.length > 0);

  for (const group of labelGroups) {
    console.log(chalk.bold(`\n${group.name}:`));
    for (const label of group.labels) {
      const colorBox = chalk.hex(label.color)('█');
      console.log(`  ${colorBox} ${label.name}${label.description ? ` - ${chalk.gray(label.description)}` : ''}`);
    }
  }

  // Check for --preview flag
  const isPreview = process.argv.includes('--preview');
  if (isPreview) {
    console.log(chalk.yellow('\n[PREVIEW MODE] No labels will be created'));
    process.exit(0);
  }

  // Create GitHub client
  const logger = new Logger();
  const github = new GitHubClient(
    process.env.GITHUB_TOKEN!,
    logger,
    false, // Not a dry run
    process.env.GITHUB_OWNER!,
    process.env.GITHUB_REPO!
  );

  // Load label config
  github.setLabelConfig(config);

  console.log(chalk.blue('\nCreating labels...\n'));

  // Create labels using the ensureLabels method
  try {
    const labelNames = allLabels.map(l => l.name);
    await github.ensureLabels(
      process.env.GITHUB_OWNER!,
      process.env.GITHUB_REPO!,
      labelNames
    );
    
    Logger.success(`✅ Successfully created/verified ${allLabels.length} labels`);
    
    console.log(chalk.gray('\nYou can view the labels at:'));
    console.log(chalk.cyan(`https://github.com/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/labels`));
    
  } catch (error: any) {
    Logger.error(`Failed to create labels: ${error.message}`);
    process.exit(1);
  }
}

setupLabels();

