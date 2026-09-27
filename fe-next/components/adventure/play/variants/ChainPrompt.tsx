'use client';

/**
 * CHAIN: the letter the next word must start with, big and glowing. A word
 * that breaks the chain (run hook returns 'chain') shakes the prompt and says why.
 */
import { memo, useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import './variants.css';

interface Props {
  letter: string | null;
  /** Bumps on every chain-breaking attempt (e.g. the rejected HitEvent id). */
  brokenAt: number | null;
  /** Current chain length (words linked so far). */
  links: number;
}

function ChainPrompt({ letter, brokenAt, links }: Props) {
  const { t } = useLanguageSafe();
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    if (brokenAt == null) return;
    setBroken(true);
    const id = setTimeout(() => setBroken(false), 1600);
    return () => clearTimeout(id);
  }, [brokenAt]);
  const shown = letter?.toUpperCase() ?? null;
  return (
    <section className={cn('mt-2 flex items-center gap-3 rounded-xl border-[3px] border-black bg-[#1a1a2e]/95 px-3 py-1.5 shadow-[3px_3px_0_#000]', broken && 'chain-broken')}
      data-testid="chain-prompt" aria-live="polite">
      <span className={cn('chain-letter grid h-12 w-12 shrink-0 place-items-center rounded-xl border-[3px] border-black font-neo-display text-3xl font-bold text-black',
        broken ? 'bg-neo-pink' : 'bg-neo-yellow')} data-letter={shown ?? ''}>
        {shown ?? <Link2 className="h-6 w-6" strokeWidth={3} />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-neo-display text-sm font-bold leading-tight">
          {broken && shown ? t('adventurePlay.variety.chainBroken', { letter: shown })
            : shown ? t('adventurePlay.variety.chainNext') : t('adventurePlay.variety.chainStart')}
        </div>
        <div className="text-[11px] font-bold uppercase tracking-wider text-neo-yellow tabular-nums">
          {t('adventurePlay.variety.chainLinks', { count: links })}
        </div>
      </div>
    </section>
  );
}

export default memo(ChainPrompt);
