import { describe, it, expect } from 'vitest';
import { success, error, fromCatch } from '@/lib/utils/apiResponse';
import { AppError } from '@/lib/utils/AppError';

describe('apiResponse', () => {
  describe('success', () => {
    it('returns JSON envelope with data and default 200 status', async () => {
      const res = success({ id: '123', name: 'test' });
      const body = await res.json();
      expect(res.status).toBe(200);
      expect(body).toEqual({ data: { id: '123', name: 'test' } });
    });

    it('accepts custom status code', async () => {
      const res = success({ created: true }, 201);
      const body = await res.json();
      expect(res.status).toBe(201);
      expect(body).toEqual({ data: { created: true } });
    });

    it('handles null data', async () => {
      const res = success(null);
      const body = await res.json();
      expect(body).toEqual({ data: null });
    });

    it('handles array data', async () => {
      const res = success([1, 2, 3]);
      const body = await res.json();
      expect(body).toEqual({ data: [1, 2, 3] });
    });

    it('handles empty object data', async () => {
      const res = success({});
      const body = await res.json();
      expect(body).toEqual({ data: {} });
    });
  });

  describe('error', () => {
    it('returns error envelope with correct status', async () => {
      const appError = AppError.dashboardNotFound('abc-123');
      const res = error(appError);
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body).toEqual({
        error: {
          code: 'DASHBOARD_NOT_FOUND',
          message: 'Dashboard not found: abc-123',
          status: 404,
          details: { dashboardId: 'abc-123' },
        },
      });
    });

    it('omits details when not present', async () => {
      const appError = AppError.internal();
      const res = error(appError);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).not.toHaveProperty('details');
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });

    it('handles 429 rate limit errors', async () => {
      const appError = AppError.rateLimitGemini();
      const res = error(appError);
      const body = await res.json();

      expect(res.status).toBe(429);
      expect(body.error.code).toBe('RATE_LIMIT_GEMINI');
    });
  });

  describe('fromCatch', () => {
    it('passes through AppError instances', async () => {
      const appError = AppError.validation('bad input');
      const res = fromCatch(appError);
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.message).toBe('bad input');
    });

    it('wraps standard Error as INTERNAL_ERROR', async () => {
      const stdError = new Error('something broke');
      const res = fromCatch(stdError);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('something broke');
    });

    it('handles non-Error thrown values', async () => {
      const res = fromCatch('string error');
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error.code).toBe('INTERNAL_ERROR');
      expect(body.error.message).toBe('An unexpected error occurred');
    });

    it('handles null thrown value', async () => {
      const res = fromCatch(null);
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error.code).toBe('INTERNAL_ERROR');
    });
  });
});
