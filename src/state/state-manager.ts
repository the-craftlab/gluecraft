import { MetadataParser, type JpdSyncMetadata } from './metadata-parser.js';

export class StateManager {
  static getSyncState(issueBody: string): JpdSyncMetadata | null {
    return MetadataParser.parse(issueBody);
  }

  static createSyncState(
    currentBody: string, 
    jpdId: string, 
    jpdUpdated: string, 
    syncHash: string,
    parentJpdId?: string,
    originalLink?: string
  ): string {
    const metadata: JpdSyncMetadata = {
      jpd_id: jpdId,
      jpd_updated: jpdUpdated,
      last_sync: new Date().toISOString(),
      sync_hash: syncHash,
      parent_jpd_id: parentJpdId,
      original_link: originalLink
    };

    return MetadataParser.inject(currentBody, metadata);
  }

  /**
   * @deprecated No longer using visible labels for sync tracking
   * Sync state is tracked entirely via hidden metadata in issue body
   * These methods kept for backward compatibility only
   */
  static getSyncedLabel(jpdId?: string): string {
    return 'jpd-synced'; // Clean label, no ID
  }

  /**
   * @deprecated No longer using visible labels for sync tracking
   */
  static isSyncedLabel(label: string): boolean {
    return label === 'jpd-synced';
  }

  /**
   * Extract JPD ID from hidden metadata, not label
   */
  static extractIdFromMetadata(issueBody: string): string | null {
    const metadata = MetadataParser.parse(issueBody);
    return metadata?.jpd_id || null;
  }
}

