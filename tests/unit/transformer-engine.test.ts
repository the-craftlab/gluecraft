import { describe, it, expect } from 'vitest';
import { TransformerEngine } from '../../src/transformers/transformer-engine.js';

describe('TransformerEngine', () => {
  const sampleData = {
    fields: {
      summary: 'Test Issue',
      priority: { name: 'High' },
      next_up: true
    },
    key: 'DKP-123'
  };

  it('should transform using simple mapping', async () => {
    const result = await TransformerEngine.transform({ jpd: 'fields.summary', github: 'title' }, sampleData);
    expect(result).toBe('Test Issue');
  });

  it('should transform using template', async () => {
    const result = await TransformerEngine.transform({ 
      jpd: 'fields.priority.name', 
      github: 'labels',
      transform: 'priority:{{fields.priority.name | lowercase}}'
    }, sampleData);
    
    expect(result).toBe('priority:high');
  });

  it('should handle array mapping (no transform)', async () => {
    const result = await TransformerEngine.transform({ 
      jpd: ['key'], 
      github: 'body' 
    }, sampleData);
    
    expect(result).toEqual({ key: 'DKP-123' });
  });

  // Note: Custom function testing requires mocking file imports which is complex in unit tests
});

