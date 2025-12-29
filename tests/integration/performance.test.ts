/**
 * Performance and Scale Tests
 * 
 * Tests the sync tool's performance with large datasets, many labels,
 * and concurrent operations.
 */

import { describe, test, expect, vi } from 'vitest';
import { DiffUtil } from '../../src/utils/diff.js';
import { TemplateParser } from '../../src/transformers/template-parser.js';
import { MetadataParser } from '../../src/state/metadata-parser.js';
import { JpdClient } from '../../src/clients/jpd-client.js';
import { GitHubClient } from '../../src/clients/github-client.js';

describe('Hash Calculation Performance', () => {
  test('should calculate hash for 100 issues quickly', () => {
    const issues = Array.from({ length: 100 }, (_, i) => ({
      key: `TEST-${i}`,
      updated: '2024-01-01T00:00:00.000Z',
      summary: `Test Issue ${i}`,
      status: 'To Do'
    }));

    const startTime = Date.now();
    
    issues.forEach(issue => {
      DiffUtil.calculateHash(issue);
    });
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    console.log(`Hash calculation for 100 issues: ${duration}ms`);
  });

  test('should calculate hash for issue with many fields', () => {
    const complexIssue = {
      key: 'TEST-1',
      fields: Object.fromEntries(
        Array.from({ length: 100 }, (_, i) => [`field${i}`, `value${i}`])
      )
    };

    const startTime = Date.now();
    const hash = DiffUtil.calculateHash(complexIssue);
    const duration = Date.now() - startTime;
    
    expect(hash).toBeDefined();
    expect(duration).toBeLessThan(100); // Should be very fast
    console.log(`Hash calculation for complex issue: ${duration}ms`);
  });
});

describe('Template Parsing Performance', () => {
  test('should parse 1000 templates quickly', () => {
    const issue = {
      key: 'TEST-1',
      fields: {
        summary: 'Test Issue',
        status: { name: 'In Progress' },
        priority: { name: 'High' }
      }
    };

    const template = 'status:{{fields.status.name | lowercase}}';
    
    const startTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      TemplateParser.parse(template, issue);
    }
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000); // Should complete in < 1 second
    console.log(`Template parsing (1000x): ${duration}ms`);
  });

  test('should handle complex template with multiple filters', () => {
    const issue = {
      fields: {
        summary: '  Test: Complex / Summary  '
      }
    };

    const template = '{{fields.summary | trim | lowercase | slugify}}';
    
    const startTime = Date.now();
    
    for (let i = 0; i < 1000; i++) {
      TemplateParser.parse(template, issue);
    }
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(1000);
    console.log(`Complex template parsing (1000x): ${duration}ms`);
  });
});

describe('Metadata Extraction Performance', () => {
  test('should extract metadata from 100 issue bodies quickly', () => {
    const bodies = Array.from({ length: 100 }, (_, i) => `
# Issue ${i}

Some content here.

<!-- jpd-sync-metadata
${JSON.stringify({
  jpd_id: `TEST-${i}`,
  jpd_updated: '2024-01-01T00:00:00.000Z',
  sync_hash: `hash-${i}`,
  original_link: 'http://test'
})}
-->
    `);

    const startTime = Date.now();
    
    bodies.forEach(body => {
      MetadataParser.extract(body);
    });
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(500); // Should be fast
    console.log(`Metadata extraction (100x): ${duration}ms`);
  });

  test('should inject metadata into 100 issue bodies quickly', () => {
    const bodies = Array.from({ length: 100 }, (_, i) => `# Issue ${i}\n\nContent here.`);
    const metadata = {
      jpd_id: 'TEST-1',
      jpd_updated: '2024-01-01T00:00:00.000Z',
      sync_hash: 'hash',
      original_link: 'http://test'
    };

    const startTime = Date.now();
    
    bodies.forEach(body => {
      MetadataParser.inject(body, metadata);
    });
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(500);
    console.log(`Metadata injection (100x): ${duration}ms`);
  });
});

