'use client';

/** Hint button with its charge count. Each press lights real tiles on the board (see BoardFx). */
import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

interface Props {
  hintsLeft: number;
  onHint: () => void;
  disabled?: boolean;
  className?: string;
}

export default function HintButton({ hintsLeft, onHint, disabled, className }: Props) {
  const { t } = useLanguageSafe();
  const [pop, setPop] = useState(0);
  const empty = hintsLeft <= 0;
  return (
    <button
      type="button"
      data-testid="adv-hint-button"
      disabled={disabled || empty}
      onClick={() => { setPop((p) => p + 1); onHint(); }}
      aria-label={t('adventurePlay.juice.hintAria', { count: hintsLeft })}
      className={cn(
        'relative inline-flex items-center gap-1.5 rounded-xl border-[3px] border-black px-3 py-1.5 font-neo-display font-bold text-black shadow-[3px_3px_0_#000] transition-transform active:translate-y-0.5 active:shadow-none',
        empty ? 'bg-[#3a3f5c] text-neo-cream/60 shadow-none' : 'bg-neo-yellow',
        'disabled:cursor-not-allowed',
        className,
      )}
    >
      <Lightbulb key={pop} className={cn('w-5 h-5 stroke-[2.5]', pop > 0 && 'adv-hint-btn-pop', !empty && 'fill-white')} />
      <span className="text-sm uppercase">{t('adventurePlay.juice.hint')}</span>
      <span className={cn('grid place-items-center min-w-6 h-6 rounded-full border-2 border-black px-1 text-sm tabular-nums',
        empty ? 'bg-black/40 text-neo-cream/60' : 'bg-black text-neo-yellow')}>
        {hintsLeft}
      </span>
    </button>
  );
}
