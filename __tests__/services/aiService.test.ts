import { vi, describe, it, expect, beforeEach } from 'vitest';
import { resetRateLimits } from '@/lib/utils/rateLimiter';
import { clear as clearCache } from '@/lib/utils/cache';
import { AppError } from '@/lib/utils/AppError';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { getClothingSuggestion } from '@/lib/services/aiService';

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    clearCache();
    process.env.GEMINI_API_KEY = 'fake-gemini-key';
  });

  const makeGeminiResponse = (text: string) => ({
    ok: true,
    status: 200,
    json: () =>
      Promise.resolve({
        candidates: [
          {
            content: {
              parts: [{ text }],
            },
          },
        ],
      }),
  });

  describe('getClothingSuggestion', () => {
    it('returns Gemini suggestion when API succeeds', async () => {
      mockFetch.mockResolvedValueOnce(
        makeGeminiResponse('Wear a light jacket and sunglasses.'),
      );

      const suggestion = await getClothingSuggestion('Tokyo', 22, 'sunny');

      expect(suggestion).toBe('Wear a light jacket and sunglasses.');
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('generativelanguage.googleapis.com'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('falls back to local suggestion when API network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const suggestion = await getClothingSuggestion('London', 5, 'rain');

      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
      expect(suggestion).toContain('waterproof');
    });

    it('falls back to local suggestion when no API key', async () => {
      delete process.env.GEMINI_API_KEY;

      const suggestion = await getClothingSuggestion('Paris', 25, 'sunny');

      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('falls back when Gemini returns empty response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ candidates: [] }),
      });

      const suggestion = await getClothingSuggestion('Berlin', 15, 'cloudy');

      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
    });

    it('throws rate limit error when Gemini returns 429', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      await expect(
        getClothingSuggestion('NYC', 20, 'clear'),
      ).rejects.toThrow(AppError);

      try {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 429,
        });
        resetRateLimits();
        await getClothingSuggestion('NYC', 20, 'clear');
      } catch (err) {
        expect((err as AppError).code).toBe('RATE_LIMIT_GEMINI');
      }
    });

    it('throws external API error on non-429 failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(
        getClothingSuggestion('Rome', 30, 'sunny'),
      ).rejects.toThrow(AppError);
    });

    it('returns cached result on second call with same params', async () => {
      mockFetch.mockResolvedValueOnce(
        makeGeminiResponse('Light layers recommended.'),
      );

      const first = await getClothingSuggestion('Paris', 18, 'cloudy');
      const second = await getClothingSuggestion('Paris', 18, 'cloudy');

      expect(first).toBe(second);
      expect(first).toBe('Light layers recommended.');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('makes new API call for different parameters', async () => {
      mockFetch
        .mockResolvedValueOnce(makeGeminiResponse('Wear warm coat.'))
        .mockResolvedValueOnce(makeGeminiResponse('Wear shorts.'));

      const cold = await getClothingSuggestion('Moscow', -5, 'snow');
      const hot = await getClothingSuggestion('Miami', 35, 'sunny');

      expect(cold).toBe('Wear warm coat.');
      expect(hot).toBe('Wear shorts.');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('respects in-memory rate limiting', async () => {
      // Exhaust the Gemini rate limit (15 RPM)
      for (let i = 0; i < 15; i++) {
        mockFetch.mockResolvedValueOnce(
          makeGeminiResponse(`Suggestion ${i}`),
        );
        // Use different params to avoid cache
        await getClothingSuggestion(`City${i}`, i, 'clear');
      }

      // 16th call should be rate limited
      await expect(
        getClothingSuggestion('CityOverLimit', 99, 'clear'),
      ).rejects.toThrow(AppError);
    });

    it('provides temperature-appropriate fallback for cold', async () => {
      delete process.env.GEMINI_API_KEY;

      const suggestion = await getClothingSuggestion('Siberia', -10, 'clear');
      expect(suggestion).toContain('freezing');
    });

    it('provides temperature-appropriate fallback for hot', async () => {
      delete process.env.GEMINI_API_KEY;

      const suggestion = await getClothingSuggestion('Dubai', 42, 'sunny');
      expect(suggestion).toContain('hot');
    });

    it('provides rain-specific fallback', async () => {
      delete process.env.GEMINI_API_KEY;

      const suggestion = await getClothingSuggestion('London', 12, 'rain');
      expect(suggestion).toContain('waterproof');
    });

    it('provides snow-specific fallback', async () => {
      delete process.env.GEMINI_API_KEY;

      const suggestion = await getClothingSuggestion('Oslo', -2, 'snow');
      expect(suggestion).toContain('Bundle up');
    });
  });
});
