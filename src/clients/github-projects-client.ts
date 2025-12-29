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
}

