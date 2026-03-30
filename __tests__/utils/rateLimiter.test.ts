import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  checkRateLimit,
  checkGeminiLimit,
  checkUnsplashLimit,
  checkWeatherLimit,
  resetRateLimits,
} from '@/lib/utils/rateLimiter';

describe('rateLimiter', () => {
  beforeEach(() => {
    resetRateLimits();
    vi.restoreAllMocks();
  });

  describe('checkRateLimit', () => {
    it('allows first request and shows correct remaining', () => {
      const result = checkRateLimit('test-key', 5, 60_000);
      expect(result.allowed).toBe(true);
      expect(result.remaining).toBe(4);
      expect(result.resetAt).toBeGreaterThan(Date.now() - 1000);
    });

    it('allows requests under the limit', () => {
      for (let i = 0; i < 4; i++) {
        const result = checkRateLimit('under-limit', 5, 60_000);
        expect(result.allowed).toBe(true);
      }
      const final = checkRateLimit('under-limit', 5, 60_000);
      expect(final.allowed).toBe(true);
      expect(final.remaining).toBe(0);
    });

    it('blocks requests over the limit', () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimit('over-limit', 3, 60_000);
      }
      const blocked = checkRateLimit('over-limit', 3, 60_000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('resets after window expires', () => {
      const now = Date.now();
      vi.spyOn(Date, 'now').mockReturnValue(now);

      for (let i = 0; i < 3; i++) {
        checkRateLimit('expire-key', 3, 1000);
      }
      const blocked = checkRateLimit('expire-key', 3, 1000);
      expect(blocked.allowed).toBe(false);

      vi.spyOn(Date, 'now').mockReturnValue(now + 1001);

      const afterReset = checkRateLimit('expire-key', 3, 1000);
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.remaining).toBe(2);
    });

    it('tracks different keys independently', () => {
      for (let i = 0; i < 2; i++) {
        checkRateLimit('key-a', 2, 60_000);
      }
      const blockedA = checkRateLimit('key-a', 2, 60_000);
      expect(blockedA.allowed).toBe(false);

      const allowedB = checkRateLimit('key-b', 2, 60_000);
      expect(allowedB.allowed).toBe(true);
      expect(allowedB.remaining).toBe(1);
    });

    it('remaining decreases with each request', () => {
      const r1 = checkRateLimit('decrement', 5, 60_000);
      expect(r1.remaining).toBe(4);

      const r2 = checkRateLimit('decrement', 5, 60_000);
      expect(r2.remaining).toBe(3);

      const r3 = checkRateLimit('decrement', 5, 60_000);
      expect(r3.remaining).toBe(2);
    });
  });

  describe('checkGeminiLimit', () => {
    it('allows up to 15 requests per minute', () => {
      for (let i = 0; i < 15; i++) {
        const result = checkGeminiLimit();
        expect(result.allowed).toBe(true);
      }
      const blocked = checkGeminiLimit();
      expect(blocked.allowed).toBe(false);
    });

    it('uses custom client key', () => {
      for (let i = 0; i < 15; i++) {
        checkGeminiLimit('client-1');
      }
      const blockedClient1 = checkGeminiLimit('client-1');
      expect(blockedClient1.allowed).toBe(false);

      const allowedClient2 = checkGeminiLimit('client-2');
      expect(allowedClient2.allowed).toBe(true);
    });
  });

  describe('checkUnsplashLimit', () => {
    it('allows up to 50 requests per hour', () => {
      for (let i = 0; i < 50; i++) {
        const result = checkUnsplashLimit();
        expect(result.allowed).toBe(true);
      }
      const blocked = checkUnsplashLimit();
      expect(blocked.allowed).toBe(false);
    });
  });

  describe('checkWeatherLimit', () => {
    it('allows up to 1000 requests per day', () => {
      for (let i = 0; i < 1000; i++) {
        checkWeatherLimit();
      }
      const blocked = checkWeatherLimit();
      expect(blocked.allowed).toBe(false);
    });
  });

  describe('resetRateLimits', () => {
    it('clears all tracked limits', () => {
      for (let i = 0; i < 3; i++) {
        checkRateLimit('reset-test', 3, 60_000);
      }
      expect(checkRateLimit('reset-test', 3, 60_000).allowed).toBe(false);

      resetRateLimits();

      expect(checkRateLimit('reset-test', 3, 60_000).allowed).toBe(true);
    });
  });
});
