import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppError } from '@/lib/utils/AppError';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

vi.mock('crypto', () => ({
  randomUUID: vi.fn(() => 'test-uuid-1234'),
}));

vi.mock('@/lib/utils/rateLimiter', () => ({
  checkUnsplashLimit: vi.fn(),
}));

vi.mock('@/lib/utils/cache', () => ({
  get: vi.fn(),
  set: vi.fn(),
  has: vi.fn(),
  UNSPLASH_TTL_MS: 10 * 60 * 1000,
}));

import { searchUnsplash, saveUploadedImage } from '@/lib/services/backgroundService';
import { checkUnsplashLimit } from '@/lib/utils/rateLimiter';
import * as cache from '@/lib/utils/cache';
import { readFile, writeFile, mkdir } from 'fs/promises';

const mockCheckUnsplashLimit = vi.mocked(checkUnsplashLimit);
const mockCacheGet = vi.mocked(cache.get);
const mockCacheSet = vi.mocked(cache.set);
const mockReadFile = vi.mocked(readFile);
const mockWriteFile = vi.mocked(writeFile);
const mockMkdir = vi.mocked(mkdir);

const makeUnsplashApiResponse = () => ({
  results: [
    {
      id: 'photo-1',
      urls: { regular: 'https://unsplash.com/photo1.jpg', small: 'https://unsplash.com/photo1_thumb.jpg' },
      user: { name: 'Alice' },
    },
    {
      id: 'photo-2',
      urls: { regular: 'https://unsplash.com/photo2.jpg', small: 'https://unsplash.com/photo2_thumb.jpg' },
      user: { name: 'Bob' },
    },
  ],
});

const makeExpectedResult = () => ({
  images: [
    { id: 'photo-1', url: 'https://unsplash.com/photo1.jpg', thumbUrl: 'https://unsplash.com/photo1_thumb.jpg', author: 'Alice' },
    { id: 'photo-2', url: 'https://unsplash.com/photo2.jpg', thumbUrl: 'https://unsplash.com/photo2_thumb.jpg', author: 'Bob' },
  ],
});

