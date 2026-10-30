'use client';

import { Fragment, useEffect } from 'react';
import { ChevronRight } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import type { SessionFlowStep } from '@/lib/education/sessionTemplates';
import { LobbyWarmupButton, LobbyWarmupStatus, type LobbyWarmupState } from './LobbyWarmup';

const STEPS: readonly SessionFlowStep[] = ['learn', 'solo', 'live'];
const REFRESH_MS = 20_000;

/** A ready-made lesson's run sheet: the list goes out as practice (learn + solo), then GO LIVE. */
export function LobbyFlowStrip({ warmup, modeName }: { warmup: LobbyWarmupState; modeName: string }) {
  const { t } = useLanguage();
  const sent = !!warmup.sent;
  const { refresh } = warmup;

  useEffect(() => {
    if (!sent) return;
    const id = window.setInterval(() => void refresh(), REFRESH_MS);
    return () => window.clearInterval(id);
  }, [sent, refresh]);

  return (
    <section data-testid="lobby-flow" aria-label={t('eduShell.home.flow.stepsLabel')} title={t('eduShell.home.flow.thenLive')} className="rounded-neo-lg border-2 border-neo-cream/35 bg-neo-navy-light p-3 max-sm:p-1.5 @4xl/lobby:px-3 @4xl/lobby:py-1">
      <div className="flex flex-col gap-2 max-sm:flex-row max-sm:items-center @4xl/lobby:flex-row @4xl/lobby:items-center @4xl/lobby:gap-3">
      <ol className="grid min-w-0 flex-1 grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-2 max-sm:sr-only">
        {STEPS.map((step, i) => (
          <Fragment key={step}>
            {i > 0 ? <ChevronRight aria-hidden="true" className="size-4 max-sm:size-3 text-neo-cream/50 rtl:-scale-x-100" strokeWidth={3} /> : null}
            <li data-testid="lobby-flow-step" data-step={step} className="flex min-w-0 items-center gap-2">
              <span className="min-w-0 font-neo-body text-sm font-bold leading-tight text-neo-cream max-sm:text-xs">
                <span className="me-1 text-neo-cream/60">{i + 1}.</span>
                {step === 'live' ? t('eduShell.home.flow.live', { mode: modeName }) : t(`eduShell.home.flow.${step}`)}
              </span>
            </li>
          </Fragment>
        ))}
      </ol>
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 border-t-2 border-neo-cream/15 pt-2 max-sm:min-w-0 max-sm:flex-1 max-sm:border-t-0 max-sm:pt-0 @4xl/lobby:border-t-0 @4xl/lobby:pt-0">
        {sent ? <LobbyWarmupStatus warmup={warmup} /> : <LobbyWarmupButton warmup={warmup} className="@4xl/lobby:min-h-9" />}
        <p className="font-neo-body text-xs font-semibold text-neo-cream/70 @4xl/lobby:sr-only">{t('eduShell.home.flow.thenLive')}</p>
      </div>
      </div>
    </section>
  );
}

export default LobbyFlowStrip;
