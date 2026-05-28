'use client';

import { PERKS, type PerkId } from '@/lib/wordTower/perks';

interface Props {
  /** The 3 (or fewer) offered perks — null when no draft is open. */
  choices: PerkId[] | null;
  onChoose: (id: PerkId) => void;
  onSkip: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir?: 'ltr' | 'rtl';
}

/**
 * Roguelike perk draft — a pick-1-of-3 boon card shown at daily milestones.
 * Modal overlay (pauses the climb visually); each card is a neo-brutalist tile.
 */
export function WordTowerPerkDraft({ choices, onChoose, onSkip, t, dir = 'ltr' }: Props) {
  if (!choices || choices.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-neo-navy/80 px-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('wordTower.perk.title')}
      dir={dir}
    >
      <div className="w-full max-w-md animate-neo-pop rounded-neo border-neo-thick border-black bg-neo-navy-light p-4 shadow-hard-lg">
        <h2 className="mb-1 text-center font-neo-display text-xl font-black uppercase tracking-wide text-neo-purple">
          {t('wordTower.perk.title')}
        </h2>
        <p className="mb-4 text-center font-neo-body text-xs font-bold text-neo-white/70">
          {t('wordTower.perk.subtitle')}
        </p>

        <div className="flex flex-col gap-2.5">
          {choices.map((id) => {
            const perk = PERKS[id];
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChoose(id)}
                className="group flex items-center gap-3 rounded-neo border-neo-thick border-black bg-neo-navy px-3 py-3 text-start shadow-hard transition-transform hover:-translate-y-0.5 active:translate-y-px"
              >
                <span className="text-3xl" aria-hidden>{perk.icon}</span>
                <span className="flex-1">
                  <span className="block font-neo-display text-base font-black text-neo-lime">
                    {t(perk.nameKey)}
                  </span>
                  <span className="block font-neo-body text-xs font-medium text-neo-white/80">
                    {t(perk.descKey)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onSkip}
          className="mx-auto mt-3 block font-neo-body text-xs font-bold uppercase tracking-wider text-neo-white/50 underline-offset-2 hover:underline"
        >
          {t('wordTower.perk.skip')}
        </button>
      </div>
    </div>
  );
}
