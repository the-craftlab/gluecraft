/**
 * E2E tests for GitHub Projects v2 Live API Integration
 * 
 * Tests real GitHub Projects API behavior for field synchronization.
 * Requires:
 * - GitHub Projects v2 enabled in test repo
 * - Test project with custom fields: Start date, Target date, Priority, Size, Estimate
 * - Environment variables configured
 * 
 * @group e2e
 * @group projects
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GitHubProjectsClient } from '../../src/clients/github-projects-client.js';
import { GitHubClient } from '../../src/clients/github-client.js';
import { ProjectFieldTransformer } from '../../src/transformers/project-field-transformer.js';
import { setupTestEnv, teardownTestEnv, type TestEnv } from './setup.js';
import { ConfigLoader } from '../../src/config/config-loader.js';
import type { ProjectFieldMapping } from '../../src/config/config-schema.js';

describe('GitHub Projects v2 Live API Integration', () => {
  let env: TestEnv;
  let projectsClient: GitHubProjectsClient;
  let githubClient: GitHubClient;
  let projectId: string;
  let projectNumber: number;
  let testIssueNumber: number;
  let testIssueNodeId: string;
  let projectItemId: string;

  beforeAll(async () => {
    // Setup test environment
    env = await setupTestEnv();
    githubClient = env.githubClient;
    
    // Initialize GitHub Projects client
    projectsClient = new GitHubProjectsClient(
      process.env.GITHUB_TOKEN!,
      false // dry-run = false for E2E
    );

    // Load config to get project number
    const config = ConfigLoader.load('./config/mtt-test-config.yaml');
    projectNumber = config.projects?.project_number || 23;

    // Get project by number
    const project = await projectsClient.getProjectByNumber(
      env.githubOwner,
      env.githubRepo,
      projectNumber
    );
    
    if (!project) {
      throw new Error(`Project #${projectNumber} not found`);
    }
    
    projectId = project.id;

    // Create a test issue for field updates
    const issue = await githubClient.createIssue(
      env.githubOwner,
      env.githubRepo,
      {
        title: `[E2E Test] GitHub Projects Field Sync - ${env.testRunId}`,
        body: 'Test issue for GitHub Projects v2 field synchronization E2E tests',
        labels: ['test-issue', env.testRunId]
      }
    );

    testIssueNumber = issue.number;
    testIssueNodeId = issue.node_id;

    // Add issue to project
    projectItemId = await projectsClient.addIssueToProject(projectId, testIssueNodeId) || '';
    
    if (!projectItemId) {
      throw new Error('Failed to add issue to project');
    }
  }, 60000); // 60s timeout for setup

  afterAll(async () => {
    // Cleanup test issue
    if (testIssueNumber) {
      await githubClient.updateIssue(
        env.githubOwner,
        env.githubRepo,
        testIssueNumber,
        { state: 'closed' }
      );
    }
    
    await teardownTestEnv(env);
  }, 30000);

  describe('Date Field Synchronization', () => {
    it('should sync JPD start date to GitHub Project date field', async () => {
      const startDate = '2024-06-01';
      
      // Get field info
      const fields = await projectsClient.getProjectFields(projectId);
      const startDateField = fields.find(f => f.name === 'Start date' && f.dataType === 'DATE');
      
      if (!startDateField) {
        throw new Error('Start date field not found in project');
      }

      // Update field value
      const success = await projectsClient.updateFieldValue(
        projectId,
        projectItemId,
        startDateField.id,
        { date: startDate }
      );

      expect(success).toBe(true);
    });

    it('should sync JPD target date to GitHub Project date field', async () => {
      const targetDate = '2024-06-30';
      
      const fields = await projectsClient.getProjectFields(projectId);
      const targetDateField = fields.find(f => f.name === 'Target date' && f.dataType === 'DATE');
      
      if (!targetDateField) {
        throw new Error('Target date field not found in project');
      }

      const success = await projectsClient.updateFieldValue(
        projectId,
        projectItemId,
        targetDateField.id,
        { date: targetDate }
      );

      expect(success).toBe(true);
    });

    it('should handle null dates gracefully', async () => {
      const fields = await projectsClient.getProjectFields(projectId);
      const startDateField = fields.find(f => f.name === 'Start date' && f.dataType === 'DATE');
      
      if (!startDateField) {
        throw new Error('Start date field not found in project');
      }

      // Clear the date field by passing null
      const success = await projectsClient.updateFieldValue(
        projectId,
        projectItemId,
        startDateField.id,
        { date: null as any }
      );

      // Should succeed (clearing a date is valid)
      expect(success).toBe(true);
    });

    it('should parse various date formats correctly', () => {
      // Test ISO format
      const iso = ProjectFieldTransformer.parseDate('2024-06-15');
      expect(iso).toBe('2024-06-15');

      // Test slash format
      const slash = ProjectFieldTransformer.parseDate('06/15/2024');
      expect(slash).toMatch(/2024-06-15/);

      // Test with time
      const withTime = ProjectFieldTransformer.parseDate('2024-06-15T10:30:00Z');
      expect(withTime).toMatch(/2024-06-15/);
    });
  });

  describe('Number Field Synchronization', () => {
    it('should sync JPD effort to GitHub Project number field (Estimate)', async () => {
      const effort = 13;
      
      const fields = await projectsClient.getProjectFields(projectId);
      const estimateField = fields.find(f => f.name === 'Estimate' && f.dataType === 'NUMBER');
      
      if (!estimateField) {
        throw new Error('Estimate field not found in project');
      }

      const success = await projectsClient.updateFieldValue(
        projectId,
        projectItemId,
        estimateField.id,
        { number: effort }
      );

      expect(success).toBe(true);
    });

    it('should handle decimal values correctly', async () => {
      const decimalValue = 7.5;
      
      const fields = await projectsClient.getProjectFields(projectId);
      const estimateField = fields.find(f => f.name === 'Estimate' && f.dataType === 'NUMBER');
      
      if (!estimateField) {
        throw new Error('Estimate field not found in project');
      }

      const success = await projectsClient.updateFieldValue(
        projectId,
        projectItemId,
        estimateField.id,
        { number: decimalValue }
      );

      expect(success).toBe(true);
    });
  });

  describe('Single-Select with Value Mapping', () => {
    it('should map Critical→P0 correctly', async () => {
      const mapping: ProjectFieldMapping = {
        jpd: 'fields.customfield_14425.value',
        github_field: 'Priority',
        type: 'single_select',
        mapping: {
          Critical: 'P0',
          High: 'P1',
          Normal: 'P2',
          Low: 'P3'
        }
      };

      const fields = await projectsClient.getProjectFields(projectId);
      const priorityField = fields.find(f => f.name === 'Priority' && f.dataType === 'SINGLE_SELECT');
      
      if (!priorityField || !priorityField.options) {
        throw new Error('Priority field not found or has no options');
      }

      const mapped = ProjectFieldTransformer.mapSelectValue('Critical', mapping.mapping!);
      expect(mapped).toBe('P0');

      const p0Option = priorityField.options.find(o => o.name === 'P0');
      expect(p0Option).toBeDefined();
    });

    it('should map High→P1 correctly', async () => {
      const mapping: ProjectFieldMapping = {
        jpd: 'fields.customfield_14425.value',
        github_field: 'Priority',
        type: 'single_select',
        mapping: {
          Critical: 'P0',
          High: 'P1',
          Normal: 'P2',
          Low: 'P3'
        }
      };

      const fields = await projectsClient.getProjectFields(projectId);
      const priorityField = fields.find(f => f.name === 'Priority' && f.dataType === 'SINGLE_SELECT');
      
      if (!priorityField || !priorityField.options) {
        throw new Error('Priority field not found or has no options');
      }

      const mapped = ProjectFieldTransformer.mapSelectValue('High', mapping.mapping!);
      expect(mapped).toBe('P1');

      const p1Option = priorityField.options.find(o => o.name === 'P1');
      expect(p1Option).toBeDefined();

      // Try updating the field
      const success = await projectsClient.updateFieldValue(
        projectId,
        projectItemId,
        priorityField.id,
        { singleSelectOptionId: p1Option!.id }
      );

      expect(success).toBe(true);
    });

    it('should warn on unmapped priority values', () => {
      const mapping: ProjectFieldMapping = {
        jpd: 'fields.customfield_14425.value',
        github_field: 'Priority',
        type: 'single_select',
        mapping: {
          Critical: 'P0',
          High: 'P1',
          Normal: 'P2',
          Low: 'P3'
        }
      };

      // "Urgent" is not in the mapping
      const mapped = ProjectFieldTransformer.mapSelectValue('Urgent', mapping.mapping!);
      
      // Should return the original value (unmapped)
      expect(mapped).toBe('Urgent');
    });
  });

  describe('Threshold Derivation (Size from Effort)', () => {
    it('should derive Size XS from Effort 1-2', () => {
      const thresholds = [
        { max: 2, value: 'XS' },
        { max: 5, value: 'S' },
        { max: 10, value: 'M' },
        { max: 20, value: 'L' },
        { max: 999, value: 'XL' }
      ];

      expect(ProjectFieldTransformer.deriveFromThresholds(1, thresholds)).toBe('XS');
      expect(ProjectFieldTransformer.deriveFromThresholds(2, thresholds)).toBe('XS');
    });

    it('should derive Size S from Effort 3-5', () => {
      const thresholds = [
        { max: 2, value: 'XS' },
        { max: 5, value: 'S' },
        { max: 10, value: 'M' },
        { max: 20, value: 'L' },
        { max: 999, value: 'XL' }
      ];

      expect(ProjectFieldTransformer.deriveFromThresholds(3, thresholds)).toBe('S');
      expect(ProjectFieldTransformer.deriveFromThresholds(5, thresholds)).toBe('S');
    });

    it('should derive Size M from Effort 6-10', () => {
      const thresholds = [
        { max: 2, value: 'XS' },
        { max: 5, value: 'S' },
        { max: 10, value: 'M' },
        { max: 20, value: 'L' },
        { max: 999, value: 'XL' }
      ];

      expect(ProjectFieldTransformer.deriveFromThresholds(6, thresholds)).toBe('M');
      expect(ProjectFieldTransformer.deriveFromThresholds(8, thresholds)).toBe('M');
      expect(ProjectFieldTransformer.deriveFromThresholds(10, thresholds)).toBe('M');
    });

    it('should derive Size L from Effort 11-20', () => {
      const thresholds = [
        { max: 2, value: 'XS' },
        { max: 5, value: 'S' },
        { max: 10, value: 'M' },
        { max: 20, value: 'L' },
        { max: 999, value: 'XL' }
      ];

      expect(ProjectFieldTransformer.deriveFromThresholds(11, thresholds)).toBe('L');
      expect(ProjectFieldTransformer.deriveFromThresholds(15, thresholds)).toBe('L');
      expect(ProjectFieldTransformer.deriveFromThresholds(20, thresholds)).toBe('L');
    });

    it('should derive Size XL from Effort 21+', () => {
      const thresholds = [
        { max: 2, value: 'XS' },
        { max: 5, value: 'S' },
        { max: 10, value: 'M' },
        { max: 20, value: 'L' },
        { max: 999, value: 'XL' }
      ];

      expect(ProjectFieldTransformer.deriveFromThresholds(21, thresholds)).toBe('XL');
      expect(ProjectFieldTransformer.deriveFromThresholds(50, thresholds)).toBe('XL');
      expect(ProjectFieldTransformer.deriveFromThresholds(100, thresholds)).toBe('XL');
    });

    it('should handle boundary conditions correctly', () => {
      const thresholds = [
        { max: 2, value: 'XS' },
        { max: 5, value: 'S' },
        { max: 10, value: 'M' },
        { max: 20, value: 'L' },
        { max: 999, value: 'XL' }
      ];

      // Boundary at 2 (last XS)
      expect(ProjectFieldTransformer.deriveFromThresholds(2, thresholds)).toBe('XS');
      
      // Boundary at 3 (first S)
      expect(ProjectFieldTransformer.deriveFromThresholds(3, thresholds)).toBe('S');
      
      // Boundary at 5 (last S)
      expect(ProjectFieldTransformer.deriveFromThresholds(5, thresholds)).toBe('S');
      
      // Boundary at 6 (first M)
      expect(ProjectFieldTransformer.deriveFromThresholds(6, thresholds)).toBe('M');
    });
  });

  describe('Error Handling', () => {
    it('should handle non-existent project field gracefully', async () => {
      const fields = await projectsClient.getProjectFields(projectId);
      
      // Try to find a field that doesn't exist
      const fakeField = fields.find(f => f.name === 'NonExistentField');
      
      expect(fakeField).toBeUndefined();
    });

    it('should validate field mappings and report errors', async () => {
      const config = ConfigLoader.load('./config/mtt-test-config.yaml');
      const mappings = config.projects?.field_mappings || [];

      const validation = await projectsClient.validateFieldMappings(projectId, mappings);

      // Should be valid if all fields are properly configured
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should detect missing single-select option', async () => {
      const fields = await projectsClient.getProjectFields(projectId);
      const priorityField = fields.find(f => f.name === 'Priority' && f.dataType === 'SINGLE_SELECT');
      
      if (!priorityField || !priorityField.options) {
        throw new Error('Priority field not found');
      }

      // Look for an option that doesn't exist
      const fakeOption = priorityField.options.find(o => o.name === 'P99');
      
      expect(fakeOption).toBeUndefined();
    });
  });
});
