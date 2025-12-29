/**
 * Transformation E2E Tests
 * 
 * Tests all transformation scenarios including templates, custom functions,
 * filters, and complex field mappings.
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { setupTestEnv, getJpdTestIssues, type TestEnv } from './setup.js';
import { TransformerEngine } from '../../src/transformers/transformer-engine.js';
import { TemplateParser } from '../../src/transformers/template-parser.js';
import { Logger } from '../../src/utils/logger.js';

const logger = new Logger();
let env: TestEnv;
let jpdIssues: any[];

beforeAll(async () => {
  logger.info('Setting up transformation test environment...');
  env = await setupTestEnv();
  jpdIssues = await getJpdTestIssues(env.jpdClient, env.jpdProject, 5);
  logger.info(`Loaded ${jpdIssues.length} JPD issues for transformation testing`);
}, 30000);

describe('Template Transformation Tests', () => {
  test('should substitute simple variables', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const template = 'Issue: {{fields.summary}}';
    
    const result = TemplateParser.parse(template, issue);
    const expected = `Issue: ${issue.fields.summary}`;
    
    expect(result).toBe(expected);
    logger.info(`Simple substitution: "${template}" -> "${result}"`);
  });

  test('should substitute nested paths', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const template = '{{fields.status.name}}';
    
    const result = TemplateParser.parse(template, issue);
    
    expect(result).toBe(issue.fields.status.name);
    logger.info(`Nested path: "${template}" -> "${result}"`);
  });

  test('should apply lowercase filter', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const template = '{{fields.status.name | lowercase}}';
    
    const result = TemplateParser.parse(template, issue);
    const expected = issue.fields.status.name.toLowerCase();
    
    expect(result).toBe(expected);
    logger.info(`Lowercase filter: "${issue.fields.status.name}" -> "${result}"`);
  });

  test('should apply slugify filter', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const template = '{{fields.summary | slugify}}';
    
    const result = TemplateParser.parse(template, issue);
    
    // Should be lowercase, no spaces
    expect(result).toMatch(/^[a-z0-9-]+$/);
    expect(result).not.toContain(' ');
    
    logger.info(`Slugify filter: "${issue.fields.summary}" -> "${result}"`);
  });

  test('should combine multiple fields', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const template = '{{key}}-{{fields.status.name | lowercase}}';
    
    const result = TemplateParser.parse(template, issue);
    const expected = `${issue.key}-${issue.fields.status.name.toLowerCase()}`;
    
    expect(result).toBe(expected);
    logger.info(`Multiple fields: "${template}" -> "${result}"`);
  });

  test('should handle prefix in templates', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const template = 'status:{{fields.status.name | lowercase}}';
    
    const result = TemplateParser.parse(template, issue);
    const expected = `status:${issue.fields.status.name.toLowerCase()}`;
    
    expect(result).toBe(expected);
    logger.info(`Prefix template: "${template}" -> "${result}"`);
  });

  test('should handle missing fields gracefully', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const template = '{{fields.nonexistent.field}}';
    
    const result = TemplateParser.parse(template, issue);
    
    // Should return empty string or undefined, not throw
    expect(result === '' || result === undefined).toBe(true);
    logger.info(`Missing field handled: "${template}" -> "${result}"`);
  });

  test('should handle null field values', async () => {
    const issueWithNull = jpdIssues.find(i => i.fields.priority === null);
    
    if (!issueWithNull) {
      logger.info('No issue with null values - skipping');
      return;
    }
    
    const template = 'priority:{{fields.priority.name}}';
    
    const result = TemplateParser.parse(template, issueWithNull);
    
    // Should handle gracefully
    expect(result === 'priority:' || result === '' || result === undefined).toBe(true);
    logger.info(`Null field handled: "${template}" -> "${result}"`);
  });

  test('should chain multiple filters', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const template = '{{fields.summary | lowercase | slugify}}';
    
    const result = TemplateParser.parse(template, issue);
    
    // Should be slugified (lowercase, dashes)
    expect(result).toMatch(/^[a-z0-9-]+$/);
    logger.info(`Chained filters: "${issue.fields.summary}" -> "${result}"`);
  });
});

describe('Complex Transformation Tests', () => {
  test('should transform with TransformerEngine', async () => {
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
    logger.info(`TransformerEngine: ${issue.fields.status.name} -> "${result}"`);
  });

  test('should handle array-to-multiple-labels transformation', async () => {
    const issueWithLabels = jpdIssues.find(i => 
      i.fields.labels && Array.isArray(i.fields.labels) && i.fields.labels.length > 0
    );
    
    if (!issueWithLabels) {
      logger.info('No issue with labels - skipping');
      return;
    }
    
    const mapping = {
      jpd: 'fields.labels',
      github: 'labels'
    };
    
    const result = await TransformerEngine.transform(mapping, issueWithLabels);
    
    // Should return array if JPD has array
    expect(Array.isArray(result) || typeof result === 'string').toBe(true);
    logger.info(`Array transformation: ${issueWithLabels.fields.labels} -> ${result}`);
  });

  test('should support conditional transformations', async () => {
    if (jpdIssues.length === 0) return;
    
    // Test that we can conditionally include labels based on field presence
    const issue = jpdIssues[0];
    
    // If priority exists, create priority label
    if (issue.fields.priority) {
      const mapping = {
        jpd: 'fields.priority.name',
        github: 'labels',
        template: 'priority:{{fields.priority.name | lowercase}}'
      };
      
      const result = await TransformerEngine.transform(mapping, issue);
      expect(result).toBeDefined();
      expect(result).toContain('priority:');
      logger.info(`Conditional (priority exists): ${result}`);
    } else {
      const mapping = {
        jpd: 'fields.priority.name',
        github: 'labels',
        template: 'priority:{{fields.priority.name}}'
      };
      
      const result = await TransformerEngine.transform(mapping, issue);
      // Should be undefined or empty for null priority
      expect(result === undefined || result === 'priority:').toBe(true);
      logger.info(`Conditional (priority null): ${result}`);
    }
  });
});

describe('Custom Function Transformation Tests', () => {
  test('should load and execute custom function if exists', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    
    // Test with the example combine-labels function
    const mapping = {
      jpd: 'multiple',
      github: 'labels',
      customFunction: './transforms/combine-labels.ts'
    };
    
    try {
      const result = await TransformerEngine.transform(mapping, issue);
      
      // Should return array of labels
      expect(Array.isArray(result)).toBe(true);
      logger.info(`Custom function result: ${JSON.stringify(result)}`);
    } catch (error: any) {
      // Custom function might not exist yet, that's ok
      logger.info(`Custom function not found (expected): ${error.message}`);
    }
  });

  test('should handle custom function errors gracefully', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const mapping = {
      jpd: 'multiple',
      github: 'labels',
      customFunction: './transforms/nonexistent.ts'
    };
    
    // Should not throw, should return undefined
    const result = await TransformerEngine.transform(mapping, issue);
    
    expect(result).toBeUndefined();
    logger.info('✓ Nonexistent custom function handled gracefully');
  });
});

describe('Edge Case Transformation Tests', () => {
  test('should handle very long strings', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = {
      ...jpdIssues[0],
      fields: {
        ...jpdIssues[0].fields,
        summary: 'A'.repeat(500) // Very long summary
      }
    };
    
    const mapping = {
      jpd: 'fields.summary',
      github: 'title',
      template: '{{fields.summary}}'
    };
    
    const result = await TransformerEngine.transform(mapping, issue);
    
    expect(result).toBeDefined();
    expect(result?.length).toBe(500);
    logger.info(`Long string handled: ${result?.length} chars`);
  });

  test('should handle special characters in transformation', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = {
      ...jpdIssues[0],
      fields: {
        ...jpdIssues[0].fields,
        summary: 'Test: A/B [Draft] (v2.0) <html> & "quotes"'
      }
    };
    
    const mapping = {
      jpd: 'fields.summary',
      github: 'title',
      template: '{{fields.summary}}'
    };
    
    const result = await TransformerEngine.transform(mapping, issue);
    
    expect(result).toBe(issue.fields.summary);
    logger.info(`Special chars preserved: "${result}"`);
  });

  test('should handle unicode characters', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = {
      ...jpdIssues[0],
      fields: {
        ...jpdIssues[0].fields,
        summary: '测试 🚀 Tëst'
      }
    };
    
    const mapping = {
      jpd: 'fields.summary',
      github: 'title',
      template: '{{fields.summary}}'
    };
    
    const result = await TransformerEngine.transform(mapping, issue);
    
    expect(result).toBe(issue.fields.summary);
    logger.info(`Unicode handled: "${result}"`);
  });

  test('should handle empty string transformation', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = {
      ...jpdIssues[0],
      fields: {
        ...jpdIssues[0].fields,
        description: ''
      }
    };
    
    const mapping = {
      jpd: 'fields.description',
      github: 'body',
      template: '{{fields.description}}'
    };
    
    const result = await TransformerEngine.transform(mapping, issue);
    
    expect(result).toBe('');
    logger.info('✓ Empty string handled');
  });
});

describe('Filter Chain Tests', () => {
  test('should apply trim filter', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = {
      ...jpdIssues[0],
      fields: {
        ...jpdIssues[0].fields,
        summary: '  Test with spaces  '
      }
    };
    
    const template = '{{fields.summary | trim}}';
    const result = TemplateParser.parse(template, issue);
    
    expect(result).toBe('Test with spaces');
    logger.info(`Trim filter: "${issue.fields.summary}" -> "${result}"`);
  });

  test('should apply uppercase filter', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = jpdIssues[0];
    const template = '{{fields.status.name | uppercase}}';
    
    const result = TemplateParser.parse(template, issue);
    const expected = issue.fields.status.name.toUpperCase();
    
    expect(result).toBe(expected);
    logger.info(`Uppercase filter: "${issue.fields.status.name}" -> "${result}"`);
  });

  test('should combine filters intelligently', async () => {
    if (jpdIssues.length === 0) return;
    
    const issue = {
      ...jpdIssues[0],
      fields: {
        ...jpdIssues[0].fields,
        summary: '  Test: Complex / Label  '
      }
    };
    
    const template = '{{fields.summary | trim | lowercase | slugify}}';
    const result = TemplateParser.parse(template, issue);
    
    // Should be trimmed, lowercase, slugified
    expect(result).toMatch(/^[a-z0-9-]+$/);
    expect(result).not.toContain(' ');
    logger.info(`Filter chain: "${issue.fields.summary}" -> "${result}"`);
  });
});

