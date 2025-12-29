/**
 * Fixture Capture Utility
 * 
 * Runs a live sync and captures all API requests and responses for later use
 * in mocked unit tests. This allows tests to be deterministic and fast while
 * being based on real-world data.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { setupTestEnv, getJpdTestIssues } from './setup.js';
import { Logger } from '../../src/utils/logger.js';

interface CapturedFixture {
  timestamp: string;
  scenario: string;
  jpd: {
    request: {
      jql: string;
      maxResults: number;
    };
    response: any;
  };
  github?: {
    existingIssues: any[];
    createdIssues: any[];
    updatedIssues: any[];
  };
}

/**
 * Capture JPD issue data as fixtures
 */
async function captureJpdFixtures(): Promise<void> {
  Logger.info('📸 Capturing JPD fixtures...');
  
  const env = await setupTestEnv();
  
  // Capture full MTT project data
  const jql = `project = ${env.jpdProject}`;
  const issues = await getJpdTestIssues(env.jpdClient, env.jpdProject, 100);
  
  const fixture: any = {
    timestamp: new Date().toISOString(),
    scenario: 'full-mtt-project',
    jpd: {
      request: {
        jql,
        maxResults: 100
      },
      response: {
        total: issues.length,
        issues: issues
      }
    }
  };

  // Save to file
  const outputPath = join(
    process.cwd(),
    'tests',
    'fixtures',
    'jpd',
    `issues-mtt-${Date.now()}.json`
  );
  
  mkdirSync(join(process.cwd(), 'tests', 'fixtures', 'jpd'), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(fixture, null, 2));
  
  Logger.info(`✓ Saved JPD fixture to ${outputPath}`);
  Logger.info(`  - Captured ${issues.length} issues`);
  
  // Log available fields for documentation
  if (issues.length > 0) {
    const sampleIssue = issues[0];
    const fields = Object.keys(sampleIssue.fields);
    Logger.info(`  - Available fields: ${fields.slice(0, 10).join(', ')}... (${fields.length} total)`);
    
    // Check for custom fields
    const customFields = fields.filter(f => f.startsWith('customfield_'));
    if (customFields.length > 0) {
      Logger.info(`  - Custom fields found: ${customFields.length}`);
      customFields.forEach(cf => {
        const value = sampleIssue.fields[cf];
        if (value !== null && value !== undefined) {
          Logger.info(`    • ${cf}: ${typeof value === 'object' ? JSON.stringify(value).substring(0, 50) : value}`);
        }
      });
    }
  }
}

/**
 * Capture GitHub issues as fixtures
 */
async function captureGitHubFixtures(): Promise<void> {
  Logger.info('📸 Capturing GitHub fixtures...');
  
  const env = await setupTestEnv();
  
  // Get all synced issues
  const issues = await env.githubClient.getSyncedIssues(env.githubOwner, env.githubRepo);
  
  const fixture = {
    timestamp: new Date().toISOString(),
    scenario: 'synced-issues',
    github: {
      repo: `${env.githubOwner}/${env.githubRepo}`,
      issues: issues
    }
  };

  // Save to file
  const outputPath = join(
    process.cwd(),
    'tests',
    'fixtures',
    'github',
    `issues-synced-${Date.now()}.json`
  );
  
  mkdirSync(join(process.cwd(), 'tests', 'fixtures', 'github'), { recursive: true });
  writeFileSync(outputPath, JSON.stringify(fixture, null, 2));
  
  Logger.info(`✓ Saved GitHub fixture to ${outputPath}`);
  Logger.info(`  - Captured ${issues.length} issues`);
  
  // Log label statistics
  const allLabels = new Set<string>();
  issues.forEach(issue => {
    issue.labels.forEach(label => allLabels.add(label));
  });
  Logger.info(`  - Unique labels: ${allLabels.size}`);
  Logger.info(`  - Sample labels: ${Array.from(allLabels).slice(0, 10).join(', ')}`);
}

/**
 * Create synthetic edge case fixtures
 */
function createEdgeCaseFixtures(): void {
  Logger.info('📝 Creating synthetic edge case fixtures...');
  
  const edgeCases = {
    timestamp: new Date().toISOString(),
    scenario: 'edge-cases',
    cases: [
      {
        name: 'null-priority',
        issue: {
          key: 'TEST-1',
          fields: {
            summary: 'Issue with null priority',
            description: 'This issue has no priority set',
            status: { name: 'To Do' },
            priority: null,
            updated: new Date().toISOString()
          }
        }
      },
      {
        name: 'empty-description',
        issue: {
          key: 'TEST-2',
          fields: {
            summary: 'Issue with empty description',
            description: '',
            status: { name: 'In Progress' },
            priority: { name: 'High' },
            updated: new Date().toISOString()
          }
        }
      },
      {
        name: 'special-characters',
        issue: {
          key: 'TEST-3',
          fields: {
            summary: 'Test: A/B [Draft] (v2.0)',
            description: 'Contains <HTML> & "quotes" and \'apostrophes\'',
            status: { name: 'Done' },
            priority: { name: 'Medium' },
            updated: new Date().toISOString()
          }
        }
      },
      {
        name: 'very-long-summary',
        issue: {
          key: 'TEST-4',
          fields: {
            summary: 'A'.repeat(300), // GitHub title max is 256
            description: 'This has a very long summary that exceeds GitHub limits',
            status: { name: 'To Do' },
            priority: { name: 'Low' },
            updated: new Date().toISOString()
          }
        }
      },
      {
        name: 'parent-child',
        issue: {
          key: 'TEST-5',
          fields: {
            summary: 'Child story',
            description: 'This is linked to a parent epic',
            status: { name: 'To Do' },
            priority: { name: 'High' },
            parent: {
              key: 'TEST-EPIC-1',
              fields: {
                summary: 'Parent Epic'
              }
            },
            updated: new Date().toISOString()
          }
        }
      },
      {
        name: 'multiple-labels',
        issue: {
          key: 'TEST-6',
          fields: {
            summary: 'Issue with many labels',
            description: 'Testing label limits',
            status: { name: 'To Do' },
            priority: { name: 'Medium' },
            labels: Array.from({ length: 50 }, (_, i) => `label-${i}`),
            updated: new Date().toISOString()
          }
        }
      }
    ]
  };

  const outputPath = join(
    process.cwd(),
    'tests',
    'fixtures',
    'jpd',
    'edge-cases.json'
  );
  
  writeFileSync(outputPath, JSON.stringify(edgeCases, null, 2));
  Logger.info(`✓ Saved edge case fixtures to ${outputPath}`);
  Logger.info(`  - Created ${edgeCases.cases.length} test cases`);
}

/**
 * Main execution
 */
async function main() {
  try {
    Logger.info('🚀 Starting fixture capture...\n');
    
    // Capture live data
    await captureJpdFixtures();
    console.log('');
    await captureGitHubFixtures();
    console.log('');
    
    // Create synthetic edge cases
    createEdgeCaseFixtures();
    
    console.log('');
    Logger.info('✅ Fixture capture complete!');
    Logger.info('\nNext steps:');
    Logger.info('  1. Review the captured fixtures in tests/fixtures/');
    Logger.info('  2. Use these fixtures in mocked unit tests');
    Logger.info('  3. Run: pnpm test to verify mocked tests pass');
    
  } catch (error) {
    Logger.error('❌ Fixture capture failed:', error);
    process.exit(1);
  }
}

main();

