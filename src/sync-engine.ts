import { ConfigLoader } from './config/config-loader.js';
import { JpdClient } from './clients/jpd-client.js';
import { GitHubClient } from './clients/github-client.js';
import { GitHubProjectsClient } from './clients/github-projects-client.js';
import { TransformerEngine } from './transformers/transformer-engine.js';
import { HierarchyManager } from './hierarchy/hierarchy-manager.js';
import { StatusBasedHierarchy } from './hierarchy/status-based-hierarchy.js';
import { CommentSyncManager } from './comments/comment-sync-manager.js';
import { FieldValidator } from './validation/field-validator.js';
import { Logger } from './utils/logger.js';
import { DiffUtil } from './utils/diff.js';
import type { Config } from './config/config-schema.js';

export class SyncEngine {
  private config: Config;
  private jpd: JpdClient;
  private github: GitHubClient;
  private projects?: GitHubProjectsClient;
  private hierarchy: HierarchyManager;
  private statusHierarchy: StatusBasedHierarchy;
  private dryRun: boolean;
  private logger: Logger;
  private githubOwner: string;
  private githubRepo: string;
  private warnings: Array<{context: string, message: string, why: string}> = [];

  constructor(configPath: string, dryRun: boolean = false) {
    this.config = ConfigLoader.load(configPath);
    this.dryRun = dryRun;
    this.logger = new Logger();
    this.githubOwner = process.env.GITHUB_OWNER!;
    this.githubRepo = process.env.GITHUB_REPO!;
    
    this.jpd = new JpdClient({
      baseUrl: process.env.JPD_BASE_URL!,
      email: process.env.JPD_EMAIL!,
      apiToken: process.env.JPD_API_KEY!
    });

    this.github = new GitHubClient(
      process.env.GITHUB_TOKEN!,
      this.logger,
      this.dryRun,
      this.githubOwner,
      this.githubRepo
    );

    // Load label definitions from config
    this.github.setLabelConfig(this.config);

    // GitHub Projects (Beta) client if enabled
    if (this.config.projects?.enabled) {
      this.projects = new GitHubProjectsClient(
        process.env.GITHUB_TOKEN!,
        this.dryRun
      );
    }

    this.hierarchy = new HierarchyManager(this.config);
    this.statusHierarchy = new StatusBasedHierarchy(this.config);
  }

  async run() {
    // Validate JPD fields before syncing
    await this.validateFields();

    if (this.config.sync.direction === 'jpd-to-github' || this.config.sync.direction === 'bidirectional') {
      await this.syncJpdToGithub();
    }

    if (this.config.sync.direction === 'github-to-jpd' || this.config.sync.direction === 'bidirectional') {
      await this.syncGithubToJpd();
      
      // Create JPD issues from unsynced GitHub issues (if enabled)
      if (this.config.github_to_jpd_creation?.enabled) {
        await this.createJpdFromGithub();
      }
    }

    // Sync comments after main issue sync
    if (this.config.sync.direction === 'bidirectional') {
      await this.syncComments();
    }

    // Print warnings summary at the end
    if (this.warnings.length > 0) {
      Logger.section('Warnings');
      this.warnings.forEach((w, i) => {
        console.log(`${i + 1}. ${w.message}`);
        if (w.why) {
          console.log(`   💡 ${w.why}`);
        }
        console.log('');
      });
    }
  }

  /**
   * Validate that all required JPD fields exist and have the correct types
   */
  private async validateFields(): Promise<void> {
    // Skip validation if no field definitions provided
    if (!this.config.fields || this.config.fields.length === 0) {
      this.logger.debug('No field validation configured');
      return;
    }

    Logger.section('Field Validation');

    // Extract project key from JQL or env
    const projectKey = this.extractProjectKey();
    if (!projectKey) {
      Logger.warn('Could not determine project key. Skipping field validation.');
      return;
    }

    const validator = new FieldValidator(this.jpd, this.config.fields);
    const result = await validator.validate(projectKey);

    const reqCount = this.config.fields.filter(f => f.required).length;
    if (result.valid) {
      console.log(`✓ All ${reqCount} required fields validated`);
    } else {
      const report = validator.generateErrorReport(result);
      Logger.error(report);
      throw new Error(`JPD field validation failed.`);
    }

    // Don't show optional field warnings during validation
    // We'll check those on actual synced issues
    console.log('');
  }

