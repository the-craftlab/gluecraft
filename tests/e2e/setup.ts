/**
 * E2E Test Setup and Cleanup Utilities
 * 
 * Provides test environment validation, cleanup helpers for test-created issues,
 * and utilities for managing live test data in JPD and GitHub.
 */

import { config } from 'dotenv';
import { JpdClient } from '../../src/clients/jpd-client.js';
import { GitHubClient } from '../../src/clients/github-client.js';
import { Logger } from '../../src/utils/logger.js';

// Load environment variables
config();

const logger = new Logger();

/**
 * Test environment configuration
 */
export interface TestEnv {
  jpdClient: JpdClient;
  githubClient: GitHubClient;
  testRunId: string;
  jpdProject: string;
  githubOwner: string;
  githubRepo: string;
}

/**
 * Validate required environment variables and create test environment
 */
export async function setupTestEnv(): Promise<TestEnv> {
  // Validate environment variables
  const requiredEnvVars = [
    'JPD_API_KEY',
    'JPD_BASE_URL',
    'JPD_EMAIL',
    'GITHUB_TOKEN',
    'GITHUB_OWNER',
    'GITHUB_REPO'
  ];

  const missing = requiredEnvVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  // Create clients
  const jpdClient = new JpdClient({
    baseUrl: process.env.JPD_BASE_URL!,
    email: process.env.JPD_EMAIL!,
    apiToken: process.env.JPD_API_KEY!
  });

  const githubClient = new GitHubClient(
    process.env.GITHUB_TOKEN!,
    logger,
    false // not dry-run for E2E tests
  );

  // Generate unique test run ID
  const testRunId = `test-run-${Date.now()}`;

  logger.info(`Test environment initialized with run ID: ${testRunId}`);

  // Validate access
  await validateJpdAccess(jpdClient, process.env.JPD_PROJECT || 'MTT');
  await validateGitHubAccess(
    githubClient,
    process.env.GITHUB_OWNER!,
    process.env.GITHUB_REPO!
  );

  return {
    jpdClient,
    githubClient,
    testRunId,
    jpdProject: process.env.JPD_PROJECT || 'MTT',
    githubOwner: process.env.GITHUB_OWNER!,
    githubRepo: process.env.GITHUB_REPO!
  };
}

/**
 * Validate JPD access by attempting to search for issues
 */
async function validateJpdAccess(client: JpdClient, project: string): Promise<void> {
  try {
    const result = await client.searchIssues(`project = ${project}`, ['*all'], 1);
    logger.info(`✓ JPD access validated for project ${project} (found ${result.total} issues)`);
  } catch (error) {
    throw new Error(`Failed to access JPD project ${project}: ${error}`);
  }
}

/**
 * Validate GitHub access by attempting to list issues
 */
async function validateGitHubAccess(
  client: GitHubClient,
  owner: string,
  repo: string
): Promise<void> {
  try {
    await client.getSyncedIssues(owner, repo);
    logger.info(`✓ GitHub access validated for ${owner}/${repo}`);
  } catch (error) {
    throw new Error(`Failed to access GitHub repo ${owner}/${repo}: ${error}`);
  }
}

/**
 * Tag a GitHub issue with the test run ID for cleanup
 */
export async function tagTestIssue(
  client: GitHubClient,
  owner: string,
  repo: string,
  issueNumber: number,
  testRunId: string
): Promise<void> {
  const issue = await client.getIssue(owner, repo, issueNumber);
  const existingLabels = issue.labels?.map((l: any) => 
    typeof l === 'string' ? l : l.name
  ) || [];
  
  await client.updateIssue(owner, repo, issueNumber, {
    labels: [...existingLabels, testRunId, 'test-issue']
  });
  
  logger.debug(`Tagged issue #${issueNumber} with ${testRunId}`);
}

/**
 * Cleanup all issues created during a specific test run
 */
export async function cleanupTestRun(
  client: GitHubClient,
  owner: string,
  repo: string,
  testRunId: string
): Promise<number> {
  logger.info(`Cleaning up test issues with tag: ${testRunId}`);
  
  // Find all issues with the test run label
  const allIssues = await client.getSyncedIssues(owner, repo);
  const testIssues = allIssues.filter((issue: any) => {
    const labels = issue.labels?.map((l: any) => 
      typeof l === 'string' ? l : l.name
    ) || [];
    return labels.includes(testRunId);
  });

  logger.info(`Found ${testIssues.length} test issues to clean up`);

  // Close and label as cleaned up
  for (const issue of testIssues) {
    try {
      await client.updateIssue(owner, repo, issue.number, {
        state: 'closed',
        labels: [...(issue.labels?.map((l: any) => typeof l === 'string' ? l : l.name) || []), 'test-cleaned']
      });
      logger.debug(`Closed test issue #${issue.number}`);
    } catch (error) {
      logger.error(`Failed to close issue #${issue.number}: ${error}`);
    }
  }

  return testIssues.length;
}

/**
 * Cleanup all test issues (with 'test-issue' label) regardless of run ID
 */
export async function cleanupAllTestIssues(
  client: GitHubClient,
  owner: string,
  repo: string
): Promise<number> {
  logger.info('Cleaning up all test issues...');
  
  const allIssues = await client.getSyncedIssues(owner, repo);
  const testIssues = allIssues.filter((issue: any) => {
    const labels = issue.labels?.map((l: any) => 
      typeof l === 'string' ? l : l.name
    ) || [];
    return labels.includes('test-issue');
  });

  logger.info(`Found ${testIssues.length} test issues to clean up`);

  for (const issue of testIssues) {
    try {
      await client.updateIssue(owner, repo, issue.number, {
        state: 'closed',
        labels: [...(issue.labels?.map((l: any) => typeof l === 'string' ? l : l.name) || []), 'test-cleaned']
      });
      logger.debug(`Closed test issue #${issue.number}`);
    } catch (error) {
      logger.error(`Failed to close issue #${issue.number}: ${error}`);
    }
  }

  return testIssues.length;
}

/**
 * Get all issues from JPD for testing
 */
export async function getJpdTestIssues(
  client: JpdClient,
  project: string,
  maxResults: number = 50
): Promise<any[]> {
  const result = await client.searchIssues(`project = ${project}`, ['*all'], maxResults);
  return result.issues;
}

/**
 * Teardown helper for test suites
 */
export async function teardownTestEnv(env: TestEnv): Promise<void> {
  logger.info('Tearing down test environment...');
  await cleanupTestRun(
    env.githubClient,
    env.githubOwner,
    env.githubRepo,
    env.testRunId
  );
  logger.info('Test environment cleanup complete');
}