describe('backgroundService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.UNSPLASH_ACCESS_KEY = 'fake-unsplash-key';
    mockCheckUnsplashLimit.mockReturnValue({ allowed: true, remaining: 49, resetAt: Date.now() + 3600000 });
    mockCacheGet.mockReturnValue(undefined);
  });

  describe('searchUnsplash', () => {
    it('returns mapped images on successful API response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeUnsplashApiResponse()),
      });

      const result = await searchUnsplash('nature');

      expect(result).toEqual(makeExpectedResult());
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('api.unsplash.com/search/photos'),
        expect.objectContaining({
          headers: { Authorization: 'Client-ID fake-unsplash-key' },
        }),
      );
    });

    it('caches results after successful fetch', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(makeUnsplashApiResponse()),
      });

      await searchUnsplash('mountains', 1);

      expect(mockCacheSet).toHaveBeenCalledWith(
        'unsplash:mountains:1',
        makeExpectedResult(),
        cache.UNSPLASH_TTL_MS,
      );
    });

    it('returns cached result without calling fetch', async () => {
      const cachedData = makeExpectedResult();
      mockCacheGet.mockReturnValueOnce(cachedData);

      const result = await searchUnsplash('ocean');

      expect(result).toEqual(cachedData);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockCheckUnsplashLimit).not.toHaveBeenCalled();
    });

    it('throws RATE_LIMIT_UNSPLASH when rate limit exceeded', async () => {
      mockCheckUnsplashLimit.mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 3600000 });

      await expect(searchUnsplash('forest')).rejects.toThrow(AppError);

      try {
        mockCheckUnsplashLimit.mockReturnValueOnce({ allowed: false, remaining: 0, resetAt: Date.now() + 3600000 });
        await searchUnsplash('forest');
      } catch (err) {
        expect((err as AppError).code).toBe('RATE_LIMIT_UNSPLASH');
        expect((err as AppError).status).toBe(429);
      }
    });

    it('throws INTERNAL_ERROR when UNSPLASH_ACCESS_KEY is missing', async () => {
      delete process.env.UNSPLASH_ACCESS_KEY;

      await expect(searchUnsplash('sunset')).rejects.toThrow(AppError);

      try {
        await searchUnsplash('sunset');
      } catch (err) {
        expect((err as AppError).code).toBe('INTERNAL_ERROR');
        expect((err as AppError).message).toContain('not configured');
      }
    });

    it('throws RATE_LIMIT_UNSPLASH when API returns 429', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 429,
      });

      await expect(searchUnsplash('beach')).rejects.toThrow(AppError);

      try {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
        await searchUnsplash('beach');
      } catch (err) {
        expect((err as AppError).code).toBe('RATE_LIMIT_UNSPLASH');
      }
    });

    it('throws EXTERNAL_API_ERROR on non-429 HTTP failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(searchUnsplash('city')).rejects.toThrow(AppError);

      try {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });
        await searchUnsplash('city');
      } catch (err) {
        expect((err as AppError).code).toBe('EXTERNAL_API_ERROR');
        expect((err as AppError).status).toBe(502);
      }
    });

    it('throws EXTERNAL_API_ERROR on network failure', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(searchUnsplash('desert')).rejects.toThrow(AppError);

      try {
        mockFetch.mockRejectedValueOnce(new Error('Network timeout'));
        await searchUnsplash('desert');
      } catch (err) {
        expect((err as AppError).code).toBe('EXTERNAL_API_ERROR');
        expect((err as AppError).message).toContain('Network timeout');
      }
    });
  });

  describe('saveUploadedImage', () => {
    const validFile = {
      filepath: '/tmp/upload-abc123',
      mimetype: 'image/png',
      size: 1024 * 100,
    };

    it('saves file and returns public URL path', async () => {
      const fakeBuffer = Buffer.from('fake-image-data');
      mockMkdir.mockResolvedValueOnce(undefined);
      mockReadFile.mockResolvedValueOnce(fakeBuffer);
      mockWriteFile.mockResolvedValueOnce(undefined);

      const result = await saveUploadedImage(validFile, 'dash-001');

      expect(result).toBe('/uploads/backgrounds/dash-001-test-uuid-1234.png');
      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('uploads'),
        { recursive: true },
      );
      expect(mockReadFile).toHaveBeenCalledWith('/tmp/upload-abc123');
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('dash-001-test-uuid-1234.png'),
        fakeBuffer,
      );
    });

    it('throws INVALID_FILE_TYPE for disallowed MIME type', async () => {
      const gifFile = { filepath: '/tmp/upload.gif', mimetype: 'image/gif', size: 1000 };

      await expect(saveUploadedImage(gifFile, 'dash-002')).rejects.toThrow(AppError);

      try {
        await saveUploadedImage(gifFile, 'dash-002');
      } catch (err) {
        expect((err as AppError).code).toBe('INVALID_FILE_TYPE');
        expect((err as AppError).status).toBe(400);
      }
    });

    it('throws INVALID_FILE_TYPE when mimetype is null', async () => {
      const nullMimeFile = { filepath: '/tmp/upload.bin', mimetype: null, size: 1000 };

      await expect(saveUploadedImage(nullMimeFile, 'dash-003')).rejects.toThrow(AppError);

      try {
        await saveUploadedImage(nullMimeFile, 'dash-003');
      } catch (err) {
        expect((err as AppError).code).toBe('INVALID_FILE_TYPE');
      }
    });

    it('throws FILE_TOO_LARGE when file exceeds 5MB', async () => {
      const largeFile = { filepath: '/tmp/upload-large.png', mimetype: 'image/png', size: 6 * 1024 * 1024 };

      await expect(saveUploadedImage(largeFile, 'dash-004')).rejects.toThrow(AppError);

      try {
        await saveUploadedImage(largeFile, 'dash-004');
      } catch (err) {
        expect((err as AppError).code).toBe('FILE_TOO_LARGE');
        expect((err as AppError).status).toBe(400);
      }
    });

    it('throws INTERNAL_ERROR when filesystem operation fails', async () => {
      mockMkdir.mockRejectedValueOnce(new Error('EACCES: permission denied'));

      await expect(saveUploadedImage(validFile, 'dash-005')).rejects.toThrow(AppError);

      try {
        mockMkdir.mockRejectedValueOnce(new Error('EACCES'));
        await saveUploadedImage(validFile, 'dash-005');
      } catch (err) {
        expect((err as AppError).code).toBe('INTERNAL_ERROR');
        expect((err as AppError).message).toContain('Failed to save uploaded image');
      }
    });
  });
});
