import { query, pool } from '@/lib/db';
import { AppError } from '@/lib/utils/AppError';
import type { Dashboard, DashboardSummary } from '@/types/dashboard';
import {
  mapBlock,
  mapDashboard,
  type DashboardRow,
  type BlockRow,
} from '@/lib/services/dbMappers';

export const listDashboards = async (
  userId: string
): Promise<DashboardSummary[]> => {
  try {
    const result = await query<DashboardRow>(
      `SELECT d.id, d.name, d.theme, d.background, d.updated_at,
              (SELECT COUNT(*) FROM blocks WHERE dashboard_id = d.id) AS block_count
       FROM dashboards d
       WHERE d.user_id = $1
       ORDER BY d.updated_at DESC`,
      [userId]
    );
    return result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      blockCount: parseInt(row.block_count ?? '0', 10),
      theme: row.theme,
      background: row.background,
      updatedAt: row.updated_at,
    }));
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to list dashboards');
  }
};

export const getDashboard = async (
  id: string,
  userId: string
): Promise<Dashboard> => {
  try {
    const dashResult = await query<DashboardRow>(
      `SELECT * FROM dashboards WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (dashResult.rows.length === 0) {
      throw AppError.dashboardNotFound(id);
    }

    const blocksResult = await query<BlockRow>(
      `SELECT * FROM blocks WHERE dashboard_id = $1 ORDER BY sort_order ASC`,
      [id]
    );

    const blocks = blocksResult.rows.map(mapBlock);
    return mapDashboard(dashResult.rows[0], blocks);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to get dashboard');
  }
};

interface TemplateBlock {
  type: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface TemplateConfig {
  bg: string;
  bgType: string;
  accent: string;
  blocks: TemplateBlock[];
}

const TEMPLATE_BLOCKS: Record<string, TemplateConfig> = {
  'Morning Vibes': {
    bg: 'linear-gradient(135deg, #fff8f2, #fef3c7)',
    bgType: 'gradient',
    accent: '#8C5A3C',
    blocks: [
      { type: 'greeting', title: 'Good Morning!', x: 0, y: 0, w: 8, h: 4 },
      { type: 'clock', title: 'Clock', x: 8, y: 0, w: 4, h: 3 },
      { type: 'weather', title: 'Weather', x: 0, y: 4, w: 4, h: 4 },
      { type: 'quotes', title: 'Daily Quote', x: 4, y: 4, w: 4, h: 4 },
      { type: 'todos', title: 'Morning Tasks', x: 8, y: 3, w: 4, h: 5 },
    ],
  },
  'Work Focus': {
    bg: 'linear-gradient(135deg, #f0f4ff, #dbeafe)',
    bgType: 'gradient',
    accent: '#176B87',
    blocks: [
      { type: 'title', title: 'Work Focus', x: 0, y: 0, w: 8, h: 2 },
      { type: 'clock', title: 'Clock', x: 8, y: 0, w: 4, h: 3 },
      { type: 'pomodoro', title: 'Pomodoro', x: 0, y: 2, w: 4, h: 5 },
      { type: 'todos', title: 'Tasks', x: 4, y: 2, w: 4, h: 5 },
      { type: 'notes', title: 'Notes', x: 8, y: 3, w: 4, h: 4 },
    ],
  },
  'Chill & Music': {
    bg: 'linear-gradient(135deg, #ecfdf5, #d1fae5)',
    bgType: 'gradient',
    accent: '#237227',
    blocks: [
      { type: 'greeting', title: 'Hey there!', x: 0, y: 0, w: 6, h: 3 },
      { type: 'clock', title: 'Clock', x: 6, y: 0, w: 3, h: 3 },
      { type: 'weather', title: 'Weather', x: 9, y: 0, w: 3, h: 3 },
      { type: 'youtube', title: 'YouTube', x: 0, y: 3, w: 6, h: 5 },
      { type: 'spotify', title: 'Spotify', x: 6, y: 3, w: 6, h: 5 },
      { type: 'quotes', title: 'Quotes', x: 0, y: 8, w: 6, h: 3 },
      { type: 'notes', title: 'Notes', x: 6, y: 8, w: 6, h: 3 },
    ],
  },
};

export const createDashboard = async (
  userId: string,
  name?: string
): Promise<Dashboard> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const dashName = name ?? 'My Dashboard';
    const template = TEMPLATE_BLOCKS[dashName];
    const bg = template?.bg ?? '#ffffff';
    const bgType = template?.bgType ?? 'color';
    const accent = template?.accent ?? '#237227';

    const dashResult = await client.query<DashboardRow>(
      `INSERT INTO dashboards (user_id, name, background, background_type, accent_color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, dashName, bg, bgType, accent]
    );
    const dashboard = dashResult.rows[0];

    const templateBlocks = template?.blocks ?? [
      { type: 'greeting', title: 'Hello!', x: 0, y: 0, w: 8, h: 4 },
      { type: 'clock', title: 'Clock', x: 8, y: 0, w: 4, h: 3 },
    ];

    const blockRows: BlockRow[] = [];
    for (let i = 0; i < templateBlocks.length; i++) {
      const b = templateBlocks[i];
      const result = await client.query<BlockRow>(
        `INSERT INTO blocks (dashboard_id, type, title, layout_x, layout_y, layout_w, layout_h, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [dashboard.id, b.type, b.title, b.x, b.y, b.w, b.h, i]
      );
      blockRows.push(result.rows[0]);
    }

    await client.query('COMMIT');

    const blocks = blockRows.map(mapBlock);
    return mapDashboard(dashboard, blocks);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to create dashboard');
  } finally {
    client.release();
  }
};

interface DashboardUpdates {
  name?: string;
  theme?: 'light' | 'dark';
  background?: string;
  backgroundType?: 'color' | 'gradient' | 'image' | 'unsplash';
  accentColor?: string;
  palette?: Dashboard['palette'];
  addBlocks?: Array<{ type: string; title?: string }>;
  removeBlocks?: string[];
  updateBlocks?: Array<{
    id: string;
    content?: Record<string, unknown>;
    layout_x?: number;
    layout_y?: number;
    layout_w?: number;
    layout_h?: number;
  }>;
}

export const updateDashboard = async (
  id: string,
  userId: string,
  updates: DashboardUpdates
): Promise<Dashboard> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query<DashboardRow>(
      `SELECT * FROM dashboards WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (existing.rows.length === 0) {
      throw AppError.dashboardNotFound(id);
    }

    await applyDashboardFields(client, id, userId, updates);
    await applyRemoveBlocks(client, id, updates.removeBlocks);
    await applyAddBlocks(client, id, updates.addBlocks);
    await applyUpdateBlocks(client, id, updates.updateBlocks);

    await client.query('COMMIT');
    return getDashboard(id, userId);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to update dashboard');
  } finally {
    client.release();
  }
};

interface PgClient {
  query: <T>(text: string, params?: unknown[]) => Promise<{ rows: T[] }>;
}

const applyDashboardFields = async (
  client: PgClient,
  id: string,
  userId: string,
  updates: DashboardUpdates
): Promise<void> => {
  const setClauses: string[] = [];
  const setValues: unknown[] = [];
  let paramIdx = 1;

  const addField = (column: string, value: unknown): void => {
    setClauses.push(`${column} = $${paramIdx}`);
    setValues.push(value);
    paramIdx += 1;
  };

  if (updates.name !== undefined) addField('name', updates.name);
  if (updates.theme !== undefined) addField('theme', updates.theme);
  if (updates.background !== undefined)
    addField('background', updates.background);
  if (updates.backgroundType !== undefined)
    addField('background_type', updates.backgroundType);
  if (updates.accentColor !== undefined)
    addField('accent_color', updates.accentColor);
  if (updates.palette !== undefined)
    addField('palette', JSON.stringify(updates.palette));

  if (setClauses.length > 0) {
    await client.query(
      `UPDATE dashboards SET ${setClauses.join(', ')}
       WHERE id = $${paramIdx} AND user_id = $${paramIdx + 1}`,
      [...setValues, id, userId]
    );
  }
};

const applyRemoveBlocks = async (
  client: PgClient,
  dashboardId: string,
  blockIds?: string[]
): Promise<void> => {
  if (!blockIds || blockIds.length === 0) return;
  const placeholders = blockIds.map((_, i) => `$${i + 2}`);
  await client.query(
    `DELETE FROM blocks WHERE dashboard_id = $1 AND id IN (${placeholders.join(', ')})`,
    [dashboardId, ...blockIds]
  );
};

const applyAddBlocks = async (
  client: PgClient,
  dashboardId: string,
  blocks?: Array<{ type: string; title?: string }>
): Promise<void> => {
  if (!blocks || blocks.length === 0) return;
  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    await client.query(
      `INSERT INTO blocks (dashboard_id, type, title, sort_order)
       VALUES ($1, $2, $3, $4)`,
      [dashboardId, block.type, block.title ?? '', i]
    );
  }
};

const applyUpdateBlocks = async (
  client: PgClient,
  dashboardId: string,
  updates?: DashboardUpdates['updateBlocks']
): Promise<void> => {
  if (!updates || updates.length === 0) return;
  for (const block of updates) {
    const clauses: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const add = (col: string, val: unknown): void => {
      clauses.push(`${col} = $${idx}`);
      values.push(val);
      idx += 1;
    };

    if (block.content !== undefined)
      add('content', JSON.stringify(block.content));
    if (block.layout_x !== undefined) add('layout_x', block.layout_x);
    if (block.layout_y !== undefined) add('layout_y', block.layout_y);
    if (block.layout_w !== undefined) add('layout_w', block.layout_w);
    if (block.layout_h !== undefined) add('layout_h', block.layout_h);

    if (clauses.length > 0) {
      await client.query(
        `UPDATE blocks SET ${clauses.join(', ')}
         WHERE id = $${idx} AND dashboard_id = $${idx + 1}`,
        [...values, block.id, dashboardId]
      );
    }
  }
};

export const deleteDashboard = async (
  id: string,
  userId: string
): Promise<void> => {
  try {
    const result = await query<DashboardRow>(
      `DELETE FROM dashboards WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      throw AppError.dashboardNotFound(id);
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to delete dashboard');
  }
};
