import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { ConfigSchema, type Config } from './config-schema.js';

export class ConfigLoader {
  static load(configPath: string): Config {
    if (!fs.existsSync(configPath)) {
      throw new Error(`Config file not found at: ${configPath}`);
    }

    const fileContents = fs.readFileSync(configPath, 'utf8');
    const parsed = YAML.parse(fileContents);
    
    const result = ConfigSchema.safeParse(parsed);

    if (!result.success) {
      // Zod 3 error handling
      const errorMsg = result.error.errors 
        ? result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join('\n')
        : JSON.stringify(result.error);
        
      throw new Error(`Config validation failed:\n${errorMsg}`);
    }

    return result.data;
  }
}
