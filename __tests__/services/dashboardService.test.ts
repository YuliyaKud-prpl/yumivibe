import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { QueryResult, QueryResultRow } from 'pg';

const mockQuery = vi.fn();
const mockPoolConnect = vi.fn();
const mockClientQuery = vi.fn();
const mockClientRelease = vi.fn();

vi.mock('@/lib/db', () => ({
  query: (...args: unknown[]) => mockQuery(...args),
  pool: {
    connect: () => mockPoolConnect(),
  },
}));

import {
  listDashboards,
  getDashboard,
  createDashboard,
  updateDashboard,
  deleteDashboard,
} from '@/lib/services/dashboardService';
import { AppError } from '@/lib/utils/AppError';

const fakeClient = {
  query: mockClientQuery,
  release: mockClientRelease,
};

const FAKE_USER = 'user-001';
const FAKE_DASH_ID = '550e8400-e29b-41d4-a716-446655440000';

const makeDashRow = (overrides = {}) => ({
  id: FAKE_DASH_ID,
  user_id: FAKE_USER,
  name: 'Test Dashboard',
  theme: 'light' as const,
  background: '#ffffff',
  background_type: 'color' as const,
  accent_color: null,
  palette: null,
  block_count: '2',
  created_at: '2025-01-01',
  updated_at: '2025-01-02',
  ...overrides,
});

const makeBlockRow = (overrides = {}) => ({
  id: 'block-001',
  dashboard_id: FAKE_DASH_ID,
  type: 'greeting',
  title: 'Hello!',
  content: {},
  layout_x: 0,
  layout_y: 0,
  layout_w: 4,
  layout_h: 2,
  sort_order: 0,
  created_at: '2025-01-01',
  updated_at: '2025-01-02',
  ...overrides,
});

const makeResult = <T extends QueryResultRow>(rows: T[]): QueryResult<T> =>
  ({ rows, rowCount: rows.length }) as QueryResult<T>;

