/**
 * Connection Cache
 * 
 * Caches successful connection tests to avoid hitting rate limits
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

interface CacheEntry {
  timestamp: number;
  credentials_hash: string;
  success: boolean;
}

export class ConnectionCache {
  private static CACHE_FILE = '.connection-cache.json';
  private static CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Check if connection was recently tested successfully
   */
  static isValid(service: 'jpd' | 'github', credentials: Record<string, string>): boolean {
    try {
      const cache = this.loadCache();
      const entry = cache[service];

      if (!entry) return false;

      // Check if cache is still valid
      const age = Date.now() - entry.timestamp;
      if (age > this.CACHE_TTL) return false;

      // Check if credentials match
      const hash = this.hashCredentials(credentials);
      if (entry.credentials_hash !== hash) return false;

      return entry.success;
    } catch {
      return false;
    }
  }

  /**
   * Mark connection as successfully tested
   */
  static markSuccess(service: 'jpd' | 'github', credentials: Record<string, string>): void {
    try {
      const cache = this.loadCache();
      cache[service] = {
        timestamp: Date.now(),
        credentials_hash: this.hashCredentials(credentials),
        success: true
      };
      this.saveCache(cache);
    } catch (error) {
      // Silently fail - cache is optional
    }
  }

  /**
   * Clear cached connection for a service
   */
  static clear(service?: 'jpd' | 'github'): void {
    try {
      if (service) {
        const cache = this.loadCache();
        delete cache[service];
        this.saveCache(cache);
      } else {
        // Clear entire cache
        const cachePath = path.join(process.cwd(), this.CACHE_FILE);
        if (fs.existsSync(cachePath)) {
          fs.unlinkSync(cachePath);
        }
      }
    } catch {
      // Silently fail
    }
  }

  /**
   * Get cache age in seconds
   */
  static getAge(service: 'jpd' | 'github'): number | null {
    try {
      const cache = this.loadCache();
      const entry = cache[service];
      if (!entry) return null;
      return Math.floor((Date.now() - entry.timestamp) / 1000);
    } catch {
      return null;
    }
  }

  /**
   * Load cache from disk
   */
  private static loadCache(): Record<string, CacheEntry> {
    const cachePath = path.join(process.cwd(), this.CACHE_FILE);
    
    if (!fs.existsSync(cachePath)) {
      return {};
    }

    const data = fs.readFileSync(cachePath, 'utf8');
    return JSON.parse(data);
  }

  /**
   * Save cache to disk
   */
  private static saveCache(cache: Record<string, CacheEntry>): void {
    const cachePath = path.join(process.cwd(), this.CACHE_FILE);
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2));
  }

  /**
   * Hash credentials for comparison (never store actual credentials!)
   */
  private static hashCredentials(credentials: Record<string, string>): string {
    const sorted = Object.keys(credentials)
      .sort()
      .map(key => `${key}:${credentials[key]}`)
      .join('|');
    
    return createHash('sha256').update(sorted).digest('hex');
  }
}

