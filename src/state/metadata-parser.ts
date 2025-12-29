export interface JpdSyncMetadata {
  jpd_id: string;
  jpd_updated: string;
  last_sync: string;
  sync_hash: string;
  parent_jpd_id?: string | undefined;
  original_link?: string | undefined;
}

export class MetadataParser {
  private static readonly COMMENT_START = '<!-- jpd-sync-metadata';
  private static readonly COMMENT_END = '-->';

  static parse(body: string | undefined | null): JpdSyncMetadata | null {
    if (!body) return null;

    const startIdx = body.lastIndexOf(this.COMMENT_START);
    if (startIdx === -1) return null;

    const endIdx = body.indexOf(this.COMMENT_END, startIdx);
    if (endIdx === -1) return null;

    const jsonStr = body.substring(startIdx + this.COMMENT_START.length, endIdx).trim();
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse JPD metadata JSON', e);
      return null;
    }
  }

  static stringify(metadata: JpdSyncMetadata): string {
    return `${this.COMMENT_START}\n${JSON.stringify(metadata, null, 2)}\n${this.COMMENT_END}`;
  }

  static inject(body: string, metadata: JpdSyncMetadata): string {
    const comment = this.stringify(metadata);
    const existingMetadata = this.parse(body);

    if (existingMetadata) {
      // Replace existing comment
      const startIdx = body.lastIndexOf(this.COMMENT_START);
      const endIdx = body.indexOf(this.COMMENT_END, startIdx);
      return body.substring(0, startIdx) + comment + body.substring(endIdx + this.COMMENT_END.length);
    } else {
      // Append to end
      return (body || '') + '\n\n' + comment;
    }
  }
}

