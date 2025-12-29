/**
 * Comment Synchronization Manager
 * 
 * Handles bidirectional comment sync between JPD and GitHub with author attribution.
 * Since we can't do native author sync, comments are formatted with author references.
 * 
 * Format:
 * - JPD → GitHub: "**[@username](jpd-profile-url)** commented in JPD:\n\n[body]"
 * - GitHub → JPD: "**[@username](github-profile-url)** commented in GitHub:\n\n[body]"
 * 
 * Sync state is tracked using hidden markers in comment text to avoid duplicates.
 */

import { Logger } from '../utils/logger.js';
import crypto from 'crypto';

export interface Comment {
  id: string;
  author: {
    name: string;
    displayName?: string;
    profileUrl: string;
    avatarUrl?: string;
  };
  body: string;
  created: string;
  updated?: string;
  source: 'jpd' | 'github';
  sourceId: string; // Original comment ID
}

export interface CommentSyncMetadata {
  synced_from: 'jpd' | 'github';
  source_comment_id: string;
  sync_hash: string;
  synced_at: string;
}

export class CommentSyncManager {
  private static SYNC_MARKER_PREFIX = '<!-- comment-sync:';
  private static SYNC_MARKER_SUFFIX = '-->';

  /**
   * Format a comment for cross-posting with author attribution
   */
  static formatComment(comment: Comment, targetSystem: 'jpd' | 'github'): string {
    const authorLink = `[${comment.author.displayName || comment.author.name}](${comment.author.profileUrl})`;
    const sourceSystem = comment.source === 'jpd' ? 'JPD' : 'GitHub';
    
    let formattedBody = `**${authorLink}** commented in ${sourceSystem}:\n\n`;
    formattedBody += comment.body;
    
    // Add sync metadata marker (hidden in GitHub, visible in JPD as HTML comment)
    const metadata: CommentSyncMetadata = {
      synced_from: comment.source,
      source_comment_id: comment.sourceId,
      sync_hash: this.calculateHash(comment),
      synced_at: new Date().toISOString()
    };
    
    formattedBody += `\n\n${this.SYNC_MARKER_PREFIX}${JSON.stringify(metadata)}${this.SYNC_MARKER_SUFFIX}`;
    
    return formattedBody;
  }

