import { TemplateParser } from './template-parser.js';
import { CustomFunctions } from './custom-functions.js';
import type { Config } from '../config/config-schema.js';

export class TransformerEngine {
  static async transform(
    mapping: any, // Use any to support the extended schema
    data: Record<string, any>
  ): Promise<any> {
    
    // 1. Custom Function (highest priority)
    if (mapping.transform_function) {
      return await CustomFunctions.execute(mapping.transform_function, data);
    }

    // 2. Template String ({{field | filter}})
    if (mapping.template) {
      return TemplateParser.parse(mapping.template, data);
    }

    // 3. Simple Key-Value Mapping
    if (mapping.mapping) {
      const sourceValue = this.getValue(data, mapping.jpd);
      // If source is an object with .value property (JPD select fields)
      const actualValue = sourceValue && typeof sourceValue === 'object' && sourceValue.value 
        ? sourceValue.value 
        : sourceValue;
      
      return mapping.mapping[actualValue] || actualValue;
    }

    // 4. String Template (legacy support)
    if (mapping.transform) {
      return TemplateParser.parse(mapping.transform, data);
    }

    // 5. Direct Mapping
    // If jpd is a string, return that field's value
    if (typeof mapping.jpd === 'string') {
      const value = this.getValue(data, mapping.jpd);
      
      // Handle JPD select fields that return {value: "..."}
      if (value && typeof value === 'object' && value.value) {
        return value.value;
      }
      
      // Handle JPD multi-select fields that return [{value: "..."}]
      if (Array.isArray(value) && value.length > 0 && value[0].value) {
        return value.map(v => v.value);
      }
      
      return value;
    }

    // If jpd is an array, we default to returning the whole data object subset
    if (Array.isArray(mapping.jpd)) {
      const result: Record<string, any> = {};
      for (const key of mapping.jpd) {
        result[key] = this.getValue(data, key);
      }
      return result;
    }

    return undefined;
  }

  private static getValue(data: Record<string, any>, key: string): any {
     return key.split('.').reduce((obj, k) => obj && obj[k], data);
  }
}

