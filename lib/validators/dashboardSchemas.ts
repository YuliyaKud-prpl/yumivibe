import { z } from 'zod';
import { BLOCK_TYPES } from '@/types/dashboard';

export const blockTypeEnum = z.enum(BLOCK_TYPES);

export const dashboardIdSchema = z.object({
  id: z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    'Invalid UUID format',
  ),
});

export const createDashboardSchema = z.object({
  name: z.string().max(100).optional(),
});

export const paletteSchema = z.object({
  greetingFrom: z.string(),
  greetingTo: z.string(),
  greetingText: z.string(),
});

export const addBlockSchema = z.object({
  type: blockTypeEnum,
  title: z.string().max(100).optional(),
});

export const updateBlockSchema = z.object({
  id: z.string().uuid(),
  content: z.record(z.string(), z.unknown()).optional(),
  layout_x: z.number().int().min(0).optional(),
  layout_y: z.number().int().min(0).optional(),
  layout_w: z.number().int().min(1).optional(),
  layout_h: z.number().int().min(1).optional(),
});

export const updateDashboardSchema = z.object({
  name: z.string().max(100).optional(),
  theme: z.enum(['light', 'dark']).optional(),
  background: z.string().max(500).optional(),
  backgroundType: z.enum(['color', 'gradient', 'image', 'unsplash']).optional(),
  accentColor: z.string().max(50).optional(),
  palette: paletteSchema.optional(),
  addBlocks: z.array(addBlockSchema).optional(),
  removeBlocks: z.array(z.string().uuid()).optional(),
  updateBlocks: z.array(updateBlockSchema).optional(),
});

export type DashboardIdInput = z.infer<typeof dashboardIdSchema>;
export type CreateDashboardInput = z.infer<typeof createDashboardSchema>;
export type UpdateDashboardInput = z.infer<typeof updateDashboardSchema>;
export type AddBlockInput = z.infer<typeof addBlockSchema>;
export type UpdateBlockInput = z.infer<typeof updateBlockSchema>;
