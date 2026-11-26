'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { useEduReducedMotion } from '@/lib/education/motion/useEduReducedMotion';
import { JoinCodeField } from './JoinCodeField';
import { JoinAlert } from './JoinAlert';
import { JoinPrimaryButton } from './JoinPrimaryButton';
import { useKeepInView } from './useKeepInView';
import { JoinWrongCodeHelp } from './JoinWrongCodeHelp';
import type { JoinFlowState } from './joinFlowState';

const K = 'education.student.join';
/** Six tiles at 45ms apart plus the last pop's first frames. */
const WAVE_MS = 300;

interface JoinCodeStepProps {
  flow: JoinFlowState;
  pasteNoteKey: string | null;
  onPaste: () => void;
}

export function JoinCodeStep({ flow, pasteNoteKey, onPaste }: JoinCodeStepProps) {
  const { t } = useLanguage();
  const formRef = useRef<HTMLFormElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  useKeepInView(formRef, nextRef);
  const [stripped, setStripped] = useState(false);
  const reduced = useEduReducedMotion();
  const [waving, setWaving] = useState(false);
  const waveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelWave = () => {
    if (waveTimer.current) clearTimeout(waveTimer.current);
    waveTimer.current = null;
    setWaving(false);
  };
  useEffect(() => () => {
    if (waveTimer.current) clearTimeout(waveTimer.current);
  }, []);
  // An edit during the beat withdraws it: the code on screen is no longer the one accepted.
  useEffect(() => {
    if (waveTimer.current && flow.code.length < 6) cancelWave();
  }, [flow.code]);
  const completeCode = (next: string) => {
    if (reduced) return flow.advance(next);
    if (waveTimer.current) return;
    setWaving(true);
    waveTimer.current = setTimeout(() => {
      waveTimer.current = null;
      setWaving(false);
      flow.advance(next);
    }, WAVE_MS);
  };
  const retype = () => {
    flow.setCode('');
    formRef.current?.querySelector<HTMLInputElement>('[data-testid="join-code-input"]')?.focus();
  };
  const refused = !!flow.codeErrorKey || flow.codeRejected;
  const wrongCode = flow.codeErrorKey ? flow.codeErrorKey === `${K}.invalidCode` : flow.codeRejected;

  return (
    <form
      ref={formRef}
      data-testid="join-code-step"
      onSubmit={(e) => {
        e.preventDefault();
        flow.advance();
      }}
      className="flex flex-col gap-5 short:gap-3 [@media(orientation:landscape)_and_(max-height:520px)_and_(min-width:600px)]:grid [@media(orientation:landscape)_and_(max-height:520px)_and_(min-width:600px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:520px)_and_(min-width:600px)]:items-center [@media(orientation:landscape)_and_(max-height:520px)_and_(min-width:600px)]:gap-x-8"
    >
      <div>
        <h1 className="font-neo-display text-4xl font-black uppercase leading-[0.95] tracking-tight text-neo-white short:text-3xl sm:text-5xl lg:text-6xl">
          {t(`${K}.flow.codeHeadline`)}
        </h1>
        <p className="mt-2 font-neo-body text-base font-bold text-neo-cyan short:mt-1 short:text-sm phone-short:hidden lg:text-lg">
          {t(`${K}.flow.codeSub`)}
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <JoinCodeField
          value={flow.code}
          onChange={flow.setCode}
          onComplete={completeCode}
          wave={waving}
          onPaste={onPaste}
          onOverflow={flow.refuseTooLong}
          onStripped={setStripped}
          label={t(`${K}.codeLabel`)}
          describedBy="join-code-note"
          invalid={refused}
          autoFocus
        />

        <div id="join-code-note" className="min-h-11">
          {refused ? (
            <div className="flex flex-col gap-2">
              <JoinAlert key={flow.refusalTick}>{t(flow.codeErrorKey ?? `${K}.invalidCode`)}</JoinAlert>
              {wrongCode && <JoinWrongCodeHelp code={flow.code} />}
            </div>
          ) : (
            // The sub line already says where the code comes from; this region only speaks up when something happened.
            <p
              role="status"
              className={cn('font-neo-body text-sm font-bold lg:text-base', stripped ? 'text-neo-yellow' : 'text-neo-lime')}
            >
              {stripped ? t(`${K}.codeStripped`) : pasteNoteKey ? t(pasteNoteKey) : null}
            </p>
          )}
        </div>

        {wrongCode ? (
          <JoinPrimaryButton type="button" onClick={retype}>
            {t(`${K}.flow.retypeCode`)}
          </JoinPrimaryButton>
        ) : (
          <JoinPrimaryButton ref={nextRef} disabled={waving} aria-busy={waving || undefined}>
            {t(`${K}.flow.next`)}
          </JoinPrimaryButton>
        )}

        <details className="group/where rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light/80">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-neo px-3 py-2 font-neo-body text-sm font-bold text-neo-cyan focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-neo-cyan lg:text-base [&::-webkit-details-marker]:hidden">
            <HelpCircle aria-hidden="true" className="size-5 shrink-0" />
            <span>{t(`${K}.flow.whereCode`)}</span>
            <ChevronDown
              aria-hidden="true"
              className="ms-auto size-5 shrink-0 group-open/where:rotate-180 motion-safe:transition-transform"
            />
          </summary>
          <p className="px-3 pb-3 font-neo-body text-sm leading-snug text-neo-white/85 lg:text-base">
            {t(`${K}.flow.whereCodeAnswer`)}
          </p>
        </details>
      </div>
    </form>
  );
}
