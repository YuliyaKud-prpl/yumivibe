import { type ComponentType } from 'react';
import { type Block, type BlockType } from '@/types/dashboard';
import { GreetingBlock } from '@/components/blocks/GreetingBlock';
import { ClockBlock } from '@/components/blocks/ClockBlock';
import { TimerBlock } from '@/components/blocks/TimerBlock';
import { PomodoroBlock } from '@/components/blocks/PomodoroBlock';
import { WeatherBlock } from '@/components/blocks/WeatherBlock';
import { QuotesBlock } from '@/components/blocks/QuotesBlock';
import { NotesBlock } from '@/components/blocks/NotesBlock';
import { TodosBlock } from '@/components/blocks/TodosBlock';
import { YouTubeBlock } from '@/components/blocks/YouTubeBlock';
import { SpotifyBlock } from '@/components/blocks/SpotifyBlock';
import { TitleBlock } from '@/components/blocks/TitleBlock';

export interface BlockComponentProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

const registry: Record<BlockType, ComponentType<BlockComponentProps>> = {
  greeting: GreetingBlock,
  clock: ClockBlock,
  timer: TimerBlock,
  pomodoro: PomodoroBlock,
  weather: WeatherBlock,
  quotes: QuotesBlock,
  notes: NotesBlock,
  todos: TodosBlock,
  youtube: YouTubeBlock,
  spotify: SpotifyBlock,
  title: TitleBlock,
};

export function getBlockComponent(type: BlockType): ComponentType<BlockComponentProps> {
  return registry[type];
}
