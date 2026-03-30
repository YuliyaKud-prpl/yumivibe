'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { DashboardSummary, Dashboard } from '@/types/dashboard';
import { apiGet, apiPost, apiDelete } from '@/utils/apiClient';
import {
  loadFromStorage,
  saveToStorage,
  removeFromStorage,
  DASHBOARDS_KEY,
  dashboardKey,
} from '@/utils/storage';

interface DashboardListResponse {
  dashboards: DashboardSummary[];
}

interface DashboardResponse {
  dashboard: Dashboard;
}

interface UseDashboardsReturn {
  dashboards: DashboardSummary[];
  isLoading: boolean;
  error: string | null;
  createDashboard: (name: string) => Promise<DashboardSummary>;
  deleteDashboard: (id: string) => Promise<void>;
}

export function useDashboards(): UseDashboardsReturn {
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const initialLoadDone = useRef(false);

  useEffect(() => {
    let cancelled = false;

    async function fetchDashboards() {
      try {
        setIsLoading(true);
        setError(null);

        // Try API first
        try {
          const response = await apiGet<DashboardListResponse>('/dashboards');
          if (!cancelled) {
            const list = response.dashboards ?? [];
            setDashboards(list);
            saveToStorage(DASHBOARDS_KEY, list);
            initialLoadDone.current = true;
            return;
          }
        } catch {
          // API failed — fall back to localStorage
        }

        // Fallback: localStorage
        const stored = loadFromStorage<DashboardSummary[]>(DASHBOARDS_KEY);
        if (!cancelled) {
          setDashboards(stored ?? []);
          initialLoadDone.current = true;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load dashboards');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchDashboards();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!initialLoadDone.current) return;
    saveToStorage(DASHBOARDS_KEY, dashboards);
  }, [dashboards]);

  const createDashboard = useCallback(async (name: string): Promise<DashboardSummary> => {
    try {
      const response = await apiPost<DashboardResponse>('/dashboards', { name });
      const created = response.dashboard;
      return {
        id: created.id,
        name: created.name,
        blockCount: created.blocks?.length ?? 0,
        theme: created.theme,
        background: created.background,
        updatedAt: created.updatedAt,
      };
    } catch {
      // API failed — create locally
      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const localSummary: DashboardSummary = {
        id,
        name,
        blockCount: 0,
        theme: 'light' as const,
        background: 'linear-gradient(135deg, #A1BC98, #D2DCB6)',
        updatedAt: now,
      };
      setDashboards((prev) => [...prev, localSummary]);

      const initialDashboard: Dashboard = {
        id: localSummary.id,
        name: localSummary.name,
        theme: localSummary.theme,
        background: localSummary.background,
        backgroundType: 'gradient',
        blocks: [],
        createdAt: now,
        updatedAt: now,
      };
      saveToStorage(dashboardKey(localSummary.id), initialDashboard);
      return localSummary;
    }
  }, []);

  const deleteDashboard = useCallback(async (id: string): Promise<void> => {
    try {
      await apiDelete(`/dashboards/${id}`);
    } catch {
      // API failed — delete locally anyway
    }
    setDashboards((prev) => prev.filter((d) => d.id !== id));
    removeFromStorage(dashboardKey(id));
  }, []);

  return { dashboards, isLoading, error, createDashboard, deleteDashboard };
}
