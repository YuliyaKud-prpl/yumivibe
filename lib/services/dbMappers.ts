import type { Block, Dashboard } from '@/types/dashboard';

export interface DashboardRow {
  id: string;
  user_id: string;
  name: string;
  theme: 'light' | 'dark';
  background: string;
  background_type: 'color' | 'gradient' | 'image' | 'unsplash';
  accent_color: string | null;
  palette: Record<string, unknown> | null;
  block_count?: string;
  created_at: string;
  updated_at: string;
}

export interface BlockRow {
  id: string;
  dashboard_id: string;
  type: string;
  title: string;
  content: Record<string, unknown>;
  layout_x: number;
  layout_y: number;
  layout_w: number;
  layout_h: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export const mapBlock = (row: BlockRow): Block => ({
  id: row.id,
  dashboardId: row.dashboard_id,
  type: row.type as Block['type'],
  title: row.title,
  content: row.content,
  layoutX: row.layout_x,
  layoutY: row.layout_y,
  layoutW: row.layout_w,
  layoutH: row.layout_h,
  sortOrder: row.sort_order,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapDashboard = (
  row: DashboardRow,
  blocks: Block[] = []
): Dashboard => ({
  id: row.id,
  name: row.name,
  theme: row.theme,
  background: row.background,
  backgroundType: row.background_type,
  ...(row.accent_color ? { accentColor: row.accent_color } : {}),
  ...(row.palette
    ? { palette: row.palette as Dashboard['palette'] }
    : {}),
  blocks,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
