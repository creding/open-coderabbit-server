import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LRUCache, ReviewCache } from '../../src/utils/cache';
import { File, ReviewComment } from '../../src/types';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new LRUCache<string>(3, 1000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should set and get a value', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return null for a non-existent key', () => {
    expect(cache.get('nonexistent')).toBeNull();
  });

  it('should return null for an expired key', () => {
    cache.set('key1', 'value1', 500);
    vi.advanceTimersByTime(600);
    expect(cache.get('key1')).toBeNull();
  });

  it('should evict the least recently used item when full', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4'); // This should evict key1
    expect(cache.get('key1')).toBeNull();
    expect(cache.get('key2')).toBe('value2');
  });

  it('should update the timestamp on get', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.get('key1'); // Access key1 to make it recently used
    cache.set('key4', 'value4'); // This should evict key2
    expect(cache.get('key2')).toBeNull();
    expect(cache.get('key1')).toBe('value1');
  });

  it('should delete a key', () => {
    cache.set('key1', 'value1');
    expect(cache.delete('key1')).toBe(true);
    expect(cache.get('key1')).toBeNull();
  });

  it('should clear the cache', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.clear();
    expect(cache.getSize()).toBe(0);
  });

  it('should check if a key exists', () => {
    cache.set('key1', 'value1');
    expect(cache.has('key1')).toBe(true);
    expect(cache.has('nonexistent')).toBe(false);
  });

  it('should not have an expired key', () => {
    cache.set('key1', 'value1', 500);
    vi.advanceTimersByTime(600);
    expect(cache.has('key1')).toBe(false);
  });

  it('should update stats correctly', () => {
    cache.set('key1', 'value1');
    cache.get('key1'); // hit
    cache.get('nonexistent'); // miss
    const stats = cache.getStats();
    expect(stats.size).toBe(1);
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
    expect(stats.hitRate).toBe(50);
  });
});

describe('ReviewCache', () => {
  let reviewCache: ReviewCache;

  beforeEach(() => {
    reviewCache = new ReviewCache();
  });

  const mockFiles: File[] = [
    { filename: 'file1.ts', fileContent: 'content1', diff: 'diff1', newFile: false, deletedFile: false, lines: [] },
    { filename: 'file2.ts', fileContent: 'content2', diff: 'diff2', newFile: false, deletedFile: false, lines: [] },
  ];

  const mockComments: ReviewComment[] = [
    { filename: 'file1.ts', startLine: 1, endLine: 2, comment: 'comment1' },
    { filename: 'file2.ts', startLine: 3, endLine: 4, comment: 'comment2' },
  ];

  it('should generate a review key', () => {
    const key = reviewCache.generateReviewKey(mockFiles);
    expect(key).toMatch(/^review:/);
  });

  it('should generate a summary key', () => {
    const key = reviewCache.generateSummaryKey(mockComments);
    expect(key).toMatch(/^summary:/);
  });

  it('should generate a title key', () => {
    const key = reviewCache.generateTitleKey(mockFiles);
    expect(key).toMatch(/^title:/);
  });

  it('should cache and retrieve a review', () => {
    reviewCache.setReview(mockFiles, mockComments);
    const cached = reviewCache.getReview(mockFiles);
    expect(cached).toEqual(mockComments);
  });

  it('should cache and retrieve a summary', () => {
    const summary = { summary: 'long summary', shortSummary: 'short' };
    reviewCache.setSummary(mockComments, summary);
    const cached = reviewCache.getSummary(mockComments);
    expect(cached).toEqual(summary);
  });

  it('should cache and retrieve a title', () => {
    const title = 'Test Title';
    reviewCache.setTitle(mockFiles, title);
    const cached = reviewCache.getTitle(mockFiles);
    expect(cached).toBe(title);
  });

  it('should return null for a non-existent review', () => {
    const cached = reviewCache.getReview(mockFiles);
    expect(cached).toBeNull();
  });

  it('should clear all caches', () => {
    reviewCache.setReview(mockFiles, mockComments);
    reviewCache.clear();
    const cached = reviewCache.getReview(mockFiles);
    expect(cached).toBeNull();
  });

  describe('shouldCache', () => {
    it('should return false for less than 2 files', () => {
      const files: File[] = [{ filename: 'file1.ts', fileContent: 'content', diff: 'diff', newFile: false, deletedFile: false, lines: [] }];
      expect(reviewCache.shouldCache(files)).toBe(false);
    });

    it('should return false for more than 20 files', () => {
      const files: File[] = Array(21).fill(0).map((_, i) => ({
        filename: `file${i}.ts`,
        fileContent: 'content',
        diff: 'diff',
        newFile: false,
        deletedFile: false,
        lines: []
      }));
      expect(reviewCache.shouldCache(files)).toBe(false);
    });

    it('should return false for total size over 500KB', () => {
      const largeContent = 'a'.repeat(500001);
      const files: File[] = [{ filename: 'file1.ts', fileContent: largeContent, diff: 'diff', newFile: false, deletedFile: false, lines: [] }];
      expect(reviewCache.shouldCache(files)).toBe(false);
    });

    it('should return true for valid cache conditions', () => {
      const files: File[] = [
        { filename: 'file1.ts', fileContent: 'content', diff: 'diff', newFile: false, deletedFile: false, lines: [] },
        { filename: 'file2.ts', fileContent: 'content', diff: 'diff', newFile: false, deletedFile: false, lines: [] },
      ];
      expect(reviewCache.shouldCache(files)).toBe(true);
    });
  });
});