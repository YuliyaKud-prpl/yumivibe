import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockRegister = vi.fn();
const mockLogin = vi.fn();

vi.mock('@/lib/services/authService', () => ({
  register: (...args: unknown[]) => mockRegister(...args),
  login: (...args: unknown[]) => mockLogin(...args),
  verifyToken: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() },
}));

import { AppError } from '@/lib/utils/AppError';

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('succeeds with valid data', async () => {
    mockRegister.mockResolvedValue({
      token: 'jwt-token-123',
      user: { id: 'u-001', email: 'test@example.com' },
    });

    const { POST } = await import('@/app/api/auth/register/route');
    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'secure1pass',
        displayName: 'Test User',
      }),
    });

    const res = await POST(request as never);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.token).toBe('jwt-token-123');
    expect(body.data.user.email).toBe('test@example.com');
    expect(mockRegister).toHaveBeenCalledWith(
      'test@example.com',
      'secure1pass',
      'Test User',
    );
  });

  it('fails with invalid email', async () => {
    const { POST } = await import('@/app/api/auth/register/route');
    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'not-an-email',
        password: 'secure1pass',
      }),
    });

    const res = await POST(request as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('fails with short password', async () => {
    const { POST } = await import('@/app/api/auth/register/route');
    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'short',
      }),
    });

    const res = await POST(request as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('fails with missing email', async () => {
    const { POST } = await import('@/app/api/auth/register/route');
    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ password: 'secure1pass' }),
    });

    const res = await POST(request as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('handles service error (duplicate email)', async () => {
    mockRegister.mockRejectedValue(
      AppError.validation('Email already registered'),
    );

    const { POST } = await import('@/app/api/auth/register/route');
    const request = new Request('http://localhost/api/auth/register', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'existing@example.com',
        password: 'secure1pass',
      }),
    });

    const res = await POST(request as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('succeeds with valid credentials', async () => {
    mockLogin.mockResolvedValue({
      token: 'jwt-token-456',
      user: { id: 'u-001', email: 'test@example.com' },
    });

    const { POST } = await import('@/app/api/auth/login/route');
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'secure1pass',
      }),
    });

    const res = await POST(request as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.token).toBe('jwt-token-456');
    expect(mockLogin).toHaveBeenCalledWith(
      'test@example.com',
      'secure1pass',
    );
  });

  it('fails with wrong password', async () => {
    mockLogin.mockRejectedValue(
      AppError.unauthorized('Invalid email or password'),
    );

    const { POST } = await import('@/app/api/auth/login/route');
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpass',
      }),
    });

    const res = await POST(request as never);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });

  it('fails with missing fields', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });

    const res = await POST(request as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('fails with invalid email format', async () => {
    const { POST } = await import('@/app/api/auth/login/route');
    const request = new Request('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        email: 'bad-email',
        password: 'secure1pass',
      }),
    });

    const res = await POST(request as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});
