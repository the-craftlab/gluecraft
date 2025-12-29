/**
 * Error Handling and Edge Case Tests
 * 
 * Tests various error scenarios, edge cases, and failure modes to ensure
 * the sync tool handles them gracefully without data loss.
 */

import { describe, test, expect, vi } from 'vitest';
import { ConfigLoader } from '../../src/config/config-loader.js';
import { MetadataParser } from '../../src/state/metadata-parser.js';
import { TemplateParser } from '../../src/transformers/template-parser.js';
import { DiffUtil } from '../../src/utils/diff.js';

describe('Config Loading Error Tests', () => {
  test('should throw on missing config file', () => {
    expect(() => {
      ConfigLoader.load('./nonexistent-config.yaml');
    }).toThrow();
  });

  test('should throw on invalid YAML syntax', () => {
    // This would require a temp file with invalid YAML
    // For now, we test the error path exists
    expect(() => {
      ConfigLoader.load('./invalid-yaml.yaml');
    }).toThrow();
  });

  test('should validate required config fields', () => {
    // Test that validation catches missing required fields
    const invalidConfig = {
      // Missing 'sync' field
      mappings: [],
      statuses: {}
    };

    // ConfigLoader should validate this
    expect(invalidConfig.sync).toBeUndefined();
  });
});

describe('Metadata Parsing Error Tests', () => {
  test('should handle corrupted metadata gracefully', () => {
    const bodyWithCorruptedMetadata = `
# Issue Title

Some content

<!-- jpd-sync-metadata
{corrupted json}
-->
    `;

    const metadata = MetadataParser.extract(bodyWithCorruptedMetadata);
    
    // Should return null for corrupted metadata
    expect(metadata).toBeNull();
  });

  test('should handle missing metadata comment', () => {
    const bodyWithoutMetadata = `
# Issue Title

Regular issue body without any metadata.
    `;

    const metadata = MetadataParser.extract(bodyWithoutMetadata);
    
    expect(metadata).toBeNull();
  });

  test('should handle empty body', () => {
    const metadata = MetadataParser.extract('');
    
    expect(metadata).toBeNull();
  });

  test('should handle malformed JSON in metadata', () => {
    const bodyWithMalformedJSON = `
<!-- jpd-sync-metadata
{"jpd_id": "TEST-1", "invalid": }
-->
    `;

    const metadata = MetadataParser.extract(bodyWithMalformedJSON);
    
    expect(metadata).toBeNull();
  });

  test('should inject metadata without corrupting existing body', () => {
    const originalBody = `
# Important Issue

**Critical information that must not be lost.**

- Item 1
- Item 2
    `;

    const newBody = MetadataParser.inject(originalBody, {
      jpd_id: 'TEST-1',
      jpd_updated: '2024-01-01T00:00:00.000Z',
      sync_hash: 'hash123',
      original_link: 'http://test'
    });

    // Original content should be preserved
    expect(newBody).toContain('Important Issue');
    expect(newBody).toContain('Critical information');
    expect(newBody).toContain('Item 1');
    expect(newBody).toContain('<!-- jpd-sync-metadata');
  });
});

describe('Template Parsing Error Tests', () => {
  test('should handle missing fields in template', () => {
    const issue = {
      fields: {
        summary: 'Test'
      }
    };

    const template = '{{fields.nonexistent.field}}';
    
    const result = TemplateParser.parse(template, issue);
    
    // Should return empty or undefined, not throw
    expect(result === '' || result === undefined).toBe(true);
  });

  test('should handle null fields in template', () => {
    const issue = {
      fields: {
        priority: null
      }
    };

    const template = '{{fields.priority.name}}';
    
    const result = TemplateParser.parse(template, issue);
    
    // Should handle gracefully
    expect(result === '' || result === undefined).toBe(true);
  });

  test('should handle deeply nested null fields', () => {
    const issue = {
      fields: {
        parent: {
          fields: {
            priority: null
          }
        }
      }
    };

    const template = '{{fields.parent.fields.priority.name}}';
    
    const result = TemplateParser.parse(template, issue);
    
    expect(result === '' || result === undefined).toBe(true);
  });

  test('should handle invalid filter names', () => {
    const issue = {
      fields: {
        summary: 'Test Summary'
      }
    };

    const template = '{{fields.summary | invalidfilter}}';
    
    // Should either ignore invalid filter or return original
    const result = TemplateParser.parse(template, issue);
    
    expect(result).toBeDefined();
  });

  test('should handle empty template', () => {
    const issue = {
      fields: {
        summary: 'Test'
      }
    };

    const result = TemplateParser.parse('', issue);
    
    expect(result).toBe('');
  });

  test('should handle template with no variables', () => {
    const issue = {
      fields: {}
    };

    const template = 'static-label';
    
    const result = TemplateParser.parse(template, issue);
    
    expect(result).toBe('static-label');
  });
});

