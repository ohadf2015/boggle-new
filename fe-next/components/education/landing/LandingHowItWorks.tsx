'use client';
import { Users, QrCode, Play } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import m from './landingMotion.module.css';

export interface GeoAnswer {
  question: string;
  answer: string;
}

const STEPS = [
  { id: 'create', Icon: Users, tone: 'bg-neo-lime' },
  { id: 'share', Icon: QrCode, tone: 'bg-neo-cyan' },
  { id: 'play', Icon: Play, tone: 'bg-neo-pink' },
] as const;

/** How a class runs, readable before signing up. The geo answer stays visible: it backs the FAQ JSON-LD. */
export function LandingHowItWorks({ geo }: { geo?: GeoAnswer }) {
  const { t } = useLanguage();
  return (
    <section id="how-it-works" data-answer className="mx-auto max-w-6xl scroll-mt-20 px-4 py-8 sm:px-6 sm:py-14 lg:px-8">
      <h2 className="max-w-3xl text-balance font-neo-poster text-2xl font-extrabold leading-tight tracking-[-0.01em] text-edu-ink [overflow-wrap:anywhere] sm:text-3xl">
        {geo?.question ?? t('eduPlans.how.title')}
      </h2>
      {geo && <p className="mt-3 max-w-[70ch] text-base leading-relaxed text-edu-ink/80">{geo.answer}</p>}
      <ol className="mt-5 grid gap-4 md:grid-cols-3 md:gap-5">
        {STEPS.map(({ id, Icon, tone }, i) => (
          <li
            key={id}
            data-testid={`onboarding-step-${id}`}
            style={{ '--i': i } as CSSProperties}
            className={cn(
              'flex items-start gap-3 sm:rounded-neo sm:border-3 sm:border-edu-line sm:bg-edu-surface sm:p-4 sm:shadow-hard sm:hover:shadow-hard-lg',
              m.card,
              m.reveal
            )}
          >
            <span className={cn('grid size-11 shrink-0 place-items-center rounded-neo border-2 border-neo-black text-neo-navy shadow-hard-sm', tone, m.stepIcon)}>
              <Icon className="size-5" strokeWidth={2.5} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <h3 className="font-neo-display text-lg font-black leading-tight text-edu-ink">
                <span className="me-1.5 text-edu-ink/60 tabular-nums">{i + 1}.</span>
                {t(`eduPlans.how.${id}Title`)}
              </h3>
              <p className="mt-1 text-sm leading-snug text-edu-ink/75">{t(`eduPlans.how.${id}Body`)}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

export default LandingHowItWorks;
