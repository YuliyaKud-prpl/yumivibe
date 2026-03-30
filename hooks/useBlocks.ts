import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { type Block, type BlockType } from '@/types/dashboard';
import { getDefaultLayout, getDefaultTitle } from '@/utils/defaultLayouts';

interface LayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface UseBlocksReturn {
  blocks: Block[];
  setBlocks: (blocks: Block[]) => void;
  addBlock: (type: BlockType) => Block;
  removeBlock: (id: string) => void;
  updateBlock: (id: string, content: Record<string, unknown>) => void;
  updateLayout: (layouts: LayoutItem[]) => void;
}

function findNextY(blocks: Block[]): number {
  if (blocks.length === 0) return 0;
  return Math.max(...blocks.map((b) => b.layoutY + b.layoutH));
}

export function useBlocks(
  dashboardId: string,
  initialBlocks: Block[] = [],
): UseBlocksReturn {
  const [blocks, setBlocks] = useState<Block[]>(initialBlocks);

  const addBlock = useCallback(
    (type: BlockType): Block => {
      const defaults = getDefaultLayout(type);
      const now = new Date().toISOString();
      const newBlock: Block = {
        id: uuidv4(),
        dashboardId,
        type,
        title: getDefaultTitle(type),
        content: {},
        layoutX: 0,
        layoutY: findNextY(blocks),
        layoutW: defaults.w,
        layoutH: defaults.h,
        sortOrder: blocks.length,
        createdAt: now,
        updatedAt: now,
      };
      setBlocks((prev) => [...prev, newBlock]);
      return newBlock;
    },
    [dashboardId, blocks],
  );

  const removeBlock = useCallback((id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateBlock = useCallback(
    (id: string, content: Record<string, unknown>) => {
      setBlocks((prev) =>
        prev.map((b) =>
          b.id === id
            ? { ...b, content: { ...b.content, ...content }, updatedAt: new Date().toISOString() }
            : b,
        ),
      );
    },
    [],
  );

  const updateLayout = useCallback((layouts: LayoutItem[]) => {
    setBlocks((prev) =>
      prev.map((block) => {
        const layout = layouts.find((l) => l.i === block.id);
        if (!layout) return block;
        return {
          ...block,
          layoutX: layout.x,
          layoutY: layout.y,
          layoutW: layout.w,
          layoutH: layout.h,
          updatedAt: new Date().toISOString(),
        };
      }),
    );
  }, []);

  return { blocks, setBlocks, addBlock, removeBlock, updateBlock, updateLayout };
}
