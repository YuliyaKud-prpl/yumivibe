import { vi, describe, it, expect, beforeEach } from 'vitest';
import { resetRateLimits } from '@/lib/utils/rateLimiter';
import { clear as clearCache } from '@/lib/utils/cache';
import { AppError } from '@/lib/utils/AppError';

const mockSend = vi.fn();

vi.mock('@aws-sdk/client-bedrock-runtime', () => {
  const ClientClass = class {
    send(...args: unknown[]) { return mockSend(...args); }
  };
  const CommandClass = class {
    constructor(public input: unknown) {}
  };
  return {
    BedrockRuntimeClient: ClientClass,
    InvokeModelCommand: CommandClass,
  };
});

import { getClothingSuggestion } from '@/lib/services/aiService';

function makeBedrockResponse(text: string) {
  return {
    body: new TextEncoder().encode(JSON.stringify({
      content: [{ text }],
    })),
  };
}

describe('aiService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetRateLimits();
    clearCache();
    process.env.AWS_ACCESS_KEY_ID = 'fake-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'fake-secret';
    process.env.AWS_REGION = 'us-east-1';
  });

  describe('getClothingSuggestion', () => {
    it('returns Claude Haiku suggestion when API succeeds', async () => {
      mockSend.mockResolvedValueOnce(
        makeBedrockResponse('Wear a light jacket and sunglasses.'),
      );

      const suggestion = await getClothingSuggestion('Tokyo', 22, 'sunny');

      expect(suggestion).toBe('Wear a light jacket and sunglasses.');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('falls back to local suggestion when API error', async () => {
      mockSend.mockRejectedValueOnce(new Error('Service error'));

      const suggestion = await getClothingSuggestion('London', 5, 'rain');

      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
      expect(suggestion).toContain('waterproof');
    });

    it('falls back to local suggestion when no AWS credentials', async () => {
      delete process.env.AWS_ACCESS_KEY_ID;
      delete process.env.AWS_SECRET_ACCESS_KEY;

      const suggestion = await getClothingSuggestion('Paris', 25, 'sunny');

      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
      expect(mockSend).not.toHaveBeenCalled();
    });

    it('falls back when Claude returns empty response', async () => {
      mockSend.mockResolvedValueOnce({
        body: new TextEncoder().encode(JSON.stringify({ content: [] })),
      });

      const suggestion = await getClothingSuggestion('Berlin', 15, 'cloudy');

      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
    });

    it('returns cached result on second call with same params', async () => {
      mockSend.mockResolvedValueOnce(
        makeBedrockResponse('Light layers recommended.'),
      );

      const first = await getClothingSuggestion('Paris', 18, 'cloudy');
      const second = await getClothingSuggestion('Paris', 18, 'cloudy');

      expect(first).toBe(second);
      expect(first).toBe('Light layers recommended.');
      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('makes new API call for different parameters', async () => {
      mockSend
        .mockResolvedValueOnce(makeBedrockResponse('Wear warm coat.'))
        .mockResolvedValueOnce(makeBedrockResponse('Wear shorts.'));

      const cold = await getClothingSuggestion('Moscow', -5, 'snow');
      const hot = await getClothingSuggestion('Miami', 35, 'sunny');

      expect(cold).toBe('Wear warm coat.');
      expect(hot).toBe('Wear shorts.');
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('respects in-memory rate limiting', async () => {
      for (let i = 0; i < 15; i++) {
        mockSend.mockResolvedValueOnce(
          makeBedrockResponse(`Suggestion ${i}`),
        );
        await getClothingSuggestion(`City${i}`, i, 'clear');
      }

      await expect(
        getClothingSuggestion('CityOverLimit', 99, 'clear'),
      ).rejects.toThrow(AppError);
    });

    it('provides temperature-appropriate fallback for cold', async () => {
      delete process.env.AWS_ACCESS_KEY_ID;

      const suggestion = await getClothingSuggestion('Siberia', -10, 'clear');
      expect(suggestion).toContain('freezing');
    });

    it('provides temperature-appropriate fallback for hot', async () => {
      delete process.env.AWS_ACCESS_KEY_ID;

      const suggestion = await getClothingSuggestion('Dubai', 42, 'sunny');
      expect(suggestion).toContain('hot');
    });

    it('provides rain-specific fallback', async () => {
      delete process.env.AWS_ACCESS_KEY_ID;

      const suggestion = await getClothingSuggestion('London', 12, 'rain');
      expect(suggestion).toContain('waterproof');
    });

    it('provides snow-specific fallback', async () => {
      delete process.env.AWS_ACCESS_KEY_ID;

      const suggestion = await getClothingSuggestion('Oslo', -2, 'snow');
      expect(suggestion).toContain('Bundle up');
    });
  });
});
