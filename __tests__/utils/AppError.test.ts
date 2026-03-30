import { describe, it, expect } from 'vitest';
import { AppError } from '@/lib/utils/AppError';

describe('AppError', () => {
  describe('constructor', () => {
    it('creates an error with all properties', () => {
      const err = new AppError('VALIDATION_ERROR', 'bad input', 400, { field: 'name' });
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.message).toBe('bad input');
      expect(err.status).toBe(400);
      expect(err.details).toEqual({ field: 'name' });
      expect(err.name).toBe('AppError');
    });

    it('creates an error without details', () => {
      const err = new AppError('INTERNAL_ERROR', 'oops', 500);
      expect(err.details).toBeUndefined();
    });

    it('extends Error', () => {
      const err = new AppError('INTERNAL_ERROR', 'oops', 500);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(AppError);
    });
  });

  describe('factory: validation', () => {
    it('returns 400 VALIDATION_ERROR with default message', () => {
      const err = AppError.validation();
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.status).toBe(400);
      expect(err.message).toBe('Validation failed');
    });

    it('accepts custom message and details', () => {
      const err = AppError.validation('bad name', { field: 'name' });
      expect(err.message).toBe('bad name');
      expect(err.details).toEqual({ field: 'name' });
    });
  });

  describe('factory: invalidBlockType', () => {
    it('returns 400 with block type in details', () => {
      const err = AppError.invalidBlockType('calendar');
      expect(err.code).toBe('INVALID_BLOCK_TYPE');
      expect(err.status).toBe(400);
      expect(err.message).toContain('calendar');
      expect(err.details).toEqual({ type: 'calendar' });
    });
  });

  describe('factory: invalidFileType', () => {
    it('returns 400 with mime type in details', () => {
      const err = AppError.invalidFileType('application/pdf');
      expect(err.code).toBe('INVALID_FILE_TYPE');
      expect(err.status).toBe(400);
      expect(err.message).toContain('application/pdf');
      expect(err.details).toEqual({ mimeType: 'application/pdf' });
    });
  });

  describe('factory: fileTooLarge', () => {
    it('returns 400 with size info', () => {
      const err = AppError.fileTooLarge(10_000_000);
      expect(err.code).toBe('FILE_TOO_LARGE');
      expect(err.status).toBe(400);
      expect(err.details).toEqual({
        sizeBytes: 10_000_000,
        maxBytes: 5 * 1024 * 1024,
      });
    });
  });

  describe('factory: dashboardNotFound', () => {
    it('returns 404 with dashboard id', () => {
      const err = AppError.dashboardNotFound('abc-123');
      expect(err.code).toBe('DASHBOARD_NOT_FOUND');
      expect(err.status).toBe(404);
      expect(err.details).toEqual({ dashboardId: 'abc-123' });
    });
  });

  describe('factory: blockNotFound', () => {
    it('returns 404 with block id', () => {
      const err = AppError.blockNotFound('blk-456');
      expect(err.code).toBe('BLOCK_NOT_FOUND');
      expect(err.status).toBe(404);
      expect(err.details).toEqual({ blockId: 'blk-456' });
    });
  });

  describe('rate limit factories', () => {
    it('rateLimitGemini returns 429', () => {
      const err = AppError.rateLimitGemini();
      expect(err.code).toBe('RATE_LIMIT_GEMINI');
      expect(err.status).toBe(429);
    });

    it('rateLimitUnsplash returns 429', () => {
      const err = AppError.rateLimitUnsplash();
      expect(err.code).toBe('RATE_LIMIT_UNSPLASH');
      expect(err.status).toBe(429);
    });

    it('rateLimitWeather returns 429', () => {
      const err = AppError.rateLimitWeather();
      expect(err.code).toBe('RATE_LIMIT_WEATHER');
      expect(err.status).toBe(429);
    });
  });

  describe('factory: externalApiError', () => {
    it('returns 502 with service name', () => {
      const err = AppError.externalApiError('Gemini', 'timeout');
      expect(err.code).toBe('EXTERNAL_API_ERROR');
      expect(err.status).toBe(502);
      expect(err.message).toContain('Gemini');
      expect(err.message).toContain('timeout');
      expect(err.details).toEqual({ service: 'Gemini' });
    });
  });

  describe('factory: databaseError', () => {
    it('returns 500 with default message', () => {
      const err = AppError.databaseError();
      expect(err.code).toBe('DATABASE_ERROR');
      expect(err.status).toBe(500);
      expect(err.message).toBe('A database error occurred');
    });

    it('accepts custom message', () => {
      const err = AppError.databaseError('connection lost');
      expect(err.message).toBe('connection lost');
    });
  });

  describe('factory: internal', () => {
    it('returns 500 with default message', () => {
      const err = AppError.internal();
      expect(err.code).toBe('INTERNAL_ERROR');
      expect(err.status).toBe(500);
      expect(err.message).toBe('An internal error occurred');
    });
  });

  describe('factory: unauthorized', () => {
    it('returns 401 with default message', () => {
      const err = AppError.unauthorized();
      expect(err.code).toBe('UNAUTHORIZED');
      expect(err.status).toBe(401);
      expect(err.message).toBe('Authentication required');
    });
  });

  describe('factory: forbidden', () => {
    it('returns 403 with default message', () => {
      const err = AppError.forbidden();
      expect(err.code).toBe('FORBIDDEN');
      expect(err.status).toBe(403);
      expect(err.message).toBe('Access denied');
    });
  });

  describe('toJSON', () => {
    it('serializes error with details', () => {
      const err = AppError.validation('bad', { field: 'x' });
      const json = err.toJSON();
      expect(json).toEqual({
        code: 'VALIDATION_ERROR',
        message: 'bad',
        status: 400,
        details: { field: 'x' },
      });
    });

    it('serializes error without details', () => {
      const err = AppError.internal();
      const json = err.toJSON();
      expect(json).toEqual({
        code: 'INTERNAL_ERROR',
        message: 'An internal error occurred',
        status: 500,
      });
      expect(json).not.toHaveProperty('details');
    });
  });
});