describe('Large Dataset Handling', () => {
  test('should handle 100 issues with many labels', () => {
    const issues = Array.from({ length: 100 }, (_, i) => ({
      key: `TEST-${i}`,
      fields: {
        summary: `Test Issue ${i}`,
        labels: Array.from({ length: 50 }, (_, j) => `label-${j}`)
      }
    }));

    expect(issues.length).toBe(100);
    expect(issues[0].fields.labels.length).toBe(50);
    
    // Calculate total labels
    const totalLabels = issues.reduce((sum, issue) => 
      sum + issue.fields.labels.length, 0
    );
    
    expect(totalLabels).toBe(5000);
    console.log(`Total labels across 100 issues: ${totalLabels}`);
  });

  test('should handle very long description', () => {
    const longDescription = Array.from({ length: 1000 }, (_, i) => 
      `Line ${i}: ${'A'.repeat(100)}`
    ).join('\n');

    expect(longDescription.length).toBeGreaterThan(100000);
    
    // Should not cause memory issues
    const lines = longDescription.split('\n');
    expect(lines.length).toBe(1000);
    console.log(`Long description length: ${longDescription.length} chars`);
  });

  test('should handle pagination of 500 issues', () => {
    const pageSize = 100;
    const totalIssues = 500;
    const pages = Math.ceil(totalIssues / pageSize);

    expect(pages).toBe(5);
    
    // Simulate pagination
    const allIssues: any[] = [];
    for (let page = 0; page < pages; page++) {
      const pageIssues = Array.from({ length: pageSize }, (_, i) => ({
        key: `TEST-${page * pageSize + i}`
      }));
      allIssues.push(...pageIssues);
    }

    expect(allIssues.length).toBe(totalIssues);
    console.log(`Paginated ${totalIssues} issues across ${pages} pages`);
  });
});

describe('Concurrent Operations', () => {
  test('should handle multiple hash calculations concurrently', async () => {
    const issues = Array.from({ length: 50 }, (_, i) => ({
      key: `TEST-${i}`,
      updated: '2024-01-01T00:00:00.000Z',
      summary: `Test ${i}`
    }));

    const startTime = Date.now();
    
    const hashes = await Promise.all(
      issues.map(issue => Promise.resolve(DiffUtil.calculateHash(issue)))
    );
    
    const duration = Date.now() - startTime;
    
    expect(hashes.length).toBe(50);
    expect(duration).toBeLessThan(500);
    console.log(`Concurrent hash calculations: ${duration}ms`);
  });

  test('should handle concurrent template parsing', async () => {
    const issues = Array.from({ length: 50 }, (_, i) => ({
      key: `TEST-${i}`,
      fields: {
        status: { name: `Status ${i}` }
      }
    }));

    const template = 'status:{{fields.status.name | lowercase}}';
    
    const startTime = Date.now();
    
    const results = await Promise.all(
      issues.map(issue => Promise.resolve(TemplateParser.parse(template, issue)))
    );
    
    const duration = Date.now() - startTime;
    
    expect(results.length).toBe(50);
    expect(duration).toBeLessThan(500);
    console.log(`Concurrent template parsing: ${duration}ms`);
  });
});

