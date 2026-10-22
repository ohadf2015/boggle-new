'use client';

import { useRef, useState, type RefObject } from 'react';
import { ArrowLeft, Dices, Sparkles } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { pickFunName } from './funName';
import { JoinAlert } from './JoinAlert';
import { JoinPrimaryButton } from './JoinPrimaryButton';
import { useKeepInView } from './useKeepInView';
import type { JoinFlowState } from './useJoinFlow';

const K = 'education.student.join';

/** `common.error` is a dead end for a student; say what to try. */
export function studentFormErrorKey(key: string | null): string | null {
  return key === 'common.error' ? `${K}.flow.genericError` : key;
}

interface JoinNameStepProps {
  flow: JoinFlowState;
  nameRef: RefObject<HTMLInputElement | null>;
  goRef: RefObject<HTMLButtonElement | null>;
}

export function JoinNameStep({ flow, nameRef, goRef }: JoinNameStepProps) {
  const { t } = useLanguage();
  const formRef = useRef<HTMLFormElement>(null);
  useKeepInView(formRef, goRef);
  const [diceSpin, setDiceSpin] = useState(0);
  const verdict = flow.target?.verdict;
  const formError = studentFormErrorKey(flow.formErrorKey);

  return (
    <form
      ref={formRef}
      data-testid="join-name-step"
      onSubmit={(e) => {
        e.preventDefault();
        flow.submit();
      }}
      className="flex flex-col gap-4 short:gap-3 [@media(orientation:landscape)_and_(max-height:520px)_and_(min-width:600px)]:grid [@media(orientation:landscape)_and_(max-height:520px)_and_(min-width:600px)]:grid-cols-2 [@media(orientation:landscape)_and_(max-height:520px)_and_(min-width:600px)]:items-start [@media(orientation:landscape)_and_(max-height:520px)_and_(min-width:600px)]:gap-x-8"
    >
      <div className="flex flex-col gap-4 short:gap-3">
        {/* The code, and the way back to it. One control, so there is no
            second "change code" affordance to diverge from this one. */}
        <button
          type="button"
          onClick={flow.backToCode}
          aria-label={t(`${K}.flow.changeCode`)}
          title={t(`${K}.flow.changeCode`)}
          className="flex min-h-11 items-center gap-3 self-start rounded-neo border-3 border-neo-cream bg-neo-navy-light px-3 py-2 shadow-hard focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan"
        >
          <DirectionalIcon icon={ArrowLeft} className="h-4 w-4 text-neo-cyan" />
          <span dir="ltr" className="font-neo-display text-2xl font-black tracking-[0.2em] text-neo-lime">
            {flow.code}
          </span>
        </button>

        {/* Reserved height: the confirmation resolves over the network and
            must never move the button underneath it. */}
        <div data-testid="join-confirm-slot" className="min-h-[124px]">
          {flow.codeRejected ? (
            <JoinAlert>{t(`${K}.invalidCode`)}</JoinAlert>
          ) : flow.target?.label ? (
            <div className="rounded-neo border-3 border-neo-black bg-neo-lime p-3 shadow-hard">
              <p className="font-neo-display text-xs font-black uppercase tracking-wide text-neo-navy/70">
                {t(verdict === 'game' ? `${K}.preview.gameLabel` : `${K}.preview.label`)}
              </p>
              <p title={flow.target.label} className="truncate font-neo-display text-xl font-black leading-tight text-neo-navy lg:text-2xl">
                {flow.target.label}
              </p>
              <p className="mt-1 line-clamp-2 font-neo-body text-sm font-bold leading-snug text-neo-navy/80">
                {t(verdict === 'game' ? `${K}.preview.gameConfirm` : `${K}.preview.classroomNext`)}
              </p>
            </div>
          ) : flow.isChecking ? (
            <div className="rounded-neo border-3 border-neo-cream bg-neo-navy-light p-3 shadow-hard">
              <div className="h-3 w-24 rounded-full bg-neo-cyan/40 motion-safe:animate-pulse" />
              <div className="mt-2 h-4 w-40 rounded-full bg-neo-cyan/25 motion-safe:animate-pulse" />
            </div>
          ) : null}
        </div>

        <h1 className="font-neo-display text-3xl font-black uppercase leading-[0.95] tracking-tight text-neo-white short:text-2xl sm:text-4xl lg:text-5xl">
          {t(flow.showNameField ? `${K}.flow.nameHeadline` : `${K}.flow.readyHeadline`)}
        </h1>
      </div>

      <div className="flex flex-col gap-3">
        {flow.showNameField ? (
          <div className="flex flex-col gap-2">
            <label
              htmlFor="join-nickname"
              className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-cyan lg:text-base"
            >
              {t(`${K}.nameLabel`)}
            </label>
            <input
              id="join-nickname"
              ref={nameRef}
              value={flow.name}
              onChange={(e) => flow.setName(e.target.value)}
              maxLength={40}
              autoComplete="off"
              autoCapitalize="words"
              enterKeyHint="go"
              placeholder={t(`${K}.namePlaceholder`)}
              aria-invalid={flow.nameError || undefined}
              aria-describedby="join-name-hint"
              className={cn(
                'min-h-14 w-full rounded-neo border-3 border-neo-black bg-neo-cream px-4 py-3 text-center font-neo-display text-2xl font-black text-neo-navy shadow-hard outline-none placeholder:font-neo-body placeholder:text-xl placeholder:font-bold placeholder:text-neo-navy/40 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan lg:text-3xl',
                flow.nameError && 'border-neo-red shadow-hard-pink motion-safe:animate-neo-shake'
              )}
            />
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <button
                type="button"
                onClick={() => {
                  flow.setName(pickFunName(t('eduStudent.join.funNames'), flow.name));
                  setDiceSpin((n) => n + 1);
                  nameRef.current?.focus();
                }}
                className="inline-flex min-h-11 items-center gap-2 rounded-neo border-3 border-neo-cyan bg-neo-navy-light px-4 py-2 font-neo-display text-base font-black text-neo-white shadow-hard-sm transition-transform motion-safe:active:translate-y-0.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-neo-cyan"
              >
                <Dices
                  key={diceSpin}
                  aria-hidden="true"
                  className="size-6 text-neo-cyan motion-safe:animate-[lc-join-dice_450ms_ease-out]"
                  strokeWidth={2.5}
                />
                {t('eduStudent.join.surpriseMe')}
              </button>
              <p id="join-name-hint" className="font-neo-body text-sm text-neo-white/75">
                {t(`${K}.nameHint`)}
              </p>
            </div>
            <style>{'@keyframes lc-join-dice{0%{transform:rotate(0) scale(.8)}60%{transform:rotate(300deg) scale(1.15)}100%{transform:rotate(360deg) scale(1)}}'}</style>
          </div>
        ) : (
          <p className="font-neo-body text-base font-bold text-neo-white/80 lg:text-lg">{t(`${K}.flow.readySub`)}</p>
        )}

        {flow.suggestedName && (
          <div role="alert" className="flex flex-col gap-2 rounded-neo border-3 border-neo-black bg-neo-yellow p-3 shadow-hard">
            <p className="font-neo-body text-sm font-bold text-neo-navy">
              {t(`${K}.nameTaken`, { suggestedName: flow.suggestedName })}
            </p>
            <button
              type="button"
              onClick={() => flow.submit(flow.suggestedName ?? undefined)}
              className="min-h-11 rounded-neo border-3 border-neo-cream bg-neo-navy px-3 py-2 font-neo-display text-sm font-black uppercase text-neo-lime shadow-hard-sm"
            >
              {t(`${K}.useSuggestedName`, { suggestedName: flow.suggestedName })}
            </button>
          </div>
        )}

        {formError && !flow.suggestedName && <JoinAlert>{t(formError)}</JoinAlert>}

        <JoinPrimaryButton ref={goRef} disabled={!flow.canSubmit} className="text-2xl lg:text-3xl">
          <Sparkles aria-hidden="true" className="size-6" />
          {flow.isSubmitting ? t(`${K}.joining`) : t(`${K}.flow.go`)}
        </JoinPrimaryButton>

        {(flow.isHolding || flow.isSubmitting) && (
          <p role="status" className="text-center font-neo-body text-sm font-bold text-neo-lime">
            {t(flow.isSubmitting ? `${K}.flow.entering` : `${K}.preparing`)}
          </p>
        )}
      </div>
    </form>
  );
}
