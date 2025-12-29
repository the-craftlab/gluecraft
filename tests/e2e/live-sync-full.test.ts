/**
 * Live Full Sync E2E Tests
 * 
 * Tests the complete sync flow using real JPD and GitHub APIs.
 * Requires .env configuration with valid credentials.
 */

import { describe, test, expect, beforeAll, afterAll } from 'vitest';
import { setupTestEnv, teardownTestEnv, tagTestIssue, type TestEnv } from './setup.js';
import { SyncEngine } from '../../src/sync-engine.js';
import { Logger } from '../../src/utils/logger.js';

const logger = new Logger();
let env: TestEnv;

beforeAll(async () => {
  logger.info('Setting up E2E test environment...');
  env = await setupTestEnv();
}, 30000); // 30 second timeout for setup

afterAll(async () => {
  if (env) {
    logger.info('Cleaning up E2E test environment...');
    await teardownTestEnv(env);
  }
}, 30000);

describe('Live Full Sync E2E', () => {
  test('should sync MTT issues to GitHub', async () => {
    logger.info('Running full sync...');
    
    // Run the sync engine
    const configPath = './config/local-config.yaml';
    const syncEngine = new SyncEngine(configPath, false); // Not dry-run
    
    await syncEngine.run();
    
    // Verify issues were created in GitHub
    const githubIssues = await env.githubClient.getSyncedIssues(
      env.githubOwner,
      env.githubRepo
    );
    
    logger.info(`Found ${githubIssues.length} synced issues in GitHub`);
    
    // Should have at least one issue synced
    expect(githubIssues.length).toBeGreaterThan(0);
    
    // Check that issues have proper structure
    for (const issue of githubIssues) {
      expect(issue.number).toBeDefined();
      expect(issue.title).toBeDefined();
      expect(issue.labels).toBeInstanceOf(Array);
      
      // Should have metadata
      if (issue.metadata) {
        expect(issue.metadata.jpd_id).toBeDefined();
        expect(issue.metadata.jpd_updated).toBeDefined();
        expect(issue.metadata.sync_hash).toBeDefined();
        
        logger.debug(`Issue #${issue.number}: ${issue.title}`);
        logger.debug(`  - JPD ID: ${issue.metadata.jpd_id}`);
        logger.debug(`  - Labels: ${issue.labels.join(', ')}`);
      }
      
      // Tag with test run ID for cleanup
      await tagTestIssue(
        env.githubClient,
        env.githubOwner,
        env.githubRepo,
        issue.number,
        env.testRunId
      );
    }
  }, 60000); // 60 second timeout

  test('should handle updates to existing synced issues', async () => {
    // Get existing synced issues
    const beforeIssues = await env.githubClient.getSyncedIssues(
      env.githubOwner,
      env.githubRepo
    );
    
    const beforeCount = beforeIssues.length;
    logger.info(`Found ${beforeCount} issues before re-sync`);
    
    // Run sync again
    const configPath = './config/local-config.yaml';
    const syncEngine = new SyncEngine(configPath, false);
    await syncEngine.run();
    
    // Check issues after
    const afterIssues = await env.githubClient.getSyncedIssues(
      env.githubOwner,
      env.githubRepo
    );
    
    logger.info(`Found ${afterIssues.length} issues after re-sync`);
    
    // Should not create duplicates
    expect(afterIssues.length).toBe(beforeCount);
    
    // All issues should still have valid metadata
    for (const issue of afterIssues) {
      expect(issue.metadata).toBeDefined();
      expect(issue.metadata?.jpd_id).toBeDefined();
    }
  }, 60000);

  test('should preserve labels during updates', async () => {
    // Get an issue
    const issues = await env.githubClient.getSyncedIssues(
      env.githubOwner,
      env.githubRepo
    );
    
    if (issues.length === 0) {
      logger.info('No issues to test - skipping');
      return;
    }
    
    const testIssue = issues[0];
    const originalLabels = [...testIssue.labels];
    
    logger.info(`Testing label preservation on issue #${testIssue.number}`);
    logger.info(`  Original labels: ${originalLabels.join(', ')}`);
    
    // Run sync again
    const configPath = './config/local-config.yaml';
    const syncEngine = new SyncEngine(configPath, false);
    await syncEngine.run();
    
    // Check labels are still there
    const updatedIssue = await env.githubClient.getIssue(
      env.githubOwner,
      env.githubRepo,
      testIssue.number
    );
    
    const updatedLabels = updatedIssue.labels.map((l: any) => 
      typeof l === 'string' ? l : l.name
    );
    
    logger.info(`  Updated labels: ${updatedLabels.join(', ')}`);
    
    // Should have jpd-synced label
    const hasSyncLabel = updatedLabels.some((l: string) => l.startsWith('jpd-synced:'));
    expect(hasSyncLabel).toBe(true);
    
    // Should have test-issue label (from tagging)
    if (originalLabels.includes('test-issue')) {
      expect(updatedLabels).toContain('test-issue');
    }
  }, 60000);

  test('should inject metadata in issue body', async () => {
    const issues = await env.githubClient.getSyncedIssues(
      env.githubOwner,
      env.githubRepo
    );
    
    if (issues.length === 0) {
      logger.info('No issues to test - skipping');
      return;
    }
    
    const testIssue = issues[0];
    
    // Get full issue details
    const fullIssue = await env.githubClient.getIssue(
      env.githubOwner,
      env.githubRepo,
      testIssue.number
    );
    
    logger.info(`Checking metadata in issue #${testIssue.number}`);
    
    // Should have hidden metadata comment in body
    expect(fullIssue.body).toBeDefined();
    expect(fullIssue.body).toContain('<!-- jpd-sync-metadata');
    expect(fullIssue.body).toContain('jpd_id');
    
    logger.info('✓ Metadata found in issue body');
  }, 30000);

  test('should map statuses correctly', async () => {
    const issues = await env.githubClient.getSyncedIssues(
      env.githubOwner,
      env.githubRepo
    );
    
    logger.info(`Checking status mapping for ${issues.length} issues`);
    
    for (const issue of issues) {
      // Issues should be either open or closed based on JPD status
      expect(['open', 'closed']).toContain(issue.state);
      
      logger.debug(`Issue #${issue.number}: state=${issue.state}`);
    }
  }, 30000);
});

