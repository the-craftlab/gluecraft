/**
 * Integration tests for GitHubProjectsClient field methods
 * Tests GraphQL queries and mutations for custom field operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubProjectsClient } from '../../src/clients/github-projects-client.js';
import { Logger } from '../../src/utils/logger.js';

// Mock graphql function
const mockGraphql = vi.fn();

// Mock Octokit
vi.mock('@octokit/rest', () => ({
  Octokit: class {
    graphql = mockGraphql;
  }
}));

describe('GitHubProjectsClient - Field Operations', () => {
  let client: GitHubProjectsClient;

  beforeEach(() => {
    mockGraphql.mockClear();
    client = new GitHubProjectsClient('fake-token', false);
  });

  describe('getProjectFields', () => {
    it('should query and return all field types correctly', async () => {
      mockGraphql.mockResolvedValueOnce({
        node: {
          id: 'PVT_test123',
          fields: {
            nodes: [
              {
                __typename: 'ProjectV2Field',
                id: 'PVTF_date1',
                name: 'Start date',
                dataType: 'DATE'
              },
              {
                __typename: 'ProjectV2Field',
                id: 'PVTF_num1',
                name: 'Estimate',
                dataType: 'NUMBER'
              },
              {
                __typename: 'ProjectV2SingleSelectField',
                id: 'PVTSSF_pri1',
                name: 'Priority',
                options: [
                  { id: 'opt1', name: 'P0' },
                  { id: 'opt2', name: 'P1' },
                  { id: 'opt3', name: 'P2' }
                ]
              }
            ]
          }
        }
      });

      const fields = await client.getProjectFields('PVT_test123');

      expect(fields).toHaveLength(3);
      expect(fields[0]).toEqual({
        id: 'PVTF_date1',
        name: 'Start date',
        dataType: 'DATE',
        options: undefined
      });
      expect(fields[1]).toEqual({
        id: 'PVTF_num1',
        name: 'Estimate',
        dataType: 'NUMBER',
        options: undefined
      });
      expect(fields[2]).toEqual({
        id: 'PVTSSF_pri1',
        name: 'Priority',
        dataType: 'SINGLE_SELECT',
        options: [
          { id: 'opt1', name: 'P0' },
          { id: 'opt2', name: 'P1' },
          { id: 'opt3', name: 'P2' }
        ]
      });
    });

    it('should handle project not found', async () => {
      mockGraphql.mockResolvedValueOnce({ node: null });

      await expect(client.getProjectFields('PVT_nonexistent')).rejects.toThrow(
        'Project not found'
      );
    });
  });

  describe('updateFieldValue', () => {
    it('should send correct mutation for date field', async () => {
      mockGraphql.mockResolvedValueOnce({
        updateProjectV2ItemFieldValue: {
          projectV2Item: { id: 'item123' }
        }
      });

      const result = await client.updateFieldValue(
        'PVT_test123',
        'item123',
        'PVTF_date1',
        { date: '2024-06-15' }
      );

      expect(result).toBe(true);
      expect(mockGraphql).toHaveBeenCalledWith(
        expect.stringContaining('updateProjectV2ItemFieldValue'),
        {
          projectId: 'PVT_test123',
          itemId: 'item123',
          fieldId: 'PVTF_date1',
          value: { date: '2024-06-15' }
        }
      );
    });

    it('should send correct mutation for number field', async () => {
      mockGraphql.mockResolvedValueOnce({
        updateProjectV2ItemFieldValue: {
          projectV2Item: { id: 'item123' }
        }
      });

      const result = await client.updateFieldValue(
        'PVT_test123',
        'item123',
        'PVTF_num1',
        { number: 8 }
      );

      expect(result).toBe(true);
      expect(mockGraphql).toHaveBeenCalledWith(
        expect.stringContaining('updateProjectV2ItemFieldValue'),
        {
          projectId: 'PVT_test123',
          itemId: 'item123',
          fieldId: 'PVTF_num1',
          value: { number: 8 }
        }
      );
    });

    it('should send correct mutation for single_select field', async () => {
      mockGraphql.mockResolvedValueOnce({
        updateProjectV2ItemFieldValue: {
          projectV2Item: { id: 'item123' }
        }
      });

      const result = await client.updateFieldValue(
        'PVT_test123',
        'item123',
        'PVTSSF_pri1',
        { singleSelectOptionId: 'opt1' }
      );

      expect(result).toBe(true);
      expect(mockGraphql).toHaveBeenCalledWith(
        expect.stringContaining('updateProjectV2ItemFieldValue'),
        {
          projectId: 'PVT_test123',
          itemId: 'item123',
          fieldId: 'PVTSSF_pri1',
          value: { singleSelectOptionId: 'opt1' }
        }
      );
    });

    it('should return false on mutation error', async () => {
      mockGraphql.mockRejectedValueOnce(new Error('GraphQL error'));

      const result = await client.updateFieldValue(
        'PVT_test123',
        'item123',
        'PVTF_date1',
        { date: '2024-06-15' }
      );

      expect(result).toBe(false);
    });

    it('should not call mutation in dry-run mode', async () => {
      const dryRunClient = new GitHubProjectsClient('fake-token', true);
      const callCountBefore = mockGraphql.mock.calls.length;

      const result = await dryRunClient.updateFieldValue(
        'PVT_test123',
        'item123',
        'PVTF_date1',
        { date: '2024-06-15' }
      );

      expect(result).toBe(true);
      expect(mockGraphql.mock.calls.length).toBe(callCountBefore); // No new calls
    });
  });

  describe('validateFieldMappings', () => {
    beforeEach(() => {
      // Mock getProjectFields
      mockGraphql.mockResolvedValueOnce({
        node: {
          id: 'PVT_test123',
          fields: {
            nodes: [
              {
                __typename: 'ProjectV2Field',
                id: 'PVTF_date1',
                name: 'Start date',
                dataType: 'DATE'
              },
              {
                __typename: 'ProjectV2SingleSelectField',
                id: 'PVTSSF_pri1',
                name: 'Priority',
                options: [
                  { id: 'opt1', name: 'P0' },
                  { id: 'opt2', name: 'P1' }
                ]
              }
            ]
          }
        }
      });
    });

    it('should validate correct field mappings', async () => {
      const mappings = [
        {
          jpd: 'fields.customfield_14383',
          github_field: 'Start date',
          type: 'date' as const
        },
        {
          jpd: 'fields.customfield_14425.value',
          github_field: 'Priority',
          type: 'single_select' as const,
          mapping: { Critical: 'P0', High: 'P1' }
        }
      ];

      const result = await client.validateFieldMappings('PVT_test123', mappings);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.warnings).toHaveLength(0);
    });

    it('should detect missing fields', async () => {
      const mappings = [
        {
          jpd: 'fields.customfield_14383',
          github_field: 'Start date',
          type: 'date' as const
        },
        {
          jpd: 'fields.customfield_14384',
          github_field: 'Target date',
          type: 'date' as const
        }
      ];

      const result = await client.validateFieldMappings('PVT_test123', mappings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Field "Target date" not found in project');
    });

    it('should detect missing single-select options', async () => {
      const mappings = [
        {
          jpd: 'fields.customfield_14425.value',
          github_field: 'Priority',
          type: 'single_select' as const,
          mapping: { Critical: 'P0', High: 'P1', Medium: 'P2' }
        }
      ];

      const result = await client.validateFieldMappings('PVT_test123', mappings);

      expect(result.valid).toBe(true); // Still valid, but warnings
      expect(result.warnings).toContain(
        'Field "Priority" missing option: P2 (mapped from Medium)'
      );
    });

    it('should validate type mismatch', async () => {
      const mappings = [
        {
          jpd: 'fields.customfield_14383',
          github_field: 'Start date',
          type: 'number' as const // Wrong type!
        }
      ];

      const result = await client.validateFieldMappings('PVT_test123', mappings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Field "Start date" type mismatch: expected number, got DATE'
      );
    });
  });
});
