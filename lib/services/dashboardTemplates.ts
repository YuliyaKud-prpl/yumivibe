export interface TemplateBlock {
  type: string;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface TemplateConfig {
  bg: string;
  bgType: string;
  accent: string;
  blocks: TemplateBlock[];
}

export const TEMPLATE_BLOCKS: Record<string, TemplateConfig> = {
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
