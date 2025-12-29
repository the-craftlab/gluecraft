import { TemplateParser } from '../transformers/template-parser.js';
import type { Config } from '../config/config-schema.js';

export interface IssueRelationships {
  parent_jpd_key?: string;
  parent_github_number?: number;
  child_jpd_keys?: string[];
  child_github_numbers?: number[];
  related_jpd_keys?: string[];
  related_github_numbers?: number[];
}

export class HierarchyManager {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Check if hierarchy tracking is enabled
   */
  isEnabled(): boolean {
    return this.config.hierarchy?.enabled !== false;
  }

  /**
   * Extract parent-child relationships from a JPD issue
   */
  extractRelationships(jpdIssue: Record<string, any>): IssueRelationships {
    // If hierarchy is disabled, return empty relationships
    if (!this.isEnabled()) {
      return {
        parent_jpd_key: null,
        child_jpd_keys: [],
        related_jpd_keys: []
      };
    }
    
    const relationships: IssueRelationships = {};
    const fields = jpdIssue.fields || {};

    // Parent relationship
    if (fields.parent) {
      relationships.parent_jpd_key = fields.parent.key;
    }

    // Subtasks (children)
    if (fields.subtasks && Array.isArray(fields.subtasks)) {
      relationships.child_jpd_keys = fields.subtasks.map((s: any) => s.key);
    }

    // Issue links (JPD uses "Subtask" link type for parent-child)
    if (fields.issuelinks && Array.isArray(fields.issuelinks)) {
      const childKeys: string[] = [];
      const relatedKeys: string[] = [];
      
      for (const link of fields.issuelinks) {
        // Subtask links = parent-child relationship
        if (link.type?.name === 'Subtask') {
          // inwardIssue = child (subtask)
          if (link.inwardIssue) {
            childKeys.push(link.inwardIssue.key);
          }
          // outwardIssue = parent (if current issue is the child)
          if (link.outwardIssue) {
            relationships.parent_jpd_key = link.outwardIssue.key;
          }
        } else {
          // Other link types are "related" not hierarchical
          if (link.inwardIssue) relatedKeys.push(link.inwardIssue.key);
          if (link.outwardIssue) relatedKeys.push(link.outwardIssue.key);
        }
      }
      
      if (childKeys.length > 0) {
        relationships.child_jpd_keys = childKeys;
      }
      if (relatedKeys.length > 0) {
        relationships.related_jpd_keys = relatedKeys;
      }
    }

    return relationships;
  }

  /**
   * Generate hierarchy labels based on parent issue
   * Returns simple, human-readable labels only (no IDs or machine metadata)
   */
  generateLabels(
    jpdIssue: Record<string, any>, 
    parentIssue?: Record<string, any>
  ): string[] {
    // Hierarchy labels removed - we use hidden metadata instead
    // This keeps labels clean and human-focused
    return [];
  }

  /**
   * Build rich body content with cross-references to GitHub issues and JPD
   */
  buildRelationshipsBody(
    relationships: IssueRelationships,
    githubIssueMap: Map<string, number>, // JPD key -> GitHub issue number
    jpdBaseUrl: string,
    existingGithubIssues?: Array<{ number: number; state: string; metadata?: any }> // Optional: for checkbox state
  ): string {
    let body = '';

    // Parent section
    if (relationships.parent_jpd_key) {
      const parentGhNumber = githubIssueMap.get(relationships.parent_jpd_key);
      body += '\n\n## 🔗 Parent\n\n';
      
      if (parentGhNumber) {
        body += `- GitHub: #${parentGhNumber}\n`;
      }
      body += `- JPD: [${relationships.parent_jpd_key}](${jpdBaseUrl}/browse/${relationships.parent_jpd_key})\n`;
    }

    // Children section - use task lists for GitHub sub-issues
    if (relationships.child_jpd_keys && relationships.child_jpd_keys.length > 0) {
      body += '\n\n## 📋 Subtasks\n\n';
      
      for (const childKey of relationships.child_jpd_keys) {
        const childGhNumber = githubIssueMap.get(childKey);
        if (childGhNumber) {
          // Check if child is closed (preserve checkbox state)
          let checkbox = '[ ]';
          if (existingGithubIssues) {
            const childIssue = existingGithubIssues.find(gh => gh.number === childGhNumber);
            if (childIssue && childIssue.state === 'closed') {
              checkbox = '[x]';
            }
          }
          
          // Use task list format for GitHub sub-issues with correct checkbox state
          body += `- ${checkbox} #${childGhNumber} ([${childKey}](${jpdBaseUrl}/browse/${childKey}))\n`;
        } else {
          // Not yet synced to GitHub - just show JPD link
          body += `- [ ] [${childKey}](${jpdBaseUrl}/browse/${childKey})\n`;
        }
      }
    }

    // Related issues section
    if (relationships.related_jpd_keys && relationships.related_jpd_keys.length > 0) {
      body += '\n\n## 🔀 Related Issues\n\n';
      
      for (const relatedKey of relationships.related_jpd_keys) {
        const relatedGhNumber = githubIssueMap.get(relatedKey);
        if (relatedGhNumber) {
          body += `- #${relatedGhNumber} ([${relatedKey}](${jpdBaseUrl}/browse/${relatedKey}))\n`;
        } else {
          body += `- [${relatedKey}](${jpdBaseUrl}/browse/${relatedKey})\n`;
        }
      }
    }

    return body;
  }

  /**
   * Legacy method for backward compatibility
   */
  getParentLinkBody(parentIssue: Record<string, any>, jpdBaseUrl: string): string {
    if (!this.config.hierarchy?.parent_field_in_body || !parentIssue) {
      return '';
    }

    const parentType = parentIssue.fields?.issuetype?.name || 'Parent';
    const parentKey = parentIssue.key;
    const parentLink = `${jpdBaseUrl}/browse/${parentKey}`;

    return `\n\n**${parentType}**: [${parentKey}](${parentLink})`;
  }
}

