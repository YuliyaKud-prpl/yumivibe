import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  updateUserSchema,
} from '@/lib/validators/authSchemas';

describe('authSchemas', () => {
  describe('registerSchema', () => {
    it('accepts valid registration with email and password', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'secure1pass',
      });
      expect(result.success).toBe(true);
    });

    it('accepts valid registration with displayName', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'secure1pass',
        displayName: 'Yuliya',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBe('Yuliya');
      }
    });

    it('rejects missing email', () => {
      const result = registerSchema.safeParse({
        password: 'secure1pass',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const result = registerSchema.safeParse({
        email: 'not-an-email',
        password: 'secure1pass',
      });
      expect(result.success).toBe(false);
    });

    it('rejects email without domain', () => {
      const result = registerSchema.safeParse({
        email: 'user@',
        password: 'secure1pass',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password shorter than 8 characters', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'short',
      });
      expect(result.success).toBe(false);
    });

    it('accepts password exactly 8 characters with complexity', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'abcdef1x',
      });
      expect(result.success).toBe(true);
    });

    it('rejects password without letters', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: '12345678',
      });
      expect(result.success).toBe(false);
    });

    it('rejects password without digit', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'nodigitshere',
      });
      expect(result.success).toBe(false);
    });

    it('rejects displayName longer than 100 characters', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'secure1pass',
        displayName: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('accepts empty object for displayName (optional)', () => {
      const result = registerSchema.safeParse({
        email: 'user@example.com',
        password: 'secure1pass',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.displayName).toBeUndefined();
      }
    });
  });

  describe('loginSchema', () => {
    it('accepts valid login credentials', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'mypassword',
      });
      expect(result.success).toBe(true);
    });

    it('rejects missing email', () => {
      const result = loginSchema.safeParse({
        password: 'mypassword',
      });
      expect(result.success).toBe(false);
    });

    it('rejects missing password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid email format', () => {
      const result = loginSchema.safeParse({
        email: 'bad-email',
        password: 'mypassword',
      });
      expect(result.success).toBe(false);
    });

    it('rejects empty password', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: '',
      });
      expect(result.success).toBe(false);
    });

    it('accepts short password (min 1 for login)', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'x',
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty object', () => {
      const result = loginSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('updateUserSchema', () => {
    it('accepts empty object (all optional)', () => {
      const result = updateUserSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts displayName update', () => {
      const result = updateUserSchema.safeParse({
        displayName: 'New Name',
      });
      expect(result.success).toBe(true);
    });

    it('ignores unknown fields like role', () => {
      const result = updateUserSchema.safeParse({ role: 'admin' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).not.toHaveProperty('role');
      }
    });

    it('rejects displayName longer than 100 characters', () => {
      const result = updateUserSchema.safeParse({
        displayName: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });
});
