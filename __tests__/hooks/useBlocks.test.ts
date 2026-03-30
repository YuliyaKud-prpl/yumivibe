// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBlocks } from '@/hooks/useBlocks';
import type { Block, BlockType } from '@/types/dashboard';

vi.mock('uuid', () => ({
  v4: vi.fn(),
}));

import { v4 as uuidv4 } from 'uuid';

const mockedUuid = vi.mocked(uuidv4);

function makeBlock(overrides: Partial<Block> = {}): Block {
  return {
    id: 'block-1',
    dashboardId: 'dash-1',
    type: 'clock',
    title: 'Clock',
    content: {},
    layoutX: 0,
    layoutY: 0,
    layoutW: 4,
    layoutH: 3,
    sortOrder: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('useBlocks', () => {
  const dashboardId = 'dash-1';

  beforeEach(() => {
    vi.restoreAllMocks();
    mockedUuid.mockReturnValue('generated-uuid-1');
  });

  it('returns initial blocks when provided', () => {
    const initial = [makeBlock({ id: 'b1' }), makeBlock({ id: 'b2' })];
    const { result } = renderHook(() => useBlocks(dashboardId, initial));

    expect(result.current.blocks).toHaveLength(2);
    expect(result.current.blocks[0].id).toBe('b1');
    expect(result.current.blocks[1].id).toBe('b2');
  });

  it('returns empty array when no initial blocks', () => {
    const { result } = renderHook(() => useBlocks(dashboardId));

    expect(result.current.blocks).toEqual([]);
  });

  it('addBlock creates block with correct type and default layout dimensions', () => {
    const { result } = renderHook(() => useBlocks(dashboardId));

    let newBlock: Block;
    act(() => {
      newBlock = result.current.addBlock('weather');
    });

    expect(newBlock!.type).toBe('weather');
    expect(newBlock!.title).toBe('Weather');
    expect(newBlock!.layoutW).toBe(4);
    expect(newBlock!.layoutH).toBe(4);
    expect(newBlock!.id).toBe('generated-uuid-1');
    expect(newBlock!.dashboardId).toBe(dashboardId);
    expect(newBlock!.content).toEqual({});
  });

  it('addBlock places new block at correct Y position below existing blocks', () => {
    const existing = [
      makeBlock({ id: 'b1', layoutY: 0, layoutH: 3 }),
      makeBlock({ id: 'b2', layoutY: 3, layoutH: 5 }),
    ];
    const { result } = renderHook(() => useBlocks(dashboardId, existing));

    let newBlock: Block;
    act(() => {
      newBlock = result.current.addBlock('notes');
    });

    // Max of (0+3, 3+5) = 8
    expect(newBlock!.layoutY).toBe(8);
  });

  it('addBlock sets sortOrder to current block count', () => {
    const existing = [makeBlock({ id: 'b1' }), makeBlock({ id: 'b2' })];
    const { result } = renderHook(() => useBlocks(dashboardId, existing));

    let newBlock: Block;
    act(() => {
      newBlock = result.current.addBlock('clock');
    });

    expect(newBlock!.sortOrder).toBe(2);
  });

  it('removeBlock removes the specified block', () => {
    const initial = [
      makeBlock({ id: 'b1' }),
      makeBlock({ id: 'b2' }),
      makeBlock({ id: 'b3' }),
    ];
    const { result } = renderHook(() => useBlocks(dashboardId, initial));

    act(() => {
      result.current.removeBlock('b2');
    });

    expect(result.current.blocks).toHaveLength(2);
    expect(result.current.blocks.map((b) => b.id)).toEqual(['b1', 'b3']);
  });

  it('removeBlock does nothing when id not found', () => {
    const initial = [makeBlock({ id: 'b1' })];
    const { result } = renderHook(() => useBlocks(dashboardId, initial));

    act(() => {
      result.current.removeBlock('nonexistent');
    });

    expect(result.current.blocks).toHaveLength(1);
  });

  it('updateBlock merges content correctly', () => {
    const initial = [
      makeBlock({ id: 'b1', content: { city: 'London', units: 'metric' } }),
    ];
    const { result } = renderHook(() => useBlocks(dashboardId, initial));

    act(() => {
      result.current.updateBlock('b1', { city: 'Paris' });
    });

    expect(result.current.blocks[0].content).toEqual({
      city: 'Paris',
      units: 'metric',
    });
    expect(result.current.blocks[0].updatedAt).not.toBe(initial[0].updatedAt);
  });

  it('updateLayout updates positions for matching blocks', () => {
    const initial = [
      makeBlock({ id: 'b1', layoutX: 0, layoutY: 0, layoutW: 4, layoutH: 3 }),
      makeBlock({ id: 'b2', layoutX: 0, layoutY: 3, layoutW: 4, layoutH: 3 }),
    ];
    const { result } = renderHook(() => useBlocks(dashboardId, initial));

    act(() => {
      result.current.updateLayout([
        { i: 'b1', x: 2, y: 1, w: 6, h: 4 },
        { i: 'b2', x: 0, y: 5, w: 8, h: 2 },
      ]);
    });

    const b1 = result.current.blocks.find((b) => b.id === 'b1')!;
    expect(b1.layoutX).toBe(2);
    expect(b1.layoutY).toBe(1);
    expect(b1.layoutW).toBe(6);
    expect(b1.layoutH).toBe(4);

    const b2 = result.current.blocks.find((b) => b.id === 'b2')!;
    expect(b2.layoutX).toBe(0);
    expect(b2.layoutY).toBe(5);
    expect(b2.layoutW).toBe(8);
    expect(b2.layoutH).toBe(2);
  });

  it('setBlocks replaces all blocks', () => {
    const initial = [makeBlock({ id: 'b1' })];
    const { result } = renderHook(() => useBlocks(dashboardId, initial));

    const replacement = [
      makeBlock({ id: 'new-1', type: 'notes' }),
      makeBlock({ id: 'new-2', type: 'todos' }),
    ];

    act(() => {
      result.current.setBlocks(replacement);
    });

    expect(result.current.blocks).toHaveLength(2);
    expect(result.current.blocks[0].id).toBe('new-1');
    expect(result.current.blocks[1].id).toBe('new-2');
  });

  it('addBlock uses getDefaultLayout for each block type', () => {
    const typesAndExpected: [BlockType, number, number][] = [
      ['greeting', 8, 4],
      ['clock', 4, 3],
      ['title', 8, 2],
      ['youtube', 6, 5],
    ];

    for (const [type, expectedW, expectedH] of typesAndExpected) {
      const { result } = renderHook(() => useBlocks(dashboardId));

      let newBlock: Block;
      act(() => {
        newBlock = result.current.addBlock(type);
      });

      expect(newBlock!.layoutW).toBe(expectedW);
      expect(newBlock!.layoutH).toBe(expectedH);
    }
  });
});
