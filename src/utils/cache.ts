import { logger } from './logger';
import { File, ReviewComment } from '../types';

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

export interface CacheStats {
  size: number;
  hits: number;
  misses: number;
  hitRate: number;
  evictions: number;
}

export class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;
  private stats: CacheStats;

  constructor(maxSize: number = 1000, defaultTTL: number = 3600000) {
    // 1 hour default
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.stats = {
      size: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      evictions: 0,
    };

    // Clean up expired entries every 5 minutes
    setInterval(() => this.cleanup(), 300000);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.size--;
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access time and hit count
    entry.timestamp = Date.now();
    entry.hits++;
    this.stats.hits++;
    this.updateHitRate();

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.value;
  }

  set(key: string, value: T, ttl?: number): void {
    const existingEntry = this.cache.get(key);

    if (existingEntry) {
      // Update existing entry
      existingEntry.value = value;
      existingEntry.timestamp = Date.now();
      existingEntry.ttl = ttl || this.defaultTTL;

      // Move to end
      this.cache.delete(key);
      this.cache.set(key, existingEntry);
      return;
    }

    // Check if we need to evict
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
    };

    this.cache.set(key, entry);
    this.stats.size++;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.stats.size--;
    }
    return deleted;
  }

  clear(): void {
    this.cache.clear();
    this.stats.size = 0;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.stats.size--;
      return false;
    }

    return true;
  }

  private evictLRU(): void {
    const firstKey = this.cache.keys().next().value;
    if (firstKey) {
      this.cache.delete(firstKey);
      this.stats.size--;
      this.stats.evictions++;
    }
  }

  private cleanup(): void {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.stats.size -= cleaned;
      logger.debug('Cache cleanup completed', {
        entriesRemoved: cleaned,
        currentSize: this.stats.size,
      });
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
  }

  getStats(): CacheStats {
    return { ...this.stats };
  }

  getSize(): number {
    return this.cache.size;
  }
}

export class ReviewCache {
  private cache: LRUCache<ReviewComment[]>;
  private summaryCache: LRUCache<{ summary: string; shortSummary: string }>;
  private titleCache: LRUCache<string>;

  constructor() {
    this.cache = new LRUCache<ReviewComment[]>(100, 7200000); // 2 hours
    this.summaryCache = new LRUCache<{ summary: string; shortSummary: string }>(
      50,
      3600000
    ); // 1 hour
    this.titleCache = new LRUCache<string>(50, 3600000); // 1 hour
  }

  // Generate cache key for review based on file contents and diffs
  generateReviewKey(files: File[]): string {
    const fileHashes = files
      .map((file) => {
        // Create a hash based on filename and diff
        const content = `${file.filename}:${file.diff}`;
        return this.fnv1aHash(content);
      })
      .sort()
      .join('|');

    return `review:${this.fnv1aHash(fileHashes)}`;
  }

  // Generate cache key for summary based on comments
  generateSummaryKey(comments: ReviewComment[]): string {
    const commentHashes = comments
      .map((comment) =>
        this.fnv1aHash(
          `${comment.filename}:${comment.startLine}:${comment.comment}`
        )
      )
      .sort()
      .join('|');

    return `summary:${this.fnv1aHash(commentHashes)}`;
  }

  // Generate cache key for title based on files
  generateTitleKey(files: File[]): string {
    const fileInfo = files
      .map(
        (file) =>
          `${file.filename}:${file.newFile ? 'new' : file.deletedFile ? 'deleted' : 'modified'}`
      )
      .sort()
      .join('|');

    return `title:${this.fnv1aHash(fileInfo)}`;
  }

  private fnv1aHash(str: string): string {
    // FNV-1a hash algorithm for better collision resistance
    let hash = 2166136261; // FNV offset basis

    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 16777619) >>> 0; // FNV prime, ensure 32-bit
    }

    return hash.toString(36);
  }

  // Review caching
  getReview(files: File[]): ReviewComment[] | null {
    const key = this.generateReviewKey(files);
    const result = this.cache.get(key);

    if (result) {
      logger.debug('Review cache hit', { key, commentCount: result.length });
    } else {
      logger.debug('Review cache miss', { key });
    }

    return result;
  }

  setReview(files: File[], comments: ReviewComment[]): void {
    const key = this.generateReviewKey(files);
    this.cache.set(key, comments);
    logger.debug('Review cached', { key, commentCount: comments.length });
  }

  // Summary caching
  getSummary(
    comments: ReviewComment[]
  ): { summary: string; shortSummary: string } | null {
    const key = this.generateSummaryKey(comments);
    const result = this.summaryCache.get(key);

    if (result) {
      logger.debug('Summary cache hit', { key });
    } else {
      logger.debug('Summary cache miss', { key });
    }

    return result;
  }

  setSummary(
    comments: ReviewComment[],
    summary: { summary: string; shortSummary: string }
  ): void {
    const key = this.generateSummaryKey(comments);
    this.summaryCache.set(key, summary);
    logger.debug('Summary cached', { key });
  }

  // Title caching
  getTitle(files: File[]): string | null {
    const key = this.generateTitleKey(files);
    const result = this.titleCache.get(key);

    if (result) {
      logger.debug('Title cache hit', { key });
    } else {
      logger.debug('Title cache miss', { key });
    }

    return result;
  }

  setTitle(files: File[], title: string): void {
    const key = this.generateTitleKey(files);
    this.titleCache.set(key, title);
    logger.debug('Title cached', { key });
  }

  // Cache management
  clear(): void {
    this.cache.clear();
    this.summaryCache.clear();
    this.titleCache.clear();
    logger.info('All caches cleared');
  }

  getStats(): { review: CacheStats; summary: CacheStats; title: CacheStats } {
    return {
      review: this.cache.getStats(),
      summary: this.summaryCache.getStats(),
      title: this.titleCache.getStats(),
    };
  }

  // Check if caching would be beneficial for these files
  shouldCache(files: File[]): boolean {
    // Don't cache very small reviews (likely one-off changes)
    if (files.length < 2) return false;

    // Don't cache very large reviews (likely major refactors)
    if (files.length > 20) return false;

    // Don't cache if total content is too large
    const totalSize = files.reduce(
      (sum, file) => sum + file.fileContent.length,
      0
    );
    if (totalSize > 500000) return false; // 500KB

    return true;
  }
}

// Default cache instance
export const reviewCache = new ReviewCache();