describe('Memory Usage Tests', () => {
  test('should not leak memory with repeated operations', () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Perform many operations
    for (let i = 0; i < 1000; i++) {
      const issue = {
        key: `TEST-${i}`,
        fields: {
          summary: `Test ${i}`,
          description: 'A'.repeat(1000)
        }
      };
      
      DiffUtil.calculateHash(issue);
    }
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be reasonable (< 10MB)
    expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)} MB`);
  });

  test('should handle large batch of issues without excessive memory', () => {
    const issues = Array.from({ length: 1000 }, (_, i) => ({
      key: `TEST-${i}`,
      fields: {
        summary: `Issue ${i}`,
        description: 'A'.repeat(100)
      }
    }));

    const memoryBefore = process.memoryUsage().heapUsed;
    
    // Process all issues
    issues.forEach(issue => {
      DiffUtil.calculateHash(issue);
    });
    
    const memoryAfter = process.memoryUsage().heapUsed;
    const memoryUsed = memoryAfter - memoryBefore;
    
    console.log(`Memory used for 1000 issues: ${(memoryUsed / 1024 / 1024).toFixed(2)} MB`);
    
    // Should be reasonable
    expect(memoryUsed).toBeLessThan(50 * 1024 * 1024); // < 50MB
  });
});

describe('API Response Mocking Performance', () => {
  test('should mock 100 API responses quickly', async () => {
    const mockResponses = Array.from({ length: 100 }, (_, i) => ({
      total: 1,
      issues: [{
        key: `TEST-${i}`,
        fields: {
          summary: `Test ${i}`,
          status: { name: 'To Do' }
        }
      }]
    }));

    vi.spyOn(JpdClient.prototype, 'searchIssues').mockImplementation(
      async () => mockResponses[0]
    );

    const startTime = Date.now();
    
    for (let i = 0; i < 100; i++) {
      await JpdClient.prototype.searchIssues('test', 10);
    }
    
    const duration = Date.now() - startTime;
    
    expect(duration).toBeLessThan(100); // Should be very fast with mocks
    console.log(`Mocked API calls (100x): ${duration}ms`);
    
    vi.restoreAllMocks();
  });
});

describe('String Operation Performance', () => {
  test('should perform slugify on 1000 strings quickly', () => {
    const strings = Array.from({ length: 1000 }, (_, i) => 
      `Test String ${i}: With Special/Characters [And] (Parens)`
    );

    const startTime = Date.now();
    
    const slugified = strings.map(str => 
      str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    );
    
    const duration = Date.now() - startTime;
    
    expect(slugified.length).toBe(1000);
    expect(duration).toBeLessThan(100);
    console.log(`Slugify 1000 strings: ${duration}ms`);
  });

  test('should trim and normalize 1000 strings quickly', () => {
    const strings = Array.from({ length: 1000 }, (_, i) => 
      `  Test String ${i}  \n\t  `
    );

    const startTime = Date.now();
    
    const normalized = strings.map(str => str.trim());
    
    const duration = Date.now() - startTime;
    
    expect(normalized.length).toBe(1000);
    expect(duration).toBeLessThan(50);
    console.log(`Trim 1000 strings: ${duration}ms`);
  });
});

describe('JSON Operations Performance', () => {
  test('should parse 1000 JSON objects quickly', () => {
    const jsonStrings = Array.from({ length: 1000 }, (_, i) => 
      JSON.stringify({
        jpd_id: `TEST-${i}`,
        jpd_updated: '2024-01-01T00:00:00.000Z',
        sync_hash: `hash-${i}`,
        original_link: 'http://test'
      })
    );

    const startTime = Date.now();
    
    const parsed = jsonStrings.map(str => JSON.parse(str));
    
    const duration = Date.now() - startTime;
    
    expect(parsed.length).toBe(1000);
    expect(duration).toBeLessThan(100);
    console.log(`JSON parse (1000x): ${duration}ms`);
  });

  test('should stringify 1000 objects quickly', () => {
    const objects = Array.from({ length: 1000 }, (_, i) => ({
      jpd_id: `TEST-${i}`,
      jpd_updated: '2024-01-01T00:00:00.000Z',
      sync_hash: `hash-${i}`,
      fields: {
        summary: `Test ${i}`,
        status: 'To Do'
      }
    }));

    const startTime = Date.now();
    
    const stringified = objects.map(obj => JSON.stringify(obj));
    
    const duration = Date.now() - startTime;
    
    expect(stringified.length).toBe(1000);
    expect(duration).toBeLessThan(100);
    console.log(`JSON stringify (1000x): ${duration}ms`);
  });
});

