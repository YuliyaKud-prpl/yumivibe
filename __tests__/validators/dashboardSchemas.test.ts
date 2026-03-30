import { describe, it, expect } from 'vitest';
import {
  createDashboardSchema,
  updateDashboardSchema,
  dashboardIdSchema,
  blockTypeEnum,
  addBlockSchema,
  updateBlockSchema,
} from '@/lib/validators/dashboardSchemas';

describe('dashboardSchemas', () => {
  describe('dashboardIdSchema', () => {
    it('accepts a valid UUID', () => {
      const result = dashboardIdSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('rejects a non-UUID string', () => {
      const result = dashboardIdSchema.safeParse({ id: 'not-a-uuid' });
      expect(result.success).toBe(false);
    });

    it('rejects an empty string', () => {
      const result = dashboardIdSchema.safeParse({ id: '' });
      expect(result.success).toBe(false);
    });

    it('rejects missing id', () => {
      const result = dashboardIdSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('rejects a number', () => {
      const result = dashboardIdSchema.safeParse({ id: 12345 });
      expect(result.success).toBe(false);
    });
  });

  describe('createDashboardSchema', () => {
    it('accepts valid input with name', () => {
      const result = createDashboardSchema.safeParse({ name: 'My Dashboard' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('My Dashboard');
      }
    });

    it('accepts empty object (name is optional)', () => {
      const result = createDashboardSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('rejects name longer than 100 characters', () => {
      const result = createDashboardSchema.safeParse({
        name: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });

    it('accepts name exactly 100 characters', () => {
      const result = createDashboardSchema.safeParse({
        name: 'a'.repeat(100),
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty string name', () => {
      const result = createDashboardSchema.safeParse({ name: '' });
      expect(result.success).toBe(true);
    });
  });

  describe('blockTypeEnum', () => {
    const validTypes = [
      'greeting', 'clock', 'timer', 'pomodoro', 'weather',
      'quotes', 'notes', 'todos', 'youtube', 'spotify', 'title',
    ];

    it.each(validTypes)('accepts valid block type: %s', (type) => {
      const result = blockTypeEnum.safeParse(type);
      expect(result.success).toBe(true);
    });

    it('rejects invalid block type', () => {
      const result = blockTypeEnum.safeParse('calendar');
      expect(result.success).toBe(false);
    });

    it('rejects empty string', () => {
      const result = blockTypeEnum.safeParse('');
      expect(result.success).toBe(false);
    });
  });

  describe('addBlockSchema', () => {
    it('accepts valid block with type only', () => {
      const result = addBlockSchema.safeParse({ type: 'weather' });
      expect(result.success).toBe(true);
    });

    it('accepts valid block with type and title', () => {
      const result = addBlockSchema.safeParse({
        type: 'notes',
        title: 'My Notes',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid block type', () => {
      const result = addBlockSchema.safeParse({ type: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('rejects title longer than 100 chars', () => {
      const result = addBlockSchema.safeParse({
        type: 'notes',
        title: 'a'.repeat(101),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateBlockSchema', () => {
    it('accepts valid update with id only', () => {
      const result = updateBlockSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
      });
      expect(result.success).toBe(true);
    });

    it('accepts full layout update', () => {
      const result = updateBlockSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        content: { text: 'hello' },
        layout_x: 0,
        layout_y: 2,
        layout_w: 4,
        layout_h: 3,
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID id', () => {
      const result = updateBlockSchema.safeParse({ id: 'bad-id' });
      expect(result.success).toBe(false);
    });

    it('rejects negative layout_x', () => {
      const result = updateBlockSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        layout_x: -1,
      });
      expect(result.success).toBe(false);
    });

    it('rejects layout_w of 0', () => {
      const result = updateBlockSchema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        layout_w: 0,
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateDashboardSchema', () => {
    it('accepts empty object (all fields optional)', () => {
      const result = updateDashboardSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('accepts name update', () => {
      const result = updateDashboardSchema.safeParse({
        name: 'New Name',
      });
      expect(result.success).toBe(true);
    });

    it('accepts theme update', () => {
      const result = updateDashboardSchema.safeParse({ theme: 'dark' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid theme', () => {
      const result = updateDashboardSchema.safeParse({ theme: 'blue' });
      expect(result.success).toBe(false);
    });

    it('accepts background and backgroundType', () => {
      const result = updateDashboardSchema.safeParse({
        background: '#1a1a2e',
        backgroundType: 'color',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid backgroundType', () => {
      const result = updateDashboardSchema.safeParse({
        backgroundType: 'video',
      });
      expect(result.success).toBe(false);
    });

    it('accepts addBlocks with valid types', () => {
      const result = updateDashboardSchema.safeParse({
        addBlocks: [
          { type: 'weather', title: 'Weather' },
          { type: 'notes' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('rejects addBlocks with invalid types', () => {
      const result = updateDashboardSchema.safeParse({
        addBlocks: [{ type: 'calendar' }],
      });
      expect(result.success).toBe(false);
    });

    it('accepts removeBlocks with valid UUIDs', () => {
      const result = updateDashboardSchema.safeParse({
        removeBlocks: ['550e8400-e29b-41d4-a716-446655440000'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects removeBlocks with invalid UUIDs', () => {
      const result = updateDashboardSchema.safeParse({
        removeBlocks: ['not-a-uuid'],
      });
      expect(result.success).toBe(false);
    });

    it('accepts updateBlocks with valid data', () => {
      const result = updateDashboardSchema.safeParse({
        updateBlocks: [
          {
            id: '550e8400-e29b-41d4-a716-446655440000',
            content: { text: 'new' },
            layout_x: 2,
          },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('accepts palette update', () => {
      const result = updateDashboardSchema.safeParse({
        palette: {
          greetingFrom: '#ff0000',
          greetingTo: '#00ff00',
          greetingText: '#ffffff',
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects incomplete palette', () => {
      const result = updateDashboardSchema.safeParse({
        palette: { greetingFrom: '#ff0000' },
      });
      expect(result.success).toBe(false);
    });

    it('accepts accentColor', () => {
      const result = updateDashboardSchema.safeParse({
        accentColor: '#ff6600',
      });
      expect(result.success).toBe(true);
    });
  });
});
