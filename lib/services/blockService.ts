import { query } from '@/lib/db';
import { AppError } from '@/lib/utils/AppError';
import { BLOCK_TYPES } from '@/types/dashboard';
import type { Block } from '@/types/dashboard';
import { mapBlock, type BlockRow } from '@/lib/services/dbMappers';

const validateBlockType = (type: string): void => {
  if (!(BLOCK_TYPES as readonly string[]).includes(type)) {
    throw AppError.invalidBlockType(type);
  }
};

const verifyDashboardOwnership = async (
  dashboardId: string
): Promise<void> => {
  const result = await query<{ id: string }>(
    `SELECT id FROM dashboards WHERE id = $1`,
    [dashboardId]
  );
  if (result.rows.length === 0) {
    throw AppError.dashboardNotFound(dashboardId);
  }
};

export const getBlock = async (
  blockId: string,
  dashboardId: string
): Promise<Block> => {
  try {
    const result = await query<BlockRow>(
      `SELECT * FROM blocks WHERE id = $1 AND dashboard_id = $2`,
      [blockId, dashboardId]
    );
    if (result.rows.length === 0) {
      throw AppError.blockNotFound(blockId);
    }
    return mapBlock(result.rows[0]);
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to get block');
  }
};

export const addBlocks = async (
  dashboardId: string,
  blocks: Array<{ type: string; title?: string }>
): Promise<Block[]> => {
  try {
    await verifyDashboardOwnership(dashboardId);

    for (const block of blocks) {
      validateBlockType(block.type);
    }

    const countResult = await query<{ max_order: string | null }>(
      `SELECT MAX(sort_order) AS max_order FROM blocks WHERE dashboard_id = $1`,
      [dashboardId]
    );
    let nextOrder = parseInt(
      countResult.rows[0].max_order ?? '-1',
      10
    ) + 1;

    const inserted: Block[] = [];
    for (const block of blocks) {
      const result = await query<BlockRow>(
        `INSERT INTO blocks (dashboard_id, type, title, sort_order)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [dashboardId, block.type, block.title ?? '', nextOrder]
      );
      inserted.push(mapBlock(result.rows[0]));
      nextOrder += 1;
    }

    return inserted;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to add blocks');
  }
};

export const removeBlocks = async (
  dashboardId: string,
  blockIds: string[]
): Promise<void> => {
  try {
    await verifyDashboardOwnership(dashboardId);

    if (blockIds.length === 0) return;

    const placeholders = blockIds.map((_, i) => `$${i + 2}`);
    const result = await query<{ id: string }>(
      `DELETE FROM blocks
       WHERE dashboard_id = $1 AND id IN (${placeholders.join(', ')})
       RETURNING id`,
      [dashboardId, ...blockIds]
    );

    if (result.rows.length !== blockIds.length) {
      const deletedIds = new Set(result.rows.map((r) => r.id));
      const missing = blockIds.find((bid) => !deletedIds.has(bid));
      if (missing) {
        throw AppError.blockNotFound(missing);
      }
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to remove blocks');
  }
};

interface BlockUpdate {
  id: string;
  content?: Record<string, unknown>;
  layout_x?: number;
  layout_y?: number;
  layout_w?: number;
  layout_h?: number;
}

export const updateBlocks = async (
  dashboardId: string,
  updates: BlockUpdate[]
): Promise<Block[]> => {
  try {
    await verifyDashboardOwnership(dashboardId);

    const updated: Block[] = [];

    for (const update of updates) {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIdx = 1;

      const addField = (column: string, value: unknown): void => {
        setClauses.push(`${column} = $${paramIdx}`);
        values.push(value);
        paramIdx += 1;
      };

      if (update.content !== undefined)
        addField('content', JSON.stringify(update.content));
      if (update.layout_x !== undefined)
        addField('layout_x', update.layout_x);
      if (update.layout_y !== undefined)
        addField('layout_y', update.layout_y);
      if (update.layout_w !== undefined)
        addField('layout_w', update.layout_w);
      if (update.layout_h !== undefined)
        addField('layout_h', update.layout_h);

      if (setClauses.length === 0) {
        const block = await getBlock(update.id, dashboardId);
        updated.push(block);
        continue;
      }

      const result = await query<BlockRow>(
        `UPDATE blocks SET ${setClauses.join(', ')}
         WHERE id = $${paramIdx} AND dashboard_id = $${paramIdx + 1}
         RETURNING *`,
        [...values, update.id, dashboardId]
      );

      if (result.rows.length === 0) {
        throw AppError.blockNotFound(update.id);
      }

      updated.push(mapBlock(result.rows[0]));
    }

    return updated;
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw AppError.databaseError('Failed to update blocks');
  }
};
