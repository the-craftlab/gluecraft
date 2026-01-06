/**
 * GitHub Projects (Beta) API Client
 * 
 * Handles interaction with GitHub Projects for:
 * - Moving issues between columns based on status
 * - Querying issue positions in project boards
 * - Managing project board structure
 */

import { Octokit } from '@octokit/rest';
import { Logger } from '../utils/logger.js';

export interface ProjectColumn {
  id: string;
  name: string;
  position: number;
}

export interface ProjectInfo {
  id: string;
  number: number;
  title: string;
  columns: ProjectColumn[];
}

export interface ProjectFieldInfo {
  id: string;
  name: string;
  dataType: 'TEXT' | 'NUMBER' | 'DATE' | 'SINGLE_SELECT';
  options?: Array<{ id: string; name: string }>;
}

export interface FieldValue {
  date?: string;
  number?: number;
  singleSelectOptionId?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class GitHubProjectsClient {
  private octokit: Octokit;
  private logger: typeof Logger;
  private dryRun: boolean;

  constructor(token: string, dryRun: boolean = false) {
    this.octokit = new Octokit({ auth: token });
    this.logger = Logger;
    this.dryRun = dryRun;
  }

  /**
   * Get project information using GraphQL (required for Projects Beta)
   */
  async getProjectByNumber(owner: string, repo: string, projectNumber: number): Promise<ProjectInfo | null> {
    try {
      const query = `
        query($owner: String!, $repo: String!, $number: Int!) {
          repository(owner: $owner, name: $repo) {
            projectV2(number: $number) {
              id
              number
              title
              fields(first: 20) {
                nodes {
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const result: any = await this.octokit.graphql(query, {
        owner,
        repo,
        number: projectNumber
      });

      const project = result.repository?.projectV2;
      if (!project) return null;

      // Extract status field columns
      const statusField = project.fields.nodes.find((f: any) => 
        f.name === 'Status' || f.name === 'status'
      );

      const columns: ProjectColumn[] = statusField?.options?.map((opt: any, idx: number) => ({
        id: opt.id,
        name: opt.name,
        position: idx
      })) || [];

      return {
        id: project.id,
        number: project.number,
        title: project.title,
        columns
      };
    } catch (error: any) {
      this.logger.error(`Failed to get project #${projectNumber}: ${error.message}`);
      return null;
    }
  }

  /**
   * Add an issue to a project
   */
  async addIssueToProject(
    projectId: string,
    issueNodeId: string
  ): Promise<string | null> {
    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would add issue ${issueNodeId} to project ${projectId}`);
      return null;
    }

    try {
      const mutation = `
        mutation($projectId: ID!, $contentId: ID!) {
          addProjectV2ItemById(input: {
            projectId: $projectId
            contentId: $contentId
          }) {
            item {
              id
            }
          }
        }
      `;

      const result: any = await this.octokit.graphql(mutation, {
        projectId,
        contentId: issueNodeId
      });

      return result.addProjectV2ItemById?.item?.id || null;
    } catch (error: any) {
      this.logger.error(`Failed to add issue to project: ${error.message}`);
      return null;
    }
  }

  /**
   * Update an issue's status in a project
   */
  async updateIssueStatus(
    projectId: string,
    itemId: string,
    statusFieldId: string,
    statusOptionId: string
  ): Promise<boolean> {
    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would update item ${itemId} status to ${statusOptionId}`);
      return true;
    }

