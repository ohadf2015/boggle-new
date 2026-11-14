'use client';

import { useCountUp } from '@/hooks/useCountUp';
import { useLanguage } from '@/contexts/LanguageContext';
import { Mascot } from '@/components/ui/Mascot';
import { signupMilestone } from '@/lib/admin/signupMilestone';

interface Props {
  total: number;
  today: number;
  week: number;
}

export function SignupsHero({ total, today, week }: Props) {
  const { t, language } = useLanguage();
  const shown = useCountUp({ target: total, duration: 1600 });
  const m = signupMilestone(total, week);
  const fmt = (n: number) => n.toLocaleString(language);
  const date = new Date().toLocaleDateString(language, { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <section
      data-testid="signups-hero"
      className="relative mb-6 overflow-hidden rounded-neo border-4 border-neo-black bg-neo-navy p-5 shadow-hard sm:p-7"
    >
      <div className="flex items-center gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm font-bold uppercase tracking-wide text-neo-cream/80">
            <span>{t('admin.signupsHero.title', 'Signed up to LexiClash')}</span>
            <span className="text-xs font-medium normal-case tracking-normal text-neo-cream/50">{date}</span>
          </div>

          <div
            data-testid="signups-total"
            className="mt-1 font-neo-display text-7xl leading-none text-neo-lime tabular-nums [text-shadow:5px_5px_0_rgb(var(--neo-black))] sm:text-8xl lg:text-9xl"
          >
            {fmt(shown)}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-neo border-2 border-neo-black bg-neo-lime px-3 py-1 text-sm font-black text-neo-black shadow-hard-sm">
              +{fmt(today)} {t('admin.signupsHero.today', 'today')}
            </span>
            <span className="rounded-neo border-2 border-neo-black bg-neo-cyan px-3 py-1 text-sm font-black text-neo-black shadow-hard-sm">
              +{fmt(week)} {t('admin.signupsHero.week', 'this week')}
            </span>
            {m.crossedThisWeek && (
              <span data-testid="signups-milestone" className="rounded-neo border-2 border-neo-black bg-neo-pink px-3 py-1 text-sm font-black text-neo-black shadow-hard-sm">
                🎉 {t('admin.signupsHero.milestone', 'Passed {n} this week!', { n: fmt(m.prev) })}
              </span>
            )}
          </div>

          <div className="mt-5 max-w-xl">
            <div data-testid="signups-next" className="mb-1.5 text-xs font-semibold text-neo-cream/70">
              {t('admin.signupsHero.next', '{left} more to {next}', { left: fmt(m.next - total), next: fmt(m.next) })}
            </div>
            <div
              role="progressbar"
              aria-valuenow={m.pct}
              aria-valuemin={0}
              aria-valuemax={100}
              className="h-4 overflow-hidden rounded-full border-2 border-neo-black bg-neo-navy-light"
            >
              <div className="h-full bg-neo-lime transition-[width] duration-1000" style={{ width: `${m.pct}%` }} />
            </div>
          </div>
        </div>

        <div className="hidden shrink-0 md:block">
          <Mascot variant="trophy" size="sm" />
        </div>
      </div>
    </section>
  );
}
