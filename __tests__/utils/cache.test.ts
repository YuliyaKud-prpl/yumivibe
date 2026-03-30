import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  get,
  set,
  has,
  del,
  clear,
  WEATHER_TTL_MS,
  UNSPLASH_TTL_MS,
} from '@/lib/utils/cache';

describe('cache', () => {
  beforeEach(() => {
    clear();
    vi.restoreAllMocks();
  });

  describe('set and get', () => {
    it('stores and retrieves a value', () => {
      set('key1', { temp: 22 }, 60_000);
      const value = get<{ temp: number }>('key1');
      expect(value).toEqual({ temp: 22 });
    });

    it('stores string values', () => {
      set('str', 'hello', 60_000);
      expect(get<string>('str')).toBe('hello');
    });

    it('stores array values', () => {
      set('arr', [1, 2, 3], 60_000);
      expect(get<number[]>('arr')).toEqual([1, 2, 3]);
    });

    it('stores null values', () => {
      set('nil', null, 60_000);
      expect(get('nil')).toBeNull();
    });

    it('returns undefined for missing keys', () => {
      expect(get('nonexistent')).toBeUndefined();
    });

    it('overwrites existing values', () => {
      set('key', 'first', 60_000);
      expect(get<string>('key')).toBe('first');

      set('key', 'second', 60_000);
      expect(get<string>('key')).toBe('second');
    });
  });

  describe('TTL expiration', () => {
    it('returns undefined for expired entries', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      set('expiring', 'data', 1000);
      expect(get<string>('expiring')).toBe('data');

      vi.spyOn(Date, 'now').mockReturnValue(now + 1001);
      expect(get('expiring')).toBeUndefined();
    });

    it('returns value just before expiration', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      set('almost', 'data', 1000);

      vi.spyOn(Date, 'now').mockReturnValue(now + 999);
      expect(get<string>('almost')).toBe('data');
    });

    it('returns undefined at exact expiration time', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      set('exact', 'data', 1000);

      vi.spyOn(Date, 'now').mockReturnValue(now + 1000);
      expect(get('exact')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('returns true for existing non-expired key', () => {
      set('exists', 'val', 60_000);
      expect(has('exists')).toBe(true);
    });

    it('returns false for missing key', () => {
      expect(has('missing')).toBe(false);
    });

    it('returns false for expired key', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      set('expired', 'val', 500);

      vi.spyOn(Date, 'now').mockReturnValue(now + 501);
      expect(has('expired')).toBe(false);
    });
  });

  describe('del', () => {
    it('removes an existing key and returns true', () => {
      set('removable', 'val', 60_000);
      expect(del('removable')).toBe(true);
      expect(get('removable')).toBeUndefined();
    });

    it('returns false for non-existing key', () => {
      expect(del('no-such-key')).toBe(false);
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      set('a', 1, 60_000);
      set('b', 2, 60_000);
      set('c', 3, 60_000);

      clear();

      expect(get('a')).toBeUndefined();
      expect(get('b')).toBeUndefined();
      expect(get('c')).toBeUndefined();
    });
  });

  describe('TTL constants', () => {
    it('WEATHER_TTL_MS is 15 minutes', () => {
      expect(WEATHER_TTL_MS).toBe(15 * 60 * 1000);
    });

    it('UNSPLASH_TTL_MS is 10 minutes', () => {
      expect(UNSPLASH_TTL_MS).toBe(10 * 60 * 1000);
    });
  });
});