    try {
      const mutation = `
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: $value
          }) {
            projectV2Item {
              id
            }
          }
        }
      `;

      await this.octokit.graphql(mutation, {
        projectId,
        itemId,
        fieldId: statusFieldId,
        value: {
          singleSelectOptionId: statusOptionId
        }
      });

      return true;
    } catch (error: any) {
      this.logger.error(`Failed to update issue status: ${error.message}`);
      return false;
    }
  }

  /**
   * Get an issue's current project item ID
   */
  async getIssueProjectItemId(
    projectId: string,
    issueNumber: number,
    owner: string,
    repo: string
  ): Promise<string | null> {
    try {
      const query = `
        query($owner: String!, $repo: String!, $number: Int!) {
          repository(owner: $owner, name: $repo) {
            issue(number: $number) {
              projectItems(first: 10) {
                nodes {
                  id
                  project {
                    id
                  }
                }
              }
            }
          }
        }
      `;

      const result: any = await this.octokit.graphql(query, {
        owner,
        repo,
        number: issueNumber
      });

      const items = result.repository?.issue?.projectItems?.nodes || [];
      const item = items.find((i: any) => i.project.id === projectId);
      
      return item?.id || null;
    } catch (error: any) {
      this.logger.error(`Failed to get issue project item: ${error.message}`);
      return null;
    }
  }

  /**
   * Get all field definitions for a project
   */
  async getProjectFields(projectId: string): Promise<ProjectFieldInfo[]> {
    try {
      const query = `
        query($projectId: ID!) {
          node(id: $projectId) {
            ... on ProjectV2 {
              id
              fields(first: 50) {
                nodes {
                  ... on ProjectV2Field {
                    id
                    name
                    dataType
                  }
                  ... on ProjectV2SingleSelectField {
                    id
                    name
                    options {
                      id
                      name
                    }
                  }
                }
              }
            }
          }
        }
      `;

      const result: any = await this.octokit.graphql(query, { projectId });

      if (!result.node) {
        this.logger.error(`Failed to get project fields: Project not found`);
        return [];
      }

      const fields: ProjectFieldInfo[] = [];
      for (const field of result.node.fields.nodes) {
        if (field.options) {
          // Single select field
          fields.push({
            id: field.id,
            name: field.name,
            dataType: 'SINGLE_SELECT',
            options: field.options
          });
        } else {
          // Regular field (DATE, NUMBER, TEXT, etc.)
          fields.push({
            id: field.id,
            name: field.name,
            dataType: field.dataType,
            options: undefined
          });
        }
      }

      return fields;
    } catch (error: any) {
      this.logger.error(`Failed to get project fields: ${error.message}`);
      return [];
    }
  }

  /**
   * Update a field value on a project item
   */
  async updateFieldValue(
    projectId: string,
    itemId: string,
    fieldId: string,
    value: FieldValue
  ): Promise<boolean> {
    if (this.dryRun) {
      this.logger.info(
        `[DRY RUN] Would update field ${fieldId} on item ${itemId} to ${JSON.stringify(value)}`
      );
      return true;
    }

    try {
      const mutation = `
        mutation($projectId: ID!, $itemId: ID!, $fieldId: ID!, $value: ProjectV2FieldValue!) {
          updateProjectV2ItemFieldValue(input: {
            projectId: $projectId
            itemId: $itemId
            fieldId: $fieldId
            value: $value
          }) {
            projectV2Item {
              id
            }
          }
        }
      `;

      await this.octokit.graphql(mutation, {
        projectId,
        itemId,
        fieldId,
        value
      });

      return true;
    } catch (error: any) {
      this.logger.error(`Failed to update field value: ${error.message}`);
      return false;
    }
  }

  /**
   * Validate field mappings against project fields
   */
  async validateFieldMappings(
    projectId: string,
    mappings: Array<{
      jpd: string;
      github_field: string;
      type: 'date' | 'number' | 'single_select';
      mapping?: Record<string, string>;
      derive?: any;
    }>
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      const projectFields = await this.getProjectFields(projectId);
      const fieldMap = new Map<string, ProjectFieldInfo>();
      
      for (const field of projectFields) {
        fieldMap.set(field.name, field);
      }

      for (const mapping of mappings) {
        const projectField = fieldMap.get(mapping.github_field);

        if (!projectField) {
          errors.push(`Field "${mapping.github_field}" not found in project`);
          continue;
        }

        // Check type compatibility
        const expectedDataType = this.mapTypeToDataType(mapping.type);
        if (projectField.dataType !== expectedDataType) {
          errors.push(
            `Field "${mapping.github_field}" type mismatch: expected ${mapping.type}, got ${projectField.dataType}`
          );
          continue;
        }

        // For single-select fields, validate options
        if (mapping.type === 'single_select' && mapping.mapping && projectField.options) {
          const projectOptionNames = new Set(projectField.options.map(opt => opt.name));
          
          for (const [jpdValue, githubValue] of Object.entries(mapping.mapping)) {
            if (!projectOptionNames.has(githubValue)) {
              warnings.push(
                `Field "${mapping.github_field}" missing option: ${githubValue} (mapped from ${jpdValue})`
              );
            }
          }
        }
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error: any) {
      errors.push(`Failed to validate field mappings: ${error.message}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Map config field type to GitHub dataType
   */
  private mapTypeToDataType(type: 'date' | 'number' | 'single_select'): string {
    switch (type) {
      case 'date':
        return 'DATE';
      case 'number':
        return 'NUMBER';
      case 'single_select':
        return 'SINGLE_SELECT';
      default:
        return 'TEXT';
    }
  }
}

