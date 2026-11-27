'use client';

import { useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { podium, type Match } from '@/lib/holidays/arcade/kit/passPlay';
import { cn } from '@/lib/utils';
import { useArcadeFx } from '../ArcadeShell';
import { useKitSfx } from '../kit/useKitSfx';
import { PLAYER_BG, playerName } from './playerChip';
import styles from './family.module.css';

const STEP = ['h-28', 'h-20', 'h-14', 'h-10'];

export default function Podium({ match, onDone }: { match: Match; onDone: () => void }) {
  const { t } = useLanguage();
  const sfx = useKitSfx();
  const fx = useArcadeFx();
  const rows = podium(match);
  const champ = rows[0];

  useEffect(() => {
    sfx.play('win');
    fx.cheer(t('holiday.arcade.family.champion', { name: playerName(t, champ, champ.index) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="family-podium" data-testid="family-podium" className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-neo-navy/80 p-4 text-center">
      <h2 id="family-podium" className="font-neo-display text-3xl font-black text-neo-holiday-gold [text-shadow:3px_3px_0_rgb(var(--neo-black))]">
        {t('holiday.arcade.family.podium')}
      </h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/holidays/arcade/spr-trophy.webp" alt="" width={120} height={104} className={cn('h-20 w-auto drop-shadow-[3px_3px_0_rgb(var(--neo-black))]', styles.bob)} />
      <ol className="flex w-full max-w-sm items-end justify-center gap-2">
        {rows.map((r, i) => (
          <li key={r.index} className={cn('flex min-w-0 flex-1 flex-col items-center gap-1', styles.rise)} style={{ animationDelay: `${(rows.length - i) * 120}ms` }}>
            <span className="max-w-full truncate font-neo-display text-sm font-black">{playerName(t, r, r.index)}</span>
            <span className="font-neo-display text-lg font-black tabular-nums text-neo-holiday-gold">{r.score}</span>
            <span className={cn('grid w-full place-items-center rounded-t-xl border-[3px] border-b-0 border-black font-neo-display text-2xl font-black text-neo-navy shadow-hard', PLAYER_BG[r.color], STEP[r.place - 1])}>
              {r.place}
            </span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        autoFocus
        data-testid="family-finish"
        onClick={onDone}
        className="h-12 w-full max-w-xs rounded-xl border-[3px] border-black bg-neo-lime font-neo-display text-lg font-black text-neo-navy shadow-hard active:translate-x-px active:translate-y-px active:shadow-hard-pressed"
      >
        {t('holiday.arcade.family.finish')}
      </button>
    </div>
  );
}
