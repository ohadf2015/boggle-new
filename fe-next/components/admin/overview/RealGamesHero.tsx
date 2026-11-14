'use client';

import { Gamepad2 } from 'lucide-react';
import { useCountUp } from '@/hooks/useCountUp';
import { useLanguage } from '@/contexts/LanguageContext';

interface Props {
  total: number;
  today: number;
  week: number;
}

/** All-time real games (see admin_real_games_stats), shown under the signups hero. */
export function RealGamesHero({ total, today, week }: Props) {
  const { t, language } = useLanguage();
  const shown = useCountUp({ target: total, duration: 1600 });
  const fmt = (n: number) => n.toLocaleString(language);

  return (
    <section
      data-testid="real-games-hero"
      className="relative mb-6 overflow-hidden rounded-neo border-4 border-neo-black bg-neo-navy p-5 shadow-hard sm:p-7"
    >
      <div className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-neo-cream/80">
        <Gamepad2 className="h-4 w-4 text-neo-cyan" aria-hidden />
        <span>{t('admin.realGamesHero.title', 'Games played since launch')}</span>
      </div>

      <div
        data-testid="real-games-total"
        className="mt-1 font-neo-display text-6xl leading-none text-neo-cyan tabular-nums [text-shadow:4px_4px_0_rgb(var(--neo-black))] sm:text-7xl lg:text-8xl"
      >
        {fmt(shown)}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-neo border-2 border-neo-black bg-neo-lime px-3 py-1 text-sm font-black text-neo-black shadow-hard-sm">
          +{fmt(today)} {t('admin.signupsHero.today', 'today')}
        </span>
        <span className="rounded-neo border-2 border-neo-black bg-neo-pink px-3 py-1 text-sm font-black text-neo-black shadow-hard-sm">
          +{fmt(week)} {t('admin.signupsHero.week', 'this week')}
        </span>
      </div>

      <p data-testid="real-games-hint" className="mt-4 max-w-xl text-xs font-semibold text-neo-cream/60">
        {t('admin.realGamesHero.hint', 'Real games only: each player’s finished game with at least one word found. Test accounts and previews are left out.')}
      </p>
    </section>
  );
}