describe('dashboardService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolConnect.mockResolvedValue(fakeClient);
  });

  describe('listDashboards', () => {
    it('returns summary list for user', async () => {
      const row = makeDashRow();
      mockQuery.mockResolvedValueOnce(makeResult([row]));

      const result = await listDashboards(FAKE_USER);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: FAKE_DASH_ID,
        name: 'Test Dashboard',
        blockCount: 2,
        theme: 'light',
        background: '#ffffff',
        updatedAt: '2025-01-02',
      });
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE d.user_id = $1'),
        [FAKE_USER],
      );
    });

    it('returns empty array when user has no dashboards', async () => {
      mockQuery.mockResolvedValueOnce(makeResult([]));
      const result = await listDashboards(FAKE_USER);
      expect(result).toEqual([]);
    });

    it('throws DATABASE_ERROR on query failure', async () => {
      mockQuery.mockRejectedValueOnce(new Error('conn refused'));
      await expect(listDashboards(FAKE_USER)).rejects.toThrow(AppError);
      await expect(listDashboards(FAKE_USER)).rejects.toThrow(AppError);
    });
  });

  describe('getDashboard', () => {
    it('returns full dashboard with blocks', async () => {
      mockQuery
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(makeResult([makeBlockRow()]));

      const dashboard = await getDashboard(FAKE_DASH_ID, FAKE_USER);

      expect(dashboard.id).toBe(FAKE_DASH_ID);
      expect(dashboard.name).toBe('Test Dashboard');
      expect(dashboard.blocks).toHaveLength(1);
      expect(dashboard.blocks[0].type).toBe('greeting');
    });

    it('throws DASHBOARD_NOT_FOUND when not found', async () => {
      mockQuery.mockResolvedValueOnce(makeResult([]));

      await expect(
        getDashboard(FAKE_DASH_ID, FAKE_USER),
      ).rejects.toThrow(AppError);

      try {
        mockQuery.mockResolvedValueOnce(makeResult([]));
        await getDashboard(FAKE_DASH_ID, FAKE_USER);
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('DASHBOARD_NOT_FOUND');
      }
    });

    it('throws DASHBOARD_NOT_FOUND for wrong user', async () => {
      mockQuery.mockResolvedValueOnce(makeResult([]));

      await expect(
        getDashboard(FAKE_DASH_ID, 'other-user'),
      ).rejects.toThrow(AppError);
    });
  });

  describe('createDashboard', () => {
    it('creates dashboard with default blocks in a transaction', async () => {
      const dashRow = makeDashRow();
      const greetingRow = makeBlockRow({ id: 'g-1', type: 'greeting' });
      const clockRow = makeBlockRow({ id: 'c-1', type: 'clock', layout_x: 4 });

      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(makeResult([dashRow]))
        .mockResolvedValueOnce(makeResult([greetingRow]))
        .mockResolvedValueOnce(makeResult([clockRow]))
        .mockResolvedValueOnce(undefined); // COMMIT

      const dashboard = await createDashboard(FAKE_USER);

      expect(dashboard.id).toBe(FAKE_DASH_ID);
      expect(dashboard.blocks).toHaveLength(2);
      expect(mockClientQuery).toHaveBeenCalledWith('BEGIN');
      expect(mockClientQuery).toHaveBeenCalledWith('COMMIT');
      expect(mockClientRelease).toHaveBeenCalled();
    });

    it('uses custom name when provided', async () => {
      const dashRow = makeDashRow({ name: 'Work' });
      const greetingRow = makeBlockRow();
      const clockRow = makeBlockRow({ id: 'c-1', type: 'clock' });

      mockClientQuery
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(makeResult([dashRow]))
        .mockResolvedValueOnce(makeResult([greetingRow]))
        .mockResolvedValueOnce(makeResult([clockRow]))
        .mockResolvedValueOnce(undefined);

      const dashboard = await createDashboard(FAKE_USER, 'Work');

      expect(dashboard.name).toBe('Work');
      expect(mockClientQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO dashboards'),
        [FAKE_USER, 'Work', '#ffffff', 'color', '#237227'],
      );
    });

    it('rolls back on failure', async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockRejectedValueOnce(new Error('insert fail'));

      await expect(createDashboard(FAKE_USER)).rejects.toThrow(AppError);
      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClientRelease).toHaveBeenCalled();
    });
  });

  describe('updateDashboard', () => {
    it('updates dashboard name', async () => {
      const existingRow = makeDashRow();
      const updatedRow = makeDashRow({ name: 'Updated' });

      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(makeResult([existingRow])) // SELECT existing
        .mockResolvedValueOnce(undefined) // UPDATE
        .mockResolvedValueOnce(undefined); // COMMIT

      // getDashboard is called at end — mock the query calls
      mockQuery
        .mockResolvedValueOnce(makeResult([updatedRow]))
        .mockResolvedValueOnce(makeResult([]));

      const result = await updateDashboard(FAKE_DASH_ID, FAKE_USER, {
        name: 'Updated',
      });

      expect(result.name).toBe('Updated');
    });

    it('throws DASHBOARD_NOT_FOUND for non-existent dashboard', async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(makeResult([])); // SELECT — not found

      await expect(
        updateDashboard(FAKE_DASH_ID, FAKE_USER, { name: 'X' }),
      ).rejects.toThrow(AppError);

      expect(mockClientQuery).toHaveBeenCalledWith('ROLLBACK');
    });

    it('handles removeBlocks', async () => {
      const existingRow = makeDashRow();

      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(makeResult([existingRow]))
        .mockResolvedValueOnce(undefined) // DELETE blocks
        .mockResolvedValueOnce(undefined); // COMMIT

      mockQuery
        .mockResolvedValueOnce(makeResult([existingRow]))
        .mockResolvedValueOnce(makeResult([]));

      await updateDashboard(FAKE_DASH_ID, FAKE_USER, {
        removeBlocks: ['block-001'],
      });

      expect(mockClientQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM blocks'),
        [FAKE_DASH_ID, 'block-001'],
      );
    });

    it('handles addBlocks', async () => {
      const existingRow = makeDashRow();

      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(makeResult([existingRow]))
        .mockResolvedValueOnce(undefined) // INSERT block
        .mockResolvedValueOnce(undefined); // COMMIT

      mockQuery
        .mockResolvedValueOnce(makeResult([existingRow]))
        .mockResolvedValueOnce(makeResult([]));

      await updateDashboard(FAKE_DASH_ID, FAKE_USER, {
        addBlocks: [{ type: 'weather', title: 'Weather' }],
      });

      expect(mockClientQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO blocks'),
        [FAKE_DASH_ID, 'weather', 'Weather', 0],
      );
    });

    it('handles updateBlocks with partial fields', async () => {
      const existingRow = makeDashRow();

      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(makeResult([existingRow]))
        .mockResolvedValueOnce(undefined) // UPDATE block
        .mockResolvedValueOnce(undefined); // COMMIT

      mockQuery
        .mockResolvedValueOnce(makeResult([existingRow]))
        .mockResolvedValueOnce(makeResult([]));

      await updateDashboard(FAKE_DASH_ID, FAKE_USER, {
        updateBlocks: [{ id: 'block-001', layout_x: 5 }],
      });

      expect(mockClientQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE blocks SET'),
        [5, 'block-001', FAKE_DASH_ID],
      );
    });
  });

  describe('deleteDashboard', () => {
    it('deletes dashboard for owner', async () => {
      mockQuery.mockResolvedValueOnce(
        makeResult([{ id: FAKE_DASH_ID }]),
      );

      await expect(
        deleteDashboard(FAKE_DASH_ID, FAKE_USER),
      ).resolves.toBeUndefined();

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM dashboards'),
        [FAKE_DASH_ID, FAKE_USER],
      );
    });

    it('throws DASHBOARD_NOT_FOUND for non-owner', async () => {
      mockQuery.mockResolvedValueOnce(makeResult([]));

      try {
        await deleteDashboard(FAKE_DASH_ID, 'other-user');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect((err as AppError).code).toBe('DASHBOARD_NOT_FOUND');
      }
    });

    it('throws DASHBOARD_NOT_FOUND for missing dashboard', async () => {
      mockQuery.mockResolvedValueOnce(makeResult([]));

      await expect(
        deleteDashboard('nonexistent', FAKE_USER),
      ).rejects.toThrow(AppError);
    });
  });
});
