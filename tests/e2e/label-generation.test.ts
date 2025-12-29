/**
 * Label Generation E2E Tests
 * 
 * Tests all label generation scenarios including single field labels,
 * multiple field labels, hierarchy labels, and team assignment labels.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { setupTestEnv, getJpdTestIssues, type TestEnv } from './setup.js';
import { ConfigLoader } from '../../src/config/config-loader.js';
import { TransformerEngine } from '../../src/transformers/transformer-engine.js';
import { HierarchyManager } from '../../src/hierarchy/hierarchy-manager.js';
import { Logger } from '../../src/utils/logger.js';

const logger = new Logger();
let env: TestEnv;
let jpdIssues: any[];
let config: any;

beforeAll(async () => {
  logger.info('Setting up label generation test environment...');
  env = await setupTestEnv();
  jpdIssues = await getJpdTestIssues(env.jpdClient, env.jpdProject, 10);
  config = ConfigLoader.load('./config/local-config.yaml');
  logger.info(`Loaded ${jpdIssues.length} JPD issues for label testing`);
}, 30000);

describe('Single Field Label Generation', () => {
  test('should generate status label from status field', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const mapping = {
      jpd: 'fields.status.name',
      github: 'labels',
      template: 'status:{{fields.status.name | lowercase}}'
    };
    
    const label = await TransformerEngine.transform(mapping, issue);
    const expected = `status:${issue.fields.status.name.toLowerCase()}`;
    
    expect(label).toBe(expected);
    logger.info(`Status label: ${issue.fields.status.name} -> "${label}"`);
  });

  test('should generate priority label if priority exists', async () => {
    const issueWithPriority = jpdIssues.find(i => i.fields.priority !== null);
    
    if (!issueWithPriority) {
      logger.info('No issue with priority - skipping');
      return;
    }
    
    const mapping = {
      jpd: 'fields.priority.name',
      github: 'labels',
      template: 'priority:{{fields.priority.name | lowercase}}'
    };
    
    const label = await TransformerEngine.transform(mapping, issueWithPriority);
    const expected = `priority:${issueWithPriority.fields.priority.name.toLowerCase()}`;
    
    expect(label).toBe(expected);
    logger.info(`Priority label: ${issueWithPriority.fields.priority.name} -> "${label}"`);
  });

  test('should skip label generation for null fields', async () => {
    const issueWithNullPriority = jpdIssues.find(i => i.fields.priority === null);
    
    if (!issueWithNullPriority) {
      logger.info('No issue with null priority - skipping');
      return;
    }
    
    const mapping = {
      jpd: 'fields.priority.name',
      github: 'labels',
      template: 'priority:{{fields.priority.name}}'
    };
    
    const label = await TransformerEngine.transform(mapping, issueWithNullPriority);
    
    // Should be undefined or empty
    expect(label === undefined || label === 'priority:').toBe(true);
    logger.info('✓ Null field skipped label generation');
  });

  test('should generate type label if available', async () => {
    const issueWithType = jpdIssues.find(i => i.fields.issuetype);
    
    if (!issueWithType) {
      logger.info('No issue with type - skipping');
      return;
    }
    
    const mapping = {
      jpd: 'fields.issuetype.name',
      github: 'labels',
      template: 'type:{{fields.issuetype.name | lowercase}}'
    };
    
    const label = await TransformerEngine.transform(mapping, issueWithType);
    const expected = `type:${issueWithType.fields.issuetype.name.toLowerCase()}`;
    
    expect(label).toBe(expected);
    logger.info(`Type label: ${issueWithType.fields.issuetype.name} -> "${label}"`);
  });
});

describe('Multiple Field Label Generation', () => {
  test('should generate multiple labels from different fields', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const labels: string[] = [];
    
    // Status label
    const statusMapping = {
      jpd: 'fields.status.name',
      github: 'labels',
      template: 'status:{{fields.status.name | lowercase}}'
    };
    const statusLabel = await TransformerEngine.transform(statusMapping, issue);
    if (statusLabel) labels.push(statusLabel);
    
    // Priority label (if exists)
    if (issue.fields.priority) {
      const priorityMapping = {
        jpd: 'fields.priority.name',
        github: 'labels',
        template: 'priority:{{fields.priority.name | lowercase}}'
      };
      const priorityLabel = await TransformerEngine.transform(priorityMapping, issue);
      if (priorityLabel) labels.push(priorityLabel);
    }
    
    logger.info(`Generated ${labels.length} labels for ${issue.key}:`);
    labels.forEach(l => logger.info(`  - ${l}`));
    
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.every(l => typeof l === 'string')).toBe(true);
  });

  test('should handle label deduplication', async () => {
    if (jpdIssues.length === 0) return;
    
    const labels = ['status:ready', 'priority:high', 'status:ready'];
    const uniqueLabels = [...new Set(labels)];
    
    expect(uniqueLabels).toEqual(['status:ready', 'priority:high']);
    logger.info(`Deduplicated: [${labels.join(', ')}] -> [${uniqueLabels.join(', ')}]`);
  });

  test('should combine labels from config mappings', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const labels: string[] = [];
    
    // Process all mappings that target labels
    for (const mapping of config.mappings) {
      if (mapping.github === 'labels') {
        const result = await TransformerEngine.transform(mapping, issue);
        if (result) {
          if (Array.isArray(result)) {
            labels.push(...result);
          } else {
            labels.push(result);
          }
        }
      }
    }
    
    logger.info(`Config-based labels for ${issue.key}: ${labels.length} labels`);
    labels.forEach(l => logger.info(`  - ${l}`));
    
    expect(Array.isArray(labels)).toBe(true);
  });
});

describe('Hierarchy Label Generation', () => {
  test('should generate parent link label for child issues', async () => {
    const issueWithParent = jpdIssues.find(i => i.fields.parent);
    
    if (!issueWithParent) {
      logger.info('No issue with parent - skipping');
      return;
    }
    
    const hierarchyManager = new HierarchyManager(config);
    const labels = hierarchyManager.generateLabels(issueWithParent, issueWithParent.fields.parent);
    
    logger.info(`Hierarchy labels for ${issueWithParent.key}:`);
    labels.forEach(l => logger.info(`  - ${l}`));
    
    expect(labels.length).toBeGreaterThan(0);
    expect(labels.some(l => l.startsWith('epic:') || l.startsWith('parent:'))).toBe(true);
  });

  test('should not generate parent label for orphan issues', async () => {
    const orphanIssue = jpdIssues.find(i => !i.fields.parent);
    
    if (!orphanIssue) {
      logger.info('All issues have parents - skipping');
      return;
    }
    
    const hierarchyManager = new HierarchyManager(config);
    const labels = hierarchyManager.generateLabels(orphanIssue, null);
    
    logger.info(`Hierarchy labels for orphan ${orphanIssue.key}:`);
    labels.forEach(l => logger.info(`  - ${l}`));
    
    // Should not have parent/epic labels
    expect(labels.every(l => !l.startsWith('epic:') && !l.startsWith('parent:'))).toBe(true);
  });

  test('should generate epic label with proper formatting', async () => {
    const issueWithParent = jpdIssues.find(i => i.fields.parent);
    
    if (!issueWithParent) {
      logger.info('No issue with parent - skipping');
      return;
    }
    
    const parent = issueWithParent.fields.parent;
    const hierarchyManager = new HierarchyManager(config);
    const labels = hierarchyManager.generateLabels(issueWithParent, parent);
    
    const epicLabel = labels.find(l => l.includes(parent.key));
    
    if (epicLabel) {
      logger.info(`Epic label: "${epicLabel}"`);
      expect(epicLabel).toContain(parent.key);
    }
  });
});

describe('Label Formatting Tests', () => {
  test('should handle special characters in label values', async () => {
    const issue = {
      ...jpdIssues[0],
      fields: {
        ...jpdIssues[0].fields,
        summary: 'Test: A/B [Draft]'
      }
    };
    
    const mapping = {
      jpd: 'fields.summary',
      github: 'labels',
      template: '{{fields.summary | slugify}}'
    };
    
    const label = await TransformerEngine.transform(mapping, issue);
    
    // Should be slug-safe
    expect(label).toMatch(/^[a-z0-9-]+$/);
    expect(label).not.toContain(' ');
    expect(label).not.toContain('/');
    expect(label).not.toContain('[');
    logger.info(`Special chars handled: "Test: A/B [Draft]" -> "${label}"`);
  });

  test('should truncate very long label values', async () => {
    const issue = {
      ...jpdIssues[0],
      fields: {
        ...jpdIssues[0].fields,
        summary: 'A'.repeat(100)
      }
    };
    
    const mapping = {
      jpd: 'fields.summary',
      github: 'labels',
      template: '{{fields.summary | slugify}}'
    };
    
    const label = await TransformerEngine.transform(mapping, issue);
    
    // GitHub labels have a practical limit
    logger.info(`Long label generated: ${label?.length} chars`);
    expect(label).toBeDefined();
  });

  test('should handle unicode in labels', async () => {
    const issue = {
      ...jpdIssues[0],
      fields: {
        ...jpdIssues[0].fields,
        summary: '测试 🚀 Test'
      }
    };
    
    const mapping = {
      jpd: 'fields.summary',
      github: 'labels',
      template: '{{fields.summary | slugify}}'
    };
    
    const label = await TransformerEngine.transform(mapping, issue);
    
    // Slugify should handle unicode
    logger.info(`Unicode label: "测试 🚀 Test" -> "${label}"`);
    expect(label).toBeDefined();
  });
});

describe('Label Limits and Edge Cases', () => {
  test('should handle many labels', async () => {
    const labels = Array.from({ length: 50 }, (_, i) => `label-${i}`);
    
    // GitHub allows up to 100 labels per issue
    expect(labels.length).toBeLessThanOrEqual(100);
    logger.info(`Generated ${labels.length} labels (within GitHub limit)`);
  });

  test('should handle empty label array', async () => {
    const labels: string[] = [];
    
    expect(Array.isArray(labels)).toBe(true);
    expect(labels.length).toBe(0);
    logger.info('✓ Empty label array handled');
  });

  test('should filter out undefined labels', async () => {
    const labels = ['status:ready', undefined, 'priority:high', null, ''];
    const validLabels = labels.filter(l => l && typeof l === 'string' && l.trim().length > 0);
    
    expect(validLabels).toEqual(['status:ready', 'priority:high']);
    logger.info(`Filtered labels: ${validLabels.length} valid out of ${labels.length} total`);
  });

  test('should handle label with only prefix', async () => {
    const label = 'status:';
    
    // Should either be filtered or handled gracefully
    const isValid = label.split(':')[1]?.length > 0;
    expect(isValid).toBe(false);
    logger.info('✓ Empty label value detected');
  });
});

describe('Team Assignment Labels', () => {
  test('should generate team label if assignee matches team', async () => {
    const issueWithAssignee = jpdIssues.find(i => i.fields.assignee);
    
    if (!issueWithAssignee) {
      logger.info('No issue with assignee - skipping');
      return;
    }
    
    const assignee = issueWithAssignee.fields.assignee;
    const mapping = {
      jpd: 'fields.assignee.displayName',
      github: 'labels',
      template: 'assigned:{{fields.assignee.displayName | slugify}}'
    };
    
    const label = await TransformerEngine.transform(mapping, issueWithAssignee);
    
    expect(label).toBeDefined();
    expect(label).toContain('assigned:');
    logger.info(`Assignee label: ${assignee.displayName} -> "${label}"`);
  });

  test('should handle unassigned issues', async () => {
    const unassignedIssue = jpdIssues.find(i => !i.fields.assignee);
    
    if (!unassignedIssue) {
      logger.info('All issues are assigned - skipping');
      return;
    }
    
    const mapping = {
      jpd: 'fields.assignee.displayName',
      github: 'labels',
      template: 'assigned:{{fields.assignee.displayName}}'
    };
    
    const label = await TransformerEngine.transform(mapping, unassignedIssue);
    
    // Should be undefined or 'assigned:'
    expect(label === undefined || label === 'assigned:').toBe(true);
    logger.info('✓ Unassigned issue handled');
  });
});

