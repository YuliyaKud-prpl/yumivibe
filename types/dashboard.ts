export const BLOCK_TYPES = [
  'greeting',
  'clock',
  'timer',
  'pomodoro',
  'weather',
  'quotes',
  'notes',
  'todos',
  'youtube',
  'spotify',
  'title',
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export interface Block {
  id: string;
  dashboardId: string;
  type: BlockType;
  title: string;
  content: Record<string, unknown>;
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface Dashboard {
  id: string;
  name: string;
  theme: 'light' | 'dark';
  background: string;
  backgroundType: 'color' | 'gradient' | 'image' | 'unsplash';
  accentColor?: string;
  palette?: {
    greetingFrom: string;
    greetingTo: string;
    greetingText: string;
  };
  blocks: Block[];
  createdAt: string;
  updatedAt: string;
}

export interface DashboardSummary {
  id: string;
  name: string;
  blockCount: number;
  theme: 'light' | 'dark';
  background: string;
  updatedAt: string;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
}

export interface TimerContent {
  duration: number;
  remaining: number;
}

export interface PomodoroContent {
  workMinutes: number;
  breakMinutes: number;
}

export interface WeatherContent {
  city: string;
  units: 'metric' | 'imperial';
}

export interface NotesContent {
  text: string;
}

export interface QuotesContent {
  currentQuote: string;
  author: string;
}

export interface YouTubeContent {
  videoUrl: string;
}

export interface SpotifyContent {
  embedUrl: string;
}
