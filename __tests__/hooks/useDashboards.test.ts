// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { DashboardSummary, Dashboard } from '@/types/dashboard';

vi.mock('@/utils/apiClient', () => ({
  apiGet: vi.fn(),
  apiPost: vi.fn(),
  apiDelete: vi.fn(),
}));

vi.mock('@/utils/storage', () => ({
  loadFromStorage: vi.fn(),
  saveToStorage: vi.fn(),
  removeFromStorage: vi.fn(),
  DASHBOARDS_KEY: 'yumivibe-dashboards',
  dashboardKey: (id: string) => `yumivibe-dashboard-${id}`,
}));

import { apiGet, apiPost, apiDelete } from '@/utils/apiClient';
import {
  loadFromStorage,
  saveToStorage,
  removeFromStorage,
} from '@/utils/storage';
import { useDashboards } from '@/hooks/useDashboards';

const mockedApiGet = vi.mocked(apiGet);
const mockedApiPost = vi.mocked(apiPost);
const mockedApiDelete = vi.mocked(apiDelete);
const mockedLoadFromStorage = vi.mocked(loadFromStorage);
const mockedSaveToStorage = vi.mocked(saveToStorage);
const mockedRemoveFromStorage = vi.mocked(removeFromStorage);

function makeSummary(overrides: Partial<DashboardSummary> = {}): DashboardSummary {
  return {
    id: 'dash-1',
    name: 'My Dashboard',
    blockCount: 3,
    theme: 'light',
    background: 'linear-gradient(135deg, #A1BC98, #D2DCB6)',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    id: 'dash-new',
    name: 'New Dashboard',
    theme: 'light',
    background: 'linear-gradient(135deg, #A1BC98, #D2DCB6)',
    backgroundType: 'gradient',
    blocks: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('useDashboards', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockedLoadFromStorage.mockReturnValue(null);
    mockedSaveToStorage.mockImplementation(() => undefined);
    mockedRemoveFromStorage.mockImplementation(() => undefined);
  });

  it('loads dashboards from API on mount', async () => {
    const summaries = [makeSummary({ id: 'd1' }), makeSummary({ id: 'd2' })];
    mockedApiGet.mockResolvedValueOnce({ dashboards: summaries });

    const { result } = renderHook(() => useDashboards());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dashboards).toHaveLength(2);
    expect(result.current.dashboards[0].id).toBe('d1');
    expect(result.current.error).toBeNull();
    expect(mockedSaveToStorage).toHaveBeenCalledWith(
      'yumivibe-dashboards',
      summaries,
    );
  });

  it('falls back to localStorage when API fails', async () => {
    const stored = [makeSummary({ id: 'local-1', name: 'Local' })];
    mockedApiGet.mockRejectedValueOnce(new Error('Network error'));
    mockedLoadFromStorage.mockReturnValueOnce(stored);

    const { result } = renderHook(() => useDashboards());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dashboards).toHaveLength(1);
    expect(result.current.dashboards[0].id).toBe('local-1');
  });

  it('returns empty array when API fails and localStorage is empty', async () => {
    mockedApiGet.mockRejectedValueOnce(new Error('Network error'));
    mockedLoadFromStorage.mockReturnValueOnce(null);

    const { result } = renderHook(() => useDashboards());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dashboards).toEqual([]);
  });

  it('createDashboard calls API and updates state', async () => {
    mockedApiGet.mockResolvedValueOnce({ dashboards: [] });
    const created = makeDashboard({ id: 'new-1', name: 'Fresh' });
    mockedApiPost.mockResolvedValueOnce({ dashboard: created });

    const { result } = renderHook(() => useDashboards());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let summary: DashboardSummary;
    await act(async () => {
      summary = await result.current.createDashboard('Fresh');
    });

    expect(summary!.id).toBe('new-1');
    expect(summary!.name).toBe('Fresh');
    expect(mockedApiPost).toHaveBeenCalledWith('/dashboards', { name: 'Fresh' });
  });

  it('createDashboard falls back to local creation when API fails', async () => {
    mockedApiGet.mockResolvedValueOnce({ dashboards: [] });
    mockedApiPost.mockRejectedValueOnce(new Error('Server down'));

    const mockUUID = 'local-uuid-123';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(mockUUID as ReturnType<typeof crypto.randomUUID>);

    const { result } = renderHook(() => useDashboards());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let summary: DashboardSummary;
    await act(async () => {
      summary = await result.current.createDashboard('Offline Board');
    });

    expect(summary!.id).toBe(mockUUID);
    expect(summary!.name).toBe('Offline Board');
    expect(summary!.blockCount).toBe(0);
    expect(result.current.dashboards).toHaveLength(1);
    expect(mockedSaveToStorage).toHaveBeenCalledWith(
      `yumivibe-dashboard-${mockUUID}`,
      expect.objectContaining({ id: mockUUID, name: 'Offline Board' }),
    );
  });

  it('deleteDashboard removes from state and cleans up storage', async () => {
    const summaries = [makeSummary({ id: 'd1' }), makeSummary({ id: 'd2' })];
    mockedApiGet.mockResolvedValueOnce({ dashboards: summaries });
    mockedApiDelete.mockResolvedValueOnce(undefined);

    const { result } = renderHook(() => useDashboards());

    await waitFor(() => {
      expect(result.current.dashboards).toHaveLength(2);
    });

    await act(async () => {
      await result.current.deleteDashboard('d1');
    });

    expect(result.current.dashboards).toHaveLength(1);
    expect(result.current.dashboards[0].id).toBe('d2');
    expect(mockedApiDelete).toHaveBeenCalledWith('/dashboards/d1');
    expect(mockedRemoveFromStorage).toHaveBeenCalledWith('yumivibe-dashboard-d1');
  });

  it('deleteDashboard still removes locally when API fails', async () => {
    const summaries = [makeSummary({ id: 'd1' })];
    mockedApiGet.mockResolvedValueOnce({ dashboards: summaries });
    mockedApiDelete.mockRejectedValueOnce(new Error('Server error'));

    const { result } = renderHook(() => useDashboards());

    await waitFor(() => {
      expect(result.current.dashboards).toHaveLength(1);
    });

    await act(async () => {
      await result.current.deleteDashboard('d1');
    });

    expect(result.current.dashboards).toEqual([]);
    expect(mockedRemoveFromStorage).toHaveBeenCalledWith('yumivibe-dashboard-d1');
  });

  it('starts with isLoading true', () => {
    mockedApiGet.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDashboards());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.dashboards).toEqual([]);
  });
});
