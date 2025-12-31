import { Octokit } from '@octokit/rest';
import { StateManager } from '../state/state-manager.js';
import type { JpdSyncMetadata } from '../state/metadata-parser.js';
import { Logger } from '../utils/logger.js';
import type { Config } from '../config/config-schema.js';

export interface GitHubIssue {
  number: number;
  title: string;
  body: string;
  state: 'open' | 'closed';
  labels: string[];
  updated_at: string;
  metadata?: JpdSyncMetadata | null;
}

export interface LabelDefinition {
  name: string;
  color: string;
  description?: string;
}

export class GitHubClient {
  private octokit: Octokit;
  private owner: string;
  private repo: string;
  private dryRun: boolean;
  private logger: Logger;
  private labelCache: Map<string, boolean> = new Map(); // Cache for existing labels
  private labelConfig: Map<string, LabelDefinition> = new Map(); // Label definitions from config

  constructor(token: string, logger: Logger, dryRun: boolean = false, owner?: string, repo?: string) {
    this.octokit = new Octokit({ auth: token });
    this.owner = owner || '';
    this.repo = repo || '';
    this.dryRun = dryRun;
    this.logger = logger;
  }

  /**
   * Load label definitions from config
   */
  setLabelConfig(config: Config): void {
    if (!config.labels) return;

    // Load all label definitions into the map
    const allLabels = [
      ...(config.labels.hierarchy || []),
      ...(config.labels.types || []),
      ...(config.labels.priorities || []),
      ...(config.labels.statuses || []),
      ...(config.labels.custom || [])
    ];

    for (const label of allLabels) {
      this.labelConfig.set(label.name, label);
    }

    this.logger.debug(`Loaded ${this.labelConfig.size} label definitions from config`);
  }

  async getIssue(owner: string, repo: string, issueNumber: number): Promise<any> {
    const { data } = await this.octokit.issues.get({
      owner,
      repo,
      issue_number: issueNumber
    });
    return data;
  }

  /**
   * Get ALL issues from a repository (including unsynced ones)
   */
  async getAllIssues(owner?: string, repo?: string): Promise<GitHubIssue[]> {
    const finalOwner = owner || this.owner;
    const finalRepo = repo || this.repo;
    
    const { data } = await this.octokit.issues.listForRepo({
      owner: finalOwner,
      repo: finalRepo,
      state: 'all',
      per_page: 100
    });

    return data as unknown as GitHubIssue[];
  }

  async getSyncedIssues(owner?: string, repo?: string): Promise<GitHubIssue[]> {
    const finalOwner = owner || this.owner;
    const finalRepo = repo || this.repo;
    
    // Search for issues containing the hidden sync metadata comment
    // This avoids label noise while maintaining tracking capability
    const { data } = await this.octokit.search.issuesAndPullRequests({
      q: `repo:${finalOwner}/${finalRepo} is:issue "jpd-sync-metadata"`,
      per_page: 100
    });

    return data.items.map(issue => ({
      number: issue.number,
      title: issue.title,
      body: issue.body || '',
      state: issue.state as 'open' | 'closed',
      labels: issue.labels.map(l => typeof l === 'string' ? l : l.name || ''),
      updated_at: issue.updated_at,
      metadata: StateManager.getSyncState(issue.body || '')
    }));
  }

