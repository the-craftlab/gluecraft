/**
 * Comprehensive Integration Tests for GitHubProjectsClient
 * 
 * Tests all GraphQL queries and mutations with mocked responses.
 * Covers:
 * - All GraphQL queries (getProjectByNumber, getProjectFields, getProjectItems)
 * - All GraphQL mutations (updateFieldValue, addProjectV2ItemById)
 * - Error handling for all operations
 * - Dry-run mode verification
 * - Rate limit handling
 * 
 * @group integration
 * @group projects
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitHubProjectsClient } from '../../src/clients/github-projects-client.js';

const mockGraphql = vi.fn();

vi.mock('@octokit/rest', () => ({
  Octokit: class {
    graphql = mockGraphql;
  }
}));

describe('GitHubProjectsClient - Comprehensive Integration', () => {
  let client: GitHubProjectsClient;
  let dryRunClient: GitHubProjectsClient;

  beforeEach(() => {
    mockGraphql.mockClear();
    client = new GitHubProjectsClient('fake-token', false);
    dryRunClient = new GitHubProjectsClient('fake-token', true);
  });

  describe('Query Operations', () => {
    describe('getProjectByNumber', () => {
      it('should query project with all field types', async () => {
        mockGraphql.mockResolvedValueOnce({
          repository: {
            projectV2: {
              id: 'PVT_test123',
              number: 23,
              title: 'Test Project',
              fields: {
                nodes: [
                  {
                    id: 'PVTSSF_status',
                    name: 'Status',
                    options: [
                      { id: 'opt1', name: 'Todo' },
                      { id: 'opt2', name: 'In Progress' },
                      { id: 'opt3', name: 'Done' }
                    ]
                  }
                ]
              }
            }
          }
        });

        const project = await client.getProjectByNumber('owner', 'repo', 23);

        expect(project).toBeDefined();
        expect(project?.id).toBe('PVT_test123');
        expect(project?.number).toBe(23);
        expect(project?.title).toBe('Test Project');
        expect(project?.columns).toHaveLength(3);
        expect(mockGraphql).toHaveBeenCalledTimes(1);
      });

      it('should return null for non-existent project', async () => {
        mockGraphql.mockResolvedValueOnce({
          repository: {
            projectV2: null
          }
        });

        const project = await client.getProjectByNumber('owner', 'repo', 999);

        expect(project).toBeNull();
      });

      it('should handle GraphQL errors gracefully', async () => {
        mockGraphql.mockRejectedValueOnce(new Error('GraphQL error: Project not found'));

        const project = await client.getProjectByNumber('owner', 'repo', 23);

        expect(project).toBeNull();
      });

      it('should handle network errors', async () => {
        mockGraphql.mockRejectedValueOnce(new Error('Network error'));

        const project = await client.getProjectByNumber('owner', 'repo', 23);

        expect(project).toBeNull();
      });
    });

    describe('getProjectFields', () => {
      it('should query all field types with pagination', async () => {
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
                    { id: 'opt2', name: 'P1' }
                  ]
                },
                {
                  __typename: 'ProjectV2Field',
                  id: 'PVTF_text1',
                  name: 'Notes',
                  dataType: 'TEXT'
                }
              ]
            }
          }
        });

        const fields = await client.getProjectFields('PVT_test123');

        expect(fields).toHaveLength(4);
        expect(fields[0]).toEqual({
          id: 'PVTF_date1',
          name: 'Start date',
          dataType: 'DATE',
          options: undefined
        });
        expect(fields[2]).toEqual({
          id: 'PVTSSF_pri1',
          name: 'Priority',
          dataType: 'SINGLE_SELECT',
          options: [
            { id: 'opt1', name: 'P0' },
            { id: 'opt2', name: 'P1' }
          ]
        });
      });

      it('should return empty array for non-existent project', async () => {
        mockGraphql.mockResolvedValueOnce({
          node: null
        });

        const fields = await client.getProjectFields('INVALID_ID');

        expect(fields).toEqual([]);
      });

      it('should handle errors and return empty array', async () => {
        mockGraphql.mockRejectedValueOnce(new Error('GraphQL error'));

        const fields = await client.getProjectFields('PVT_test123');

        expect(fields).toEqual([]);
      });
    });

    describe('getIssueProjectItemId', () => {
      it('should query and return project item ID', async () => {
        mockGraphql.mockResolvedValueOnce({
          repository: {
            issue: {
              projectItems: {
                nodes: [
                  {
                    id: 'PVTI_item123',
                    project: { id: 'PVT_test123' }
                  },
                  {
                    id: 'PVTI_item456',
                    project: { id: 'PVT_other' }
                  }
                ]
              }
            }
          }
        });

        const itemId = await client.getIssueProjectItemId(
          'PVT_test123',
          42,
          'owner',
          'repo'
        );

        expect(itemId).toBe('PVTI_item123');
        expect(mockGraphql).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            owner: 'owner',
            repo: 'repo',
            number: 42
          })
        );
      });

      it('should return null when issue not in project', async () => {
        mockGraphql.mockResolvedValueOnce({
          repository: {
            issue: {
              projectItems: {
                nodes: [
                  {
                    id: 'PVTI_item456',
                    project: { id: 'PVT_other' }
                  }
                ]
              }
            }
          }
        });

        const itemId = await client.getIssueProjectItemId(
          'PVT_test123',
          42,
          'owner',
          'repo'
        );

        expect(itemId).toBeNull();
      });

      it('should handle errors gracefully', async () => {
        mockGraphql.mockRejectedValueOnce(new Error('Issue not found'));

        const itemId = await client.getIssueProjectItemId(
          'PVT_test123',
          999,
          'owner',
          'repo'
        );

        expect(itemId).toBeNull();
      });
    });
  });

  describe('Mutation Operations', () => {
    describe('addIssueToProject', () => {
      it('should execute addProjectV2ItemById mutation', async () => {
        mockGraphql.mockResolvedValueOnce({
          addProjectV2ItemById: {
            item: {
              id: 'PVTI_newItem123'
            }
          }
        });

        const itemId = await client.addIssueToProject(
          'PVT_test123',
          'I_issue123'
        );

        expect(itemId).toBe('PVTI_newItem123');
        expect(mockGraphql).toHaveBeenCalledWith(
          expect.stringContaining('addProjectV2ItemById'),
          expect.objectContaining({
            projectId: 'PVT_test123',
            contentId: 'I_issue123'
          })
        );
      });

      it('should return null on mutation error', async () => {
        mockGraphql.mockRejectedValueOnce(new Error('Mutation failed'));

        const itemId = await client.addIssueToProject(
          'PVT_test123',
          'I_issue123'
        );

        expect(itemId).toBeNull();
      });

      it('should not execute mutation in dry-run mode', async () => {
        const itemId = await dryRunClient.addIssueToProject(
          'PVT_test123',
          'I_issue123'
        );

        expect(itemId).toBeNull();
        expect(mockGraphql).not.toHaveBeenCalled();
      });
    });

    describe('updateFieldValue', () => {
      it('should update DATE field with mutation', async () => {
        mockGraphql.mockResolvedValueOnce({
          updateProjectV2ItemFieldValue: {
            projectV2Item: {
              id: 'PVTI_item123'
            }
          }
        });

        const success = await client.updateFieldValue(
          'PVT_test123',
          'PVTI_item123',
          'PVTF_date1',
          { date: '2024-06-01' }
        );

        expect(success).toBe(true);
        expect(mockGraphql).toHaveBeenCalledWith(
          expect.stringContaining('updateProjectV2ItemFieldValue'),
          expect.objectContaining({
            projectId: 'PVT_test123',
            itemId: 'PVTI_item123',
            fieldId: 'PVTF_date1',
            value: { date: '2024-06-01' }
          })
        );
      });

      it('should update NUMBER field with mutation', async () => {
        mockGraphql.mockResolvedValueOnce({
          updateProjectV2ItemFieldValue: {
            projectV2Item: {
              id: 'PVTI_item123'
            }
          }
        });

        const success = await client.updateFieldValue(
          'PVT_test123',
          'PVTI_item123',
          'PVTF_num1',
          { number: 13 }
        );

        expect(success).toBe(true);
        expect(mockGraphql).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            value: { number: 13 }
          })
        );
      });

      it('should update SINGLE_SELECT field with option ID', async () => {
        mockGraphql.mockResolvedValueOnce({
          updateProjectV2ItemFieldValue: {
            projectV2Item: {
              id: 'PVTI_item123'
            }
          }
        });

        const success = await client.updateFieldValue(
          'PVT_test123',
          'PVTI_item123',
          'PVTSSF_pri1',
          { singleSelectOptionId: 'opt1' }
        );

        expect(success).toBe(true);
        expect(mockGraphql).toHaveBeenCalledWith(
          expect.any(String),
          expect.objectContaining({
            value: { singleSelectOptionId: 'opt1' }
          })
        );
      });

      it('should return false on mutation error', async () => {
        mockGraphql.mockRejectedValueOnce(new Error('Field update failed'));

        const success = await client.updateFieldValue(
          'PVT_test123',
          'PVTI_item123',
          'PVTF_date1',
          { date: '2024-06-01' }
        );

        expect(success).toBe(false);
      });

      it('should not execute mutation in dry-run mode', async () => {
        const success = await dryRunClient.updateFieldValue(
          'PVT_test123',
          'PVTI_item123',
          'PVTF_date1',
          { date: '2024-06-01' }
        );

        expect(success).toBe(true); // Returns true but doesn't execute
        expect(mockGraphql).not.toHaveBeenCalled();
      });
    });
  });

  describe('Validation Operations', () => {
    describe('validateFieldMappings', () => {
      beforeEach(() => {
        // Mock getProjectFields response
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
      });

      it('should validate all mappings successfully', async () => {
        const mappings = [
          { jpd: 'fields.cf1', github_field: 'Start date', type: 'date' as const },
          { jpd: 'fields.cf2', github_field: 'Estimate', type: 'number' as const },
          {
            jpd: 'fields.cf3',
            github_field: 'Priority',
            type: 'single_select' as const,
            mapping: { High: 'P0', Normal: 'P1', Low: 'P2' }
          }
        ];

        const result = await client.validateFieldMappings('PVT_test123', mappings);

        expect(result.valid).toBe(true);
        expect(result.errors).toHaveLength(0);
        expect(result.warnings).toHaveLength(0);
      });

      it('should detect non-existent field', async () => {
        const mappings = [
          { jpd: 'fields.cf1', github_field: 'NonExistent', type: 'date' as const }
        ];

        const result = await client.validateFieldMappings('PVT_test123', mappings);

        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Field "NonExistent" not found in project');
      });

      it('should detect type mismatch', async () => {
        const mappings = [
          { jpd: 'fields.cf1', github_field: 'Estimate', type: 'date' as const } // Should be number
        ];

        const result = await client.validateFieldMappings('PVT_test123', mappings);

        expect(result.valid).toBe(false);
        expect(result.errors[0]).toContain('type mismatch');
        expect(result.errors[0]).toContain('Estimate');
      });

      it('should warn about missing single-select option', async () => {
        const mappings = [
          {
            jpd: 'fields.cf3',
            github_field: 'Priority',
            type: 'single_select' as const,
            mapping: { High: 'P0', VeryLow: 'P4' } // P4 doesn't exist
          }
        ];

        const result = await client.validateFieldMappings('PVT_test123', mappings);

        expect(result.valid).toBe(true); // Still valid, just warnings
        expect(result.warnings.length).toBeGreaterThan(0);
        expect(result.warnings[0]).toContain('P4');
      });

      it('should handle validation errors gracefully', async () => {
        // Reset mock completely to remove beforeEach's queued response
        mockGraphql.mockReset();
        mockGraphql.mockRejectedValueOnce(new Error('Validation failed'));

        const mappings = [
          { jpd: 'fields.cf1', github_field: 'Start date', type: 'date' as const }
        ];

        const result = await client.validateFieldMappings('PVT_test123', mappings);

        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle GraphQL syntax errors', async () => {
      mockGraphql.mockRejectedValueOnce(new Error('GraphQL: Syntax error'));

      const project = await client.getProjectByNumber('owner', 'repo', 23);

      expect(project).toBeNull();
    });

    it('should handle authentication errors', async () => {
      mockGraphql.mockRejectedValueOnce(new Error('GraphQL: Unauthorized'));

      const fields = await client.getProjectFields('PVT_test123');

      expect(fields).toEqual([]);
    });

    it('should handle rate limit errors', async () => {
      mockGraphql.mockRejectedValueOnce(new Error('GraphQL: Rate limit exceeded'));

      const itemId = await client.addIssueToProject('PVT_test123', 'I_issue123');

      expect(itemId).toBeNull();
    });

    it('should handle malformed responses gracefully', async () => {
      mockGraphql.mockResolvedValueOnce({
        // Missing expected structure
        someOtherField: 'unexpected'
      });

      const project = await client.getProjectByNumber('owner', 'repo', 23);

      expect(project).toBeNull();
    });
  });

  describe('Dry-Run Mode', () => {
    it('should log dry-run actions for mutations', async () => {
      const itemId = await dryRunClient.addIssueToProject(
        'PVT_test123',
        'I_issue123'
      );

      expect(itemId).toBeNull();
      expect(mockGraphql).not.toHaveBeenCalled();
    });

    it('should allow read operations in dry-run mode', async () => {
      mockGraphql.mockResolvedValueOnce({
        repository: {
          projectV2: {
            id: 'PVT_test123',
            number: 23,
            title: 'Test',
            fields: { nodes: [] }
          }
        }
      });

      const project = await dryRunClient.getProjectByNumber('owner', 'repo', 23);

      expect(project).toBeDefined();
      expect(mockGraphql).toHaveBeenCalled();
    });

    it('should simulate successful field updates in dry-run', async () => {
      const success = await dryRunClient.updateFieldValue(
        'PVT_test123',
        'PVTI_item123',
        'PVTF_date1',
        { date: '2024-06-01' }
      );

      expect(success).toBe(true);
      expect(mockGraphql).not.toHaveBeenCalled();
    });
  });
});