  /**
   * Extract sync metadata from a comment
   */
  static extractSyncMetadata(commentBody: string): CommentSyncMetadata | null {
    const markerRegex = new RegExp(
      `${this.escapeRegex(this.SYNC_MARKER_PREFIX)}(.+?)${this.escapeRegex(this.SYNC_MARKER_SUFFIX)}`,
      's'
    );
    
    const match = commentBody.match(markerRegex);
    if (!match) return null;
    
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      Logger.error(`Failed to parse comment sync metadata: ${error}`);
      return null;
    }
  }

  /**
   * Check if a comment has already been synced
   */
  static isSyncedComment(commentBody: string): boolean {
    return this.extractSyncMetadata(commentBody) !== null;
  }

  /**
   * Calculate hash of comment content for change detection
   */
  static calculateHash(comment: Comment): string {
    const content = `${comment.author.name}:${comment.body}:${comment.created}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Check if a comment needs to be synced based on existing synced comments
   */
  static shouldSyncComment(
    comment: Comment,
    existingSyncedComments: Comment[]
  ): boolean {
    // Don't sync if it's already a synced comment
    if (this.isSyncedComment(comment.body)) {
      return false;
    }

    // Check if we've already synced this source comment
    const alreadySynced = existingSyncedComments.some(synced => {
      const metadata = this.extractSyncMetadata(synced.body);
      return metadata?.source_comment_id === comment.id;
    });

    return !alreadySynced;
  }

  /**
   * Parse JPD comment to standardized format
   */
  static parseJpdComment(jpdComment: any, jpdBaseUrl: string): Comment {
    const author = jpdComment.author || jpdComment.updateAuthor;
    
    return {
      id: jpdComment.id,
      author: {
        name: author.name || author.emailAddress,
        displayName: author.displayName,
        profileUrl: `${jpdBaseUrl}/people/${author.accountId}`,
        avatarUrl: author.avatarUrls?.['48x48']
      },
      body: this.convertJiraTextToMarkdown(jpdComment.body),
      created: jpdComment.created,
      updated: jpdComment.updated,
      source: 'jpd',
      sourceId: jpdComment.id
    };
  }

  /**
   * Parse GitHub comment to standardized format
   */
  static parseGitHubComment(githubComment: any): Comment {
    return {
      id: String(githubComment.id),
      author: {
        name: githubComment.user.login,
        displayName: githubComment.user.name || githubComment.user.login,
        profileUrl: githubComment.user.html_url,
        avatarUrl: githubComment.user.avatar_url
      },
      body: githubComment.body,
      created: githubComment.created_at,
      updated: githubComment.updated_at,
      source: 'github',
      sourceId: String(githubComment.id)
    };
  }

  /**
   * Convert Jira's Atlassian Document Format (ADF) to Markdown
   */
  static convertJiraTextToMarkdown(jiraBody: any): string {
    // If it's already a string, return it
    if (typeof jiraBody === 'string') {
      return jiraBody;
    }

    // If it's ADF (Atlassian Document Format)
    if (jiraBody?.type === 'doc' && jiraBody?.content) {
      return this.convertAdfToMarkdown(jiraBody.content);
    }

    // Fallback
    return JSON.stringify(jiraBody);
  }

  /**
   * Convert ADF content to Markdown
   */
  private static convertAdfToMarkdown(content: any[]): string {
    let markdown = '';

    for (const node of content) {
      switch (node.type) {
        case 'paragraph':
          markdown += this.convertAdfInlineNodes(node.content || []) + '\n\n';
          break;
        
        case 'heading':
          const level = node.attrs?.level || 1;
          markdown += '#'.repeat(level) + ' ' + this.convertAdfInlineNodes(node.content || []) + '\n\n';
          break;
        
        case 'bulletList':
          for (const item of node.content || []) {
            markdown += '- ' + this.convertAdfInlineNodes(item.content?.[0]?.content || []) + '\n';
          }
          markdown += '\n';
          break;
        
        case 'orderedList':
          let num = 1;
          for (const item of node.content || []) {
            markdown += `${num}. ` + this.convertAdfInlineNodes(item.content?.[0]?.content || []) + '\n';
            num++;
          }
          markdown += '\n';
          break;
        
        case 'codeBlock':
          const language = node.attrs?.language || '';
          markdown += '```' + language + '\n';
          markdown += this.convertAdfInlineNodes(node.content || []);
          markdown += '\n```\n\n';
          break;
        
        default:
          // Unknown node type, try to extract text
          if (node.content) {
            markdown += this.convertAdfInlineNodes(node.content) + '\n\n';
          }
      }
    }

    return markdown.trim();
  }

  /**
   * Convert ADF inline nodes (text, links, formatting) to Markdown
   */
  private static convertAdfInlineNodes(nodes: any[]): string {
    let text = '';

    for (const node of nodes) {
      if (node.type === 'text') {
        let nodeText = node.text || '';
        
        // Apply marks (formatting)
        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case 'strong':
                nodeText = `**${nodeText}**`;
                break;
              case 'em':
                nodeText = `*${nodeText}*`;
                break;
              case 'code':
                nodeText = `\`${nodeText}\``;
                break;
              case 'link':
                nodeText = `[${nodeText}](${mark.attrs?.href || ''})`;
                break;
            }
          }
        }
        
        text += nodeText;
      } else if (node.type === 'hardBreak') {
        text += '\n';
      } else if (node.content) {
        text += this.convertAdfInlineNodes(node.content);
      }
    }

    return text;
  }

  /**
   * Escape special regex characters
   */
  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

