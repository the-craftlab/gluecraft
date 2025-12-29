import fetch, { type Response } from 'node-fetch';

export interface JpdIssue {
  id: string;
  key: string;
  fields: Record<string, any>;
  updated: string; // ISO date
}

export interface JpdSearchResult {
  issues: JpdIssue[];
  total: number;
}

export interface JpdClientConfig {
  baseUrl: string;
  email: string;
  apiToken: string;
}

export class JpdClient {
  private config: JpdClientConfig;

  constructor(config: JpdClientConfig) {
    this.config = config;
  }

  private get authHeader(): string {
    const authString = Buffer.from(`${this.config.email}:${this.config.apiToken}`).toString('base64');
    return `Basic ${authString}`;
  }

  private async fetch(endpoint: string, options: any = {}): Promise<Response> {
    const url = `${this.config.baseUrl}${endpoint}`;
    const headers = {
      'Authorization': this.authHeader,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...options.headers
    };

    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`JPD API Error ${response.status} on ${endpoint}: ${body}`);
    }

    return response;
  }

  async searchIssues(jql: string, fields: string[] = ['*all'], limit: number = 50): Promise<JpdSearchResult> {
    const issues: JpdIssue[] = [];
    let total = 0;
    let nextPageToken: string | undefined;

    do {
      // API endpoint changed from /rest/api/3/search to /rest/api/3/search/jql
      // This is a POST-only endpoint that uses nextPageToken for pagination
      const payload: any = {
        jql,
        maxResults: Math.min(limit - issues.length, 50), // Fetch only what we need, max 50 per page
        fields
      };
      
      if (nextPageToken) {
        payload.nextPageToken = nextPageToken;
      }

      const response = await this.fetch('/rest/api/3/search/jql', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const data = await response.json() as any;
      issues.push(...data.issues);
      total = data.total || issues.length; // Use total from API or fallback to count
      nextPageToken = data.nextPageToken;

    } while (nextPageToken && issues.length < limit); // Stop when we have enough!

    return { issues, total };
  }

  async updateIssue(key: string, fields: Record<string, any>): Promise<void> {
    await this.fetch(`/rest/api/3/issue/${key}`, {
      method: 'PUT',
      body: JSON.stringify({ fields })
    });
  }

  /**
   * Transition an issue to a new status
   * JPD requires using transitions API, not direct status field updates
   */
  async transitionIssue(key: string, targetStatus: string): Promise<void> {
    // Get available transitions
    const transitionsResponse = await this.fetch(`/rest/api/3/issue/${key}/transitions`);
    const transitionsData = await transitionsResponse.json() as any;
    
    // Find transition that leads to target status
    const transition = transitionsData.transitions?.find(
      (t: any) => t.to?.name === targetStatus
    );
    
    if (!transition) {
      throw new Error(`No valid transition found to status "${targetStatus}" for ${key}`);
    }
    
    // Execute transition
    await this.fetch(`/rest/api/3/issue/${key}/transitions`, {
      method: 'POST',
      body: JSON.stringify({
        transition: { id: transition.id }
      })
    });
  }

  /**
   * Create a new JPD issue
   */
  async createIssue(payload: Record<string, any>): Promise<any> {
    const response = await this.fetch(`/rest/api/3/issue`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    return await response.json();
  }

  /**
   * Get available transitions for an issue
   */
  async getIssueTransitions(key: string): Promise<any[]> {
    const response = await this.fetch(`/rest/api/3/issue/${key}/transitions`);
    const data = await response.json() as any;
    return data.transitions || [];
  }

  async getIssue(key: string, fields: string[] = ['*all']): Promise<JpdIssue> {
    const response = await this.fetch(`/rest/api/3/issue/${key}?fields=${fields.join(',')}`);
    return await response.json() as JpdIssue;
  }

  /**
   * Get comments for a JPD issue
   */
  async getComments(issueKey: string): Promise<any[]> {
    const response = await this.fetch(`/rest/api/3/issue/${issueKey}/comment`);
    const data = await response.json() as any;
    return data.comments || [];
  }

  /**
   * Add a comment to a JPD issue
   */
  async addComment(issueKey: string, commentBody: string): Promise<any> {
    const response = await this.fetch(`/rest/api/3/issue/${issueKey}/comment`, {
      method: 'POST',
      body: JSON.stringify({
        body: this.convertMarkdownToAdf(commentBody)
      })
    });
    return await response.json();
  }

  /**
   * Convert Markdown to Atlassian Document Format (ADF)
   * Simple conversion for basic formatting
   */
  private convertMarkdownToAdf(markdown: string): any {
    const paragraphs = markdown.split('\n\n').filter(p => p.trim());
    
    const content = paragraphs.map(para => {
      // Simple paragraph
      return {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: para.replace(/\*\*(.+?)\*\*/g, '$1') // Remove bold markers for simplicity
          }
        ]
      };
    });

    return {
      type: 'doc',
      version: 1,
      content
    };
  }

  /**
   * Create a link between two JPD issues
   * @param issueKey - The issue to link from (child)
   * @param parentKey - The issue to link to (parent)
   * @param linkType - Type of link (default: 'relates to')
   */
  async createIssueLink(issueKey: string, parentKey: string, linkType: string = 'relates to'): Promise<void> {
    // JPD uses the standard Jira issue link API
    await this.fetch('/rest/api/3/issueLink', {
      method: 'POST',
      body: JSON.stringify({
        type: {
          name: linkType
        },
        inwardIssue: {
          key: issueKey
        },
        outwardIssue: {
          key: parentKey
        }
      })
    });
  }
}

