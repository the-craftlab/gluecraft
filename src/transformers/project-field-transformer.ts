/**
 * ProjectFieldTransformer
 * 
 * Transforms JPD field values to GitHub Projects v2 field values
 * Supports date parsing, value mapping, and threshold-based derivation
 */

export interface ProjectFieldMapping {
  jpd: string;                           // JPD field path (e.g., "fields.customfield_14383")
  github_field: string;                  // GitHub Project field name (e.g., "Start date")
  type: 'date' | 'number' | 'single_select';
  mapping?: Record<string, string>;      // Value mapping for single_select
  derive?: {                             // Threshold-based derivation
    thresholds: Array<{ max: number; value: string }>;
  };
}

export interface FieldValue {
  date?: string;                         // ISO date string (YYYY-MM-DD)
  number?: number;                       // Numeric value
  singleSelectValue?: string;            // Option name for single select
}

export class ProjectFieldTransformer {
  /**
   * Parse a date string to ISO format (YYYY-MM-DD)
   */
  static parseDate(dateStr: string | null | undefined): string | null {
    if (!dateStr || dateStr.trim() === '') {
      return null;
    }

    try {
      // Try parsing as ISO date
      const date = new Date(dateStr);
      
      if (isNaN(date.getTime())) {
        return null;
      }

      // Return ISO date format (YYYY-MM-DD)
      return date.toISOString().split('T')[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Map a JPD select value to GitHub select value using mapping
   */
  static mapSelectValue(
    jpdValue: string | null | undefined,
    mapping?: Record<string, string>
  ): string | null {
    if (!jpdValue) {
      return null;
    }

    if (!mapping) {
      return jpdValue;
    }

    return mapping[jpdValue] || jpdValue;
  }

  /**
   * Derive a value from a number using threshold ranges
   * Returns the value for the first threshold where number <= max
   */
  static deriveFromThresholds(
    value: number | null | undefined,
    thresholds: Array<{ max: number; value: string }>
  ): string | null {
    if (value === null || value === undefined || value < 0) {
      return null;
    }

    if (!thresholds || thresholds.length === 0) {
      return null;
    }

    // Find first threshold where value <= max
    for (const threshold of thresholds) {
      if (value <= threshold.max) {
        return threshold.value;
      }
    }

    // If value exceeds all thresholds, return last threshold value
    return thresholds[thresholds.length - 1].value;
  }

  /**
   * Transform a JPD field value to GitHub Project field value
   * Returns the value in the format expected by GitHub's updateProjectV2ItemFieldValue mutation
   */
  static transformFieldValue(
    jpdValue: any,
    mapping: ProjectFieldMapping
  ): FieldValue | null {
    if (jpdValue === null || jpdValue === undefined) {
      return null;
    }

    switch (mapping.type) {
      case 'date': {
        const parsedDate = this.parseDate(jpdValue);
        if (!parsedDate) {
          return null;
        }
        return { date: parsedDate };
      }

      case 'number': {
        const numValue = typeof jpdValue === 'number' ? jpdValue : Number(jpdValue);
        if (isNaN(numValue)) {
          return null;
        }
        return { number: numValue };
      }

      case 'single_select': {
        let selectValue: string | null;

        if (mapping.derive) {
          // Derive value from number using thresholds
          const numValue = typeof jpdValue === 'number' ? jpdValue : Number(jpdValue);
          if (isNaN(numValue)) {
            return null;
          }
          selectValue = this.deriveFromThresholds(numValue, mapping.derive.thresholds);
        } else {
          // Map string value using mapping
          selectValue = this.mapSelectValue(jpdValue, mapping.mapping);
        }

        if (!selectValue) {
          return null;
        }

        return { singleSelectValue: selectValue };
      }

      default:
        return null;
    }
  }

  /**
   * Extract a value from JPD issue data using dot notation path
   */
  static extractJpdValue(data: any, path: string): any {
    const parts = path.split('.');
    let current = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }

    return current;
  }

  /**
   * Transform a JPD issue to GitHub Project field values
   * Returns a map of field names to their values
   */
  static transformIssue(
    jpdIssue: any,
    fieldMappings: ProjectFieldMapping[]
  ): Map<string, FieldValue> {
    const results = new Map<string, FieldValue>();

    for (const mapping of fieldMappings) {
      const jpdValue = this.extractJpdValue(jpdIssue, mapping.jpd);
      const transformedValue = this.transformFieldValue(jpdValue, mapping);

      if (transformedValue) {
        results.set(mapping.github_field, transformedValue);
      }
    }

    return results;
  }
}
