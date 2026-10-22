'use client';

import { useRef } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { JoinCodeField } from './JoinCodeField';
import { JoinAlert } from './JoinAlert';
import { JoinPrimaryButton } from './JoinPrimaryButton';
import { useKeepInView } from './useKeepInView';
import type { JoinFlowState } from './useJoinFlow';

const K = 'education.student.join';

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
  const refused = !!flow.codeErrorKey || flow.codeRejected;

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
          onComplete={(next) => flow.advance(next)}
          onPaste={onPaste}
          onOverflow={flow.refuseTooLong}
          label={t(`${K}.codeLabel`)}
          describedBy="join-code-note"
          invalid={refused}
          autoFocus
        />

        <div id="join-code-note" className="min-h-11">
          {refused ? (
            <JoinAlert>{t(flow.codeErrorKey ?? `${K}.invalidCode`)}</JoinAlert>
          ) : (
            <p
              role="status"
              className={
                pasteNoteKey
                  ? 'font-neo-body text-sm font-bold text-neo-lime lg:text-base'
                  : 'font-neo-body text-sm text-neo-white/75 lg:text-base'
              }
            >
              {t(pasteNoteKey ?? `${K}.codeHint`)}
            </p>
          )}
        </div>

        <JoinPrimaryButton ref={nextRef}>{t(`${K}.flow.next`)}</JoinPrimaryButton>

        <details className="group/where rounded-neo border-2 border-neo-cream/40 bg-neo-navy-light/80">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 py-2 font-neo-body text-sm font-bold text-neo-cyan lg:text-base [&::-webkit-details-marker]:hidden">
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
