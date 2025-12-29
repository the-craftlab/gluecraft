/**
 * JPD Field Validator
 * 
 * Validates that required JPD custom fields exist and have the correct types.
 * Optionally attempts to create missing fields via API.
 */

import { Logger } from '../utils/logger.js';
import type { JpdClient } from '../clients/jpd-client.js';

export type FieldDefinition = {
  id: string;                    // e.g., "customfield_14377"
  name: string;                  // e.g., "Theme"
  type: FieldType;               // Expected field type
  required: boolean;             // Is this field required for sync?
  description?: string | undefined;          // Field description
  searcherKey?: string | undefined;          // Jira searcher key for field creation
};

export type FieldType = 
  | 'string'                     // Single-line text
  | 'text'                       // Multi-line text
  | 'number'                     // Numeric
  | 'select'                     // Single-select dropdown
  | 'multiselect'                // Multi-select
  | 'user'                       // User picker
  | 'date'                       // Date picker
  | 'datetime'                   // Date-time picker
  | 'url'                        // URL field
  | 'array';                     // Array/list

export type ValidationResult = {
  valid: boolean;
  errors: FieldValidationError[];
  warnings: string[];
};

export type FieldValidationError = {
  field: string;
  fieldId: string;
  error: 'missing' | 'wrong_type' | 'inaccessible';
  expected?: FieldType;
  actual?: string;
  message: string;
};

export class FieldValidator {
  private jpdClient: JpdClient;
  private fields: FieldDefinition[];

  constructor(jpdClient: JpdClient, fields: FieldDefinition[]) {
    this.jpdClient = jpdClient;
    this.fields = fields;
  }

  /**
   * Validate all required fields exist and have correct types
   */
  async validate(projectKey: string): Promise<ValidationResult> {
    Logger.info('Validating JPD custom fields...');
    
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: []
    };

    // Get a sample issue to check fields
    const sampleIssue = await this.getSampleIssue(projectKey);
    
    if (!sampleIssue) {
      result.valid = false;
      result.errors.push({
        field: 'project',
        fieldId: projectKey,
        error: 'missing',
        message: `No issues found in project ${projectKey}. Create at least one issue to validate fields.`
      });
      return result;
    }

    // Validate each field
    for (const fieldDef of this.fields) {
      const fieldValue = this.getFieldValue(sampleIssue, fieldDef.id);
      
      if (fieldValue === undefined) {
        if (fieldDef.required) {
          result.valid = false;
          result.errors.push({
            field: fieldDef.name,
            fieldId: fieldDef.id,
            error: 'missing',
            expected: fieldDef.type,
            message: `Required field "${fieldDef.name}" (${fieldDef.id}) not found in JPD project.`
          });
        }
        // Optional fields not found are fine, no warning needed
        continue;
      }

      // Warn about empty optional fields (helpful, not blocking)
      if (fieldValue === null && !fieldDef.required) {
        result.warnings.push(`Optional field "${fieldDef.name}" (${fieldDef.id}) is empty. Edit in JPD: ${process.env.JPD_BASE_URL}/browse/${sampleIssue.key}`);
        continue;
      }

      // Validate field type (only for non-null values or required fields)
      const actualType = this.detectFieldType(fieldValue);
      if (!this.isTypeCompatible(actualType, fieldDef.type)) {
        // For optional fields with null, that's fine - skip warning
        if (!fieldDef.required && actualType === 'null') {
          // Optional field can be null, no action needed
          continue;
        }
        
        // Type mismatch for required field or non-null optional field
        result.valid = false;
        result.errors.push({
          field: fieldDef.name,
          fieldId: fieldDef.id,
          error: 'wrong_type',
          expected: fieldDef.type,
          actual: actualType,
          message: `Field "${fieldDef.name}" has type "${actualType}" but expected "${fieldDef.type}".`
        });
      }
    }

    if (result.valid) {
      // Validation complete - no need to log twice
    } else {
      Logger.error(`❌ Field validation failed with ${result.errors.length} errors`);
    }

