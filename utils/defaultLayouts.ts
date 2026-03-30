import { type BlockType } from '@/types/dashboard';

interface LayoutDefaults {
  w: number;
  h: number;
  minW: number;
  minH: number;
}

const layoutDefaults: Record<BlockType, LayoutDefaults> = {
  greeting:  { w: 8, h: 4, minW: 4, minH: 3 },
  clock:     { w: 4, h: 3, minW: 2, minH: 2 },
  timer:     { w: 4, h: 4, minW: 3, minH: 3 },
  pomodoro:  { w: 4, h: 5, minW: 3, minH: 4 },
  weather:   { w: 4, h: 4, minW: 3, minH: 3 },
  quotes:    { w: 4, h: 4, minW: 3, minH: 3 },
  notes:     { w: 8, h: 4, minW: 4, minH: 3 },
  todos:     { w: 4, h: 5, minW: 3, minH: 3 },
  youtube:   { w: 6, h: 5, minW: 4, minH: 4 },
  spotify:   { w: 6, h: 5, minW: 4, minH: 4 },
  title:     { w: 8, h: 2, minW: 3, minH: 1 },
};

export function getDefaultLayout(type: BlockType): LayoutDefaults {
  return layoutDefaults[type];
}

export function getDefaultTitle(type: BlockType): string {
  const titles: Record<BlockType, string> = {
    greeting: 'Greeting',
    clock: 'Clock',
    timer: 'Timer',
    pomodoro: 'Pomodoro',
    weather: 'Weather',
    quotes: 'Quotes',
    notes: 'Notes',
    todos: 'To-Do List',
    youtube: 'YouTube',
    spotify: 'Spotify',
    title: 'Title',
  };
  return titles[type];
}
