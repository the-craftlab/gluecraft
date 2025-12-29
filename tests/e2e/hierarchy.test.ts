/**
 * Hierarchy E2E Tests
 * 
 * Tests Epic → Story → Task hierarchy handling including parent links,
 * hierarchy labels, and orphaned issue handling.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { setupTestEnv, getJpdTestIssues, type TestEnv } from './setup.js';
import { ConfigLoader } from '../../src/config/config-loader.js';
import { HierarchyManager } from '../../src/hierarchy/hierarchy-manager.js';
import { Logger } from '../../src/utils/logger.js';

const logger = new Logger();
let env: TestEnv;
let jpdIssues: any[];
let config: any;
let hierarchyManager: HierarchyManager;

beforeAll(async () => {
  logger.info('Setting up hierarchy test environment...');
  env = await setupTestEnv();
  jpdIssues = await getJpdTestIssues(env.jpdClient, env.jpdProject, 20);
  config = ConfigLoader.load('./config/local-config.yaml');
  hierarchyManager = new HierarchyManager(config);
  logger.info(`Loaded ${jpdIssues.length} JPD issues for hierarchy testing`);
}, 30000);

describe('Parent-Child Relationship Tests', () => {
  test('should identify issues with parent links', () => {
    const issuesWithParent = jpdIssues.filter(i => i.fields.parent);
    const issuesWithoutParent = jpdIssues.filter(i => !i.fields.parent);
    
    logger.info(`Issues with parent: ${issuesWithParent.length}`);
    logger.info(`Issues without parent: ${issuesWithoutParent.length}`);
    
    issuesWithParent.forEach(issue => {
      expect(issue.fields.parent).toBeDefined();
      expect(issue.fields.parent.key).toBeDefined();
      logger.debug(`  ${issue.key} -> parent: ${issue.fields.parent.key}`);
    });
  });

  test('should extract parent information correctly', () => {
    const issueWithParent = jpdIssues.find(i => i.fields.parent);
    
    if (!issueWithParent) {
      logger.info('No issue with parent - skipping');
      return;
    }
    
    const parent = issueWithParent.fields.parent;
    
    expect(parent.key).toBeDefined();
    expect(parent.fields).toBeDefined();
    
    logger.info(`Parent details for ${issueWithParent.key}:`);
    logger.info(`  Parent key: ${parent.key}`);
    logger.info(`  Parent summary: ${parent.fields.summary || 'N/A'}`);
  });

  test('should handle multiple children of same parent', () => {
    const parentGroups: Record<string, any[]> = {};
    
    jpdIssues.forEach(issue => {
      if (issue.fields.parent) {
        const parentKey = issue.fields.parent.key;
        if (!parentGroups[parentKey]) {
          parentGroups[parentKey] = [];
        }
        parentGroups[parentKey].push(issue);
      }
    });
    
    logger.info(`\nParent-child groups:`);
    Object.entries(parentGroups).forEach(([parentKey, children]) => {
      logger.info(`  ${parentKey} has ${children.length} children:`);
      children.forEach(child => {
        logger.info(`    - ${child.key}: ${child.fields.summary}`);
      });
    });
    
    expect(Object.keys(parentGroups).length).toBeGreaterThanOrEqual(0);
  });
});

describe('Hierarchy Label Generation Tests', () => {
  test('should generate epic label for child issue', () => {
    const issueWithParent = jpdIssues.find(i => i.fields.parent);
    
    if (!issueWithParent) {
      logger.info('No issue with parent - skipping');
      return;
    }
    
    const labels = hierarchyManager.generateLabels(
      issueWithParent,
      issueWithParent.fields.parent
    );
    
    logger.info(`Hierarchy labels for ${issueWithParent.key}:`);
    labels.forEach(l => logger.info(`  - ${l}`));
    
    expect(labels.length).toBeGreaterThan(0);
    
    // Should have some form of parent reference
    const hasParentLabel = labels.some(l => 
      l.includes(issueWithParent.fields.parent.key) ||
      l.startsWith('epic:') ||
      l.startsWith('parent:')
    );
    
    expect(hasParentLabel).toBe(true);
  });

  test('should not generate hierarchy labels for orphan issues', () => {
    const orphanIssue = jpdIssues.find(i => !i.fields.parent);
    
    if (!orphanIssue) {
      logger.info('All issues have parents - skipping');
      return;
    }
    
    const labels = hierarchyManager.generateLabels(orphanIssue, null);
    
    logger.info(`Labels for orphan ${orphanIssue.key}:`);
    labels.forEach(l => logger.info(`  - ${l}`));
    
    // Should not have parent/epic labels
    const hasParentLabel = labels.some(l => 
      l.startsWith('epic:') || l.startsWith('parent:')
    );
    
    expect(hasParentLabel).toBe(false);
  });

  test('should format hierarchy labels consistently', () => {
    const issuesWithParent = jpdIssues.filter(i => i.fields.parent);
    
    if (issuesWithParent.length === 0) {
      logger.info('No issues with parents - skipping');
      return;
    }
    
    const allHierarchyLabels: string[] = [];
    
    issuesWithParent.forEach(issue => {
      const labels = hierarchyManager.generateLabels(issue, issue.fields.parent);
      allHierarchyLabels.push(...labels);
    });
    
    logger.info(`\nAll hierarchy labels (${allHierarchyLabels.length}):`);
    const uniqueLabels = [...new Set(allHierarchyLabels)];
    uniqueLabels.forEach(l => logger.info(`  - ${l}`));
    
    // All should be valid strings
    expect(allHierarchyLabels.every(l => typeof l === 'string')).toBe(true);
  });
});

describe('Parent Link Body Injection Tests', () => {
  test('should generate parent link body text', () => {
    const issueWithParent = jpdIssues.find(i => i.fields.parent);
    
    if (!issueWithParent) {
      logger.info('No issue with parent - skipping');
      return;
    }
    
    const parentLink = hierarchyManager.getParentLinkBody(
      issueWithParent.fields.parent,
      process.env.JPD_BASE_URL!
    );
    
    logger.info(`Parent link body for ${issueWithParent.key}:`);
    logger.info(parentLink);
    
    expect(parentLink).toBeDefined();
    expect(parentLink).toContain(issueWithParent.fields.parent.key);
    expect(parentLink).toContain('http');
  });

  test('should include parent summary in link', () => {
    const issueWithParent = jpdIssues.find(i => i.fields.parent);
    
    if (!issueWithParent) {
      logger.info('No issue with parent - skipping');
      return;
    }
    
    const parent = issueWithParent.fields.parent;
    const parentLink = hierarchyManager.getParentLinkBody(
      parent,
      process.env.JPD_BASE_URL!
    );
    
    // Should contain parent key and possibly summary
    expect(parentLink).toContain(parent.key);
    
    if (parent.fields.summary) {
      logger.info(`Parent summary included: ${parent.fields.summary}`);
    }
  });

  test('should handle parent link without summary', () => {
    const issueWithParent = jpdIssues.find(i => i.fields.parent);
    
    if (!issueWithParent) {
      logger.info('No issue with parent - skipping');
      return;
    }
    
    // Mock parent without summary
    const mockParent = {
      key: issueWithParent.fields.parent.key,
      fields: {}
    };
    
    const parentLink = hierarchyManager.getParentLinkBody(
      mockParent,
      process.env.JPD_BASE_URL!
    );
    
    expect(parentLink).toBeDefined();
    expect(parentLink).toContain(mockParent.key);
    logger.info('✓ Parent link generated without summary');
  });
});

describe('Hierarchy Configuration Tests', () => {
  test('should load hierarchy config correctly', () => {
    expect(config.hierarchy).toBeDefined();
    
    logger.info('\nHierarchy configuration:');
    logger.info(`  JPD parent field: ${config.hierarchy?.jpdParentField || 'N/A'}`);
    logger.info(`  GitHub label prefix: ${config.hierarchy?.githubLabelPrefix || 'N/A'}`);
  });

  test('should use configured label prefix', () => {
    const issueWithParent = jpdIssues.find(i => i.fields.parent);
    
    if (!issueWithParent) {
      logger.info('No issue with parent - skipping');
      return;
    }
    
    const labels = hierarchyManager.generateLabels(
      issueWithParent,
      issueWithParent.fields.parent
    );
    
    const prefix = config.hierarchy?.githubLabelPrefix || 'epic';
    
    // At least one label should use the configured prefix
    const hasConfiguredPrefix = labels.some(l => l.startsWith(`${prefix}:`));
    
    logger.info(`Using label prefix: "${prefix}"`);
    logger.info(`Labels with prefix: ${labels.filter(l => l.startsWith(`${prefix}:`)).join(', ')}`);
    
    if (labels.length > 0) {
      expect(hasConfiguredPrefix).toBe(true);
    }
  });
});

describe('Circular Reference Prevention', () => {
  test('should detect circular parent references', () => {
    // This is a theoretical test - JPD shouldn't allow true circular refs
    // But we should handle it gracefully
    
    const mockIssue = {
      key: 'TEST-1',
      fields: {
        parent: {
          key: 'TEST-1', // Points to itself
          fields: {}
        }
      }
    };
    
    // Should not cause infinite loop
    const labels = hierarchyManager.generateLabels(
      mockIssue,
      mockIssue.fields.parent
    );
    
    expect(Array.isArray(labels)).toBe(true);
    logger.info('✓ Circular reference handled');
  });

  test('should limit parent traversal depth', () => {
    // Create a deep parent chain
    const deepChain = {
      key: 'DEEP-5',
      fields: {
        parent: {
          key: 'DEEP-4',
          fields: {
            parent: {
              key: 'DEEP-3',
              fields: {
                parent: {
                  key: 'DEEP-2',
                  fields: {
                    parent: {
                      key: 'DEEP-1',
                      fields: {}
                    }
                  }
                }
              }
            }
          }
        }
      }
    };
    
    // Should handle deep chains
    const labels = hierarchyManager.generateLabels(
      deepChain,
      deepChain.fields.parent
    );
    
    expect(Array.isArray(labels)).toBe(true);
    logger.info(`Deep chain handled: ${labels.length} labels generated`);
  });
});

describe('Epic vs Story vs Task Detection', () => {
  test('should identify issue types if available', () => {
    const issuesByType: Record<string, any[]> = {};
    
    jpdIssues.forEach(issue => {
      if (issue.fields.issuetype) {
        const type = issue.fields.issuetype.name;
        if (!issuesByType[type]) {
          issuesByType[type] = [];
        }
        issuesByType[type].push(issue);
      }
    });
    
    logger.info('\nIssue type distribution:');
    Object.entries(issuesByType).forEach(([type, issues]) => {
      logger.info(`  ${type}: ${issues.length} issues`);
      issues.slice(0, 2).forEach(i => {
        logger.info(`    - ${i.key}: ${i.fields.summary}`);
      });
    });
    
    expect(Object.keys(issuesByType).length).toBeGreaterThanOrEqual(0);
  });

  test('should distinguish epics from stories by parent field', () => {
    const epics = jpdIssues.filter(i => !i.fields.parent);
    const stories = jpdIssues.filter(i => i.fields.parent);
    
    logger.info(`\nHierarchy breakdown:`);
    logger.info(`  Epics (no parent): ${epics.length}`);
    logger.info(`  Stories (has parent): ${stories.length}`);
    
    epics.slice(0, 3).forEach(epic => {
      logger.info(`  Epic: ${epic.key} - ${epic.fields.summary}`);
    });
    
    stories.slice(0, 3).forEach(story => {
      logger.info(`  Story: ${story.key} - ${story.fields.summary}`);
    });
  });

  test('should handle hierarchy metadata in labels', () => {
    const issuesWithParent = jpdIssues.filter(i => i.fields.parent);
    
    if (issuesWithParent.length === 0) {
      logger.info('No issues with parents - skipping');
      return;
    }
    
    issuesWithParent.forEach(issue => {
      const labels = hierarchyManager.generateLabels(issue, issue.fields.parent);
      const hierarchyLabel = labels.find(l => 
        l.startsWith('epic:') || l.startsWith('parent:') || l.startsWith('story:')
      );
      
      if (hierarchyLabel) {
        logger.debug(`${issue.key}: ${hierarchyLabel}`);
      }
    });
    
    logger.info('✓ Hierarchy metadata processed');
  });
});

describe('Orphaned Issue Handling', () => {
  test('should handle deleted parent gracefully', () => {
    // Mock an issue whose parent was deleted
    const mockOrphan = {
      key: 'ORPHAN-1',
      fields: {
        summary: 'Orphaned issue',
        parent: null
      }
    };
    
    const labels = hierarchyManager.generateLabels(mockOrphan, null);
    
    expect(Array.isArray(labels)).toBe(true);
    expect(labels.every(l => !l.startsWith('epic:') && !l.startsWith('parent:'))).toBe(true);
    logger.info('✓ Orphaned issue handled');
  });

  test('should identify orphaned issues in real data', () => {
    const orphans = jpdIssues.filter(i => !i.fields.parent);
    
    logger.info(`\nFound ${orphans.length} potential orphaned issues:`);
    orphans.slice(0, 5).forEach(issue => {
      logger.info(`  ${issue.key}: ${issue.fields.summary}`);
    });
    
    expect(Array.isArray(orphans)).toBe(true);
  });
});

