'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { type Block, type BlockType, type Dashboard } from '@/types/dashboard';
import { useBlocks } from '@/hooks/useBlocks';
import { saveToStorage, dashboardKey } from '@/utils/storage';
import { apiPatch } from '@/utils/apiClient';

interface DashboardResponse {
  dashboard: Dashboard;
}

interface DashboardContextValue {
  dashboard: Dashboard;
  blocks: Block[];
  loading: boolean;
  error: string | null;
  addBlock: (type: BlockType) => Block;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, content: Record<string, unknown>) => void;
  updateLayout: (layouts: Array<{ i: string; x: number; y: number; w: number; h: number }>) => void;
  updateDashboard: (updates: Partial<Pick<Dashboard, 'name' | 'theme' | 'background' | 'backgroundType' | 'accentColor' | 'palette'>>) => void;
}

const DashboardContext = createContext<DashboardContextValue | null>(null);

interface DashboardProviderProps {
  initialDashboard: Dashboard;
  children: ReactNode;
}

export function DashboardProvider({ initialDashboard, children }: DashboardProviderProps) {
  const [dashboard, setDashboard] = useState<Dashboard>(initialDashboard);
  const [loading] = useState(false);
  const [error] = useState<string | null>(null);

  const {
    blocks, setBlocks,
    addBlock: localAddBlock,
    removeBlock: localRemoveBlock,
    updateBlock,
    updateLayout,
  } = useBlocks(dashboard.id, initialDashboard.blocks);

  const initialLoadDone = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Save to localStorage (fast, 500ms)
  useEffect(() => {
    if (!initialLoadDone.current) {
      initialLoadDone.current = true;
      return;
    }

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(() => {
      saveToStorage(dashboardKey(dashboard.id), { ...dashboard, blocks });
    }, 500);

    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [dashboard, blocks]);

  // Sync to backend (debounced, 1500ms)
  useEffect(() => {
    if (!initialLoadDone.current) return;

    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);

    syncTimerRef.current = setTimeout(async () => {
      const updateBlocks = blocks.map((b) => ({
        id: b.id,
        content: b.content,
        layout_x: b.layoutX,
        layout_y: b.layoutY,
        layout_w: b.layoutW,
        layout_h: b.layoutH,
      }));

      try {
        await apiPatch(`/dashboards/${dashboard.id}`, {
          name: dashboard.name,
          theme: dashboard.theme,
          background: dashboard.background,
          backgroundType: dashboard.backgroundType,
          accentColor: dashboard.accentColor,
          palette: dashboard.palette,
          updateBlocks,
        });
      } catch {
        // Backend sync failed — data is still in localStorage
      }
    }, 1500);

    return () => { if (syncTimerRef.current) clearTimeout(syncTimerRef.current); };
  }, [dashboard, blocks]);

  // addBlock: local + immediate API sync
  const addBlock = useCallback((type: BlockType): Block => {
    const block = localAddBlock(type);

    apiPatch<DashboardResponse>(`/dashboards/${dashboard.id}`, {
      addBlocks: [{ type, title: block.title }],
    }).then((response) => {
      if (response?.dashboard?.blocks) {
        setBlocks(response.dashboard.blocks);
      }
    }).catch(() => {
      // offline — keep local block
    });

    return block;
  }, [localAddBlock, dashboard.id, setBlocks]);

  // removeBlock: local + immediate API sync
  const removeBlock = useCallback((id: string) => {
    localRemoveBlock(id);

    apiPatch(`/dashboards/${dashboard.id}`, {
      removeBlocks: [id],
    }).catch(() => {
      // offline — block already removed locally
    });
  }, [localRemoveBlock, dashboard.id]);

  const updateDashboard = useCallback(
    (updates: Partial<Pick<Dashboard, 'name' | 'theme' | 'background' | 'backgroundType' | 'accentColor' | 'palette'>>) => {
      setDashboard((prev) => ({
        ...prev,
        ...updates,
        updatedAt: new Date().toISOString(),
      }));
    },
    [],
  );

  return (
    <DashboardContext.Provider
      value={{
        dashboard,
        blocks,
        loading,
        error,
        addBlock,
        removeBlock,
        updateBlock,
        updateLayout,
        updateDashboard,
      }}
    >
      {children}
    </DashboardContext.Provider>
  );
}

export function useDashboardContext(): DashboardContextValue {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboardContext must be used within a DashboardProvider');
  }
  return context;
}