  /**
   * Get a specific issue by number
   */
  async getIssueByNumber(owner: string, repo: string, issueNumber: number): Promise<GitHubIssue | null> {
    try {
      const { data: issue } = await this.octokit.issues.get({
        owner,
        repo,
        issue_number: issueNumber
      });

      return {
        number: issue.number,
        title: issue.title,
        body: issue.body || '',
        state: issue.state as 'open' | 'closed',
        labels: issue.labels.map(l => typeof l === 'string' ? l : l.name || ''),
        updated_at: issue.updated_at,
        metadata: StateManager.getSyncState(issue.body || '')
      };
    } catch (error: any) {
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  async createIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    labels: string[],
    jpdMetadata: JpdSyncMetadata
  ): Promise<number> {
    const bodyWithMetadata = StateManager.createSyncState(
      body,
      jpdMetadata.jpd_id,
      jpdMetadata.jpd_updated,
      jpdMetadata.sync_hash,
      jpdMetadata.parent_jpd_id,
      jpdMetadata.original_link
    );

    // No sync label needed - tracking via hidden metadata in body
    // Filter out any empty/undefined/null labels before sending to GitHub
    // Also ensure all labels are strings
    const cleanedLabels = labels
      .filter(l => l != null && l !== undefined)
      .map(l => String(l))
      .filter(l => l.trim().length > 0);
    const finalLabels = [...new Set(cleanedLabels)];

    // Ensure all labels exist before creating issue
    await this.ensureLabels(owner, repo, finalLabels);

    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would create issue: "${title}" with labels: ${finalLabels.join(', ')}`);
      return 0; // Fake ID
    }

    const { data } = await this.octokit.issues.create({
      owner,
      repo,
      title,
      body: bodyWithMetadata,
      labels: finalLabels
    });

    return data.number;
  }

  async updateIssue(
    owner: string,
    repo: string,
    number: number,
    updates: {
      title?: string;
      body?: string;
      labels?: string[];
      state?: 'open' | 'closed';
      jpdMetadata?: JpdSyncMetadata;
    }
  ): Promise<void> {
    const updatePayload: any = {
      owner,
      repo,
      issue_number: number
    };

    if (updates.title) updatePayload.title = updates.title;
    if (updates.state) updatePayload.state = updates.state;

    // Handle body and metadata merge
    if (updates.body || updates.jpdMetadata) {
      // We need current body if we are updating metadata but not body
      // But typically we pass both.
      // If body is undefined, we need to fetch it first? 
      // Ideally the caller passes the FULL new body content or we assume `updates.body` is the new content
      // If `updates.body` is present, we inject metadata into IT.
      
      let newBody = updates.body;
      
      if (!newBody && updates.jpdMetadata && !this.dryRun) {
        // Fetch current body to inject metadata
        const { data } = await this.octokit.issues.get({
            owner,
            repo,
            issue_number: number
        });
        newBody = data.body || '';
      } else if (!newBody && updates.jpdMetadata && this.dryRun) {
         newBody = "[DRY RUN: Current Body Placeholder]";
      }

      if (newBody && updates.jpdMetadata) {
         newBody = StateManager.createSyncState(
            newBody,
            updates.jpdMetadata.jpd_id,
            updates.jpdMetadata.jpd_updated,
            updates.jpdMetadata.sync_hash,
            updates.jpdMetadata.parent_jpd_id,
            updates.jpdMetadata.original_link
         );
      }

      if (newBody) updatePayload.body = newBody;
    }

    if (updates.labels) {
      // Filter out any empty/undefined/null labels and ensure all are strings
      const cleanedLabels = updates.labels
        .filter(l => l != null && l !== undefined)
        .map(l => String(l))
        .filter(l => l.trim().length > 0);
      
      // Ensure all labels exist before updating issue
      await this.ensureLabels(owner, repo, cleanedLabels);
      
      // No sync label needed - tracking via hidden metadata
      updatePayload.labels = cleanedLabels;
    }

    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would update issue #${number}:`, JSON.stringify(updatePayload, null, 2));
      return;
    }

