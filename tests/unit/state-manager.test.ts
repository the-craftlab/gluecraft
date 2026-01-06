/**
 * Unit tests for StateManager and MetadataParser
 * 
 * Tests state extraction, injection, and recovery from GitHub issue bodies.
 * Critical for preventing data corruption and duplicate issues.
 * 
 * @group unit
 * @group state
 */

import { describe, it, expect } from 'vitest';
import { StateManager } from '../../src/state/state-manager.js';
import { MetadataParser, type JpdSyncMetadata } from '../../src/state/metadata-parser.js';

describe('MetadataParser', () => {
  describe('parse - Extract Metadata', () => {
    it('should extract valid JSON metadata from HTML comment', () => {
      const body = `
# Test Issue

Some content here.

<!-- jpd-sync-metadata
{
  "jpd_id": "MTT-123",
  "jpd_updated": "2024-06-01T10:00:00Z",
  "last_sync": "2024-06-01T10:05:00Z",
  "sync_hash": "abc123"
}
-->`;

      const metadata = MetadataParser.parse(body);

      expect(metadata).toBeDefined();
      expect(metadata?.jpd_id).toBe('MTT-123');
      expect(metadata?.jpd_updated).toBe('2024-06-01T10:00:00Z');
      expect(metadata?.last_sync).toBe('2024-06-01T10:05:00Z');
      expect(metadata?.sync_hash).toBe('abc123');
    });

    it('should return null for missing metadata', () => {
      const body = `# Test Issue

No metadata here.`;

      const metadata = MetadataParser.parse(body);

      expect(metadata).toBeNull();
    });

    it('should handle corrupted JSON gracefully', () => {
      const body = `
# Test Issue

<!-- jpd-sync-metadata
{ broken json here
-->`;

      const metadata = MetadataParser.parse(body);

      expect(metadata).toBeNull();
    });

    it('should extract metadata with escaped characters', () => {
      const body = `
# Test Issue

<!-- jpd-sync-metadata
{
  "jpd_id": "MTT-123",
  "jpd_updated": "2024-06-01T10:00:00Z",
  "last_sync": "2024-06-01T10:05:00Z",
  "sync_hash": "abc123",
  "original_link": "https://example.com/issue?id=123&status=open"
}
-->`;

      const metadata = MetadataParser.parse(body);

      expect(metadata).toBeDefined();
      expect(metadata?.original_link).toBe('https://example.com/issue?id=123&status=open');
    });

    it('should extract metadata with optional fields', () => {
      const body = `
# Test Issue

<!-- jpd-sync-metadata
{
  "jpd_id": "MTT-123",
  "jpd_updated": "2024-06-01T10:00:00Z",
  "last_sync": "2024-06-01T10:05:00Z",
  "sync_hash": "abc123",
  "parent_jpd_id": "MTT-100",
  "original_link": "https://example.com/issue/123"
}
-->`;

      const metadata = MetadataParser.parse(body);

      expect(metadata).toBeDefined();
      expect(metadata?.parent_jpd_id).toBe('MTT-100');
      expect(metadata?.original_link).toBe('https://example.com/issue/123');
    });

    it('should handle empty body', () => {
      const metadata = MetadataParser.parse('');

      expect(metadata).toBeNull();
    });

    it('should handle null body', () => {
      const metadata = MetadataParser.parse(null);

      expect(metadata).toBeNull();
    });

    it('should handle undefined body', () => {
      const metadata = MetadataParser.parse(undefined);

      expect(metadata).toBeNull();
    });

    it('should extract metadata from end of very long body', () => {
      const longContent = 'A'.repeat(10000);
      const body = `${longContent}

<!-- jpd-sync-metadata
{
  "jpd_id": "MTT-123",
  "jpd_updated": "2024-06-01T10:00:00Z",
  "last_sync": "2024-06-01T10:05:00Z",
  "sync_hash": "abc123"
}
-->`;

      const metadata = MetadataParser.parse(body);

      expect(metadata).toBeDefined();
      expect(metadata?.jpd_id).toBe('MTT-123');
    });

    it('should handle body with multiple HTML comments', () => {
      const body = `
# Test Issue

<!-- Some other comment -->
Regular content here.
<!-- Another comment -->

<!-- jpd-sync-metadata
{
  "jpd_id": "MTT-123",
  "jpd_updated": "2024-06-01T10:00:00Z",
  "last_sync": "2024-06-01T10:05:00Z",
  "sync_hash": "abc123"
}
-->`;

      const metadata = MetadataParser.parse(body);

      expect(metadata).toBeDefined();
      expect(metadata?.jpd_id).toBe('MTT-123');
    });

    it('should extract last metadata if multiple exist (should not happen)', () => {
      const body = `
<!-- jpd-sync-metadata
{
  "jpd_id": "MTT-OLD",
  "jpd_updated": "2024-05-01T10:00:00Z",
  "last_sync": "2024-05-01T10:05:00Z",
  "sync_hash": "old123"
}
-->

<!-- jpd-sync-metadata
{
  "jpd_id": "MTT-NEW",
  "jpd_updated": "2024-06-01T10:00:00Z",
  "last_sync": "2024-06-01T10:05:00Z",
  "sync_hash": "new123"
}
-->`;

      const metadata = MetadataParser.parse(body);

      expect(metadata).toBeDefined();
      expect(metadata?.jpd_id).toBe('MTT-NEW'); // Should get last one
    });
  });

  describe('stringify - Format Metadata', () => {
    it('should format metadata as HTML comment with JSON', () => {
      const metadata: JpdSyncMetadata = {
        jpd_id: 'MTT-123',
        jpd_updated: '2024-06-01T10:00:00Z',
        last_sync: '2024-06-01T10:05:00Z',
        sync_hash: 'abc123'
      };

      const formatted = MetadataParser.stringify(metadata);

      expect(formatted).toContain('<!-- jpd-sync-metadata');
      expect(formatted).toContain('-->');
      expect(formatted).toContain('"jpd_id": "MTT-123"');
      expect(formatted).toContain('"sync_hash": "abc123"');
    });

    it('should format metadata with optional fields', () => {
      const metadata: JpdSyncMetadata = {
        jpd_id: 'MTT-123',
        jpd_updated: '2024-06-01T10:00:00Z',
        last_sync: '2024-06-01T10:05:00Z',
        sync_hash: 'abc123',
        parent_jpd_id: 'MTT-100',
        original_link: 'https://example.com'
      };

      const formatted = MetadataParser.stringify(metadata);

      expect(formatted).toContain('"parent_jpd_id": "MTT-100"');
      expect(formatted).toContain('"original_link": "https://example.com"');
    });

    it('should format with pretty-print (2-space indent)', () => {
      const metadata: JpdSyncMetadata = {
        jpd_id: 'MTT-123',
        jpd_updated: '2024-06-01T10:00:00Z',
        last_sync: '2024-06-01T10:05:00Z',
        sync_hash: 'abc123'
      };

      const formatted = MetadataParser.stringify(metadata);

      // Should have newlines and indentation
      expect(formatted.split('\n').length).toBeGreaterThan(3);
      expect(formatted).toMatch(/\n  "/); // 2-space indent
    });
  });

  describe('inject - Inject/Update Metadata', () => {
    it('should inject metadata as HTML comment at end of body', () => {
      const body = '# Test Issue\n\nSome content here.';
      const metadata: JpdSyncMetadata = {
        jpd_id: 'MTT-123',
        jpd_updated: '2024-06-01T10:00:00Z',
        last_sync: '2024-06-01T10:05:00Z',
        sync_hash: 'abc123'
      };

      const newBody = MetadataParser.inject(body, metadata);

      expect(newBody).toContain('# Test Issue');
      expect(newBody).toContain('Some content here.');
      expect(newBody).toContain('<!-- jpd-sync-metadata');
      expect(newBody).toContain('"jpd_id": "MTT-123"');
      expect(newBody.indexOf('<!--')).toBeGreaterThan(body.length);
    });

    it('should preserve existing body content when injecting', () => {
      const body = `# Test Issue

## Description
This is important content.

- Item 1
- Item 2

**Bold text**`;

      const metadata: JpdSyncMetadata = {
        jpd_id: 'MTT-123',
        jpd_updated: '2024-06-01T10:00:00Z',
        last_sync: '2024-06-01T10:05:00Z',
        sync_hash: 'abc123'
      };

      const newBody = MetadataParser.inject(body, metadata);

      expect(newBody).toContain('# Test Issue');
      expect(newBody).toContain('## Description');
      expect(newBody).toContain('This is important content.');
      expect(newBody).toContain('- Item 1');
      expect(newBody).toContain('**Bold text**');
    });

    it('should not duplicate metadata on re-injection', () => {
      const body = `# Test Issue

<!-- jpd-sync-metadata
{
  "jpd_id": "MTT-123",
  "jpd_updated": "2024-06-01T10:00:00Z",
  "last_sync": "2024-06-01T10:05:00Z",
  "sync_hash": "old123"
}
-->`;

      const metadata: JpdSyncMetadata = {
        jpd_id: 'MTT-123',
        jpd_updated: '2024-06-02T10:00:00Z',
        last_sync: '2024-06-02T10:05:00Z',
        sync_hash: 'new123'
      };

      const newBody = MetadataParser.inject(body, metadata);

      // Should only have one metadata comment
      const matches = newBody.match(/<!-- jpd-sync-metadata/g);
      expect(matches).toHaveLength(1);
      
      // Should have new sync_hash
      expect(newBody).toContain('"sync_hash": "new123"');
      expect(newBody).not.toContain('"sync_hash": "old123"');
    });

    it('should update existing metadata without changing body', () => {
      const body = `# Test Issue

Some content here.

<!-- jpd-sync-metadata
{
  "jpd_id": "MTT-123",
  "jpd_updated": "2024-06-01T10:00:00Z",
  "last_sync": "2024-06-01T10:05:00Z",
  "sync_hash": "old123"
}
-->`;

      const metadata: JpdSyncMetadata = {
        jpd_id: 'MTT-123',
        jpd_updated: '2024-06-02T10:00:00Z',
        last_sync: '2024-06-02T10:05:00Z',
        sync_hash: 'new123'
      };

      const newBody = MetadataParser.inject(body, metadata);

      expect(newBody).toContain('# Test Issue');
      expect(newBody).toContain('Some content here.');
      expect(newBody).toContain('"sync_hash": "new123"');
    });

    it('should handle empty body', () => {
      const metadata: JpdSyncMetadata = {
        jpd_id: 'MTT-123',
        jpd_updated: '2024-06-01T10:00:00Z',
        last_sync: '2024-06-01T10:05:00Z',
        sync_hash: 'abc123'
      };

      const newBody = MetadataParser.inject('', metadata);

      expect(newBody).toContain('<!-- jpd-sync-metadata');
      expect(newBody).toContain('"jpd_id": "MTT-123"');
    });

    it('should handle body with only metadata', () => {
      const body = `<!-- jpd-sync-metadata
{
  "jpd_id": "MTT-123",
  "jpd_updated": "2024-06-01T10:00:00Z",
  "last_sync": "2024-06-01T10:05:00Z",
  "sync_hash": "old123"
}
-->`;

      const metadata: JpdSyncMetadata = {
        jpd_id: 'MTT-123',
        jpd_updated: '2024-06-02T10:00:00Z',
        last_sync: '2024-06-02T10:05:00Z',
        sync_hash: 'new123'
      };

      const newBody = MetadataParser.inject(body, metadata);

      expect(newBody).toContain('"sync_hash": "new123"');
      const matches = newBody.match(/<!-- jpd-sync-metadata/g);
      expect(matches).toHaveLength(1);
    });

    it('should handle special characters in metadata', () => {
      const body = '# Test Issue';
      const metadata: JpdSyncMetadata = {
        jpd_id: 'MTT-123',
        jpd_updated: '2024-06-01T10:00:00Z',
        last_sync: '2024-06-01T10:05:00Z',
        sync_hash: 'abc123',
        original_link: 'https://example.com?id=123&foo=bar'
      };

      const newBody = MetadataParser.inject(body, metadata);
      const extracted = MetadataParser.parse(newBody);

      expect(extracted?.original_link).toBe('https://example.com?id=123&foo=bar');
    });

    it('should handle Unicode in metadata', () => {
      const body = '# Test Issue';
      const metadata: JpdSyncMetadata = {
        jpd_id: 'MTT-123',
        jpd_updated: '2024-06-01T10:00:00Z',
        last_sync: '2024-06-01T10:05:00Z',
        sync_hash: 'abc123',
        original_link: 'https://example.com/测试'
      };

      const newBody = MetadataParser.inject(body, metadata);
      const extracted = MetadataParser.parse(newBody);

      expect(extracted?.original_link).toBe('https://example.com/测试');
    });
  });

  describe('Round-trip - Inject and Parse', () => {
    it('should successfully round-trip metadata', () => {
      const originalBody = '# Test Issue\n\nContent here.';
      const originalMetadata: JpdSyncMetadata = {
        jpd_id: 'MTT-123',
        jpd_updated: '2024-06-01T10:00:00Z',
        last_sync: '2024-06-01T10:05:00Z',
        sync_hash: 'abc123',
        parent_jpd_id: 'MTT-100',
        original_link: 'https://example.com'
      };

      const newBody = MetadataParser.inject(originalBody, originalMetadata);
      const extractedMetadata = MetadataParser.parse(newBody);

      expect(extractedMetadata).toEqual(originalMetadata);
    });
  });
});

describe('StateManager', () => {
  describe('getSyncState', () => {
    it('should get sync state from issue body', () => {
      const body = `# Test Issue

<!-- jpd-sync-metadata
{
  "jpd_id": "MTT-123",
  "jpd_updated": "2024-06-01T10:00:00Z",
  "last_sync": "2024-06-01T10:05:00Z",
  "sync_hash": "abc123"
}
-->`;

      const state = StateManager.getSyncState(body);

      expect(state).toBeDefined();
      expect(state?.jpd_id).toBe('MTT-123');
    });

    it('should return null for issue without sync state', () => {
      const body = '# Test Issue\n\nNo metadata here.';

      const state = StateManager.getSyncState(body);

      expect(state).toBeNull();
    });
  });

  describe('createSyncState', () => {
    it('should create sync state with required fields', () => {
      const currentBody = '# Test Issue\n\nContent here.';
      
      const newBody = StateManager.createSyncState(
        currentBody,
        'MTT-123',
        '2024-06-01T10:00:00Z',
        'abc123'
      );

      expect(newBody).toContain('# Test Issue');
      expect(newBody).toContain('<!-- jpd-sync-metadata');
      expect(newBody).toContain('"jpd_id": "MTT-123"');
      expect(newBody).toContain('"sync_hash": "abc123"');
      expect(newBody).toContain('"last_sync"');
    });

    it('should create sync state with optional fields', () => {
      const currentBody = '# Test Issue';
      
      const newBody = StateManager.createSyncState(
        currentBody,
        'MTT-123',
        '2024-06-01T10:00:00Z',
        'abc123',
        'MTT-100',
        'https://example.com'
      );

      const metadata = MetadataParser.parse(newBody);
      expect(metadata?.parent_jpd_id).toBe('MTT-100');
      expect(metadata?.original_link).toBe('https://example.com');
    });

    it('should set last_sync to current timestamp', () => {
      const beforeTime = new Date().toISOString();
      const currentBody = '# Test Issue';
      
      const newBody = StateManager.createSyncState(
        currentBody,
        'MTT-123',
        '2024-06-01T10:00:00Z',
        'abc123'
      );

      const afterTime = new Date().toISOString();
      const metadata = MetadataParser.parse(newBody);
      
      expect(metadata?.last_sync).toBeDefined();
      expect(metadata!.last_sync >= beforeTime).toBe(true);
      expect(metadata!.last_sync <= afterTime).toBe(true);
    });
  });

  describe('extractIdFromMetadata', () => {
    it('should extract JPD ID from metadata', () => {
      const body = `# Test Issue

<!-- jpd-sync-metadata
{
  "jpd_id": "MTT-123",
  "jpd_updated": "2024-06-01T10:00:00Z",
  "last_sync": "2024-06-01T10:05:00Z",
  "sync_hash": "abc123"
}
-->`;

      const id = StateManager.extractIdFromMetadata(body);

      expect(id).toBe('MTT-123');
    });

    it('should return null when no metadata exists', () => {
      const body = '# Test Issue\n\nNo metadata.';

      const id = StateManager.extractIdFromMetadata(body);

      expect(id).toBeNull();
    });
  });

  describe('Deprecated Label Methods', () => {
    it('should return clean synced label', () => {
      const label = StateManager.getSyncedLabel();

      expect(label).toBe('jpd-synced');
    });

    it('should identify synced label', () => {
      expect(StateManager.isSyncedLabel('jpd-synced')).toBe(true);
      expect(StateManager.isSyncedLabel('other-label')).toBe(false);
    });
  });
});