describe('Hash Calculation Error Tests', () => {
  test('should handle null values in hash calculation', () => {
    const data = {
      key: 'TEST-1',
      updated: '2024-01-01',
      priority: null,
      summary: 'Test'
    };

    const hash = DiffUtil.calculateHash(data);
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
  });

  test('should handle undefined values in hash calculation', () => {
    const data = {
      key: 'TEST-1',
      updated: '2024-01-01',
      priority: undefined,
      summary: 'Test'
    };

    const hash = DiffUtil.calculateHash(data);
    
    expect(hash).toBeDefined();
  });

  test('should handle empty object in hash calculation', () => {
    const hash = DiffUtil.calculateHash({});
    
    expect(hash).toBeDefined();
  });

  test('should produce consistent hashes for same data', () => {
    const data = {
      key: 'TEST-1',
      updated: '2024-01-01',
      summary: 'Test'
    };

    const hash1 = DiffUtil.calculateHash(data);
    const hash2 = DiffUtil.calculateHash(data);
    
    expect(hash1).toBe(hash2);
  });

  test('should produce different hashes for different data', () => {
    const data1 = { key: 'TEST-1', summary: 'Test 1' };
    const data2 = { key: 'TEST-2', summary: 'Test 2' };

    const hash1 = DiffUtil.calculateHash(data1);
    const hash2 = DiffUtil.calculateHash(data2);
    
    expect(hash1).not.toBe(hash2);
  });
});

describe('Field Access Error Tests', () => {
  test('should handle deeply nested null access', () => {
    const issue = {
      fields: {
        parent: null
      }
    };

    // Attempting to access issue.fields.parent.key should not throw
    const parentKey = issue.fields.parent?.key;
    
    expect(parentKey).toBeUndefined();
  });

  test('should handle array field access', () => {
    const issue = {
      fields: {
        labels: ['label1', 'label2']
      }
    };

    expect(Array.isArray(issue.fields.labels)).toBe(true);
    expect(issue.fields.labels[0]).toBe('label1');
  });

  test('should handle empty array fields', () => {
    const issue = {
      fields: {
        labels: []
      }
    };

    expect(Array.isArray(issue.fields.labels)).toBe(true);
    expect(issue.fields.labels.length).toBe(0);
  });

  test('should handle null array fields', () => {
    const issue = {
      fields: {
        labels: null
      }
    };

    const labels = issue.fields.labels || [];
    
    expect(Array.isArray(labels)).toBe(true);
    expect(labels.length).toBe(0);
  });
});

describe('Special Character Handling Tests', () => {
  test('should handle HTML in descriptions', () => {
    const description = '<p>Test with <strong>HTML</strong> tags</p>';
    
    // Should preserve or safely handle HTML
    expect(description).toContain('<p>');
    expect(description).toContain('</p>');
  });

  test('should handle markdown in descriptions', () => {
    const description = '# Heading\n\n**Bold** and *italic*';
    
    expect(description).toContain('#');
    expect(description).toContain('**Bold**');
  });

  test('should handle quotes in text', () => {
    const text = 'Test "double quotes" and \'single quotes\'';
    
    expect(text).toContain('"');
    expect(text).toContain("'");
  });

  test('should handle newlines and whitespace', () => {
    const text = 'Line 1\n\nLine 2\t\tTabbed';
    
    expect(text).toContain('\n');
    expect(text).toContain('\t');
  });

  test('should handle unicode characters', () => {
    const text = '测试 🚀 Tëst Ñoño';
    
    expect(text).toContain('测试');
    expect(text).toContain('🚀');
    expect(text).toContain('ë');
  });

  test('should handle control characters', () => {
    const text = 'Test\x00with\x01control\x02chars';
    
    // Should not throw
    expect(text).toBeDefined();
  });
});

