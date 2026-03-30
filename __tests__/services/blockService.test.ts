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

const fakeClient = {
  query: mockClientQuery,
  release: mockClientRelease,
};

const FAKE_DASH_ID = '550e8400-e29b-41d4-a716-446655440000';
const FAKE_BLOCK_ID = 'b50e8400-e29b-41d4-a716-446655440001';

const makeBlockRow = (overrides = {}) => ({
  id: FAKE_BLOCK_ID,
  dashboard_id: FAKE_DASH_ID,
  type: 'notes',
  title: 'Notes',
  content: { text: '' },
  layout_x: 0,
  layout_y: 0,
  layout_w: 4,
  layout_h: 4,
  sort_order: 0,
  created_at: '2025-01-01',
  updated_at: '2025-01-02',
  ...overrides,
});

const makeResult = <T extends QueryResultRow>(rows: T[]): QueryResult<T> =>
  ({ rows, rowCount: rows.length }) as QueryResult<T>;

/*
 * blockService is expected to provide addBlocks, removeBlocks, updateBlocks.
 * Since the service may not exist yet, these tests document the expected
 * behavior. The dashboard service handles block ops in updateDashboard,
 * so these tests verify that same logic path via updateDashboard.
 */
import { updateDashboard } from '@/lib/services/dashboardService';
import { AppError } from '@/lib/utils/AppError';

const makeDashRow = () => ({
  id: FAKE_DASH_ID,
  user_id: 'user-001',
  name: 'Test',
  theme: 'light' as const,
  background: '#ffffff',
  background_type: 'color' as const,
  accent_color: null,
  palette: null,
  created_at: '2025-01-01',
  updated_at: '2025-01-02',
});

describe('block operations via dashboardService.updateDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPoolConnect.mockResolvedValue(fakeClient);
  });

  describe('addBlocks', () => {
    it('creates blocks with correct type and default title', async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined) // BEGIN
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(undefined) // INSERT block 1
        .mockResolvedValueOnce(undefined) // INSERT block 2
        .mockResolvedValueOnce(undefined); // COMMIT

      mockQuery
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(makeResult([]));

      await updateDashboard(FAKE_DASH_ID, 'user-001', {
        addBlocks: [
          { type: 'weather', title: 'Weather' },
          { type: 'todos' },
        ],
      });

      expect(mockClientQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO blocks'),
        [FAKE_DASH_ID, 'weather', 'Weather', 0],
      );
      expect(mockClientQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO blocks'),
        [FAKE_DASH_ID, 'todos', '', 1],
      );
    });

    it('uses empty string as default title', async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockQuery
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(makeResult([]));

      await updateDashboard(FAKE_DASH_ID, 'user-001', {
        addBlocks: [{ type: 'clock' }],
      });

      expect(mockClientQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO blocks'),
        [FAKE_DASH_ID, 'clock', '', 0],
      );
    });
  });

  describe('removeBlocks', () => {
    it('deletes blocks scoped to dashboard', async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockQuery
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(makeResult([]));

      await updateDashboard(FAKE_DASH_ID, 'user-001', {
        removeBlocks: [FAKE_BLOCK_ID],
      });

      expect(mockClientQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM blocks WHERE dashboard_id = $1'),
        [FAKE_DASH_ID, FAKE_BLOCK_ID],
      );
    });

    it('handles multiple block removals', async () => {
      const blockId2 = 'b50e8400-e29b-41d4-a716-446655440002';
      mockClientQuery
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockQuery
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(makeResult([]));

      await updateDashboard(FAKE_DASH_ID, 'user-001', {
        removeBlocks: [FAKE_BLOCK_ID, blockId2],
      });

      expect(mockClientQuery).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM blocks'),
        [FAKE_DASH_ID, FAKE_BLOCK_ID, blockId2],
      );
    });
  });

  describe('updateBlocks', () => {
    it('updates content via JSON stringify', async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockQuery
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(makeResult([]));

      await updateDashboard(FAKE_DASH_ID, 'user-001', {
        updateBlocks: [
          { id: FAKE_BLOCK_ID, content: { text: 'new note' } },
        ],
      });

      expect(mockClientQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE blocks SET'),
        [JSON.stringify({ text: 'new note' }), FAKE_BLOCK_ID, FAKE_DASH_ID],
      );
    });

    it('updates layout fields only', async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      mockQuery
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(makeResult([]));

      await updateDashboard(FAKE_DASH_ID, 'user-001', {
        updateBlocks: [
          { id: FAKE_BLOCK_ID, layout_x: 2, layout_y: 3 },
        ],
      });

      expect(mockClientQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE blocks SET'),
        [2, 3, FAKE_BLOCK_ID, FAKE_DASH_ID],
      );
    });

    it('skips update when no fields are provided', async () => {
      mockClientQuery
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(undefined);

      mockQuery
        .mockResolvedValueOnce(makeResult([makeDashRow()]))
        .mockResolvedValueOnce(makeResult([]));

      await updateDashboard(FAKE_DASH_ID, 'user-001', {
        updateBlocks: [{ id: FAKE_BLOCK_ID }],
      });

      // Should not have called UPDATE blocks SET (no fields)
      const updateCalls = mockClientQuery.mock.calls.filter(
        (call: unknown[]) =>
          typeof call[0] === 'string' &&
          (call[0] as string).includes('UPDATE blocks SET'),
      );
      expect(updateCalls).toHaveLength(0);
    });
  });
});
