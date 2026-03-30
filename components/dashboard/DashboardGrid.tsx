'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import { Responsive, WidthProvider, type Layout, type LayoutItem } from 'react-grid-layout/legacy';
import { type Dashboard } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';
import { useTheme } from '@/context/ThemeContext';
import { getBlockComponent } from '@/utils/blockRegistry';
import { getDefaultLayout } from '@/utils/defaultLayouts';
import { BlockWrapper } from './BlockWrapper';
import { ErrorBoundary } from '@/components/errors/ErrorBoundary';
import { BlockError } from '@/components/errors/BlockError';

import 'react-grid-layout/css/styles.css';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardGridProps {
  dashboard: Dashboard;
}

export function DashboardGrid({ dashboard }: DashboardGridProps) {
  const { blocks, removeBlock, updateBlock, updateLayout } = useDashboardContext();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentBreakpoint, setCurrentBreakpoint] = useState<string>('lg');

  const layouts = useMemo(() => {
    const lg: LayoutItem[] = blocks.map((block) => {
      const defaults = getDefaultLayout(block.type);
      return {
        i: block.id,
        x: block.layoutX,
        y: block.layoutY,
        w: block.layoutW,
        h: block.layoutH,
        minW: defaults.minW,
        minH: defaults.minH,
      };
    });

    const md: LayoutItem[] = blocks.map((block) => {
      const defaults = getDefaultLayout(block.type);
      return {
        i: block.id,
        x: block.layoutX % 8,
        y: block.layoutY,
        w: Math.min(block.layoutW, 8),
        h: block.layoutH,
        minW: Math.min(defaults.minW, 8),
        minH: defaults.minH,
      };
    });

    const sm: LayoutItem[] = blocks.map((block, index) => {
      const defaults = getDefaultLayout(block.type);
      return {
        i: block.id,
        x: 0,
        y: index * block.layoutH,
        w: 4,
        h: block.layoutH,
        minW: Math.min(defaults.minW, 4),
        minH: defaults.minH,
      };
    });

    return { lg, md, sm };
  }, [blocks]);

  const handleBreakpointChange = useCallback((newBreakpoint: string) => {
    setCurrentBreakpoint(newBreakpoint);
  }, []);

  const handleLayoutChange = useCallback(
    (currentLayout: Layout) => {
      if (currentBreakpoint !== 'lg') return;
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        updateLayout(currentLayout as LayoutItem[]);
      }, 500);
    },
    [updateLayout, currentBreakpoint],
  );

  const backgroundStyle = useMemo(() => {
    if (isDark) return { backgroundColor: '#1a1d11' };

    const { background, backgroundType } = dashboard;
    if (!background) return {};

    switch (backgroundType) {
      case 'color':
        return { backgroundColor: background };
      case 'gradient':
        return { background };
      case 'image':
      case 'unsplash':
        return {
          backgroundImage: `url(${background})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        };
      default:
        return {};
    }
  }, [dashboard, isDark]);

  return (
    <div
      className="min-h-screen p-6 md:p-12"
      style={backgroundStyle}
    >
      <div className="max-w-7xl mx-auto w-full">
        {blocks.length === 0 ? (
          <div className="flex min-h-[60vh] items-center justify-center">
            <div className="bg-surface-container-lowest/80 backdrop-blur-xl rounded-3xl px-10 py-8 shadow-lg">
              <div className="text-center space-y-4">
                <span className="material-symbols-outlined text-6xl text-on-surface-variant/20">
                  dashboard_customize
                </span>
                <p className="text-lg font-medium text-on-surface-variant">
                  No blocks yet. Click &quot;Add Block&quot; to get started.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <ResponsiveGridLayout
            layouts={layouts}
            breakpoints={{ lg: 1024, md: 768, sm: 0 }}
            cols={{ lg: 12, md: 8, sm: 4 }}
            rowHeight={80}
            draggableHandle=".drag-handle"
            onLayoutChange={handleLayoutChange}
            onBreakpointChange={handleBreakpointChange}
            compactType="vertical"
            margin={[24, 24]}
            containerPadding={[0, 0]}
          >
            {blocks.map((block) => {
              const BlockComponent = getBlockComponent(block.type);
              return (
                <div key={block.id}>
                  <BlockWrapper
                    title={block.title}
                    onDelete={() => removeBlock(block.id)}
                    accentColor={dashboard.accentColor}
                  >
                    <ErrorBoundary
                      fallback={<BlockError onRetry={() => { /* force re-render via key change */ }} />}
                    >
                      <BlockComponent
                        block={block}
                        onUpdate={(content) => updateBlock(block.id, content)}
                      />
                    </ErrorBoundary>
                  </BlockWrapper>
                </div>
              );
            })}
          </ResponsiveGridLayout>
        )}
      </div>
    </div>
  );
}
