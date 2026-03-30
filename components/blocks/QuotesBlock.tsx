'use client';

import { useState, useCallback } from 'react';
import { Block } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';

interface BlockProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

const QUOTES = [
  { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
  { text: 'Innovation distinguishes between a leader and a follower.', author: 'Steve Jobs' },
  { text: 'Stay hungry, stay foolish.', author: 'Stewart Brand' },
  { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
  { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
  { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
  { text: 'The sun himself is weak when he first rises, and gathers strength and courage as the day gets on.', author: 'Charles Dickens' },
  { text: 'The happiness of your life depends upon the quality of your thoughts.', author: 'Marcus Aurelius' },
  { text: 'We delight in the beauty of the butterfly, but rarely admit the changes it has gone through.', author: 'Maya Angelou' },
  { text: 'Imagination is more important than knowledge. Knowledge is limited. Imagination encircles the world.', author: 'Albert Einstein' },
  { text: 'Be yourself; everyone else is already taken.', author: 'Oscar Wilde' },
  { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
  { text: 'The journey of a thousand miles begins with a single step.', author: 'Lao Tzu' },
  { text: 'Nothing in life is to be feared, it is only to be understood.', author: 'Marie Curie' },
  { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
  { text: 'What lies behind us and what lies before us are tiny matters compared to what lies within us.', author: 'Ralph Waldo Emerson' },
  { text: 'You cannot find peace by avoiding life.', author: 'Virginia Woolf' },
  { text: 'Let yourself be silently drawn by the strange pull of what you really love.', author: 'Rumi' },
  { text: 'One day you will wake up and there won\'t be any more time to do the things you\'ve always wanted. Do it now.', author: 'Paulo Coelho' },
  { text: 'I used to think I was the strangest person in the world, then I thought there are so many people in the world, there must be someone just like me.', author: 'Frida Kahlo' },
  { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
  { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { text: 'In order to be irreplaceable one must always be different.', author: 'Coco Chanel' },
  { text: 'The biggest adventure you can take is to live the life of your dreams.', author: 'Oprah Winfrey' },
  { text: 'The present is theirs; the future, for which I really worked, is mine.', author: 'Nikola Tesla' },
  { text: 'Waste no more time arguing about what a good man should be. Be one.', author: 'Marcus Aurelius' },
  { text: 'If you want to lift yourself up, lift up someone else.', author: 'Mark Twain' },
  { text: 'Life is not measured by the number of breaths we take, but by the moments that take our breath away.', author: 'Maya Angelou' },
];

export function QuotesBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const accent = dashboard.accentColor ?? '#237227';
  const [quote, setQuote] = useState(
    (block.content.currentQuote as string) || QUOTES[0].text
  );
  const [author, setAuthor] = useState(
    (block.content.author as string) || QUOTES[0].author
  );
  const [manual, setManual] = useState(false);
  const [customText, setCustomText] = useState('');

  const newQuote = useCallback(() => {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    setQuote(q.text);
    setAuthor(q.author);
    onUpdate({ ...block.content, currentQuote: q.text, author: q.author });
  }, [block.content, onUpdate]);

  const saveCustom = useCallback(() => {
    if (!customText.trim()) return;
    setQuote(customText.trim());
    setAuthor('You');
    onUpdate({ ...block.content, currentQuote: customText.trim(), author: 'You' });
  }, [customText, block.content, onUpdate]);

  return (
    <div className="p-8 h-full flex flex-col justify-center rounded-2xl">
      {!manual ? (
        <>
          <span className="material-symbols-outlined opacity-20 text-4xl mb-4" style={{ color: accent }}>
            format_quote
          </span>
          <p className="text-xl font-medium text-on-surface italic leading-relaxed">
            &ldquo;{quote}&rdquo;
          </p>
          <p className="mt-4 text-sm font-bold uppercase tracking-widest" style={{ color: accent }}>
            &mdash; {author}
          </p>
          <div className="flex gap-2 mt-6">
            <button
              onClick={newQuote}
              className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-high text-on-surface rounded-xl text-sm font-medium hover:bg-surface-container-highest transition-colors"
            >
              <span className="material-symbols-outlined text-base">refresh</span>
              New Quote
            </button>
            <button
              onClick={() => setManual(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-surface-container text-on-surface-variant rounded-xl text-sm font-medium hover:bg-surface-container-high transition-colors"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              Custom
            </button>
          </div>
        </>
      ) : (
        <>
          <textarea
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            placeholder="Enter your own quote..."
            className="w-full flex-1 border border-outline-variant rounded-xl p-4 text-sm text-on-surface bg-surface-container-lowest resize-none focus:outline-none focus:ring-1 focus:ring-primary italic"
          />
          <div className="flex gap-2 mt-4">
            <button
              onClick={saveCustom}
              className="px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
            >
              Save
            </button>
            <button
              onClick={() => setManual(false)}
              className="px-4 py-2 bg-surface-container text-on-surface-variant rounded-xl text-sm font-medium hover:bg-surface-container-high transition-colors"
            >
              Back
            </button>
          </div>
        </>
      )}
    </div>
  );
}
