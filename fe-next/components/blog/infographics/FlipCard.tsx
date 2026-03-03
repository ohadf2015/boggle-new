'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';

export type FlipCardItem = {
  front: string;
  back: string;
};

type FlipCardProps = {
  cards: FlipCardItem[];
  isDarkMode: boolean;
};

function SingleFlipCard({ card, isDarkMode }: { card: FlipCardItem; isDarkMode: boolean }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div
      className="cursor-pointer perspective-[600px]"
      onClick={() => setFlipped(f => !f)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFlipped(f => !f); }}
    >
      <AdaptiveMotion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
        style={{ transformStyle: 'preserve-3d' }}
        className="relative h-32"
      >
        {/* Front */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center p-4 rounded-neo border-3 border-neo-black shadow-hard-sm backface-hidden',
            isDarkMode ? 'bg-slate-700' : 'bg-neo-yellow'
          )}
          style={{ backfaceVisibility: 'hidden' }}
        >
          <span className={cn(
            'text-lg font-black text-center',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {card.front}
          </span>
        </div>
        {/* Back */}
        <div
          className={cn(
            'absolute inset-0 flex items-center justify-center p-4 rounded-neo border-3 border-neo-black shadow-hard-sm',
            isDarkMode ? 'bg-slate-600' : 'bg-neo-lime'
          )}
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <span className={cn(
            'text-sm font-bold text-center',
            isDarkMode ? 'text-white' : 'text-neo-black'
          )}>
            {card.back}
          </span>
        </div>
      </AdaptiveMotion.div>
    </div>
  );
}

export default function FlipCard({ cards, isDarkMode }: FlipCardProps) {
  return (
    <div className="my-8">
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <AdaptiveMotion.div
            key={i}
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.08, duration: 0.3 }}
            viewport={{ once: true }}
          >
            <SingleFlipCard card={card} isDarkMode={isDarkMode} />
          </AdaptiveMotion.div>
        ))}
      </div>
      <p className={cn(
        'text-xs text-center mt-2 italic',
        isDarkMode ? 'text-gray-500' : 'text-gray-400'
      )}>
        Tap to flip
      </p>
    </div>
  );
}
