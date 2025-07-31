import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { LRUCache, ReviewCache } from '../src/utils/cache';
import { File, ReviewComment } from '../src/types';

describe('LRUCache', () => {
  let cache: LRUCache<string>;

  beforeEach(() => {
    vi.useFakeTimers();
    cache = new LRUCache<string>(3);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should set and get a value', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('should return null for a non-existent key', () => {
    expect(cache.get('key1')).toBe(null);
  });

  it('should overwrite an existing value', () => {
    cache.set('key1', 'value1');
    cache.set('key1', 'value2');
    expect(cache.get('key1')).toBe('value2');
  });

  it('should not exceed the max size', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.set('key4', 'value4');
    expect(cache.getSize()).toBe(3);
  });

  it('should evict the least recently used item', () => {
    cache.set('key1', 'value1');
    cache.set('key2', 'value2');
    cache.set('key3', 'value3');
    cache.get('key1'); // Access key1 to make it the most recently used
    cache.set('key4', 'value4');
    expect(cache.get('key2')).toBe(null);
  });

  it('should delete a value', () => {
    cache.set('key1', 'value1');
    cache.delete('key1');
    expect(cache.get('key1')).toBe(null);
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
    expect(cache.has('key2')).toBe(false);
  });

  it('should return null for an expired key', () => {
    cache.set('key1', 'value1', 1000);
    vi.advanceTimersByTime(2000);
    expect(cache.get('key1')).toBe(null);
  });
});

describe('ReviewCache', () => {
  let reviewCache: ReviewCache;
  const mockFiles: File[] = [
    {
      filename: 'file1.ts',
      fileContent: 'content1',
      diff: 'diff1',
      newFile: false,
      deletedFile: false,
      renamedFile: false,
    },
    {
      filename: 'file2.ts',
      fileContent: 'content2',
      diff: 'diff2',
      newFile: false,
      deletedFile: false,
      renamedFile: false,
    },
  ];
  const mockComments: ReviewComment[] = [
    {
      filename: 'file1.ts',
      startLine: 1,
      endLine: 2,
      comment: 'comment1',
      type: 'issue',
    },
    {
      filename: 'file2.ts',
      startLine: 3,
      endLine: 4,
      comment: 'comment2',
      type: 'suggestion',
    },
  ];

  beforeEach(() => {
    reviewCache = new ReviewCache();
  });

  it('should generate a consistent review key', () => {
    const key1 = reviewCache.generateReviewKey(mockFiles);
    const key2 = reviewCache.generateReviewKey([...mockFiles].reverse());
    expect(key1).toBe(key2);
  });

  it('should generate a consistent summary key', () => {
    const key1 = reviewCache.generateSummaryKey(mockComments);
    const key2 = reviewCache.generateSummaryKey([...mockComments].reverse());
    expect(key1).toBe(key2);
  });

  it('should generate a consistent title key', () => {
    const key1 = reviewCache.generateTitleKey(mockFiles);
    const key2 = reviewCache.generateTitleKey([...mockFiles].reverse());
    expect(key1).toBe(key2);
  });

  it('should set and get a review', () => {
    reviewCache.setReview(mockFiles, mockComments);
    const cachedComments = reviewCache.getReview(mockFiles);
    expect(cachedComments).toEqual(mockComments);
  });

  it('should set and get a summary', () => {
    const summary = { summary: 'summary', shortSummary: 'short' };
    reviewCache.setSummary(mockComments, summary);
    const cachedSummary = reviewCache.getSummary(mockComments);
    expect(cachedSummary).toEqual(summary);
  });

  it('should set and get a title', () => {
    const title = 'Test Title';
    reviewCache.setTitle(mockFiles, title);
    const cachedTitle = reviewCache.getTitle(mockFiles);
    expect(cachedTitle).toBe(title);
  });

  it('should return false for shouldCache with too few files', () => {
    const files: File[] = [
      {
        filename: 'file1.ts',
        fileContent: 'c',
        diff: 'd',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
    ];
    expect(reviewCache.shouldCache(files)).toBe(false);
  });

  it('should return false for shouldCache with too many files', () => {
    const files: File[] = Array(21).fill({
      filename: 'f.ts',
      fileContent: 'c',
      diff: 'd',
      newFile: false,
      deletedFile: false,
      renamedFile: false,
    });
    expect(reviewCache.shouldCache(files)).toBe(false);
  });

  it('should return false for shouldCache with oversized files', () => {
    const files: File[] = [
      {
        filename: 'f1.ts',
        fileContent: 'c'.repeat(300000),
        diff: 'd',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
      {
        filename: 'f2.ts',
        fileContent: 'c'.repeat(300000),
        diff: 'd',
        newFile: false,
        deletedFile: false,
        renamedFile: false,
      },
    ];
    expect(reviewCache.shouldCache(files)).toBe(false);
  });

  it('should return true for shouldCache with valid files', () => {
    expect(reviewCache.shouldCache(mockFiles)).toBe(true);
  });
});
