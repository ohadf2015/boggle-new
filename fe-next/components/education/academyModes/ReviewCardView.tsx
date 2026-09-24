'use client';

/** One review card: pick-the-meaning or unscramble. Remounted per card (keyed by the parent). */

import { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { graphemes, type ReviewCard } from '@/lib/education/missedWordsReview';
import { cn } from '@/lib/utils';

interface Props {
  card: ReviewCard;
  answered: boolean;
  correct: boolean | null;
  onAnswer: (correct: boolean) => void;
  onTile?: () => void;
}

const same = (a: string, b: string) => a.toLocaleLowerCase() === b.toLocaleLowerCase();

const TILE_BEVEL = 'inset 0 2px 0 #fff, inset 0 -6px 0 #c79a5a, 0 4px 0 #000, 0 8px 12px rgba(0,0,0,0.35)';
const TILT = [-2, 1.5, -1, 2, -1.5, 1];

export default function ReviewCardView({ card, answered, correct, onAnswer, onTile }: Props) {
  const { t } = useLanguage();
  const [picked, setPicked] = useState<number[]>([]);
  // Source of truth for taps: two fast taps in one render must not both read position 0.
  const pickedRef = useRef<number[]>([]);
  const doneRef = useRef(false);
  const [chosen, setChosen] = useState<string | null>(null);
  const dir = card.language === 'he' ? 'rtl' : 'ltr';

  // A parchment "library card" from the vault, inked like the map art.
  const panel = cn('w-full rounded-neo border-[3px] border-black bg-neo-cream p-4 text-black shadow-hard-lg sm:p-8 lg:p-10');
  const panelStyle = {
    backgroundImage: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.9), transparent 60%), linear-gradient(180deg, #fffaf0 0%, #f2e2c0 100%)',
    boxShadow: answered
      ? `8px 8px 0 #000, 0 0 0 4px ${correct ? '#bfff00' : '#ff1493'}, 0 0 40px ${correct ? 'rgba(191,255,0,0.55)' : 'rgba(255,20,147,0.55)'}`
      : '8px 8px 0 #000, 0 0 40px rgba(0,255,255,0.25)',
  };
  const ivory = 'linear-gradient(180deg, #fffdf6 0%, #f6e8c8 55%, #ead3a2 100%)';

  if (card.kind === 'meaning') {
    return (
      <div className={panel} style={panelStyle}>
        <p className="mb-1 text-center font-neo-display text-xs font-black uppercase tracking-widest text-neo-purple lg:mb-3 lg:text-lg">
          {t('academy.modes.review.pickMeaning', 'What does it mean?')}
        </p>
        <p data-testid="review-meaning-prompt" dir={dir} translate="no" className="mb-4 text-center font-neo-display text-4xl font-black text-black sm:text-6xl lg:text-7xl">
          {card.word}
        </p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
          {card.options.map((opt) => {
            const isAnswer = opt === card.definition;
            return (
              <button
                key={opt}
                type="button"
                disabled={answered}
                onClick={() => {
                  setChosen(opt);
                  onAnswer(isAnswer);
                }}
                className={cn(
                  'min-h-12 rounded-neo border-[3px] border-black px-3 py-2 text-start font-neo-body text-sm font-bold leading-snug text-black shadow-hard transition-transform active:translate-y-0.5 active:shadow-none sm:min-h-16 sm:text-base lg:min-h-20 lg:text-xl',
                  answered && isAnswer ? 'bg-neo-lime' : answered && chosen === opt ? 'bg-neo-pink' : 'bg-neo-white',
                  'line-clamp-3',
                )}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const letters = graphemes(card.word);
  const n = card.tiles.length;
  // Long words split into two balanced rows (10 letters = 5 + 5) so phone tiles stay thumb-sized;
  // frame + panel padding ≈ 4.5rem at 390px, capped at 5.5rem per tile on desktop.
  const cols = n <= 7 ? n : Math.ceil(n / 2);
  const tileWidth = `min(5.5rem, calc((100vw - 4.5rem) / ${Math.max(cols, 5)} - 0.4rem))`;
  const rowStyle = { gridTemplateColumns: `repeat(${cols}, ${tileWidth})` };
  const tileFont = `calc(${tileWidth} * 0.55)`;
  // Answer slots run a size smaller than the tiles so a two-row word still fits a phone card.
  const slotWidth = `calc(${tileWidth} * 0.8)`;
  const slotRowStyle = { gridTemplateColumns: `repeat(${cols}, ${slotWidth})` };
  const onTap = (i: number) => {
    if (answered || doneRef.current || pickedRef.current.includes(i)) return;
    onTile?.();
    const pos = pickedRef.current.length;
    const next = [...pickedRef.current, i];
    pickedRef.current = next;
    setPicked(next);
    if (!same(card.tiles[i], letters[pos])) {
      doneRef.current = true;
      onAnswer(false);
      return;
    }
    if (next.length === letters.length) {
      doneRef.current = true;
      onAnswer(true);
    }
  };

  return (
    <div className={panel} style={panelStyle}>
      <p className="mb-1 text-center font-neo-display text-xs font-black uppercase tracking-widest text-neo-purple lg:mb-3 lg:text-lg">
        {t('academy.modes.review.unscramble', 'Unscramble the word')}
      </p>
      {card.definition && (
        <p className="mb-2 line-clamp-2 text-center font-neo-body text-sm font-bold text-black lg:mb-4 lg:text-xl">{card.definition}</p>
      )}
      {/* Answer slots */}
      <div dir={dir} translate="no" style={slotRowStyle} className="mb-4 grid justify-center gap-1.5 sm:mb-6">
        {letters.map((ch, i) => {
          const filled = i < picked.length ? card.tiles[picked[i]] : answered ? ch : '';
          const wrong = answered && correct === false && i === picked.length - 1;
          return (
            <span
              key={i}
              style={{ width: slotWidth, fontSize: `calc(${slotWidth} * 0.55)` }}
              className={cn(
                'grid aspect-square place-items-center rounded-xl border-[3px] font-neo-display font-black',
                filled ? 'border-black text-black shadow-[inset_0_2px_0_rgba(255,255,255,0.7),inset_0_-5px_0_rgba(0,0,0,0.22),0_3px_0_#000]' : 'border-dashed border-black/40 bg-black/5 text-transparent shadow-[inset_0_3px_4px_rgba(0,0,0,0.15)]',
                filled && (wrong ? 'bg-neo-pink' : answered && correct === false ? 'bg-neo-cream/70' : 'bg-neo-lime'),
              )}
            >
              {answered && correct === false ? ch : filled}
            </span>
          );
        })}
      </div>
      {/* Tiles */}
      <div dir={dir} translate="no" style={rowStyle} className="grid justify-center gap-1.5">
        {card.tiles.map((ch, i) => {
          const used = picked.includes(i);
          return (
            <motion.button
              key={i}
              type="button"
              data-testid="review-tile"
              disabled={answered || used}
              onClick={() => onTap(i)}
              whileTap={{ scale: 0.88 }}
              style={{
                width: tileWidth,
                fontSize: tileFont,
                backgroundImage: used ? undefined : ivory,
                // Carved ivory tile: top highlight, a thick baked bottom edge, a hard drop and a soft cast shadow.
                boxShadow: used ? undefined : TILE_BEVEL,
                rotate: used ? undefined : `${TILT[i % TILT.length]}deg`,
              }}
              className={cn(
                'grid aspect-square place-items-center rounded-xl border-[3px] pb-[0.12em] font-neo-display font-black leading-none',
                used ? 'border-dashed border-black/30 bg-black/10 text-black/25' : 'border-black bg-neo-cream text-black',
              )}
            >
              {ch}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
