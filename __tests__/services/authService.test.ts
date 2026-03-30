import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { QueryResult, QueryResultRow } from 'pg';

const mockQuery = vi.fn();

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  pool: { query: vi.fn() },
}));

const makeResult = <T extends QueryResultRow>(rows: T[]): QueryResult<T> =>
  ({ rows, rowCount: rows.length }) as QueryResult<T>;

const FAKE_USER_ROW = {
  id: 'u-001',
  email: 'test@example.com',
  password_hash: '',
  display_name: 'Test',
  role: 'user',
  created_at: '2025-01-01',
  updated_at: '2025-01-01',
};

import { AppError } from '@/lib/utils/AppError';
import { register, login, verifyToken } from '@/lib/services/authService';

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret-key-that-is-long-enough-for-hs256';
  });

  describe('register', () => {
    it('creates user with hashed password and returns JWT', async () => {
      mockQuery
        .mockResolvedValueOnce(makeResult([]))
        .mockResolvedValueOnce(makeResult([{ ...FAKE_USER_ROW }]));

      const result = await register('test@example.com', 'password123', 'Test');

      expect(result.user.email).toBe('test@example.com');
      expect(result.user.displayName).toBe('Test');
      expect(result.user.role).toBe('user');
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.')).toHaveLength(3);

      const insertCall = mockQuery.mock.calls[1];
      const storedHash = insertCall[1][1] as string;
      expect(storedHash).not.toBe('password123');
      expect(storedHash).toContain(':');
    });

    it('fails on duplicate email', async () => {
      mockQuery.mockResolvedValueOnce(
        makeResult([{ id: 'u-existing' }]),
      );

      try {
        await register('dup@example.com', 'password123');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('VALIDATION_ERROR');
        expect((err as AppError).message).toContain('already registered');
      }
    });

    it('uses default display name when not provided', async () => {
      mockQuery
        .mockResolvedValueOnce(makeResult([]))
        .mockResolvedValueOnce(
          makeResult([{ ...FAKE_USER_ROW, display_name: 'User' }]),
        );

      const result = await register('no-name@example.com', 'password123');

      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[1][2]).toBe('User');
      expect(result.user.displayName).toBe('User');
    });

    it('throws DATABASE_ERROR on query failure', async () => {
      mockQuery
        .mockResolvedValueOnce(makeResult([]))
        .mockRejectedValueOnce(new Error('connection lost'));

      try {
        await register('fail@example.com', 'password123');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('login', () => {
    it('succeeds with correct password', async () => {
      // Register first to get a valid hash
      mockQuery
        .mockResolvedValueOnce(makeResult([]))
        .mockResolvedValueOnce(makeResult([{ ...FAKE_USER_ROW }]));

      await register('login@example.com', 'correctpass');
      const insertCall = mockQuery.mock.calls[1];
      const passwordHash = insertCall[1][1] as string;

      mockQuery.mockResolvedValueOnce(
        makeResult([{ ...FAKE_USER_ROW, password_hash: passwordHash }]),
      );

      const result = await login('login@example.com', 'correctpass');
      expect(result.user.email).toBe('test@example.com');
      expect(typeof result.token).toBe('string');
      expect(result.token.split('.')).toHaveLength(3);
    });

    it('fails with wrong password', async () => {
      mockQuery
        .mockResolvedValueOnce(makeResult([]))
        .mockResolvedValueOnce(makeResult([{ ...FAKE_USER_ROW }]));

      await register('wrong@example.com', 'correctpass');
      const insertCall = mockQuery.mock.calls[1];
      const passwordHash = insertCall[1][1] as string;

      mockQuery.mockResolvedValueOnce(
        makeResult([{ ...FAKE_USER_ROW, password_hash: passwordHash }]),
      );

      try {
        await login('wrong@example.com', 'wrongpassword');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('UNAUTHORIZED');
      }
    });

    it('fails when user not found', async () => {
      mockQuery.mockResolvedValueOnce(makeResult([]));

      try {
        await login('ghost@example.com', 'password123');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('UNAUTHORIZED');
      }
    });

    it('throws DATABASE_ERROR on query failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('db down'));

      try {
        await login('db-fail@example.com', 'pass');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('DATABASE_ERROR');
      }
    });
  });

  describe('verifyToken', () => {
    it('returns payload for valid token', async () => {
      mockQuery
        .mockResolvedValueOnce(makeResult([]))
        .mockResolvedValueOnce(makeResult([{ ...FAKE_USER_ROW }]));

      const { token } = await register('verify@example.com', 'password123');

      const payload = await verifyToken(token);
      expect(payload.userId).toBe('u-001');
      expect(payload.role).toBe('user');
    });

    it('fails on invalid token', async () => {
      try {
        await verifyToken('totally.invalid.token');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('UNAUTHORIZED');
      }
    });

    it('fails on empty token', async () => {
      try {
        await verifyToken('');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('UNAUTHORIZED');
      }
    });

    it('fails when JWT_SECRET is not set', async () => {
      delete process.env.JWT_SECRET;

      try {
        await verifyToken('some-token');
        expect.unreachable('should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
      }
    });
  });
});
