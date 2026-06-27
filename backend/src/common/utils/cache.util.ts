export class SimpleCache {
  private static cache = new Map<string, { data: unknown; expiry: number }>();
  private static readonly MAX_ENTRIES = 1000;

  static get(key: string): unknown {
    const item = this.cache.get(key);
    if (!item) return null;
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    return item.data;
  }

  static set(key: string, data: unknown, ttlMs: number = 30000): void {
    if (this.cache.size >= this.MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttlMs,
    });
  }

  static clear(): void {
    this.cache.clear();
  }
}
