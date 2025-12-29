import { describe, it, expect } from 'vitest';
import { MetadataParser } from '../../src/state/metadata-parser.js';

describe('MetadataParser', () => {
  const sampleMetadata = {
    jpd_id: 'DKP-123',
    jpd_updated: '2025-01-01T12:00:00Z',
    last_sync: '2025-01-01T12:05:00Z',
    sync_hash: 'abc123'
  };

  it('should parse valid metadata comment', () => {
    const body = `
    Some issue content
    
    <!-- jpd-sync-metadata
    ${JSON.stringify(sampleMetadata)}
    -->
    `;
    
    const parsed = MetadataParser.parse(body);
    expect(parsed).toEqual(sampleMetadata);
  });

  it('should return null if no metadata comment', () => {
    const body = 'Just regular text';
    expect(MetadataParser.parse(body)).toBeNull();
  });

  it('should inject metadata into body without existing metadata', () => {
    const body = 'Original content';
    const newBody = MetadataParser.inject(body, sampleMetadata);
    
    expect(newBody).toContain('Original content');
    expect(newBody).toContain('<!-- jpd-sync-metadata');
    expect(newBody).toContain('DKP-123');
  });

  it('should replace existing metadata', () => {
    const originalBody = MetadataParser.inject('Content', { ...sampleMetadata, sync_hash: 'old' });
    const updatedBody = MetadataParser.inject(originalBody, { ...sampleMetadata, sync_hash: 'new' });
    
    expect(updatedBody).toContain('"sync_hash": "new"');
    expect(updatedBody).not.toContain('"sync_hash": "old"');
    // Should still contain original content
    expect(updatedBody).toContain('Content');
    // Should typically only have one metadata block
    const matches = updatedBody.match(/<!-- jpd-sync-metadata/g);
    expect(matches?.length).toBe(1);
  });
});

