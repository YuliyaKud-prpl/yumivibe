import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockListDashboards = vi.fn();
const mockCreateDashboard = vi.fn();
const mockGetDashboard = vi.fn();
const mockUpdateDashboard = vi.fn();
const mockDeleteDashboard = vi.fn();
const mockAuthenticateRequest = vi.fn();

vi.mock('@/lib/services/dashboardService', () => ({
  listDashboards: (...args: unknown[]) => mockListDashboards(...args),
  createDashboard: (...args: unknown[]) => mockCreateDashboard(...args),
  getDashboard: (...args: unknown[]) => mockGetDashboard(...args),
  updateDashboard: (...args: unknown[]) => mockUpdateDashboard(...args),
  deleteDashboard: (...args: unknown[]) => mockDeleteDashboard(...args),
}));

vi.mock('@/lib/middleware/auth', () => ({
  authenticateRequest: (...args: unknown[]) =>
    mockAuthenticateRequest(...args),
}));

vi.mock('@/lib/db', () => ({
  query: vi.fn(),
  pool: { connect: vi.fn() },
}));

import { AppError } from '@/lib/utils/AppError';

const FAKE_USER_ID = 'user-001';
const FAKE_DASH_ID = '550e8400-e29b-41d4-a716-446655440000';

const makeFakeDashboard = () => ({
  id: FAKE_DASH_ID,
  name: 'My Dashboard',
  theme: 'light',
  background: '#ffffff',
  backgroundType: 'color',
  blocks: [],
  createdAt: '2025-01-01',
  updatedAt: '2025-01-02',
});

describe('GET /api/dashboards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dashboard list when authenticated', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      userId: FAKE_USER_ID,
      role: 'user',
    });
    mockListDashboards.mockResolvedValue([
      { id: FAKE_DASH_ID, name: 'Test', blockCount: 2 },
    ]);

    const { GET } = await import('@/app/api/dashboards/route');
    const request = new Request('http://localhost/api/dashboards', {
      headers: { authorization: 'Bearer valid-token' },
    });

    const res = await GET(request as never);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.dashboards).toHaveLength(1);
    expect(mockListDashboards).toHaveBeenCalledWith(FAKE_USER_ID);
  });

  it('returns 401 when unauthenticated', async () => {
    mockAuthenticateRequest.mockRejectedValue(
      AppError.unauthorized('Missing Authorization header'),
    );

    const { GET } = await import('@/app/api/dashboards/route');
    const request = new Request('http://localhost/api/dashboards');

    const res = await GET(request as never);
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error.code).toBe('UNAUTHORIZED');
  });
});

describe('POST /api/dashboards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates dashboard when authenticated with valid input', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      userId: FAKE_USER_ID,
      role: 'user',
    });
    mockCreateDashboard.mockResolvedValue(makeFakeDashboard());

    const { POST } = await import('@/app/api/dashboards/route');
    const request = new Request('http://localhost/api/dashboards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({ name: 'My Dashboard' }),
    });

    const res = await POST(request as never);
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.data.dashboard.id).toBe(FAKE_DASH_ID);
    expect(mockCreateDashboard).toHaveBeenCalledWith(
      FAKE_USER_ID,
      'My Dashboard',
    );
  });

  it('returns 400 for invalid input (name too long)', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      userId: FAKE_USER_ID,
      role: 'user',
    });

    const { POST } = await import('@/app/api/dashboards/route');
    const request = new Request('http://localhost/api/dashboards', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: 'Bearer valid-token',
      },
      body: JSON.stringify({ name: 'a'.repeat(101) }),
    });

    const res = await POST(request as never);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('GET /api/dashboards/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns dashboard by ID', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      userId: FAKE_USER_ID,
      role: 'user',
    });
    mockGetDashboard.mockResolvedValue(makeFakeDashboard());

    const { GET } = await import('@/app/api/dashboards/[id]/route');
    const request = new Request(
      `http://localhost/api/dashboards/${FAKE_DASH_ID}`,
      { headers: { authorization: 'Bearer valid-token' } },
    );

    const res = await GET(request as never, {
      params: Promise.resolve({ id: FAKE_DASH_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.dashboard.id).toBe(FAKE_DASH_ID);
  });

  it('returns 404 for missing dashboard', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      userId: FAKE_USER_ID,
      role: 'user',
    });
    mockGetDashboard.mockRejectedValue(
      AppError.dashboardNotFound(FAKE_DASH_ID),
    );

    const { GET } = await import('@/app/api/dashboards/[id]/route');
    const request = new Request(
      `http://localhost/api/dashboards/${FAKE_DASH_ID}`,
      { headers: { authorization: 'Bearer valid-token' } },
    );

    const res = await GET(request as never, {
      params: Promise.resolve({ id: FAKE_DASH_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('DASHBOARD_NOT_FOUND');
  });

  it('returns 400 for invalid UUID', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      userId: FAKE_USER_ID,
      role: 'user',
    });

    const { GET } = await import('@/app/api/dashboards/[id]/route');
    const request = new Request(
      'http://localhost/api/dashboards/not-a-uuid',
      { headers: { authorization: 'Bearer valid-token' } },
    );

    const res = await GET(request as never, {
      params: Promise.resolve({ id: 'not-a-uuid' }),
    });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('PATCH /api/dashboards/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates dashboard', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      userId: FAKE_USER_ID,
      role: 'user',
    });
    mockUpdateDashboard.mockResolvedValue({
      ...makeFakeDashboard(),
      name: 'Renamed',
    });

    const { PATCH } = await import('@/app/api/dashboards/[id]/route');
    const request = new Request(
      `http://localhost/api/dashboards/${FAKE_DASH_ID}`,
      {
        method: 'PATCH',
        headers: {
          'content-type': 'application/json',
          authorization: 'Bearer valid-token',
        },
        body: JSON.stringify({ name: 'Renamed' }),
      },
    );

    const res = await PATCH(request as never, {
      params: Promise.resolve({ id: FAKE_DASH_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.data.dashboard.name).toBe('Renamed');
  });
});

describe('DELETE /api/dashboards/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 204 on successful delete', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      userId: FAKE_USER_ID,
      role: 'user',
    });
    mockDeleteDashboard.mockResolvedValue(undefined);

    const { DELETE } = await import('@/app/api/dashboards/[id]/route');
    const request = new Request(
      `http://localhost/api/dashboards/${FAKE_DASH_ID}`,
      {
        method: 'DELETE',
        headers: { authorization: 'Bearer valid-token' },
      },
    );

    const res = await DELETE(request as never, {
      params: Promise.resolve({ id: FAKE_DASH_ID }),
    });

    expect(res.status).toBe(204);
  });

  it('returns 404 for non-existent dashboard', async () => {
    mockAuthenticateRequest.mockResolvedValue({
      userId: FAKE_USER_ID,
      role: 'user',
    });
    mockDeleteDashboard.mockRejectedValue(
      AppError.dashboardNotFound(FAKE_DASH_ID),
    );

    const { DELETE } = await import('@/app/api/dashboards/[id]/route');
    const request = new Request(
      `http://localhost/api/dashboards/${FAKE_DASH_ID}`,
      {
        method: 'DELETE',
        headers: { authorization: 'Bearer valid-token' },
      },
    );

    const res = await DELETE(request as never, {
      params: Promise.resolve({ id: FAKE_DASH_ID }),
    });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.error.code).toBe('DASHBOARD_NOT_FOUND');
  });
});