    await this.octokit.issues.update(updatePayload);
  }

  /**
   * Clean up stale JPD metadata from an issue
   * This bypasses dry-run mode because it's fixing broken data, not syncing new data
   */
  async cleanupStaleMetadata(
    owner: string,
    repo: string,
    issueNumber: number,
    cleanedBody: string
  ): Promise<void> {
    try {
      // Always execute cleanup, even in dry-run mode
      // This is maintenance, not sync - broken references should be cleaned
      const response = await this.octokit.issues.update({
        owner,
        repo,
        issue_number: issueNumber,
        body: cleanedBody
      });
      
      this.logger.debug(`Successfully updated #${issueNumber}, status: ${response.status}`);
    } catch (error: any) {
      this.logger.error(`Failed to cleanup #${issueNumber}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get comments for a GitHub issue
   */
  async getComments(owner: string, repo: string, issueNumber: number): Promise<any[]> {
    const { data } = await this.octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100
    });
    return data;
  }

  /**
   * Add a comment to a GitHub issue
   */
  async addComment(owner: string, repo: string, issueNumber: number, body: string): Promise<any> {
    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would add comment to issue #${issueNumber}: ${body.substring(0, 100)}...`);
      return { id: 0 };
    }

    const { data } = await this.octokit.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body
    });
    return data;
  }

  /**
   * Create a sub-issue linked to a parent issue
   * Creates the issue and adds it to the parent's task list
   */
  async createSubIssue(
    owner: string,
    repo: string,
    title: string,
    body: string,
    labels: string[],
    jpdMetadata: JpdSyncMetadata,
    parentIssueNumber: number
  ): Promise<number> {
    // Check depth limit (GitHub max is 8 levels)
    const parentDepth = await this.calculateIssueDepth(owner, repo, parentIssueNumber);
    if (parentDepth >= 8) {
      this.logger.warn(`Cannot create sub-issue of #${parentIssueNumber}: depth limit reached (${parentDepth} levels, max 8)`);
      // Create as regular issue instead
      return await this.createIssue(owner, repo, title, body, labels, jpdMetadata);
    }
    
    // First, create the child issue normally
    const childNumber = await this.createIssue(owner, repo, title, body, labels, jpdMetadata);

    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would link issue #${childNumber} to parent #${parentIssueNumber}`);
      return childNumber;
    }

    // Add child to parent's sub-issues list
    await this.addSubIssueToParent(owner, repo, parentIssueNumber, childNumber, title);

    this.logger.info(`Created sub-issue #${childNumber} under parent #${parentIssueNumber}`);
    return childNumber;
  }

  /**
   * Add an existing issue as a sub-issue to a parent
   */
  private async addSubIssueToParent(
    owner: string,
    repo: string,
    parentNumber: number,
    childNumber: number,
    childTitle: string
  ): Promise<void> {
    // Get parent issue
    const parent = await this.octokit.issues.get({
      owner,
      repo,
      issue_number: parentNumber
    });

    const parentBody = parent.data.body || '';

    // Look for existing sub-issues section
    const subIssuesHeaderRegex = /^## 📋 (Subtasks?|Sub-issues?)$/m;
    const hasSubIssuesSection = subIssuesHeaderRegex.test(parentBody);

    let updatedBody: string;

    if (hasSubIssuesSection) {
      // Add to existing section
      // Find the section and add the new item
      const lines = parentBody.split('\n');
      const headerIndex = lines.findIndex(line => subIssuesHeaderRegex.test(line));
      
      // Find where to insert (after header, before next section or metadata)
      let insertIndex = headerIndex + 1;
      
      // Skip empty lines after header
      while (insertIndex < lines.length && lines[insertIndex].trim() === '') {
        insertIndex++;
      }
      
      // Insert the new sub-issue as a task list item
      const newItem = `- [ ] #${childNumber} ${childTitle}`;
      lines.splice(insertIndex, 0, newItem);
      
      updatedBody = lines.join('\n');
    } else {
      // Create new sub-issues section
      // Insert before metadata comment
      const metadataIndex = parentBody.indexOf('<!-- jpd-sync-metadata');
      const newSection = `\n\n## 📋 Subtasks\n\n- [ ] #${childNumber} ${childTitle}\n`;
      
      if (metadataIndex !== -1) {
        updatedBody = parentBody.slice(0, metadataIndex) + newSection + parentBody.slice(metadataIndex);
      } else {
        updatedBody = parentBody + newSection;
      }
    }

    // Update parent issue body
    await this.octokit.issues.update({
      owner,
      repo,
      issue_number: parentNumber,
      body: updatedBody
    });

    this.logger.debug(`Added sub-issue #${childNumber} to parent #${parentNumber}'s task list`);
  }

  /**
   * Get sub-issues of a parent issue by parsing task list
   */
  async getSubIssues(owner: string, repo: string, parentNumber: number): Promise<number[]> {
    const parent = await this.octokit.issues.get({
      owner,
      repo,
      issue_number: parentNumber
    });

    const body = parent.data.body || '';
    
    // Parse task list items that reference issues
    // Matches: - [ ] #123 or - [x] #123
    const taskListRegex = /^- \[[ x]\] #(\d+)/gm;
    const matches = [...body.matchAll(taskListRegex)];
    
    return matches.map(match => parseInt(match[1], 10));
  }

  /**
   * Get parent issue number from a child issue's metadata or body
   */
  async getParentIssue(owner: string, repo: string, childNumber: number): Promise<number | null> {
    const child = await this.octokit.issues.get({
      owner,
      repo,
      issue_number: childNumber
    });

    const body = child.data.body || '';
    
    // First, check metadata
    const metadata = StateManager.getSyncState(body);
    if (metadata?.parent_github_issue) {
      return metadata.parent_github_issue;
    }

    // Fallback: Parse body for parent reference
    // Matches: Parent: #123 or Parent Epic: #123
    const parentRegex = /Parent(?:\s+Epic)?:\s*#(\d+)/i;
    const match = body.match(parentRegex);
    
    return match ? parseInt(match[1], 10) : null;
  }

  /**
   * Mark a sub-issue as complete in the parent's task list
   */
  async markSubIssueComplete(
    owner: string,
    repo: string,
    parentNumber: number,
    childNumber: number
  ): Promise<void> {
    const parent = await this.octokit.issues.get({
      owner,
      repo,
      issue_number: parentNumber
    });

    const parentBody = parent.data.body || '';
    
    // Replace - [ ] #childNumber with - [x] #childNumber
    const updatedBody = parentBody.replace(
      new RegExp(`^- \\[ \\] #${childNumber}`, 'gm'),
      `- [x] #${childNumber}`
    );

    if (updatedBody !== parentBody) {
      await this.octokit.issues.update({
        owner,
        repo,
        issue_number: parentNumber,
        body: updatedBody
      });

      this.logger.debug(`Marked sub-issue #${childNumber} as complete in parent #${parentNumber}`);
    }
  }

  /**
   * Calculate the depth of an issue in the hierarchy
   * Returns 1 for root issues, 2 for their children, etc.
   * Max depth is 8 (GitHub's limit)
   */
  private async calculateIssueDepth(
    owner: string,
    repo: string,
    issueNumber: number,
    visited: Set<number> = new Set()
  ): Promise<number> {
    // Prevent infinite loops
    if (visited.has(issueNumber)) {
      this.logger.warn(`Circular reference detected in hierarchy at issue #${issueNumber}`);
      return 0;
    }
    visited.add(issueNumber);

    try {
      const issue = await this.octokit.issues.get({
        owner,
        repo,
        issue_number: issueNumber
      });

      const body = issue.data.body || '';
      
      // Look for parent reference in body
      const parentMatch = body.match(/## 🔗 Parent[\s\S]*?- GitHub: #(\d+)/);
      
      if (parentMatch) {
        const parentNumber = parseInt(parentMatch[1]);
        const parentDepth = await this.calculateIssueDepth(owner, repo, parentNumber, visited);
        return parentDepth + 1;
      }
      
      // No parent found - this is a root issue
      return 1;
    } catch (error) {
      this.logger.warn(`Could not calculate depth for issue #${issueNumber}: ${error}`);
      return 1; // Assume root level if we can't determine
    }
  }

  /**
   * Ensure a child issue is in the parent's task list.
   * Adds it if missing, updates checkbox state if present but wrong state.
   */
  async ensureInParentTaskList(
    owner: string,
    repo: string,
    parentNumber: number,
    childNumber: number,
    childTitle: string,
    childIsClosed: boolean = false
  ): Promise<void> {
    if (this.dryRun) {
      this.logger.debug(`[DRY RUN] Would ensure #${childNumber} is in parent #${parentNumber}'s task list`);
      return;
    }

    const parent = await this.octokit.issues.get({
      owner,
      repo,
      issue_number: parentNumber
    });

    const parentBody = parent.data.body || '';
    
    // Check if child is already in task list (with any checkbox state)
    const childPattern = new RegExp(`^- \\[[x ]\\] #${childNumber}`, 'gm');
    const isInTaskList = childPattern.test(parentBody);

    if (isInTaskList) {
      // Child exists - ensure checkbox state is correct
      const expectedCheckbox = childIsClosed ? '[x]' : '[ ]';
      const currentCheckbox = childIsClosed ? '[ ]' : '[x]';
      
      const updatedBody = parentBody.replace(
        new RegExp(`^- \\[${currentCheckbox.slice(1, 2)}\\] #${childNumber}`, 'gm'),
        `- ${expectedCheckbox} #${childNumber}`
      );

      if (updatedBody !== parentBody) {
        await this.octokit.issues.update({
          owner,
          repo,
          issue_number: parentNumber,
          body: updatedBody
        });
        this.logger.debug(`Updated checkbox state for #${childNumber} in parent #${parentNumber}`);
      }
    } else {
      // Child not in task list - add it
      await this.addSubIssueToParent(owner, repo, parentNumber, childNumber, childTitle);
      this.logger.info(`Added #${childNumber} to parent #${parentNumber}'s task list`);
    }
  }

  /**
   * Ensure a label exists in the repository, creating it if necessary
   */
  private async ensureLabel(owner: string, repo: string, labelName: string): Promise<void> {
    const cacheKey = `${owner}/${repo}/${labelName}`;

    // Check cache first
    if (this.labelCache.has(cacheKey)) {
      return;
    }

    try {
      // Check if label exists and get its current state
      const existingLabel = await this.octokit.issues.getLabel({
        owner,
        repo,
        name: labelName
      });
      
      // Check if color needs updating
      const labelDef = this.labelConfig.get(labelName);
      const expectedColor = labelDef?.color || this.getDefaultLabelColor(labelName);
      const expectedDescription = labelDef?.description || '';
      
      if (existingLabel.data.color !== expectedColor || existingLabel.data.description !== expectedDescription) {
        await this.updateLabel(owner, repo, labelName, expectedColor, expectedDescription);
      }
      
      // Label exists - cache it
      this.labelCache.set(cacheKey, true);
      this.logger.debug(`Label exists: ${labelName}`);
    } catch (error: any) {
      if (error.status === 404) {
        // Label doesn't exist - create it
        await this.createLabel(owner, repo, labelName);
        this.labelCache.set(cacheKey, true);
      } else {
        // Other error - log and continue
        this.logger.warn(`Error checking label ${labelName}: ${error.message}`);
      }
    }
  }

  /**
   * Create a label in the repository
   */
  private async createLabel(owner: string, repo: string, labelName: string): Promise<void> {
    const labelDef = this.labelConfig.get(labelName);
    const color = labelDef?.color || this.getDefaultLabelColor(labelName);
    const description = labelDef?.description || '';

    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would create label: ${labelName} (color: ${color})`);
      return;
    }

    this.logger.info(`Creating label: ${labelName} (color: ${color})`);
    
    try {
      await this.octokit.issues.createLabel({
        owner,
        repo,
        name: labelName,
        color,
        description
      });
    } catch (error: any) {
      this.logger.error(`Failed to create label ${labelName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Update an existing label's color and description
   */
  private async updateLabel(owner: string, repo: string, labelName: string, color: string, description: string): Promise<void> {
    if (this.dryRun) {
      this.logger.info(`[DRY RUN] Would update label: ${labelName} (color: ${color})`);
      return;
    }

    this.logger.info(`Updating label: ${labelName} (color: ${color})`);
    
    try {
      await this.octokit.issues.updateLabel({
        owner,
        repo,
        name: labelName,
        color,
        description
      });
    } catch (error: any) {
      this.logger.error(`Failed to update label ${labelName}: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get default color for a label based on naming conventions
   */
  private getDefaultLabelColor(labelName: string): string {
    // Hierarchy labels
    if (labelName === 'epic') return '0052CC';
    if (labelName === 'story') return '2684FF';
    if (labelName === 'task') return 'B3D4FF';
    if (labelName === 'idea') return 'C5DEF5';

    // Type labels
    if (labelName.startsWith('type:bug')) return 'DE350B';
    if (labelName.startsWith('type:feature')) return '6554C0';
    if (labelName.startsWith('type:tech-debt')) return 'FF8B00';
    if (labelName.startsWith('type:docs')) return '00B8D9';
    if (labelName.startsWith('type:security')) return 'FF5630';

    // Priority labels
    if (labelName.startsWith('priority:critical')) return 'DE350B';
    if (labelName.startsWith('priority:high')) return 'FF8B00';
    if (labelName.startsWith('priority:normal')) return 'FFC400';
    if (labelName.startsWith('priority:low')) return '8993A4';

    // Status labels
    if (labelName === 'blocked') return 'DE350B';
    if (labelName === 'needs-review') return '00B8D9';
    if (labelName === 'ready-for-dev') return '36B37E';

    // Default gray
    return '8993A4';
  }

  /**
   * Ensure multiple labels exist, creating them if necessary
   */
  async ensureLabels(owner: string, repo: string, labels: string[]): Promise<void> {
    const uniqueLabels = [...new Set(labels.filter(l => l && l.trim()))];
    
    if (uniqueLabels.length === 0) {
      return;
    }

    this.logger.debug(`Ensuring ${uniqueLabels.length} labels exist`);

    // Process labels in parallel for efficiency
    await Promise.all(
      uniqueLabels.map(label => this.ensureLabel(owner, repo, label))
    );
  }
}

