'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { type Dashboard } from '@/types/dashboard';
import { DashboardProvider, useDashboardContext } from '@/context/DashboardContext';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { Toolbar } from '@/components/layout/Toolbar';
import { apiGet } from '@/utils/apiClient';
import { loadFromStorage, saveToStorage, dashboardKey } from '@/utils/storage';
import { getDashboardCssVars } from '@/utils/paletteColors';

interface DashboardResponse {
  dashboard: Dashboard;
}

function DashboardInner() {
  const { dashboard, blocks, addBlock, updateDashboard } = useDashboardContext();
  const cssVars = getDashboardCssVars(dashboard.accentColor);

  return (
    <div className="min-h-screen bg-surface" style={cssVars as React.CSSProperties}>
      <Toolbar
        dashboardName={dashboard.name}
        onNameChange={(name) => updateDashboard({ name })}
        onAddBlock={addBlock}
      />
      <DashboardGrid dashboard={{ ...dashboard, blocks }} />
    </div>
  );
}

export default function DashboardPage() {
  const params = useParams<{ id: string }>();
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDashboard() {
      try {
        const data = await apiGet<DashboardResponse>(`/dashboards/${params.id}`);
        if (!cancelled) {
          setDashboard(data.dashboard);
          saveToStorage(dashboardKey(params.id), data.dashboard);
          setLoading(false);
          return;
        }
      } catch {
        // API failed — fall back to localStorage
      }

      // Fallback: localStorage
      const stored = loadFromStorage<Dashboard>(dashboardKey(params.id));
      if (!cancelled) {
        if (stored) {
          setDashboard(stored);
        } else {
          setError('Dashboard not found');
        }
        setLoading(false);
      }
    }

    loadDashboard();
    return () => { cancelled = true; };
  }, [params.id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sage-100 border-t-transparent" />
      </div>
    );
  }

  if (error || !dashboard) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center space-y-4">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant/20">
            error_outline
          </span>
          <p className="text-lg font-medium text-on-surface-variant">
            {error ?? 'Dashboard not found'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DashboardProvider initialDashboard={dashboard}>
      <DashboardInner />
    </DashboardProvider>
  );
}
