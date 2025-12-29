/**
 * Field Mapping E2E Tests
 * 
 * Tests all JPD field types and their transformation to GitHub fields.
 * Validates custom fields, standard fields, and edge cases.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { setupTestEnv, getJpdTestIssues, type TestEnv } from './setup.js';
import { TransformerEngine } from '../../src/transformers/transformer-engine.js';
import { Logger } from '../../src/utils/logger.js';

const logger = new Logger();
let env: TestEnv;
let jpdIssues: any[];

beforeAll(async () => {
  logger.info('Setting up field mapping test environment...');
  env = await setupTestEnv();
  
  // Fetch JPD issues for testing
  jpdIssues = await getJpdTestIssues(env.jpdClient, env.jpdProject, 10);
  logger.info(`Loaded ${jpdIssues.length} JPD issues for field testing`);
}, 30000);

describe('JPD Field Type Tests', () => {
  test('should identify all available fields in JPD issues', () => {
    if (jpdIssues.length === 0) {
      logger.info('No issues available - skipping');
      return;
    }
    
    const sampleIssue = jpdIssues[0];
    const fields = Object.keys(sampleIssue.fields);
    
    logger.info(`\nAvailable fields in ${sampleIssue.key}:`);
    fields.forEach(field => {
      const value = sampleIssue.fields[field];
      const type = value === null ? 'null' : typeof value;
      const preview = value === null ? 'null' : 
                     typeof value === 'object' ? JSON.stringify(value).substring(0, 50) + '...' : 
                     String(value).substring(0, 50);
      
      logger.info(`  - ${field}: ${type} = ${preview}`);
    });
    
    // Standard fields should exist
    expect(fields).toContain('summary');
    expect(fields).toContain('description');
    expect(fields).toContain('status');
    expect(fields).toContain('updated');
    expect(fields).toContain('created');
  });

  test('should handle null priority field', () => {
    const issuesWithNullPriority = jpdIssues.filter(
      issue => issue.fields.priority === null
    );
    
    logger.info(`Found ${issuesWithNullPriority.length} issues with null priority`);
    
    // Null priority should not cause errors
    issuesWithNullPriority.forEach(issue => {
      expect(issue.fields.priority).toBeNull();
      logger.debug(`  ${issue.key}: priority is null`);
    });
  });

  test('should identify custom fields', () => {
    if (jpdIssues.length === 0) {
      logger.info('No issues available - skipping');
      return;
    }
    
    const sampleIssue = jpdIssues[0];
    const customFields = Object.keys(sampleIssue.fields).filter(
      f => f.startsWith('customfield_')
    );
    
    logger.info(`\nFound ${customFields.length} custom fields:`);
    customFields.forEach(cf => {
      const value = sampleIssue.fields[cf];
      logger.info(`  - ${cf}: ${value === null ? 'null' : typeof value === 'object' ? JSON.stringify(value).substring(0, 100) : value}`);
    });
    
    // Document custom fields for configuration
    if (customFields.length > 0) {
      logger.info('\nTo use these in your config, add mappings like:');
      customFields.slice(0, 3).forEach(cf => {
        logger.info(`  - jpd: "fields.${cf}.name"`);
        logger.info(`    github: "labels"`);
        logger.info(`    template: "${cf.replace('customfield_', 'custom')}:{{fields.${cf}.name | lowercase}}"`);
      });
    }
  });

  test('should extract description field', () => {
    const issuesWithDescription = jpdIssues.filter(
      issue => issue.fields.description
    );
    
    logger.info(`Found ${issuesWithDescription.length} issues with descriptions`);
    
    issuesWithDescription.slice(0, 3).forEach(issue => {
      const desc = issue.fields.description;
      const preview = typeof desc === 'string' ? desc.substring(0, 100) : JSON.stringify(desc).substring(0, 100);
      
      logger.debug(`  ${issue.key}: ${preview}...`);
      expect(desc).toBeDefined();
    });
  });

  test('should extract status information', () => {
    jpdIssues.forEach(issue => {
      expect(issue.fields.status).toBeDefined();
      expect(issue.fields.status.name).toBeDefined();
      
      logger.debug(`  ${issue.key}: status = ${issue.fields.status.name}`);
    });
    
    // Count status distribution
    const statusCounts: Record<string, number> = {};
    jpdIssues.forEach(issue => {
      const status = issue.fields.status.name;
      statusCounts[status] = (statusCounts[status] || 0) + 1;
    });
    
    logger.info('\nStatus distribution:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      logger.info(`  - ${status}: ${count}`);
    });
  });

  test('should extract assignee information', () => {
    const issuesWithAssignee = jpdIssues.filter(
      issue => issue.fields.assignee
    );
    
    logger.info(`Found ${issuesWithAssignee.length} issues with assignees`);
    
    issuesWithAssignee.slice(0, 3).forEach(issue => {
      const assignee = issue.fields.assignee;
      logger.debug(`  ${issue.key}: assignee = ${assignee.displayName || assignee.name}`);
      
      expect(assignee).toBeDefined();
    });
  });

  test('should extract labels if present', () => {
    const issuesWithLabels = jpdIssues.filter(
      issue => issue.fields.labels && issue.fields.labels.length > 0
    );
    
    logger.info(`Found ${issuesWithLabels.length} issues with labels`);
    
    issuesWithLabels.slice(0, 3).forEach(issue => {
      logger.debug(`  ${issue.key}: labels = ${issue.fields.labels.join(', ')}`);
      expect(Array.isArray(issue.fields.labels)).toBe(true);
    });
  });

  test('should handle parent field', () => {
    const issuesWithParent = jpdIssues.filter(
      issue => issue.fields.parent
    );
    
    logger.info(`Found ${issuesWithParent.length} issues with parent links`);
    
    issuesWithParent.forEach(issue => {
      const parent = issue.fields.parent;
      logger.debug(`  ${issue.key} -> parent: ${parent.key}`);
      
      expect(parent.key).toBeDefined();
      expect(parent.fields).toBeDefined();
    });
  });

  test('should handle special characters in summary', () => {
    const issuesWithSpecialChars = jpdIssues.filter(issue => {
      const summary = issue.fields.summary;
      return /[<>"'&\/\[\]()]/.test(summary);
    });
    
    logger.info(`Found ${issuesWithSpecialChars.length} issues with special characters in summary`);
    
    issuesWithSpecialChars.forEach(issue => {
      logger.debug(`  ${issue.key}: "${issue.fields.summary}"`);
      expect(issue.fields.summary).toBeDefined();
    });
  });

  test('should handle empty or null description', () => {
    const issuesWithoutDescription = jpdIssues.filter(
      issue => !issue.fields.description || issue.fields.description === ''
    );
    
    logger.info(`Found ${issuesWithoutDescription.length} issues without description`);
    
    // Should not cause errors
    issuesWithoutDescription.forEach(issue => {
      logger.debug(`  ${issue.key}: description is ${issue.fields.description === null ? 'null' : 'empty'}`);
    });
  });

  test('should extract timestamps', () => {
    jpdIssues.forEach(issue => {
      expect(issue.fields.created).toBeDefined();
      expect(issue.fields.updated).toBeDefined();
      
      logger.debug(`  ${issue.key}: created=${issue.fields.created}, updated=${issue.fields.updated}`);
      
      // Should be valid ISO dates
      expect(new Date(issue.fields.created).toString()).not.toBe('Invalid Date');
      expect(new Date(issue.fields.updated).toString()).not.toBe('Invalid Date');
    });
  });
});

describe('Field Transformation Tests', () => {
  test('should transform summary to title', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const mapping = {
      jpd: 'fields.summary',
      github: 'title'
    };
    
    const result = await TransformerEngine.transform(mapping, issue);
    
    expect(result).toBe(issue.fields.summary);
    logger.info(`Transformed: "${issue.fields.summary}" -> "${result}"`);
  });

  test('should transform status to label', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const mapping = {
      jpd: 'fields.status.name',
      github: 'labels',
      template: 'status:{{fields.status.name | lowercase}}'
    };
    
    const result = await TransformerEngine.transform(mapping, issue);
    const expected = `status:${issue.fields.status.name.toLowerCase()}`;
    
    expect(result).toBe(expected);
    logger.info(`Transformed: ${issue.fields.status.name} -> "${result}"`);
  });

  test('should handle null fields gracefully', async () => {
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
    
    const result = await TransformerEngine.transform(mapping, issueWithNullPriority);
    
    // Should return undefined or empty, not throw error
    expect(result).toBeUndefined();
    logger.info('✓ Null field handled gracefully');
  });

  test('should apply lowercase filter', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const mapping = {
      jpd: 'fields.status.name',
      github: 'labels',
      template: '{{fields.status.name | lowercase}}'
    };
    
    const result = await TransformerEngine.transform(mapping, issue);
    const expected = issue.fields.status.name.toLowerCase();
    
    expect(result).toBe(expected);
    logger.info(`Filter applied: "${issue.fields.status.name}" -> "${result}"`);
  });

  test('should apply slugify filter', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const mapping = {
      jpd: 'fields.summary',
      github: 'labels',
      template: '{{fields.summary | slugify}}'
    };
    
    const result = await TransformerEngine.transform(mapping, issue);
    
    // Slugified should have no spaces, lowercase
    expect(result).toMatch(/^[a-z0-9-]+$/);
    logger.info(`Slugified: "${issue.fields.summary}" -> "${result}"`);
  });
});

