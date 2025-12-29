export class TemplateParser {
  static parse(template: string, data: Record<string, any>): string {
    return template.replace(/\{\{([^}]+)\}\}/g, (_, expression) => {
      const parts = expression.split('|').map((s: string) => s.trim());
      const key = parts[0];
      const filters = parts.slice(1);

      let value = this.getValue(data, key);

      for (const filter of filters) {
        value = this.applyFilter(value, filter);
      }

      return value !== undefined && value !== null ? String(value) : '';
    });
  }

  private static getValue(data: Record<string, any>, key: string): any {
    // Support nested keys like issue.fields.summary and array indices like fields.array[0].value
    return key.split('.').reduce((obj, k) => {
      if (!obj) return undefined;
      
      // Handle array index notation: key[0]
      const arrayMatch = k.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const arrayKey = arrayMatch[1];
        const index = parseInt(arrayMatch[2], 10);
        return obj[arrayKey] ? obj[arrayKey][index] : undefined;
      }
      
      return obj[k];
    }, data);
  }

  private static applyFilter(value: any, filter: string): any {
    // Parse filter with arguments: "replace('old', 'new')" or "join(', ')"
    const filterMatch = filter.match(/^(\w+)(?:\((.*)\))?$/);
    if (!filterMatch) return value;
    
    const filterName = filterMatch[1].toLowerCase();
    const argsString = filterMatch[2];
    
    // Parse arguments (simple CSV split, handles quoted strings)
    const args = argsString 
      ? argsString.split(/,\s*/).map(arg => arg.replace(/^['"]|['"]$/g, '').trim())
      : [];

    switch (filterName) {
      case 'lowercase':
        return typeof value === 'string' ? value.toLowerCase() : value;
      
      case 'uppercase':
        return typeof value === 'string' ? value.toUpperCase() : value;
      
      case 'slugify':
        return typeof value === 'string' 
          ? value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
          : value;
      
      case 'trim':
        return typeof value === 'string' ? value.trim() : value;
      
      case 'replace':
        if (typeof value === 'string' && args.length >= 2) {
          return value.replace(new RegExp(args[0], 'g'), args[1]);
        }
        return value;
      
      case 'join':
        if (Array.isArray(value)) {
          const separator = args[0] || ', ';
          return value.map(v => typeof v === 'object' && v.value ? v.value : v).join(separator);
        }
        return value;
      
      default:
        return value;
    }
  }
}

