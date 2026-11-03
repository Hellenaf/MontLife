/**
 * AI Cache & Token Cost Optimizer
 *
 * Caches triage and categorization responses in-memory with TTL to prevent
 * redundant LLM calls, saving tokens and minimizing latency.
 */

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  tokensSavedEstimate: number;
}

class AICacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTtlMs: number = 7 * 24 * 60 * 60 * 1000; // 7 days TTL
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalTokensSaved: 0,
  };

  /**
   * Normalizes raw natural language queries to maximize cache hit rates.
   */
  private normalizeKey(raw: string): string {
    return raw
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
  }

  get<T>(query: string): { data: T; tokensSaved: number } | null {
    this.stats.totalRequests++;
    const key = this.normalizeKey(query);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.cacheMisses++;
      return null;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      this.stats.cacheMisses++;
      return null;
    }

    this.stats.cacheHits++;
    this.stats.totalTokensSaved += entry.tokensSavedEstimate;
    return {
      data: entry.data as T,
      tokensSaved: entry.tokensSavedEstimate,
    };
  }

  set<T>(query: string, data: T, tokensEstimate: number = 420, customTtlMs?: number): void {
    const key = this.normalizeKey(query);
    const now = Date.now();
    const ttl = customTtlMs || this.defaultTtlMs;

    // Keep cache size bounded
    if (this.cache.size > 2000) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      data,
      cachedAt: now,
      expiresAt: now + ttl,
      tokensSavedEstimate: tokensEstimate,
    });
  }

  getStats() {
    return {
      ...this.stats,
      cachedEntries: this.cache.size,
      hitRatio:
        this.stats.totalRequests > 0
          ? Math.round((this.stats.cacheHits / this.stats.totalRequests) * 100)
          : 0,
    };
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global singleton to persist within the server process
const globalForAiCache = globalThis as unknown as { aiCacheInstance?: AICacheManager };

export const aiCache = globalForAiCache.aiCacheInstance || new AICacheManager();
if (process.env.NODE_ENV !== "production") {
  globalForAiCache.aiCacheInstance = aiCache;
}