  /**
   * Extract project key from JQL or environment
   */
  private extractProjectKey(): string | null {
    // Try to extract from JQL
    const jql = this.config.sync.jql || '';
    const projectMatch = jql.match(/project\s*=\s*([A-Z]+)/i);
    if (projectMatch && projectMatch[1]) {
      return projectMatch[1];
    }

    // Try from env
    if (process.env.JPD_PROJECT_KEY) {
      return process.env.JPD_PROJECT_KEY;
    }

    return null;
  }

  private async syncJpdToGithub() {
    Logger.section('JPD → GitHub Sync');
    
    // Fetch relevant JPD issues
    const jql = this.config.sync.jql || 'updated > -1d';
    this.logger.debug(`Searching JPD with JQL: "${jql}"`);
    
    const result = await this.jpd.searchIssues(jql);
    const issues = result.issues;
    
    console.log(`Fetched ${issues.length} issues from JPD`);

    // Build map of JPD keys to GitHub issue numbers for cross-referencing
    const existingGithubIssues = await this.github.getSyncedIssues(this.githubOwner, this.githubRepo);
    const jpdToGithubMap = new Map<string, number>();
    for (const ghIssue of existingGithubIssues) {
      if (ghIssue.metadata?.jpd_id) {
        jpdToGithubMap.set(ghIssue.metadata.jpd_id, ghIssue.number);
      }
    }

    // Track detailed stats
    const stats = {
      created: [] as string[],
      updated: [] as string[],
      skippedWrongStatus: [] as string[],
      skippedUpToDate: [] as string[],
      errors: [] as {key: string, error: string}[]
    };

    for (const issue of issues) {
      try {
        const result = await this.processJpdIssue(issue, jpdToGithubMap, existingGithubIssues, stats);
      } catch (e: any) {
        stats.errors.push({ key: issue.key, error: e.message });
        this.logger.error(`Failed to process ${issue.key}: ${e.message}`);
      }
    }

    // Smart summary
    this.printJpdToGithubSummary(stats);
  }

  private printJpdToGithubSummary(stats: any) {
    const action = this.dryRun ? 'Would create' : 'Created';
    const actionUpdate = this.dryRun ? 'Would update' : 'Updated';

    console.log(`\nResults:`);
    
    // Show actionable items first
    if (stats.created.length > 0) {
      console.log(`${action}: ${stats.created.length}`);
      stats.created.slice(0, 5).forEach((key: string) => console.log(`   ${key}`));
      if (stats.created.length > 5) {
        console.log(`   ... and ${stats.created.length - 5} more`);
      }
    }

    if (stats.updated.length > 0) {
      console.log(`${actionUpdate}: ${stats.updated.length}`);
      stats.updated.slice(0, 5).forEach((key: string) => console.log(`   ${key}`));
      if (stats.updated.length > 5) {
        console.log(`   ... and ${stats.updated.length - 5} more`);
      }
    }

    // Skipped - with reasons (only show if something's interesting)
    const totalSkipped = stats.skippedWrongStatus.length + stats.skippedUpToDate.length;
    if (totalSkipped > 0) {
      // Don't show "already up-to-date" unless there were other changes or DEBUG
      if (stats.created.length === 0 && stats.updated.length === 0 && stats.skippedUpToDate.length > 0) {
        console.log(`✓ All synced issues up-to-date: ${stats.skippedUpToDate.length}`);
        this.logger.debug(`Issues: ${stats.skippedUpToDate.join(', ')}`);
      }
      
      if (stats.skippedWrongStatus.length > 0) {
        console.log(`Skipped (not in Epic/Story status): ${stats.skippedWrongStatus.length}`);
        console.log(`   💡 Move to "Impact" or "Ready for delivery" to sync`);
        this.logger.debug(`Issues: ${stats.skippedWrongStatus.join(', ')}`);
      }
    }

    // Errors
    if (stats.errors.length > 0) {
      console.log(`❌ Errors: ${stats.errors.length}`);
      stats.errors.slice(0, 3).forEach((e: any) => {
        console.log(`   ${e.key}: ${e.error}`);
      });
      if (stats.errors.length > 3) {
        console.log(`   ... and ${stats.errors.length - 3} more (enable DEBUG for details)`);
      }
    }

    console.log('');
  }

