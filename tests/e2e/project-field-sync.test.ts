/**
 * E2E tests for project field sync in sync-engine
 * Tests field transformation and GitHub Projects update logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectFieldTransformer } from '../../src/transformers/project-field-transformer.js';
import { GitHubProjectsClient } from '../../src/clients/github-projects-client.js';

// Mock the Octokit
const mockGraphql = vi.fn();
vi.mock('@octokit/rest', () => ({
  Octokit: class {
    graphql = mockGraphql;
  }
}));

describe('SyncEngine - Project Field Sync E2E', () => {
  let mockProjectsClient: GitHubProjectsClient;

  beforeEach(() => {
    mockGraphql.mockClear();
    mockProjectsClient = new GitHubProjectsClient('fake-token', false);
    
    // Mock getProjectFields to return our field definitions
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
              id: 'PVTF_date2',
              name: 'Target date',
              dataType: 'DATE'
            },
            {
              __typename: 'ProjectV2SingleSelectField',
              id: 'PVTSSF_pri1',
              name: 'Priority',
              options: [
                { id: 'opt1', name: 'P0' },
                { id: 'opt2', name: 'P1' },
                { id: 'opt3', name: 'P2' },
                { id: 'opt4', name: 'P3' }
              ]
            },
            {
              __typename: 'ProjectV2SingleSelectField',
              id: 'PVTSSF_size1',
              name: 'Size',
              options: [
                { id: 'sizeXS', name: 'XS' },
                { id: 'sizeS', name: 'S' },
                { id: 'sizeM', name: 'M' },
                { id: 'sizeL', name: 'L' },
                { id: 'sizeXL', name: 'XL' }
              ]
            },
            {
              __typename: 'ProjectV2Field',
              id: 'PVTF_num1',
              name: 'Estimate',
              dataType: 'NUMBER'
            }
          ]
        }
      }
    });
  });

  it('should transform date fields correctly', () => {
    const jpdIssue = {
      fields: {
        customfield_14383: '2024-06-01',
        customfield_14384: '2024-06-30'
      }
    };

    const mapping1 = {
      jpd: 'fields.customfield_14383',
      github_field: 'Start date',
      type: 'date' as const
    };

    const mapping2 = {
      jpd: 'fields.customfield_14384',
      github_field: 'Target date',
      type: 'date' as const
    };

    const value1 = ProjectFieldTransformer.extractJpdValue(jpdIssue, mapping1.jpd);
    const transformed1 = ProjectFieldTransformer.transformFieldValue(value1, mapping1);

    const value2 = ProjectFieldTransformer.extractJpdValue(jpdIssue, mapping2.jpd);
    const transformed2 = ProjectFieldTransformer.transformFieldValue(value2, mapping2);

    expect(transformed1).toEqual({ date: '2024-06-01' });
    expect(transformed2).toEqual({ date: '2024-06-30' });
  });

  it('should transform priority with value mapping', () => {
    const jpdIssue = {
      fields: {
        customfield_14425: { value: 'High' }
      }
    };

    const mapping = {
      jpd: 'fields.customfield_14425.value',
      github_field: 'Priority',
      type: 'single_select' as const,
      mapping: {
        Critical: 'P0',
        High: 'P1',
        Normal: 'P2',
        Low: 'P3'
      }
    };

    const value = ProjectFieldTransformer.extractJpdValue(jpdIssue, mapping.jpd);
    const transformed = ProjectFieldTransformer.transformFieldValue(value, mapping);

    expect(transformed).toEqual({ singleSelectValue: 'P1' });
  });

  it('should derive Size from Effort using thresholds', () => {
    const jpdIssue = {
      fields: {
        customfield_14387: 8 // Effort = 8, should map to M (6-10 range)
      }
    };

    const mapping = {
      jpd: 'fields.customfield_14387',
      github_field: 'Size',
      type: 'single_select' as const,
      derive: {
        thresholds: [
          { max: 2, value: 'XS' },
          { max: 5, value: 'S' },
          { max: 10, value: 'M' },
          { max: 20, value: 'L' },
          { max: 999, value: 'XL' }
        ]
      }
    };

    const value = ProjectFieldTransformer.extractJpdValue(jpdIssue, mapping.jpd);
    const transformed = ProjectFieldTransformer.transformFieldValue(value, mapping);

    expect(transformed).toEqual({ singleSelectValue: 'M' });
  });

  it('should transform Estimate as number', () => {
    const jpdIssue = {
      fields: {
        customfield_14387: 13
      }
    };

    const mapping = {
      jpd: 'fields.customfield_14387',
      github_field: 'Estimate',
      type: 'number' as const
    };

    const value = ProjectFieldTransformer.extractJpdValue(jpdIssue, mapping.jpd);
    const transformed = ProjectFieldTransformer.transformFieldValue(value, mapping);

    expect(transformed).toEqual({ number: 13 });
  });

  it('should handle missing JPD values gracefully', () => {
    const jpdIssue = {
      fields: {
        // No custom fields set
      }
    };

    const mapping = {
      jpd: 'fields.customfield_14383',
      github_field: 'Start date',
      type: 'date' as const
    };

    const value = ProjectFieldTransformer.extractJpdValue(jpdIssue, mapping.jpd);
    const transformed = ProjectFieldTransformer.transformFieldValue(value, mapping);

    // Should return null for missing values
    expect(transformed).toBeNull();
  });

  it('should handle unmapped priority values', () => {
    const jpdIssue = {
      fields: {
        customfield_14425: { value: 'Urgent' } // Not in mapping
      }
    };

    const mapping = {
      jpd: 'fields.customfield_14425.value',
      github_field: 'Priority',
      type: 'single_select' as const,
      mapping: {
        Critical: 'P0',
        High: 'P1',
        Normal: 'P2',
        Low: 'P3'
      }
    };

    const value = ProjectFieldTransformer.extractJpdValue(jpdIssue, mapping.jpd);
    const transformed = ProjectFieldTransformer.transformFieldValue(value, mapping);

    // Should return original unmapped value
    expect(transformed).toEqual({ singleSelectValue: 'Urgent' });
  });
});
