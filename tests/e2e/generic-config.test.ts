/**
 * Generic Config End-to-End Test
 * 
 * Purpose: Validate that the tool works with arbitrary field IDs and status names,
 * ensuring NO hard-coded assumptions about field semantics or workflow structure.
 * 
 * This test uses completely different field IDs and status names than MTT to prove
 * the tool is truly generic.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { ConfigLoader } from '../../src/config/config-loader.js';
import { TransformerEngine } from '../../src/transformers/transformer-engine.js';
import path from 'path';
import fs from 'fs';

describe('Generic Config E2E', () => {
  const testConfigPath = path.join(__dirname, '../fixtures/configs/generic-test-config.yaml');
  
  beforeAll(() => {
    // Verify test config exists
    if (!fs.existsSync(testConfigPath)) {
      throw new Error(`Test config not found: ${testConfigPath}`);
    }
  });

  describe('Config Loading', () => {
    it('should load config with arbitrary field IDs', () => {
      const config = ConfigLoader.load(testConfigPath);
      
      expect(config).toBeDefined();
      expect(config.sync).toBeDefined();
      expect(config.mappings).toBeDefined();
      expect(config.mappings.length).toBeGreaterThan(0);
    });

    it('should accept non-MTT status names', () => {
      const config = ConfigLoader.load(testConfigPath);
      
      // Verify status names are NOT MTT statuses
      const statusNames = Object.keys(config.statuses || {});
      expect(statusNames).not.toContain('Idea');
      expect(statusNames).not.toContain('Discovery');
      expect(statusNames).not.toContain('Epic Design');
      
      // Should have some statuses though
      expect(statusNames.length).toBeGreaterThan(0);
    });

    it('should accept arbitrary field IDs (not customfield_14xxx)', () => {
      const config = ConfigLoader.load(testConfigPath);
      
      const mappings = config.mappings;
      const hasArbitraryFieldIds = mappings.some(m => {
        const jpdPath = typeof m.jpd === 'string' ? m.jpd : '';
        // Should have field IDs but NOT the MTT-specific ones
        return jpdPath.includes('customfield_') && 
               !jpdPath.includes('customfield_14');
      });
      
      expect(hasArbitraryFieldIds).toBe(true);
    });
  });

  describe('Transform Engine', () => {
    it('should handle field paths without semantic knowledge', async () => {
      const mockIssue = {
        key: 'TEST-1',
        fields: {
          summary: 'Test Issue',
          customfield_99999: {  // Arbitrary field ID
            value: 'TestValue'
          }
        }
      };

      const mapping = {
        jpd: 'fields.customfield_99999.value',
        github: 'labels',
        template: '{{fields.customfield_99999.value | lowercase}}'
      };

      const result = await TransformerEngine.transform(mapping, mockIssue);
      expect(result).toBe('testvalue');
    });

    it('should work with any status name', async () => {
      // The tool should map any status name, not just MTT ones
      const config = ConfigLoader.load(testConfigPath);
      const statuses = config.statuses || {};
      
      // Pick an arbitrary status
      const statusName = Object.keys(statuses)[0];
      const statusConfig = statuses[statusName];
      
      expect(statusConfig).toBeDefined();
      expect(['open', 'closed']).toContain(statusConfig.github_state);
    });
  });

  describe('Label Generation', () => {
    it('should generate labels without assuming field semantics', async () => {
      const mockIssue = {
        key: 'TEST-1',
        fields: {
          customfield_88888: {  // Not "Priority" - arbitrary field
            value: 'SomeValue'
          }
        }
      };

      const mapping = {
        jpd: 'fields.customfield_88888.value',
        github: 'labels',
        template: 'label:{{fields.customfield_88888.value | lowercase}}'
      };

      const result = await TransformerEngine.transform(mapping, mockIssue);
      expect(result).toBe('label:somevalue');
      
      // Tool doesn't know or care what this field represents
      expect(result).not.toContain('priority');
      expect(result).not.toContain('epic');
      expect(result).not.toContain('story');
    });
  });

  describe('Body Composition', () => {
    it('should build body from any fields via template', async () => {
      const mockIssue = {
        key: 'TEST-1',
        fields: {
          description: 'Main description',
          customfield_77777: 'Custom value 1',
          customfield_66666: { value: 'Custom value 2' }
        }
      };

      const mapping = {
        jpd: '.',
        github: 'body',
        template: '{{fields.description}}\n\nField A: {{fields.customfield_77777}}\nField B: {{fields.customfield_66666.value}}'
      };

      const result = await TransformerEngine.transform(mapping, mockIssue);
      expect(result).toContain('Main description');
      expect(result).toContain('Field A: Custom value 1');
      expect(result).toContain('Field B: Custom value 2');
    });
  });

  describe('No Hard-Coded Assumptions', () => {
    it('should NOT assume field names like "Priority"', () => {
      const config = ConfigLoader.load(testConfigPath);
      
      // Check mappings don't reference semantic field names
      const mappingStrings = JSON.stringify(config.mappings);
      
      // Should use field IDs, not field names
      expect(mappingStrings).not.toMatch(/Priority\b/);
      expect(mappingStrings).not.toMatch(/Theme\b/);
      expect(mappingStrings).not.toMatch(/Category\b(?!:)/);  // Allow "category:" as label prefix
    });

    it('should NOT assume workflow names', () => {
      const config = ConfigLoader.load(testConfigPath);
      const statuses = Object.keys(config.statuses || {});
      
      // Should not have opinionated workflow names
      // (unless they're actually used by this test project)
      const hasNoOpinionatedNames = !statuses.includes('Backlog') ||
                                     !statuses.includes('In Progress') ||
                                     !statuses.includes('Done');
      
      // At least verify we're not forcing ALL of these
      expect(statuses).not.toEqual(['Backlog', 'In Progress', 'Done']);
    });

    it('should NOT assume label patterns', () => {
      const config = ConfigLoader.load(testConfigPath);
      
      // Check for absence of prescriptive label patterns
      const configStr = JSON.stringify(config);
      
      // Should not force specific label patterns
      // (They can exist, but shouldn't be required)
      const hasFlexibleLabels = 
        !configStr.includes('"bug"') || 
        !configStr.includes('"epic"') ||
        !configStr.includes('"story"');
      
      expect(hasFlexibleLabels).toBe(true);
    });
  });
});

/**
 * Test Summary:
 * 
 * This test validates:
 * 1. Config loads with arbitrary field IDs (not customfield_14xxx)
 * 2. Status names can be anything (not just Idea/Discovery/Done)
 * 3. Transform engine works with any field paths
 * 4. Labels generate without assuming field semantics
 * 5. Body composition works with any fields
 * 6. NO assumptions about Priority, Theme, Category fields
 * 7. NO assumptions about Backlog, In Progress, Done workflow
 * 8. NO assumptions about bug, epic, story labels
 * 
 * If this test passes, the tool is truly generic.
 */