  private async processJpdIssue(
    issue: any,
    jpdToGithubMap: Map<string, number>,
    existingGithubIssues: any[],
    stats: any
  ): Promise<void> {
    // 1. Check if issue should be synced (only Epics and Stories, not raw Ideas)
    if (!this.statusHierarchy.shouldSync(issue)) {
      stats.skippedWrongStatus.push(issue.key);
      this.logger.debug(`${issue.key}: not in Epic/Story status (${issue.fields.status.name})`);
      return;
    }

    // 2. Determine hierarchy level
    const hierarchyLevel = this.statusHierarchy.getHierarchyLevel(issue);
    this.logger.debug(`${issue.key}: ${hierarchyLevel.name} (${issue.fields.status.name})`);

    // 3. Extract relationships
    const relationships = this.hierarchy.extractRelationships(issue);

    // 4. Calculate new state hash
    const syncData = {
        key: issue.key,
        updated: issue.fields.updated,
        summary: issue.fields.summary,
        status: issue.fields.status.name,
        parent: relationships.parent_jpd_key,
        hierarchy: hierarchyLevel.name
    };
    const newHash = DiffUtil.calculateHash(syncData);

    // 5. Check if already synced and up to date
    const match = existingGithubIssues.find(gh => gh.metadata?.jpd_id === issue.key);

    if (match && match.metadata?.sync_hash === newHash) {
      // Check if child checkbox states have changed (for parent issues with subtasks)
      if (relationships.child_jpd_keys && relationships.child_jpd_keys.length > 0) {
        const hasChildStateChange = relationships.child_jpd_keys.some(childKey => {
          const childGhNumber = jpdToGithubMap.get(childKey);
          if (!childGhNumber) return false;
          
          const childIssue = existingGithubIssues.find(gh => gh.number === childGhNumber);
          if (!childIssue) return false;
          
          // Check if child state differs from what's in parent's body
          const parentBody = match.body || '';
          const isChildClosed = childIssue.state === 'closed';
          const hasCheckedBox = parentBody.includes(`- [x] #${childGhNumber}`);
          const hasUncheckedBox = parentBody.includes(`- [ ] #${childGhNumber}`);
          
          // State mismatch: closed but not checked, or open but checked
          return (isChildClosed && !hasCheckedBox) || (!isChildClosed && !hasUncheckedBox);
        });
        
        if (!hasChildStateChange) {
          stats.skippedUpToDate.push(issue.key);
          return;
        }
        
        // Child checkbox state changed - proceed with update
        this.logger.debug(`${issue.key}: child checkbox state changed, updating`);
      } else {
        stats.skippedUpToDate.push(issue.key);
        return;
      }
    }

    // 3. Transform Fields
    const githubPayload: any = { labels: [] };
    
    // Mappings
    for (const mapping of this.config.mappings) {
      const value = await TransformerEngine.transform(mapping, issue);
      if (value !== undefined) {
        if (mapping.github === 'labels') {
            if (Array.isArray(value)) githubPayload.labels.push(...value);
            else githubPayload.labels.push(value);
        } else {
            githubPayload[mapping.github] = value;
        }
      }
    }

    // Status Mapping (optional if statuses not configured)
    if (this.config.statuses) {
        const statusName = issue.fields.status.name;
        const statusMap = this.config.statuses[statusName];
        if (statusMap) {
            if (statusMap.github_state) githubPayload.state = statusMap.github_state;
            // Project column update would go here (requires Projects API, omitted for MVP)
        }
    }

    // Type labels are now handled by field mappings (customfield_14385 → category)
    // No need for hierarchy-based labels here - avoids duplicates
    // Hierarchy tracking is done via hidden metadata only

    // Enhanced metadata - stores all machine data (IDs, hierarchy, etc.)
    const parentGithubNumber = relationships.parent_jpd_key ? 
      jpdToGithubMap.get(relationships.parent_jpd_key) : undefined;
    
    const metadata = {
        jpd_id: issue.key,
        jpd_updated: issue.fields.updated,
        last_sync: new Date().toISOString(),
        sync_hash: newHash,
        hierarchy: hierarchyLevel.name, // 'epic', 'story', etc.
        parent_jpd_id: relationships.parent_jpd_key,
        parent_github_issue: parentGithubNumber,
        child_jpd_ids: relationships.child_jpd_keys,
        original_link: `${process.env.JPD_BASE_URL}/browse/${issue.key}`
    };

    // Add relationship links to body (with existing GitHub issues for checkbox state)
    const relationshipsBody = this.hierarchy.buildRelationshipsBody(
      relationships,
      jpdToGithubMap,
      process.env.JPD_BASE_URL!,
      existingGithubIssues // Pass for checkbox state preservation
    );
    
    if (relationshipsBody) {
      githubPayload.body = (githubPayload.body || '') + relationshipsBody;
    }

    // 4. Create or Update
    let githubIssueNumber: number;
    
    if (match) {
        this.logger.debug(`${issue.key} → updating #${match.number}`);
        
        // Check if issue state changed to closed
        const wasClosed = match.state === 'closed';
        const willBeClosed = githubPayload.state === 'closed';
        
        await this.github.updateIssue(
            this.githubOwner,
            this.githubRepo,
            match.number,
            {
                ...githubPayload,
                jpdMetadata: metadata
            }
        );
        
        // If issue has a parent, ensure it's in the parent's task list
        // This handles cases where the parent relationship was added after creation
        if (parentGithubNumber) {
          this.logger.debug(`${issue.key} has parent #${parentGithubNumber}, ensuring in task list`);
          await this.github.ensureInParentTaskList(
            this.githubOwner,
            this.githubRepo,
            parentGithubNumber,
            match.number,
            issue.fields.summary,
            willBeClosed
          );
        }
        
        githubIssueNumber = match.number;
        stats.updated.push(issue.key);
    } else {
        this.logger.debug(`${issue.key} → creating new issue`);
        
        // Check if this issue has a parent - if so, create as sub-issue
        if (parentGithubNumber) {
          this.logger.debug(`${issue.key} has parent, creating as sub-issue of #${parentGithubNumber}`);
          githubIssueNumber = await this.github.createSubIssue(
            this.githubOwner,
            this.githubRepo,
            githubPayload.title || issue.fields.summary, // Fallback
            githubPayload.body || '', 
            githubPayload.labels,
            metadata,
            parentGithubNumber
          );
        } else {
          // No parent - create as regular issue
          githubIssueNumber = await this.github.createIssue(
            this.githubOwner,
            this.githubRepo,
            githubPayload.title || issue.fields.summary, // Fallback
            githubPayload.body || '', 
            githubPayload.labels,
            metadata
          );
        }
        
        // Add to JPD-to-GitHub map for future cross-references
        jpdToGithubMap.set(issue.key, githubIssueNumber);
        stats.created.push(issue.key);
    }

    // 5. Update GitHub Projects status (if enabled)
    await this.updateProjectStatus(issue, githubIssueNumber);
  }

