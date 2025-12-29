import path from 'path';

export type TransformFunction = (data: Record<string, any>) => any;

export class CustomFunctions {
  private static cache: Map<string, TransformFunction> = new Map();

  static async load(filePath: string): Promise<TransformFunction> {
    if (this.cache.has(filePath)) {
      return this.cache.get(filePath)!;
    }

    const absolutePath = path.resolve(process.cwd(), filePath);
    
    try {
      // Dynamic import of the user's script
      // In a real generic action, we might need to handle compilation or rely on the user providing JS
      // But since we control the runtime (Bun/TSX), we can import TS directly.
      const module = await import(absolutePath);
      
      if (typeof module.default !== 'function') {
        throw new Error(`Module at ${filePath} must export a default function`);
      }

      this.cache.set(filePath, module.default);
      return module.default;
    } catch (e: any) {
      throw new Error(`Failed to load custom transformation function at ${absolutePath}: ${e.message}`);
    }
  }

  static async execute(filePath: string, data: Record<string, any>): Promise<any> {
    const fn = await this.load(filePath);
    return fn(data);
  }
}

