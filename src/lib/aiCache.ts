/**
 * AI Cache & Token Cost Optimizer
 *
 * Caches triage and categorization responses in-memory and in Firestore
 * with TTL to prevent redundant LLM calls, saving tokens and minimizing latency.
 */
import { getFirestoreDb } from "@/lib/firebaseAdmin";

interface CacheEntry<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  tokensSavedEstimate: number;
}

class AICacheManager {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultTtlMs: number = 30 * 24 * 60 * 60 * 1000; // 30 days TTL
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalTokensSaved: 0,
  };

  private hashString(str: string): string {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (h2 >>> 0).toString(16).padStart(8, "0") + (h1 >>> 0).toString(16).padStart(8, "0");
  }

  /**
   * Normalizes raw natural language queries and appends a full-string hash
   * so long emails or commands sharing the same opening never collide in memory or Firestore.
   */
  public normalizeKey(raw: string): string {
    const normalized = raw
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "");
    const hash = this.hashString(normalized);
    const prefix = normalized.replace(/[^a-z0-9]/g, "_").slice(0, 56);
    return `${prefix}_${hash}`;
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

  async getAsync<T>(query: string): Promise<{ data: T; tokensSaved: number } | null> {
    const memoryHit = this.get<T>(query);
    if (memoryHit) return memoryHit;

    // Fallback: Check persistent cache in Firestore
    const db = getFirestoreDb();
    if (!db) return null;

    try {
      const key = this.normalizeKey(query);
      const doc = await db.collection("ai_cache").doc(key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80)).get();
      if (doc.exists) {
        const entry = doc.data() as CacheEntry<T>;
        if (entry && Date.now() <= entry.expiresAt) {
          // Re-populate in-memory cache
          this.cache.set(key, entry);
          this.stats.cacheHits++;
          this.stats.totalTokensSaved += entry.tokensSavedEstimate;
          return {
            data: entry.data,
            tokensSaved: entry.tokensSavedEstimate,
          };
        }
      }
    } catch {
      // Ignore cache fetch error
    }

    return null;
  }

  set<T>(query: string, data: T, tokensEstimate: number = 350, customTtlMs?: number): void {
    const key = this.normalizeKey(query);
    const now = Date.now();
    const ttl = customTtlMs || this.defaultTtlMs;

    // Keep memory cache size bounded
    if (this.cache.size > 2000) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    const entry: CacheEntry<T> = {
      data,
      cachedAt: now,
      expiresAt: now + ttl,
      tokensSavedEstimate: tokensEstimate,
    };

    this.cache.set(key, entry);

    // Asynchronously persist to Firestore
    const db = getFirestoreDb();
    if (db) {
      const docId = key.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
      db.collection("ai_cache").doc(docId).set(entry).catch(() => {});
    }
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