  private async updateProjectStatus(jpdIssue: any, githubIssueNumber: number): Promise<void> {
    if (!this.projects || !this.config.projects?.enabled || !this.config.projects.project_number) {
      return;
    }

    const statusName = jpdIssue.fields.status.name;
    const statusMapping = this.config.statuses?.[statusName];
    
    if (!statusMapping?.github_project_status) {
      return;
    }

    try {
      // Get project info
      const project = await this.projects.getProjectByNumber(
        this.githubOwner,
        this.githubRepo,
        this.config.projects.project_number
      );

      if (!project) {
        this.logger.error(`Project #${this.config.projects.project_number} not found`);
        return;
      }

      // Find status column
      const targetColumn = project.columns.find(
        col => col.name === statusMapping.github_project_status
      );

      if (!targetColumn) {
        this.logger.error(`Column "${statusMapping.github_project_status}" not found in project`);
        return;
      }

      // Get or create project item
      let itemId = await this.projects.getIssueProjectItemId(
        project.id,
        githubIssueNumber,
        this.githubOwner,
        this.githubRepo
      );

      if (!itemId) {
        // Get issue node ID
        const issue = await this.github.getIssue(this.githubOwner, this.githubRepo, githubIssueNumber);
        itemId = await this.projects.addIssueToProject(project.id, issue.node_id);
      }

      if (!itemId) {
        this.logger.error(`Failed to add issue #${githubIssueNumber} to project`);
        return;
      }

      // Find status field
      const statusField = project.columns[0]; // First column represents status field
      
      if (!statusField) {
        this.logger.error(`No status field found in project #${this.config.projects.project_number}`);
        return;
      }
      
      // Update status
      await this.projects.updateIssueStatus(
        project.id,
        itemId,
        statusField.id,
        targetColumn.id
      );

      this.logger.info(`Updated issue #${githubIssueNumber} to column "${targetColumn.name}"`);
    } catch (error: any) {
      this.logger.error(`Failed to update project status: ${error.message}`);
    }
  }

