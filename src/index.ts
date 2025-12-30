import { SyncEngine } from './sync-engine.js';
import { Logger } from './utils/logger.js';
import path from 'path';
import dotenv from 'dotenv';

// Load .env file if present
dotenv.config();

async function main() {
  try {
    console.log('\n' + '='.repeat(60));
    console.log('  JPD ↔ GitHub Sync Engine');
    console.log('='.repeat(60) + '\n');

    // GitHub Actions pass inputs as INPUT_* environment variables
    // GitHub converts kebab-case to SCREAMING_SNAKE_CASE, so config-path becomes INPUT_CONFIG-PATH
    // Support both GitHub Action inputs and direct environment variables
    const configPath = 
      process.env['INPUT_CONFIG-PATH'] ||
      process.env.INPUT_CONFIG_PATH || 
      process.env.CONFIG_PATH || 
      path.join(process.cwd(), 'config', 'gluecraft.yaml');
    
    // Get credentials from inputs or environment variables
    // Support both hyphenated and underscored INPUT_ variable names
    const githubToken = 
      process.env['INPUT_GITHUB-TOKEN'] ||
      process.env.INPUT_GITHUB_TOKEN || 
      process.env.GITHUB_TOKEN;
    
    const jpdApiKey = 
      process.env['INPUT_JPD-API-KEY'] ||
      process.env.INPUT_JPD_API_KEY || 
      process.env.JPD_API_KEY;
    
    const jpdEmail = 
      process.env['INPUT_JPD-EMAIL'] ||
      process.env.INPUT_JPD_EMAIL || 
      process.env.JPD_EMAIL;
    
    const jpdBaseUrl = 
      process.env['INPUT_JPD-BASE-URL'] ||
      process.env.INPUT_JPD_BASE_URL || 
      process.env.JPD_BASE_URL;

    // Validate required environment variables
    if (!githubToken) throw new Error('GITHUB_TOKEN is required (set via input or env var)');
    if (!jpdApiKey) throw new Error('JPD_API_KEY is required (set via input or env var)');

    // Set environment variables for SyncEngine (it reads from process.env)
    if (githubToken) process.env.GITHUB_TOKEN = githubToken;
    if (jpdApiKey) process.env.JPD_API_KEY = jpdApiKey;
    if (jpdEmail) process.env.JPD_EMAIL = jpdEmail;
    if (jpdBaseUrl) process.env.JPD_BASE_URL = jpdBaseUrl;

    // Check for dry-run mode (from input or command line arg)
    const dryRunInput = process.env['INPUT_DRY-RUN'] || process.env.INPUT_DRY_RUN;
    const dryRunArg = process.argv.slice(2).includes('--dry-run');
    const dryRun = dryRunInput === 'true' || dryRunArg;

    if (dryRun) {
      console.log('⚠️  DRY RUN MODE - No changes will be made\n');
    }

    const engine = new SyncEngine(configPath, dryRun);
    await engine.run();
    
    console.log('\n' + '='.repeat(60));
    console.log('  ✅ Sync Complete');
    console.log('='.repeat(60) + '\n');
  } catch (error: any) {
    console.log('\n' + '='.repeat(60));
    console.log('  ❌ Sync Failed');
    console.log('='.repeat(60));
    Logger.error(error.message);
    process.exit(1);
  }
}

main();

