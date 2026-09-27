'use client';

import { ChevronRight, Lock, Sparkles } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';
import type { LevelUnlock } from '@/lib/avatar/unlocks';
import type { UnlockReveal } from '@/lib/avatar/revealTrigger';

export interface PostGameUnlockStripProps {
  reveal: UnlockReveal | null;
  next: LevelUnlock | null;
  onOpen: () => void;
}

/**
 * One quiet row under the XP bar: a "New unlock!" chip when this game's
 * level-up granted avatar parts (tap = see them again), and a tiny "next
 * unlock at Lv N" tease tinted with that part's rarity. No card, no nag.
 */
export default function PostGameUnlockStrip({ reveal, next, onOpen }: PostGameUnlockStripProps) {
  const { t } = useLanguage();
  if (!reveal && !next) return null;
  const hex = reveal ? RARITY_TOKENS[reveal.rarity].hex : null;

  return (
    <div data-testid="post-game-unlocks" className="flex flex-wrap items-center gap-2">
      {reveal && hex && (
        <button
          type="button"
          data-testid="post-game-unlock-chip"
          onClick={onOpen}
          className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border-2 border-black shadow-hard-sm text-neo-black text-xs font-black uppercase tracking-wide hover:-translate-y-px active:translate-y-px active:shadow-none transition-transform"
          style={{ background: hex }}
        >
          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
          {reveal.unlocks.length > 1
            ? t('revealUnlock.chipMany', { count: reveal.unlocks.length })
            : t('revealUnlock.chip')}
          <ChevronRight className="w-3.5 h-3.5 rtl:rotate-180" aria-hidden="true" />
        </button>
      )}
      {next && (
        <span
          data-testid="post-game-next-unlock"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-neo-cream/70"
        >
          <Lock className="w-3 h-3" style={{ color: RARITY_TOKENS[next.rarity].hex }} aria-hidden="true" />
          {t('revealUnlock.nextHint', { level: next.level })}
        </span>
      )}
    </div>
  );
}
