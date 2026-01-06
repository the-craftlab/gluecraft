/**
 * E2E tests for GitHub Projects v2 Field Validation
 * 
 * Tests field validation before sync to catch configuration errors early.
 * Validates:
 * - Field existence in project
 * - Field type compatibility
 * - Single-select option availability
 * - Helpful error messages
 * 
 * @group e2e
 * @group projects
 * @group validation
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { GitHubProjectsClient } from '../../src/clients/github-projects-client.js';
import { setupTestEnv, type TestEnv } from './setup.js';
import { ConfigLoader } from '../../src/config/config-loader.js';
import type { ProjectFieldMapping } from '../../src/config/config-schema.js';

describe('GitHub Projects v2 Field Validation', () => {
  let env: TestEnv;
  let projectsClient: GitHubProjectsClient;
  let projectId: string;
  let projectNumber: number;

  beforeAll(async () => {
    env = await setupTestEnv();
    
    projectsClient = new GitHubProjectsClient(
      process.env.GITHUB_TOKEN!,
      false
    );

    const config = ConfigLoader.load('./config/mtt-test-config.yaml');
    projectNumber = config.projects?.project_number || 23;

    const project = await projectsClient.getProjectByNumber(
      env.githubOwner,
      env.githubRepo,
      projectNumber
    );
    
    if (!project) {
      throw new Error(`Project #${projectNumber} not found`);
    }
    
    projectId = project.id;
  }, 30000);

  describe('Field Existence Validation', () => {
    it('should detect all configured fields exist in project', async () => {
      const config = ConfigLoader.load('./config/mtt-test-config.yaml');
      const mappings = config.projects?.field_mappings || [];

      const validation = await projectsClient.validateFieldMappings(projectId, mappings);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect non-existent project field before sync', async () => {
      const invalidMapping: ProjectFieldMapping = {
        jpd: 'fields.customfield_99999',
        github_field: 'NonExistentField',
        type: 'date'
      };

      const validation = await projectsClient.validateFieldMappings(
        projectId,
        [invalidMapping]
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain(
        'Field "NonExistentField" not found in project'
      );
    });

    it('should provide helpful error with field name', async () => {
      const invalidMapping: ProjectFieldMapping = {
        jpd: 'fields.customfield_12345',
        github_field: 'MissingCustomField',
        type: 'number'
      };

      const validation = await projectsClient.validateFieldMappings(
        projectId,
        [invalidMapping]
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('MissingCustomField');
      expect(validation.errors[0]).toContain('not found');
    });
  });

  describe('Field Type Validation', () => {
    it('should validate DATE field type matches', async () => {
      const fields = await projectsClient.getProjectFields(projectId);
      const startDateField = fields.find(f => f.name === 'Start date');
      
      expect(startDateField).toBeDefined();
      expect(startDateField?.dataType).toBe('DATE');
    });

    it('should validate NUMBER field type matches', async () => {
      const fields = await projectsClient.getProjectFields(projectId);
      const estimateField = fields.find(f => f.name === 'Estimate');
      
      expect(estimateField).toBeDefined();
      expect(estimateField?.dataType).toBe('NUMBER');
    });

    it('should validate SINGLE_SELECT field type matches', async () => {
      const fields = await projectsClient.getProjectFields(projectId);
      const priorityField = fields.find(f => f.name === 'Priority');
      
      expect(priorityField).toBeDefined();
      expect(priorityField?.dataType).toBe('SINGLE_SELECT');
      expect(priorityField?.options).toBeDefined();
      expect(priorityField?.options?.length).toBeGreaterThan(0);
    });

    it('should detect wrong field type (expecting DATE, got NUMBER)', async () => {
      const wrongTypeMapping: ProjectFieldMapping = {
        jpd: 'fields.customfield_14387',
        github_field: 'Estimate', // This is a NUMBER field
        type: 'date' // But we're expecting it to be a DATE
      };

      const validation = await projectsClient.validateFieldMappings(
        projectId,
        [wrongTypeMapping]
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Estimate');
      expect(validation.errors[0]).toContain('type mismatch');
      expect(validation.errors[0]).toContain('date');
      expect(validation.errors[0]).toContain('NUMBER');
    });

    it('should detect wrong field type (expecting NUMBER, got DATE)', async () => {
      const wrongTypeMapping: ProjectFieldMapping = {
        jpd: 'fields.customfield_14383',
        github_field: 'Start date', // This is a DATE field
        type: 'number' // But we're expecting it to be a NUMBER
      };

      const validation = await projectsClient.validateFieldMappings(
        projectId,
        [wrongTypeMapping]
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Start date');
      expect(validation.errors[0]).toContain('type mismatch');
      expect(validation.errors[0]).toContain('number');
      expect(validation.errors[0]).toContain('DATE');
    });

    it('should detect wrong field type (expecting SINGLE_SELECT, got NUMBER)', async () => {
      const wrongTypeMapping: ProjectFieldMapping = {
        jpd: 'fields.customfield_14387',
        github_field: 'Estimate', // This is a NUMBER field
        type: 'single_select' // But we're expecting it to be SINGLE_SELECT
      };

      const validation = await projectsClient.validateFieldMappings(
        projectId,
        [wrongTypeMapping]
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('Estimate');
      expect(validation.errors[0]).toContain('type mismatch');
    });
  });

  describe('Single-Select Option Validation', () => {
    it('should validate all Priority options exist (P0, P1, P2, P3)', async () => {
      const fields = await projectsClient.getProjectFields(projectId);
      const priorityField = fields.find(f => f.name === 'Priority');
      
      expect(priorityField).toBeDefined();
      expect(priorityField?.options).toBeDefined();
      
      const optionNames = priorityField?.options?.map(o => o.name) || [];
      expect(optionNames).toContain('P0');
      expect(optionNames).toContain('P1');
      expect(optionNames).toContain('P2');
      expect(optionNames).toContain('P3');
    });

    it('should validate all Size options exist (XS, S, M, L, XL)', async () => {
      const fields = await projectsClient.getProjectFields(projectId);
      const sizeField = fields.find(f => f.name === 'Size');
      
      expect(sizeField).toBeDefined();
      expect(sizeField?.options).toBeDefined();
      
      const optionNames = sizeField?.options?.map(o => o.name) || [];
      expect(optionNames).toContain('XS');
      expect(optionNames).toContain('S');
      expect(optionNames).toContain('M');
      expect(optionNames).toContain('L');
      expect(optionNames).toContain('XL');
    });

    it('should detect missing single-select option (e.g., P4 not in Priority)', async () => {
      const mappingWithMissingOption: ProjectFieldMapping = {
        jpd: 'fields.customfield_14425.value',
        github_field: 'Priority',
        type: 'single_select',
        mapping: {
          Critical: 'P0',
          High: 'P1',
          Normal: 'P2',
          Low: 'P3',
          VeryLow: 'P4' // This option doesn't exist
        }
      };

      const validation = await projectsClient.validateFieldMappings(
        projectId,
        [mappingWithMissingOption]
      );

      // Should have warnings (not errors) for missing options
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some(w => w.includes('P4'))).toBe(true);
      expect(validation.warnings.some(w => w.includes('Priority'))).toBe(true);
    });

    it('should warn about missing mapped option with source value', async () => {
      const mappingWithMissingOption: ProjectFieldMapping = {
        jpd: 'fields.customfield_14425.value',
        github_field: 'Priority',
        type: 'single_select',
        mapping: {
          Urgent: 'P-1' // P-1 doesn't exist in Priority options
        }
      };

      const validation = await projectsClient.validateFieldMappings(
        projectId,
        [mappingWithMissingOption]
      );

      expect(validation.warnings.length).toBeGreaterThan(0);
      const warning = validation.warnings.find(w => w.includes('P-1'));
      expect(warning).toBeDefined();
      expect(warning).toContain('Urgent'); // Should show source value
      expect(warning).toContain('Priority'); // Should show field name
    });
  });

  describe('Multiple Field Validation', () => {
    it('should validate multiple fields at once and report all errors', async () => {
      const multipleInvalidMappings: ProjectFieldMapping[] = [
        {
          jpd: 'fields.customfield_99999',
          github_field: 'FakeField1',
          type: 'date'
        },
        {
          jpd: 'fields.customfield_88888',
          github_field: 'FakeField2',
          type: 'number'
        },
        {
          jpd: 'fields.customfield_77777',
          github_field: 'FakeField3',
          type: 'single_select'
        }
      ];

      const validation = await projectsClient.validateFieldMappings(
        projectId,
        multipleInvalidMappings
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(3);
      expect(validation.errors[0]).toContain('FakeField1');
      expect(validation.errors[1]).toContain('FakeField2');
      expect(validation.errors[2]).toContain('FakeField3');
    });

    it('should validate mix of valid and invalid fields', async () => {
      const mixedMappings: ProjectFieldMapping[] = [
        {
          jpd: 'fields.customfield_14383',
          github_field: 'Start date',
          type: 'date' // Valid
        },
        {
          jpd: 'fields.customfield_99999',
          github_field: 'InvalidField',
          type: 'number' // Invalid - field doesn't exist
        }
      ];

      const validation = await projectsClient.validateFieldMappings(
        projectId,
        mixedMappings
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors).toHaveLength(1);
      expect(validation.errors[0]).toContain('InvalidField');
    });
  });

  describe('Error Message Quality', () => {
    it('should provide actionable error message for missing field', async () => {
      const invalidMapping: ProjectFieldMapping = {
        jpd: 'fields.customfield_12345',
        github_field: 'CustomScore',
        type: 'number'
      };

      const validation = await projectsClient.validateFieldMappings(
        projectId,
        [invalidMapping]
      );

      expect(validation.valid).toBe(false);
      const error = validation.errors[0];
      
      // Error should be clear and actionable
      expect(error).toContain('CustomScore');
      expect(error).toContain('not found');
      expect(error.length).toBeGreaterThan(20); // Should be descriptive
    });

    it('should provide clear type mismatch error', async () => {
      const wrongTypeMapping: ProjectFieldMapping = {
        jpd: 'fields.customfield_14387',
        github_field: 'Estimate',
        type: 'date' // Wrong type
      };

      const validation = await projectsClient.validateFieldMappings(
        projectId,
        [wrongTypeMapping]
      );

      const error = validation.errors[0];
      
      // Should clearly state expected vs actual type
      expect(error).toContain('Estimate');
      expect(error).toContain('type mismatch');
      expect(error).toContain('expected');
      expect(error).toContain('got');
    });

    it('should return empty errors for valid configuration', async () => {
      const config = ConfigLoader.load('./config/mtt-test-config.yaml');
      const mappings = config.projects?.field_mappings || [];

      const validation = await projectsClient.validateFieldMappings(projectId, mappings);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty mappings array', async () => {
      const validation = await projectsClient.validateFieldMappings(projectId, []);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should handle invalid project ID gracefully', async () => {
      const invalidMapping: ProjectFieldMapping = {
        jpd: 'fields.customfield_14383',
        github_field: 'Start date',
        type: 'date'
      };

      const validation = await projectsClient.validateFieldMappings(
        'INVALID_PROJECT_ID',
        [invalidMapping]
      );

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle single-select field without mapping config', async () => {
      const singleSelectWithoutMapping: ProjectFieldMapping = {
        jpd: 'fields.customfield_14425.value',
        github_field: 'Priority',
        type: 'single_select'
        // No mapping property
      };

      const validation = await projectsClient.validateFieldMappings(
        projectId,
        [singleSelectWithoutMapping]
      );

      // Should still be valid - mapping is optional
      expect(validation.valid).toBe(true);
    });
  });
});
