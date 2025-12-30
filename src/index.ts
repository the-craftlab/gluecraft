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

    const configPath = process.env.CONFIG_PATH || path.join(process.cwd(), 'config', 'gluecraft.yaml');
    
    if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN is required');
    if (!process.env.JPD_API_KEY) throw new Error('JPD_API_KEY is required');

    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

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