    return result;
  }

  /**
   * Get a sample issue from the project for field validation
   */
  private async getSampleIssue(projectKey: string): Promise<any> {
    try {
      const result = await this.jpdClient.searchIssues(
        `project = ${projectKey}`,
        ['*all'],
        1 // Just need one issue
      );
      
      return result.issues[0] || null;
    } catch (error) {
      Logger.error(`Failed to fetch sample issue: ${error}`);
      return null;
    }
  }

  /**
   * Get field value from issue, handling nested paths
   */
  private getFieldValue(issue: any, fieldId: string): any {
    const fields = issue.fields || {};
    return fields[fieldId];
  }

  /**
   * Detect the actual type of a field value
   */
  private detectFieldType(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'string') return 'string';
    if (typeof value === 'number') return 'number';
    if (typeof value === 'boolean') return 'boolean';
    
    // Check for Jira-specific objects
    if (value.value !== undefined) {
      // Single-select field
      return 'select';
    }
    
    if (value.name !== undefined && value.key !== undefined) {
      // User or issue link
      return 'user';
    }

    return 'object';
  }

  /**
   * Check if actual type is compatible with expected type
   */
  private isTypeCompatible(actual: string, expected: FieldType): boolean {
    // Exact match
    if (actual === expected) return true;

    // Compatible types
    const compatibilityMap: Record<string, string[]> = {
      'string': ['text', 'url'],
      'text': ['string'],
      'array': ['multiselect'],
      'select': ['object'],  // Select fields are objects with .value
      'multiselect': ['array'],
      'object': ['select', 'user']
    };

    return compatibilityMap[actual]?.includes(expected) || false;
  }

  /**
   * Attempt to create missing custom fields (if supported by API)
   * NOTE: JPD custom field creation requires admin permissions
   */
  async createMissingFields(projectKey: string, errors: FieldValidationError[]): Promise<string[]> {
    Logger.info('Attempting to create missing custom fields...');
    const created: string[] = [];

    for (const error of errors) {
      if (error.error !== 'missing') continue;

      const fieldDef = this.fields.find(f => f.id === error.fieldId);
      if (!fieldDef) continue;

      try {
        Logger.info(`Creating field: ${fieldDef.name} (${fieldDef.id})`);
        
        // Note: This is a placeholder - actual JPD field creation is complex
        // and may require Jira admin permissions
        Logger.warn(`⚠️  Automatic field creation not yet implemented for JPD.`);
        Logger.warn(`   Please create field "${fieldDef.name}" manually in JPD project settings.`);
        
        // TODO: Implement field creation via Jira API if permissions allow
        // await this.jpdClient.createCustomField(fieldDef);
        
      } catch (error) {
        Logger.error(`Failed to create field ${fieldDef.name}: ${error}`);
      }
    }

    return created;
  }

  /**
   * Generate helpful error report for missing fields
   */
  generateErrorReport(result: ValidationResult): string {
    let report = '\n╔══════════════════════════════════════════════════════════════╗\n';
    report += '║                                                              ║\n';
    report += '║           ❌ JPD FIELD VALIDATION FAILED ❌                  ║\n';
    report += '║                                                              ║\n';
    report += '╚══════════════════════════════════════════════════════════════╝\n\n';

    if (result.errors.length > 0) {
      report += '🚫 ERRORS:\n';
      report += '─────────────────────────────────────────────────────────────\n';
      
      for (const error of result.errors) {
        report += `\n❌ ${error.field} (${error.fieldId})\n`;
        report += `   ${error.message}\n`;
        
        if (error.error === 'missing') {
          report += `\n   💡 How to fix:\n`;
          report += `   1. Go to JPD Project Settings\n`;
          report += `   2. Create custom field: "${error.field}"\n`;
          report += `   3. Type: ${error.expected}\n`;
          report += `   4. Add to project screens\n`;
        } else if (error.error === 'wrong_type') {
          report += `\n   💡 How to fix:\n`;
          report += `   1. Expected type: ${error.expected}\n`;
          report += `   2. Actual type: ${error.actual}\n`;
          report += `   3. Update config or recreate field\n`;
        }
      }
    }

    if (result.warnings.length > 0) {
      report += '\n\n⚠️  WARNINGS:\n';
      report += '─────────────────────────────────────────────────────────────\n';
      for (const warning of result.warnings) {
        report += `\n⚠️  ${warning}\n`;
      }
    }

    report += '\n─────────────────────────────────────────────────────────────\n';
    report += 'Sync cannot continue until all required fields are available.\n';
    report += '─────────────────────────────────────────────────────────────\n\n';

    return report;
  }
}

