/**
 * Unit tests for ProjectFieldTransformer
 * Tests field transformation logic for GitHub Projects v2 custom fields
 */

import { describe, it, expect } from 'vitest';
import { ProjectFieldTransformer } from '../../src/transformers/project-field-transformer.js';

describe('ProjectFieldTransformer', () => {
  describe('parseDate', () => {
    it('should parse ISO date string to ISO format', () => {
      const result = ProjectFieldTransformer.parseDate('2024-06-15');
      expect(result).toBe('2024-06-15');
    });

    it('should parse date with time to ISO date only', () => {
      const result = ProjectFieldTransformer.parseDate('2024-06-15T10:30:00Z');
      expect(result).toBe('2024-06-15');
    });

    it('should parse slash-formatted date', () => {
      const result = ProjectFieldTransformer.parseDate('06/15/2024');
      expect(result).toBe('2024-06-15');
    });

    it('should return null for empty string', () => {
      const result = ProjectFieldTransformer.parseDate('');
      expect(result).toBeNull();
    });

    it('should return null for null input', () => {
      const result = ProjectFieldTransformer.parseDate(null);
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = ProjectFieldTransformer.parseDate(undefined);
      expect(result).toBeNull();
    });

    it('should return null for invalid date string', () => {
      const result = ProjectFieldTransformer.parseDate('not-a-date');
      expect(result).toBeNull();
    });
  });

  describe('mapSelectValue', () => {
    it('should map JPD value to GitHub value using mapping', () => {
      const mapping = {
        Critical: 'P0',
        High: 'P1',
        Normal: 'P2',
        Low: 'P3'
      };
      
      expect(ProjectFieldTransformer.mapSelectValue('Critical', mapping)).toBe('P0');
      expect(ProjectFieldTransformer.mapSelectValue('High', mapping)).toBe('P1');
      expect(ProjectFieldTransformer.mapSelectValue('Normal', mapping)).toBe('P2');
      expect(ProjectFieldTransformer.mapSelectValue('Low', mapping)).toBe('P3');
    });

    it('should return original value if no mapping provided', () => {
      const result = ProjectFieldTransformer.mapSelectValue('Critical', undefined);
      expect(result).toBe('Critical');
    });

    it('should return original value if not in mapping', () => {
      const mapping = { High: 'P1' };
      const result = ProjectFieldTransformer.mapSelectValue('Critical', mapping);
      expect(result).toBe('Critical');
    });

    it('should return null for null input', () => {
      const result = ProjectFieldTransformer.mapSelectValue(null, { High: 'P1' });
      expect(result).toBeNull();
    });

    it('should return null for undefined input', () => {
      const result = ProjectFieldTransformer.mapSelectValue(undefined, { High: 'P1' });
      expect(result).toBeNull();
    });
  });

  describe('deriveFromThresholds', () => {
    const thresholds = [
      { max: 2, value: 'XS' },
      { max: 5, value: 'S' },
      { max: 10, value: 'M' },
      { max: 20, value: 'L' },
      { max: 999, value: 'XL' }
    ];

    it('should derive XS for effort <= 2', () => {
      expect(ProjectFieldTransformer.deriveFromThresholds(1, thresholds)).toBe('XS');
      expect(ProjectFieldTransformer.deriveFromThresholds(2, thresholds)).toBe('XS');
    });

    it('should derive S for effort 3-5', () => {
      expect(ProjectFieldTransformer.deriveFromThresholds(3, thresholds)).toBe('S');
      expect(ProjectFieldTransformer.deriveFromThresholds(5, thresholds)).toBe('S');
    });

    it('should derive M for effort 6-10', () => {
      expect(ProjectFieldTransformer.deriveFromThresholds(6, thresholds)).toBe('M');
      expect(ProjectFieldTransformer.deriveFromThresholds(10, thresholds)).toBe('M');
    });

    it('should derive L for effort 11-20', () => {
      expect(ProjectFieldTransformer.deriveFromThresholds(11, thresholds)).toBe('L');
      expect(ProjectFieldTransformer.deriveFromThresholds(20, thresholds)).toBe('L');
    });

    it('should derive XL for effort > 20', () => {
      expect(ProjectFieldTransformer.deriveFromThresholds(21, thresholds)).toBe('XL');
      expect(ProjectFieldTransformer.deriveFromThresholds(100, thresholds)).toBe('XL');
    });

    it('should return null for null value', () => {
      expect(ProjectFieldTransformer.deriveFromThresholds(null, thresholds)).toBeNull();
    });

    it('should return null for undefined value', () => {
      expect(ProjectFieldTransformer.deriveFromThresholds(undefined, thresholds)).toBeNull();
    });

    it('should return null for negative value', () => {
      expect(ProjectFieldTransformer.deriveFromThresholds(-5, thresholds)).toBeNull();
    });

    it('should return null for empty thresholds', () => {
      expect(ProjectFieldTransformer.deriveFromThresholds(5, [])).toBeNull();
    });
  });

  describe('transformFieldValue', () => {
    it('should transform date field', () => {
      const result = ProjectFieldTransformer.transformFieldValue(
        '2024-06-15',
        { type: 'date', jpd: 'fields.customfield_14383', github_field: 'Start date' }
      );
      expect(result).toEqual({ date: '2024-06-15' });
    });

    it('should transform number field', () => {
      const result = ProjectFieldTransformer.transformFieldValue(
        8,
        { type: 'number', jpd: 'fields.customfield_14387', github_field: 'Estimate' }
      );
      expect(result).toEqual({ number: 8 });
    });

    it('should transform single_select field with mapping', () => {
      const result = ProjectFieldTransformer.transformFieldValue(
        'Critical',
        {
          type: 'single_select',
          jpd: 'fields.customfield_14425.value',
          github_field: 'Priority',
          mapping: { Critical: 'P0', High: 'P1' }
        }
      );
      expect(result).toEqual({ singleSelectValue: 'P0' });
    });

    it('should transform single_select field with derivation', () => {
      const result = ProjectFieldTransformer.transformFieldValue(
        8,
        {
          type: 'single_select',
          jpd: 'fields.customfield_14387',
          github_field: 'Size',
          derive: {
            thresholds: [
              { max: 5, value: 'S' },
              { max: 10, value: 'M' },
              { max: 999, value: 'L' }
            ]
          }
        }
      );
      expect(result).toEqual({ singleSelectValue: 'M' });
    });

    it('should return null for invalid date', () => {
      const result = ProjectFieldTransformer.transformFieldValue(
        'invalid-date',
        { type: 'date', jpd: 'fields.customfield_14383', github_field: 'Start date' }
      );
      expect(result).toBeNull();
    });

    it('should return null for null value', () => {
      const result = ProjectFieldTransformer.transformFieldValue(
        null,
        { type: 'number', jpd: 'fields.customfield_14387', github_field: 'Estimate' }
      );
      expect(result).toBeNull();
    });

    it('should return null for undefined value', () => {
      const result = ProjectFieldTransformer.transformFieldValue(
        undefined,
        { type: 'date', jpd: 'fields.customfield_14383', github_field: 'Start date' }
      );
      expect(result).toBeNull();
    });
  });

  describe('extractJpdValue', () => {
    it('should extract simple field value', () => {
      const data = {
        fields: {
          customfield_14387: 8
        }
      };
      const result = ProjectFieldTransformer.extractJpdValue(data, 'fields.customfield_14387');
      expect(result).toBe(8);
    });

    it('should extract nested field value', () => {
      const data = {
        fields: {
          customfield_14425: { value: 'High' }
        }
      };
      const result = ProjectFieldTransformer.extractJpdValue(data, 'fields.customfield_14425.value');
      expect(result).toBe('High');
    });

    it('should return undefined for missing field', () => {
      const data = { fields: {} };
      const result = ProjectFieldTransformer.extractJpdValue(data, 'fields.customfield_99999');
      expect(result).toBeUndefined();
    });

    it('should return undefined for missing nested field', () => {
      const data = {
        fields: {
          customfield_14425: {}
        }
      };
      const result = ProjectFieldTransformer.extractJpdValue(data, 'fields.customfield_14425.value');
      expect(result).toBeUndefined();
    });
  });
});