  private async syncGithubToJpd() {
    Logger.section('GitHub → JPD Status Sync');
    const issues = await this.github.getSyncedIssues(this.githubOwner, this.githubRepo);

    console.log(`Checking ${issues.length} GitHub issues for status changes...`);

    const statusUpdates: Array<{key: string, from: string, to: string}> = [];
    const errors: Array<{key: string, error: string}> = [];

    for (const ghIssue of issues) {
        if (!ghIssue.metadata) continue;

        try {
          const result = await this.syncGithubIssueToJpd(ghIssue);
          if (result) {
            statusUpdates.push(result);
          }
        } catch (error: any) {
          errors.push({ key: ghIssue.metadata.jpd_id || `#${ghIssue.number}`, error: error.message });
          this.logger.error(`Failed to sync #${ghIssue.number}: ${error.message}`);
        }
    }
    
    const action = this.dryRun ? 'Would update' : 'Updated';

    console.log(`\nResults:`);
    if (statusUpdates.length > 0) {
      console.log(`✓ ${action}: ${statusUpdates.length}`);
      statusUpdates.forEach(update => {
        console.log(`   ${update.key}: ${update.from} → ${update.to}`);
      });
    } else {
      console.log(`✓ No status changes needed`);
    }

    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`);
      errors.slice(0, 3).forEach(e => {
        console.log(`   ${e.key}: ${e.error}`);
      });
      if (errors.length > 3) {
        console.log(`   ... and ${errors.length - 3} more (enable DEBUG for details)`);
      }
    }
    
    console.log('');
  }

  private async syncGithubIssueToJpd(ghIssue: any): Promise<{key: string, from: string, to: string} | null> {
    const jpdKey = ghIssue.metadata.jpd_id;
    if (!jpdKey) return null;

    // Build reverse status mapping (GitHub state/column -> JPD status)
    // Track multiple mappings to detect ambiguity
    const reverseStatusMap = new Map<string, string[]>();
    
    if (this.config.statuses) {
      for (const [jpdStatus, mapping] of Object.entries(this.config.statuses)) {
        if (mapping.github_state) {
          const key = `state:${mapping.github_state}`;
          if (!reverseStatusMap.has(key)) {
            reverseStatusMap.set(key, []);
          }
          reverseStatusMap.get(key)!.push(jpdStatus);
        }
        if (mapping.github_project_status) {
          const key = `column:${mapping.github_project_status}`;
          if (!reverseStatusMap.has(key)) {
            reverseStatusMap.set(key, []);
          }
          reverseStatusMap.get(key)!.push(jpdStatus);
        }
      }
    }

    // Determine target JPD status based on GitHub issue state
    let targetJpdStatus: string | undefined;

    // Try state mapping first (only if unambiguous)
    const stateKey = `state:${ghIssue.state}`;
    if (reverseStatusMap.has(stateKey)) {
      const mappings = reverseStatusMap.get(stateKey)!;
      if (mappings.length === 1) {
        // Unambiguous mapping
        targetJpdStatus = mappings[0];
      } else {
        // Ambiguous mapping (multiple JPD statuses map to same GitHub state)
        // Skip syncing to avoid incorrect status changes
        this.logger.debug(`Ambiguous mapping for #${ghIssue.number} state ${ghIssue.state}: ${mappings.join(', ')}`);
        return null;
      }
    }

    // Try project column mapping (requires Projects API query)
    if (!targetJpdStatus && this.projects && this.config.projects?.enabled) {
      const projectStatus = await this.getGitHubIssueProjectStatus(ghIssue.number);
      if (projectStatus) {
        const columnKey = `column:${projectStatus}`;
        if (reverseStatusMap.has(columnKey)) {
          const mappings = reverseStatusMap.get(columnKey)!;
          if (mappings.length === 1) {
            targetJpdStatus = mappings[0];
          } else {
            this.logger.debug(`Ambiguous column mapping for #${ghIssue.number}: ${mappings.join(', ')}`);
            return null;
          }
        }
      }
    }

    if (!targetJpdStatus) {
      this.logger.debug(`No status mapping found for #${ghIssue.number}`);
      return null;
    }

    // Get current JPD issue state
    const jpdIssue = await this.jpd.searchIssues(`key = ${jpdKey}`, ['status'], 1);
    if (jpdIssue.issues.length === 0 || !jpdIssue.issues[0]?.fields) {
      // JPD issue no longer exists - clean up stale metadata
      this.logger.info(`${jpdKey} no longer exists in JPD - removing stale metadata from #${ghIssue.number}`);
      await this.removeStaleMetadata(ghIssue.number);
      return null;
    }

    const currentJpdStatus = jpdIssue.issues[0].fields.status?.name;
    if (!currentJpdStatus) {
      this.logger.error(`${jpdKey} has no status field`);
      return null;
    }
    
    if (currentJpdStatus === targetJpdStatus) {
      this.logger.debug(`${jpdKey} already "${targetJpdStatus}"`);
      return null;
    }

    // Update JPD status (must use transitions API, not direct field update)
    if (!this.dryRun) {
      await this.jpd.transitionIssue(jpdKey, targetJpdStatus);
    }
    
    return {
      key: jpdKey,
      from: currentJpdStatus,
      to: targetJpdStatus
    };
  }

  /**
   * Remove stale JPD metadata from a GitHub issue
   * Called when the linked JPD issue no longer exists
   * 
   * Note: This runs even in dry-run mode because it's cleanup of broken data,
   * not creation of new sync data. Stale metadata causes errors and confusion.
   */
  private async removeStaleMetadata(githubIssueNumber: number): Promise<void> {
    try {
      // Get the current issue
      const issue = await this.github.getIssueByNumber(
        this.githubOwner,
        this.githubRepo,
        githubIssueNumber
      );

      if (!issue || !issue.body) return;

      // Check if metadata exists before trying to remove
      if (!issue.body.includes('jpd-sync-metadata')) {
        this.logger.debug(`#${githubIssueNumber} has no metadata, skipping cleanup`);
        return; // Already clean
      }

      // Remove the hidden sync metadata comment
      // Format: <!-- jpd-sync-metadata\n{...}\n-->
      const cleanBody = issue.body.replace(/<!--\s*jpd-sync-metadata[\s\S]*?-->/g, '').trim();

      // Debug: Check if the replacement actually worked
      const hadMetadata = issue.body.includes('jpd-sync-metadata');
      const hasMetadata = cleanBody.includes('jpd-sync-metadata');
      
      if (hadMetadata && hasMetadata) {
        this.logger.warn(`Regex failed to remove metadata from #${githubIssueNumber}!`);
        this.logger.debug(`Original length: ${issue.body.length}, Clean length: ${cleanBody.length}`);
        // Log first 200 chars to see the format
        this.logger.debug(`Metadata snippet: ${issue.body.substring(issue.body.indexOf('jpd-sync-metadata') - 20, issue.body.indexOf('jpd-sync-metadata') + 100)}`);
      }

      // Cleanup happens even in dry-run mode - call the cleanup method
      await this.github.cleanupStaleMetadata(
        this.githubOwner,
        this.githubRepo,
        githubIssueNumber,
        cleanBody
      );

      const mode = this.dryRun ? '[DRY RUN] ' : '';
      this.logger.info(`${mode}🧹 Cleaned stale metadata from #${githubIssueNumber}`);
    } catch (error: any) {
      this.logger.warn(`Failed to remove stale metadata from #${githubIssueNumber}: ${error.message}`);
    }
  }

  private async getGitHubIssueProjectStatus(issueNumber: number): Promise<string | null> {
    if (!this.projects || !this.config.projects?.project_number) {
      return null;
    }

    try {
      const project = await this.projects.getProjectByNumber(
        this.githubOwner,
        this.githubRepo,
        this.config.projects.project_number
      );

      if (!project) return null;

      const itemId = await this.projects.getIssueProjectItemId(
        project.id,
        issueNumber,
        this.githubOwner,
        this.githubRepo
      );

      if (!itemId) return null;

      // Would need additional GraphQL query to get current status value
      // For now, return null and rely on state-based sync
      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Create JPD issues from GitHub issues that don't have JPD metadata
   */
  private async createJpdFromGithub(): Promise<void> {
    Logger.section('GitHub → JPD Issue Creation');
    
    if (!this.config.github_to_jpd_creation?.enabled) {
      console.log('Skipped: GitHub → JPD creation not enabled\n');
      return;
    }

    // Get all GitHub issues
    const allIssues = await this.github.getAllIssues(this.githubOwner, this.githubRepo);
    
    // Filter to only issues WITHOUT JPD metadata (not yet synced)
    const unsyncedIssues = allIssues.filter(issue => {
      const body = issue.body || '';
      return !body.includes('<!-- jpd-sync-metadata');
    });

    console.log(`Found ${unsyncedIssues.length} GitHub issues without JPD links`);
    
    if (unsyncedIssues.length === 0) {
      console.log('✓ All GitHub issues already synced\n');
      return;
    }

    const created: Array<{github_number: number, jpd_key: string}> = [];
    const errors: Array<{github_number: number, error: string}> = [];

    for (const ghIssue of unsyncedIssues) {
      try {
        const jpdKey = await this.createJpdIssueFromGithub(ghIssue);
        if (jpdKey) {
          created.push({ github_number: ghIssue.number, jpd_key: jpdKey });
        }
      } catch (error: any) {
        errors.push({ github_number: ghIssue.number, error: error.message });
        this.logger.error(`Failed to create JPD issue from #${ghIssue.number}: ${error.message}`);
      }
    }

    const action = this.dryRun ? 'Would create' : 'Created';
    
    console.log(`\nResults:`);
    if (created.length > 0) {
      console.log(`✓ ${action}: ${created.length} JPD issues`);
      created.forEach(c => {
        console.log(`   #${c.github_number} → ${c.jpd_key}`);
      });
    }

    if (errors.length > 0) {
      console.log(`❌ Errors: ${errors.length}`);
      errors.slice(0, 3).forEach(e => {
        console.log(`   #${e.github_number}: ${e.error}`);
      });
      if (errors.length > 3) {
        console.log(`   ... and ${errors.length - 3} more (enable DEBUG for details)`);
      }
    }
    
    console.log('');
  }

  /**
   * Create a single JPD issue from a GitHub issue
   */
  private async createJpdIssueFromGithub(ghIssue: any): Promise<string | null> {
    const config = this.config.github_to_jpd_creation!;
    
    // Determine JPD category from GitHub labels
    let category = config.default_category;
    if (ghIssue.labels && ghIssue.labels.length > 0) {
      for (const label of ghIssue.labels) {
        const labelName = typeof label === 'string' ? label : label.name;
        if (config.label_to_category?.[labelName]) {
          category = config.label_to_category[labelName];
          break; // Use first matching label
        }
      }
    }

    // Parse parent GitHub issue from body (if it's a sub-issue)
    const parentGithubNumber = await this.github.getParentIssue(
      this.githubOwner,
      this.githubRepo,
      ghIssue.number
    );

    this.logger.debug(`Creating JPD issue from #${ghIssue.number}: category=${category}, parent=#${parentGithubNumber || 'none'}`);

    if (this.dryRun) {
      return `MTT-DRY-RUN-${ghIssue.number}`;
    }

    // Get project key
    const projectKey = this.extractProjectKey();
    if (!projectKey) {
      throw new Error('Could not determine JPD project key. Set JPD_PROJECT_KEY env var or use JQL with project filter.');
    }

    // Build JPD issue payload
    const payload: Record<string, any> = {
      fields: {
        project: { key: projectKey },
        summary: ghIssue.title,
        description: {
          type: 'doc',
          version: 1,
          content: [
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: ghIssue.body || 'Created from GitHub issue'
                }
              ]
            },
            {
              type: 'paragraph',
              content: [
                {
                  type: 'text',
                  text: `\nOriginal GitHub Issue: https://github.com/${this.githubOwner}/${this.githubRepo}/issues/${ghIssue.number}`,
                  marks: [{ type: 'em' }]
                }
              ]
            }
          ]
        },
        issuetype: { name: 'Idea' }
      }
    };

    // Add category field (configurable)
    const categoryFieldId = config.field_mappings?.category_field_id;
    if (category && categoryFieldId) {
      payload.fields[categoryFieldId] = { value: category };
      this.logger.debug(`Setting category field ${categoryFieldId} = ${category}`);
    } else if (category && !categoryFieldId) {
      this.logger.warn('Category label found but category_field_id not configured in github_to_jpd_creation.field_mappings');
    }

    // Add priority field (configurable)
    const priorityFieldId = config.field_mappings?.priority_field_id;
    if (config.default_priority && priorityFieldId) {
      payload.fields[priorityFieldId] = { value: config.default_priority };
      this.logger.debug(`Setting priority field ${priorityFieldId} = ${config.default_priority}`);
    } else if (config.default_priority && !priorityFieldId) {
      this.logger.warn('Default priority configured but priority_field_id not configured in github_to_jpd_creation.field_mappings');
    }

    // Create JPD issue
    const createResponse = await this.jpd.createIssue(payload);
    const jpdKey = createResponse.key;

    // Transition to configured status (if not default "Idea")
    if (config.default_status && config.default_status !== 'Idea') {
      try {
        const transitions = await this.jpd.getIssueTransitions(jpdKey);
        const transition = transitions.find((t: any) => t.to.name === config.default_status);
        if (transition) {
          await this.jpd.transitionIssue(jpdKey, transition.id);
          this.logger.debug(`Transitioned ${jpdKey} to ${config.default_status}`);
        } else {
          this.logger.warn(`No transition found to "${config.default_status}" for ${jpdKey}. Leaving in initial status.`);
        }
      } catch (error: any) {
        // Don't fail the entire creation if transition fails
        this.logger.warn(`Could not transition ${jpdKey} to ${config.default_status}: ${error.message}`);
      }
    }

    // Fetch the full issue to get updated timestamp and other fields
    const jpdIssue = await this.jpd.getIssue(jpdKey, ['updated']);

    // If this is a sub-issue in GitHub, link it to parent in JPD
    if (parentGithubNumber) {
      // Find the JPD key for the parent GitHub issue
      const parentGithubIssue = await this.github.getIssueByNumber(
        this.githubOwner,
        this.githubRepo,
        parentGithubNumber
      );
      
      if (parentGithubIssue?.metadata?.jpd_id) {
        const parentJpdKey = parentGithubIssue.metadata.jpd_id;
        this.logger.debug(`Linking ${jpdKey} to parent ${parentJpdKey} in JPD`);
        
        try {
          // Create parent link in JPD using issuelinks API
          await this.jpd.createIssueLink(jpdKey, parentJpdKey, 'relates to');
          this.logger.info(`✓ Linked ${jpdKey} → ${parentJpdKey} in JPD`);
        } catch (error: any) {
          this.logger.warn(`Could not create parent link in JPD: ${error.message}`);
        }
      } else {
        this.logger.warn(`Parent GitHub issue #${parentGithubNumber} has no JPD mapping, cannot create link`);
      }
    }

    // Update GitHub issue with JPD metadata
    const metadata = {
      jpd_id: jpdKey,
      jpd_updated: jpdIssue.fields.updated,
      sync_hash: '',
      hierarchy: category.toLowerCase(),
      original_link: `${process.env.JPD_BASE_URL}/browse/${jpdKey}`,
      created_from_github: true,
      github_issue_number: ghIssue.number,
      parent_github_issue: parentGithubNumber
    };

    const metadataComment = `\n\n<!-- jpd-sync-metadata\n${JSON.stringify(metadata, null, 2)}\n-->`;
    const updatedBody = (ghIssue.body || '') + metadataComment;

    await this.github.updateIssue(
      this.githubOwner,
      this.githubRepo,
      ghIssue.number,
      { body: updatedBody }
    );

    return jpdKey;
  }

  /**
   * Sync comments bidirectionally between JPD and GitHub
   */
  private async syncComments(): Promise<void> {
    Logger.section('Comment Sync');

    // Get all synced issues
    const githubIssues = await this.github.getSyncedIssues(this.githubOwner, this.githubRepo);

    let synced = 0;
    for (const ghIssue of githubIssues) {
      if (!ghIssue.metadata?.jpd_id) continue;

      try {
        const count = await this.syncIssueComments(ghIssue.metadata.jpd_id, ghIssue.number);
        synced += count;
      } catch (error: any) {
        // Check if this is a 404 (deleted JPD issue) and clean up
        if (error.message && error.message.includes('404')) {
          this.logger.info(`${ghIssue.metadata.jpd_id} no longer exists in JPD - removing stale metadata from #${ghIssue.number}`);
          await this.removeStaleMetadata(ghIssue.number);
        } else {
          this.logger.error(`Failed to sync comments for ${ghIssue.metadata.jpd_id}: ${error.message}`);
        }
      }
    }
    
    console.log(`\n${synced} comments synced\n`);
  }

  /**
   * Sync comments for a specific issue pair
   */
  private async syncIssueComments(jpdKey: string, githubIssueNumber: number): Promise<number> {
    // Fetch comments from both systems
    const [jpdComments, githubComments] = await Promise.all([
      this.jpd.getComments(jpdKey),
      this.github.getComments(this.githubOwner, this.githubRepo, githubIssueNumber)
    ]);

    // Parse comments to standardized format
    const parsedJpdComments = jpdComments.map(c => 
      CommentSyncManager.parseJpdComment(c, process.env.JPD_BASE_URL!)
    );
    const parsedGithubComments = githubComments.map(c => 
      CommentSyncManager.parseGitHubComment(c)
    );

    let count = 0;

    // Sync JPD → GitHub
    for (const jpdComment of parsedJpdComments) {
      if (CommentSyncManager.shouldSyncComment(jpdComment, parsedGithubComments)) {
        const formattedComment = CommentSyncManager.formatComment(jpdComment, 'github');
        
        this.logger.debug(`Syncing JPD comment to #${githubIssueNumber}`);
        
        if (!this.dryRun) {
          await this.github.addComment(
            this.githubOwner,
            this.githubRepo,
            githubIssueNumber,
            formattedComment
          );
        }
        count++;
      }
    }

    // Sync GitHub → JPD
    for (const githubComment of parsedGithubComments) {
      if (CommentSyncManager.shouldSyncComment(githubComment, parsedJpdComments)) {
        const formattedComment = CommentSyncManager.formatComment(githubComment, 'jpd');
        
        this.logger.debug(`Syncing GitHub comment to ${jpdKey}`);
        
        if (!this.dryRun) {
          await this.jpd.addComment(jpdKey, formattedComment);
        }
        count++;
      }
    }
    
    return count;
  }
}

