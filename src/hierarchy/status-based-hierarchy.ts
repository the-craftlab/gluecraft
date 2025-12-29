/**
 * Status-Based Hierarchy Detection
 * 
 * In JPD, the hierarchy level is determined by the workflow status, not by issue type:
 * - "Epic Design" status = Epic level (high-level initiatives)
 * - "Backlog"/"Ready"/"In Progress"/"In Review" = Story level (ready for dev work)
 * - Tasks are created in GitHub by developers splitting stories
 */

export interface HierarchyLevel {
  name: 'epic' | 'story' | 'task' | 'idea';
  label_prefix?: string;
  github_issue_type?: string;
}

export class StatusBasedHierarchy {
  private epicStatuses: Set<string>;
  private storyStatuses: Set<string>;
  private taskStatuses: Set<string>;
  private config: any;
  
  constructor(config: any) {
    this.config = config;
    
    // Define which statuses map to which hierarchy levels
    this.epicStatuses = new Set(config?.hierarchy?.epic_statuses || ['Epic Design']);
    this.storyStatuses = new Set(config?.hierarchy?.story_statuses || [
      'Backlog',
      'Ready', 
      'In Progress',
      'In Review'
    ]);
    this.taskStatuses = new Set(config?.hierarchy?.task_statuses || []);
  }

  /**
   * Determine the hierarchy level based on JPD status
   */
  getHierarchyLevel(jpdIssue: any): HierarchyLevel {
    const status = jpdIssue.fields?.status?.name;
    
    if (!status) {
      return { name: 'idea' };
    }

    if (this.epicStatuses.has(status)) {
      return { 
        name: 'epic',
        label_prefix: 'epic',
        github_issue_type: 'Epic'
      };
    }

    if (this.storyStatuses.has(status)) {
      return { 
        name: 'story',
        label_prefix: 'story',
        github_issue_type: 'Story'
      };
    }

    if (this.taskStatuses.has(status)) {
      return { 
        name: 'task',
        label_prefix: 'task',
        github_issue_type: 'Task'
      };
    }

    // Default: treat as idea (not yet promoted to epic or story)
    return { name: 'idea' };
  }

  /**
   * Generate hierarchy label for an issue
   */
  generateHierarchyLabel(jpdIssue: any): string | null {
    const level = this.getHierarchyLevel(jpdIssue);
    
    if (level.name === 'epic' || level.name === 'story') {
      return `${level.label_prefix}:${jpdIssue.key}`;
    }

    return null;
  }

  /**
   * Check if an issue should be synced to GitHub
   * Checks both hierarchy level and status config sync flag
   */
  shouldSync(jpdIssue: any): boolean {
    const status = jpdIssue.fields?.status?.name;
    
    // Check if status has sync: false configured
    if (this.config?.statuses && status) {
      const statusConfig = this.config.statuses[status];
      if (statusConfig && statusConfig.sync === false) {
        return false;
      }
    }
    
    // Check hierarchy level (only sync Epics and Stories)
    const level = this.getHierarchyLevel(jpdIssue);
    return level.name === 'epic' || level.name === 'story';
  }

  /**
   * Generate type label based on hierarchy level
   */
  generateTypeLabel(jpdIssue: any): string {
    const level = this.getHierarchyLevel(jpdIssue);
    
    switch (level.name) {
      case 'epic':
        return 'type:epic';
      case 'story':
        return 'type:story';
      case 'task':
        return 'type:task';
      default:
        return 'type:idea';
    }
  }
}