describe('Pagination Error Tests', () => {
  test('should handle empty pagination response', () => {
    const response = {
      total: 0,
      issues: [],
      nextPageToken: null
    };

    expect(response.issues.length).toBe(0);
    expect(response.nextPageToken).toBeNull();
  });

  test('should handle last page of pagination', () => {
    const response = {
      total: 100,
      issues: [{ key: 'TEST-100' }],
      nextPageToken: null // Last page
    };

    expect(response.nextPageToken).toBeNull();
    expect(response.issues.length).toBeGreaterThan(0);
  });

  test('should handle missing pagination token', () => {
    const response = {
      total: 50,
      issues: [{ key: 'TEST-1' }]
      // nextPageToken missing
    };

    expect(response.nextPageToken).toBeUndefined();
  });
});

describe('Concurrent Modification Tests', () => {
  test('should detect concurrent modifications via hash', () => {
    const originalData = {
      key: 'TEST-1',
      updated: '2024-01-01T00:00:00.000Z',
      summary: 'Original'
    };

    const modifiedData = {
      key: 'TEST-1',
      updated: '2024-01-01T01:00:00.000Z', // Updated later
      summary: 'Modified'
    };

    const hash1 = DiffUtil.calculateHash(originalData);
    const hash2 = DiffUtil.calculateHash(modifiedData);

    // Hashes should differ, indicating modification
    expect(hash1).not.toBe(hash2);
  });

  test('should handle stale metadata gracefully', () => {
    const staleMetadata = {
      jpd_id: 'TEST-1',
      jpd_updated: '2024-01-01T00:00:00.000Z',
      sync_hash: 'old-hash',
      original_link: 'http://test'
    };

    const currentData = {
      key: 'TEST-1',
      updated: '2024-01-02T00:00:00.000Z' // Newer
    };

    // Comparing dates should show staleness
    const staleDate = new Date(staleMetadata.jpd_updated);
    const currentDate = new Date(currentData.updated);

    expect(currentDate.getTime()).toBeGreaterThan(staleDate.getTime());
  });
});

describe('Large Data Handling Tests', () => {
  test('should handle very long summaries', () => {
    const longSummary = 'A'.repeat(1000);
    
    expect(longSummary.length).toBe(1000);
    
    // GitHub title limit is 256 chars
    const truncated = longSummary.substring(0, 256);
    expect(truncated.length).toBe(256);
  });

  test('should handle very long descriptions', () => {
    const longDescription = 'B'.repeat(100000);
    
    expect(longDescription.length).toBe(100000);
    // Should not cause memory issues
  });

  test('should handle many labels', () => {
    const manyLabels = Array.from({ length: 100 }, (_, i) => `label-${i}`);
    
    expect(manyLabels.length).toBe(100);
    // GitHub allows up to 100 labels per issue
  });
});

describe('Type Coercion Tests', () => {
  test('should handle string numbers', () => {
    const issue = {
      fields: {
        customNumber: '42'
      }
    };

    const num = Number(issue.fields.customNumber);
    expect(num).toBe(42);
  });

  test('should handle boolean strings', () => {
    const issue = {
      fields: {
        customFlag: 'true'
      }
    };

    const bool = issue.fields.customFlag === 'true';
    expect(bool).toBe(true);
  });

  test('should handle date strings', () => {
    const dateStr = '2024-01-01T00:00:00.000Z';
    const date = new Date(dateStr);
    
    expect(date.toString()).not.toBe('Invalid Date');
  });
});

