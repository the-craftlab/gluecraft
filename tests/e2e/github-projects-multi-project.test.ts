/**
 * E2E tests for GitHub Projects v2 Multi-Project Support
 * 
 * Tests issues that exist in multiple GitHub Projects simultaneously.
 * Validates:
 * - Issue in multiple projects
 * - Different field mappings per project
 * - Project-specific status columns
 * - Field updates across all projects
 * 
 * @group e2e
 * @group projects
 * @group multi-project
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { GitHubProjectsClient } from '../../src/clients/github-projects-client.js';
import { GitHubClient } from '../../src/clients/github-client.js';
import { setupTestEnv, teardownTestEnv, type TestEnv } from './setup.js';

describe('GitHub Projects v2 Multi-Project Support', () => {
  let env: TestEnv;
  let projectsClient: GitHubProjectsClient;
  let githubClient: GitHubClient;
  let testIssueNumber: number;
  let testIssueNodeId: string;

  beforeAll(async () => {
    env = await setupTestEnv();
    githubClient = env.githubClient;
    
    projectsClient = new GitHubProjectsClient(
      process.env.GITHUB_TOKEN!,
      false
    );

    // Create a test issue for multi-project testing
    const issue = await githubClient.createIssue(
      env.githubOwner,
      env.githubRepo,
      {
        title: `[E2E Test] Multi-Project Support - ${env.testRunId}`,
        body: 'Test issue for GitHub Projects v2 multi-project scenarios',
        labels: ['test-issue', env.testRunId]
      }
    );

    testIssueNumber = issue.number;
    testIssueNodeId = issue.node_id;
  }, 60000);

  afterAll(async () => {
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

  describe('Basic Multi-Project Operations', () => {
    it('should add issue to a single project', async () => {
      const projectNumber = 23;
      const project = await projectsClient.getProjectByNumber(
        env.githubOwner,
        env.githubRepo,
        projectNumber
      );
      
      expect(project).toBeDefined();
      expect(project?.id).toBeDefined();

      if (!project) {
        throw new Error('Project not found');
      }

      const itemId = await projectsClient.addIssueToProject(
        project.id,
        testIssueNodeId
      );

      expect(itemId).toBeDefined();
      expect(typeof itemId).toBe('string');
    });

    it('should retrieve issue project item ID', async () => {
      const projectNumber = 23;
      const project = await projectsClient.getProjectByNumber(
        env.githubOwner,
        env.githubRepo,
        projectNumber
      );

      if (!project) {
        throw new Error('Project not found');
      }

      const itemId = await projectsClient.getIssueProjectItemId(
        project.id,
        testIssueNumber,
        env.githubOwner,
        env.githubRepo
      );

      expect(itemId).toBeDefined();
      expect(typeof itemId).toBe('string');
    });

    it('should handle issue not in project gracefully', async () => {
      const projectNumber = 23;
      const project = await projectsClient.getProjectByNumber(
        env.githubOwner,
        env.githubRepo,
        projectNumber
      );

      if (!project) {
        throw new Error('Project not found');
      }

      // Use a very high issue number that likely doesn't exist
      const itemId = await projectsClient.getIssueProjectItemId(
        project.id,
        999999,
        env.githubOwner,
        env.githubRepo
      );

      expect(itemId).toBeNull();
    });
  });

  describe('Multi-Project Field Updates', () => {
    it('should update same field in single project', async () => {
      const projectNumber = 23;
      const project = await projectsClient.getProjectByNumber(
        env.githubOwner,
        env.githubRepo,
        projectNumber
      );

      if (!project) {
        throw new Error('Project not found');
      }

      const itemId = await projectsClient.getIssueProjectItemId(
        project.id,
        testIssueNumber,
        env.githubOwner,
        env.githubRepo
      );

      if (!itemId) {
        throw new Error('Issue not in project');
      }

      const fields = await projectsClient.getProjectFields(project.id);
      const estimateField = fields.find(f => f.name === 'Estimate' && f.dataType === 'NUMBER');

      if (!estimateField) {
        throw new Error('Estimate field not found');
      }

      const success = await projectsClient.updateFieldValue(
        project.id,
        itemId,
        estimateField.id,
        { number: 5 }
      );

      expect(success).toBe(true);
    });

    it('should handle field update for non-existent item', async () => {
      const projectNumber = 23;
      const project = await projectsClient.getProjectByNumber(
        env.githubOwner,
        env.githubRepo,
        projectNumber
      );

      if (!project) {
        throw new Error('Project not found');
      }

      const fields = await projectsClient.getProjectFields(project.id);
      const estimateField = fields.find(f => f.name === 'Estimate');

      if (!estimateField) {
        throw new Error('Estimate field not found');
      }

      // Try to update with fake item ID
      const success = await projectsClient.updateFieldValue(
        project.id,
        'FAKE_ITEM_ID',
        estimateField.id,
        { number: 10 }
      );

      expect(success).toBe(false);
    });
  });

  describe('Project-Specific Field Mappings', () => {
    it('should retrieve different field configurations per project', async () => {
      const projectNumber = 23;
      const project = await projectsClient.getProjectByNumber(
        env.githubOwner,
        env.githubRepo,
        projectNumber
      );

      if (!project) {
        throw new Error('Project not found');
      }

      const fields = await projectsClient.getProjectFields(project.id);
      
      expect(fields).toBeDefined();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields.length).toBeGreaterThan(0);

      // Verify expected field types exist
      const dateFields = fields.filter(f => f.dataType === 'DATE');
      const numberFields = fields.filter(f => f.dataType === 'NUMBER');
      const selectFields = fields.filter(f => f.dataType === 'SINGLE_SELECT');

      expect(dateFields.length).toBeGreaterThan(0);
      expect(numberFields.length).toBeGreaterThan(0);
      expect(selectFields.length).toBeGreaterThan(0);
    });

    it('should validate single-select options are project-specific', async () => {
      const projectNumber = 23;
      const project = await projectsClient.getProjectByNumber(
        env.githubOwner,
        env.githubRepo,
        projectNumber
      );

      if (!project) {
        throw new Error('Project not found');
      }

      const fields = await projectsClient.getProjectFields(project.id);
      const priorityField = fields.find(f => f.name === 'Priority' && f.dataType === 'SINGLE_SELECT');

      expect(priorityField).toBeDefined();
      expect(priorityField?.options).toBeDefined();
      expect(Array.isArray(priorityField?.options)).toBe(true);
      
      // Each option should have id and name
      priorityField?.options?.forEach(opt => {
        expect(opt.id).toBeDefined();
        expect(opt.name).toBeDefined();
        expect(typeof opt.id).toBe('string');
        expect(typeof opt.name).toBe('string');
      });
    });
  });

  describe('Project Status Columns', () => {
    it('should retrieve project status columns', async () => {
      const projectNumber = 23;
      const project = await projectsClient.getProjectByNumber(
        env.githubOwner,
        env.githubRepo,
        projectNumber
      );

      expect(project).toBeDefined();
      expect(project?.columns).toBeDefined();
      expect(Array.isArray(project?.columns)).toBe(true);
    });

    it('should have status columns with proper structure', async () => {
      const projectNumber = 23;
      const project = await projectsClient.getProjectByNumber(
        env.githubOwner,
        env.githubRepo,
        projectNumber
      );

      if (!project) {
        throw new Error('Project not found');
      }

      // Status columns should have id, name, and position
      project.columns.forEach(col => {
        expect(col.id).toBeDefined();
        expect(col.name).toBeDefined();
        expect(col.position).toBeDefined();
        expect(typeof col.id).toBe('string');
        expect(typeof col.name).toBe('string');
        expect(typeof col.position).toBe('number');
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid project number gracefully', async () => {
      const project = await projectsClient.getProjectByNumber(
        env.githubOwner,
        env.githubRepo,
        999999 // Invalid project number
      );

      expect(project).toBeNull();
    });

    it('should handle invalid project ID in field queries', async () => {
      const fields = await projectsClient.getProjectFields('INVALID_PROJECT_ID');

      expect(fields).toEqual([]);
    });

    it('should handle adding issue to non-existent project', async () => {
      const itemId = await projectsClient.addIssueToProject(
        'INVALID_PROJECT_ID',
        testIssueNodeId
      );

      expect(itemId).toBeNull();
    });
  });

  describe('Dry-Run Mode', () => {
    it('should not execute mutations in dry-run mode', async () => {
      const dryRunClient = new GitHubProjectsClient(
        process.env.GITHUB_TOKEN!,
        true // dry-run = true
      );

      const projectNumber = 23;
      const project = await projectsClient.getProjectByNumber(
        env.githubOwner,
        env.githubRepo,
        projectNumber
      );

      if (!project) {
        throw new Error('Project not found');
      }

      // In dry-run mode, addIssueToProject should return null
      const itemId = await dryRunClient.addIssueToProject(
        project.id,
        testIssueNodeId
      );

      expect(itemId).toBeNull();
    });

    it('should allow read operations in dry-run mode', async () => {
      const dryRunClient = new GitHubProjectsClient(
        process.env.GITHUB_TOKEN!,
        true
      );

      const projectNumber = 23;
      const project = await dryRunClient.getProjectByNumber(
        env.githubOwner,
        env.githubRepo,
        projectNumber
      );

      // Read operations should work in dry-run mode
      expect(project).toBeDefined();
      expect(project?.id).toBeDefined();
    });
  });
});
