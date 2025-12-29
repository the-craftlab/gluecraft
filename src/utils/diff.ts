import crypto from 'crypto';

export class DiffUtil {
  static calculateHash(data: any): string {
    return crypto.createHash('md5').update(JSON.stringify(data)).digest('hex');
  }

  static hasChanged(oldHash: string, newData: any): boolean {
    const newHash = this.calculateHash(newData);
    return oldHash !== newHash;
  }
}

