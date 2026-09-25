'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { JoinCodeField, JOIN_CODE_LENGTH, sanitizeJoinCode } from './JoinCodeField';
import { useJoinFlow } from './useJoinFlow';
import { useFitStage } from './fitStage';
import { BoundedConfettiBurst } from '@/components/motion/BoundedConfettiBurst';
import { PopPressButton } from '@/components/motion/PopPressButton';

/**
 * The student's whole way in: code, nickname, playing.
 *
 * Two screens, one per decision, each with exactly one thing to do — because
 * the target reader is fifteen, standing up, on a phone, with a code read off
 * a projector and about nine seconds of patience. What was here before was a
 * *form*: two labelled fields, two hint lines, a tooltip, a hero image and a
 * back link, all at once, with the code field below the name field.
 *
 * Non-negotiables encoded in the markup:
 *  - every refusal is inline and stays on screen (`role="alert"`), never a
 *    toast that is gone before it is read;
 *  - the confirmation slot has a reserved height, so a class name arriving
 *    late cannot shove the button out from under a finger already in flight
 *    (the original "first tap does nothing, second tap works" report);
 *  - no entrance opacity tween on the fullscreen surface, and the navy is
 *    hardcoded — this is a dark-only surface (recurring pitfall class 5).
 *  - confetti burst on success, with navigation deferred until animation
 *    completes (~750ms), so the celebration is not instantly erased by
 *    page transition.
 */
interface JoinFlowProps {
  /** From `/join/[code]` or `/join?code=` — the QR lands here pre-filled. */
  initialCode?: string;
  /**
   * Called on successful join, before navigation. Can return a Promise
   * to delay navigation (e.g. for celebration animations).
   */
  onSuccessBeforeNavigation?: () => Promise<void> | void;
  /**
   * Own the whole viewport and never scroll: the column is sized and zoomed to
   * fit (two columns on a phone on its side, bigger on desktops/TVs). Used by
   * the in-app `/student/join`; `/join` keeps its document flow.
   */
  fit?: boolean;
}

const K = 'education.student.join';

export function JoinFlow({ initialCode = '', onSuccessBeforeNavigation: externalCallback, fit = false }: JoinFlowProps) {
  const { t, dir } = useLanguage();
  const { ref: stageRef, stage } = useFitStage(fit);
  const rail = fit && stage.rail;
  // PopPressButton wraps its <button> in an inline-block motion div that
  // shrinks it to its label. In fit mode, give it a full-width cell (column 2 on
  // the rail); `/join` keeps its markup untouched.
  const inColumn2 = (node: React.ReactNode) =>
    fit ? <div className={cn('[&>div]:!block [&_button]:w-full', rail && 'col-start-2')}>{node}</div> : node;
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);

  // Create a callback that shows confetti and waits for animation
  const handleSuccessBeforeNavigation = useCallback(async () => {
    setShowSuccessCelebration(true);
    // Wait for confetti animation (~750ms)
    await new Promise((resolve) => setTimeout(resolve, 750));
    // Then call external callback if provided
    if (externalCallback) {
      await Promise.resolve(externalCallback());
    }
  }, [externalCallback]);

  const flow = useJoinFlow(initialCode, handleSuccessBeforeNavigation);
  const nameRef = useRef<HTMLInputElement>(null);
  const [pasteNoteKey, setPasteNoteKey] = useState<string | null>(null);

  // Land on the nickname with the keyboard already up: on the QR path this is
  // the only field between the student and the game.
  useEffect(() => {
    if (flow.step === 'name' && flow.showNameField) nameRef.current?.focus();
  }, [flow.step, flow.showNameField]);

  // Any refusal about the NAME — empty, or already taken by a classmate — puts
  // the cursor back in the field that fixes it. One place, so the two refusals
  // cannot behave differently (recurring pitfall class 3).
  useEffect(() => {
    if (flow.nameError) nameRef.current?.focus();
  }, [flow.nameError]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = sanitizeJoinCode(text);
      if (!cleaned) {
        setPasteNoteKey(`${K}.emptyClipboard`);
        return;
      }
      flow.setCode(cleaned);
      setPasteNoteKey(`${K}.codePasted`);
      if (cleaned.length === JOIN_CODE_LENGTH) flow.advance(cleaned);
    } catch {
      // Clipboard read is permission-gated on mobile Safari and simply refuses
      // sometimes. Say so where they can read it; the field still works.
      setPasteNoteKey(`${K}.clipboardError`);
    }
  };

  const confirmLabel =
    flow.target?.verdict === 'game'
      ? `${K}.preview.gameLabel`
      : flow.target?.verdict === 'classroom'
        ? `${K}.preview.label`
        : null;

  return (
    <BoundedConfettiBurst
      trigger={showSuccessCelebration}
      anchorDimensions={{ width: 390, height: 844 }}
      colors={['#22C55E', '#EC4899', '#06B6D4', '#D946EF']}
    >
      <div
        dir={dir}
        className={cn(
          'flex flex-col overflow-hidden bg-neo-navy text-neo-white',
          fit ? 'fixed inset-0 items-center justify-center' : 'relative min-h-dvh'
        )}
      >
        {/* Loud, cheap, and behind everything — no layout cost, no tween. */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -start-16 -top-16 h-56 w-56 rotate-12 rounded-neo border-3 border-neo-purple bg-neo-purple/20" />
          <div className="absolute -end-20 top-1/3 h-64 w-64 -rotate-6 rounded-neo border-3 border-neo-pink bg-neo-pink/20" />
          <div className="absolute -bottom-24 start-1/4 h-52 w-52 rotate-6 rounded-neo border-3 border-neo-cyan bg-neo-cyan/15" />
        </div>

        <main
          ref={stageRef as React.RefObject<HTMLElement>}
          data-testid="join-stage"
          data-rail={rail || undefined}
          className={cn(
            'relative z-10 flex flex-col',
            fit ? (rail ? 'px-2 py-2' : 'px-0 py-4') : 'mx-auto w-full max-w-md flex-1 justify-center px-4 py-6'
          )}
          // Inline: a global landscape-phone rule forces every <main> to relative
          // and caps widths; the fit column must be exactly this wide.
          style={fit ? { width: stage.width, maxWidth: 'none', ...(stage.zoom !== 1 ? { zoom: stage.zoom } : {}) } : undefined}
        >
        <header className={cn('flex items-center justify-between gap-3', rail ? 'mb-2' : 'mb-5')}>
          <span className="inline-block -rotate-2 rounded-neo border-3 border-neo-black bg-neo-lime px-3 py-1 font-neo-display text-lg font-black uppercase tracking-tight text-neo-navy shadow-hard">
            LexiClash
          </span>
          <ol className="flex items-center gap-1.5" aria-label={t(`${K}.flow.steps`)}>
            {(['code', 'name'] as const).map((s) => (
              <li
                key={s}
                aria-current={flow.step === s ? 'step' : undefined}
                className={cn(
                  'h-2.5 rounded-full border-2 border-neo-black transition-all',
                  flow.step === s ? 'w-8 bg-neo-cyan' : 'w-2.5 bg-neo-white/30'
                )}
              />
            ))}
          </ol>
        </header>

        {flow.step === 'code' ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              flow.advance();
            }}
            className={cn(rail ? 'grid grid-flow-row-dense grid-cols-2 items-start gap-x-6 gap-y-2' : 'flex flex-col gap-4')}
          >
            <div className={cn(rail && 'col-start-1 row-span-3 self-center')}>
              <h1 className="font-neo-display text-4xl font-black uppercase leading-[0.95] tracking-tight text-neo-white sm:text-5xl">
                {t(`${K}.flow.codeHeadline`)}
              </h1>
              <p className="mt-2 font-neo-body text-base font-bold text-neo-cyan">
                {t(`${K}.flow.codeSub`)}
              </p>
            </div>

            <div className={cn(rail && 'col-start-2')}>
              <JoinCodeField
                value={flow.code}
                onChange={flow.setCode}
                onComplete={(next) => flow.advance(next)}
                onPaste={handlePaste}
                label={t(`${K}.codeLabel`)}
                describedBy="join-code-note"
                invalid={!!flow.codeErrorKey || flow.codeRejected}
                autoFocus
              />
            </div>

            <div id="join-code-note" className={cn('min-h-[44px]', rail && 'col-start-2')}>
              {flow.codeErrorKey || flow.codeRejected ? (
                <p
                  role="alert"
                  className="animate-neo-shake rounded-neo border-3 border-neo-black bg-neo-red px-3 py-2 font-neo-body text-sm font-bold text-neo-white shadow-hard"
                >
                  {t(flow.codeErrorKey ?? `${K}.invalidCode`)}
                </p>
              ) : pasteNoteKey ? (
                <p className="font-neo-body text-sm font-bold text-neo-lime">{t(pasteNoteKey)}</p>
              ) : (
                <p className="font-neo-body text-sm text-neo-white/70">{t(`${K}.codeHint`)}</p>
              )}
            </div>

            {inColumn2(
              <PopPressButton
                type="submit"
                className="font-neo-display text-xl font-black uppercase tracking-wide"
              >
                {t(`${K}.flow.next`)}
              </PopPressButton>
            )}
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              flow.submit();
            }}
            className={cn(rail ? 'grid grid-flow-row-dense grid-cols-2 items-start gap-x-6 gap-y-2' : 'flex flex-col gap-4')}
          >
            {/* The code, and the way back to it. One control, so there is no
                second "change code" affordance to diverge from this one. */}
            <button
              type="button"
              onClick={flow.backToCode}
              aria-label={t(`${K}.flow.changeCode`)}
              /* Cream edge, not black: black on navy measures 1.23:1 and the
                 audit reads this control as borderless. */
              className={cn('flex items-center gap-3 self-start justify-self-start rounded-neo border-[3px] border-neo-cream bg-neo-navy-light px-3 py-2 shadow-hard', rail && 'col-start-1')}
            >
              <DirectionalIcon icon={ArrowLeft} className="h-4 w-4 text-neo-cyan" />
              <span
                dir="ltr"
                className="font-neo-display text-2xl font-black tracking-[0.2em] text-neo-lime"
              >
                {flow.code}
              </span>
            </button>

            {/* Reserved height: the confirmation resolves over the network and
                must never move the button underneath it. */}
            <div data-testid="join-confirm-slot" className={cn('min-h-[76px]', rail && 'col-start-1')}>
              {flow.codeRejected ? (
                <div
                  role="alert"
                  className="animate-neo-shake rounded-neo border-3 border-neo-black bg-neo-red p-3 shadow-hard"
                >
                  <p className="font-neo-body text-sm font-bold text-neo-white">
                    {t(`${K}.invalidCode`)}
                  </p>
                </div>
              ) : flow.target?.label ? (
                <div className="rounded-neo border-3 border-neo-black bg-neo-lime p-3 shadow-hard">
                  <p className="font-neo-display text-xs font-black uppercase tracking-wide text-neo-navy/70">
                    {t(confirmLabel ?? `${K}.preview.label`)}
                  </p>
                  <p className="font-neo-display text-lg font-black leading-tight text-neo-navy">
                    {flow.target.label}
                  </p>
                </div>
              ) : flow.isChecking ? (
                <div className="rounded-neo border-3 border-neo-cream bg-neo-navy-light p-3 shadow-hard">
                  <div className="h-3 w-24 animate-pulse rounded-full bg-neo-cyan/40" />
                  <div className="mt-2 h-4 w-40 animate-pulse rounded-full bg-neo-cyan/25" />
                </div>
              ) : null}
            </div>

            <h1 className={cn('font-neo-display text-3xl font-black uppercase leading-[0.95] tracking-tight text-neo-white sm:text-4xl', rail && 'col-start-1')}>
              {t(flow.showNameField ? `${K}.flow.nameHeadline` : `${K}.flow.readyHeadline`)}
            </h1>

            {flow.showNameField ? (
              <div className={cn('flex flex-col gap-2', rail && 'col-start-2 row-start-1 row-span-2')}>
                <label
                  htmlFor="join-nickname"
                  className="font-neo-display text-sm font-black uppercase tracking-wide text-neo-cyan"
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
                  enterKeyHint="go"
                  placeholder={t(`${K}.namePlaceholder`)}
                  aria-invalid={flow.nameError || undefined}
                  className={cn(
                    'w-full rounded-neo border-3 border-neo-black bg-neo-cream px-4 py-4 text-center font-neo-display text-2xl font-black text-neo-navy shadow-hard outline-none placeholder:font-neo-body placeholder:text-xl placeholder:font-bold placeholder:text-neo-navy/40',
                    flow.nameError && 'bg-neo-red/20 shadow-hard-pink'
                  )}
                />
                <p className="font-neo-body text-sm text-neo-white/70">{t(`${K}.nameHint`)}</p>
              </div>
            ) : (
              <p className={cn('font-neo-body text-base font-bold text-neo-white/80', rail && 'col-start-2 row-start-1')}>
                {t(`${K}.flow.readySub`)}
              </p>
            )}

            {flow.suggestedName && (
              <div
                role="alert"
                className={cn('flex flex-col gap-2 rounded-neo border-3 border-neo-black bg-neo-yellow p-3 shadow-hard', rail && 'col-start-2')}
              >
                <p className="font-neo-body text-sm font-bold text-neo-navy">
                  {t(`${K}.nameTaken`, { suggestedName: flow.suggestedName })}
                </p>
                <button
                  type="button"
                  onClick={() => flow.submit(flow.suggestedName ?? undefined)}
                  className="rounded-neo border-3 border-neo-cream bg-neo-navy px-3 py-2 font-neo-display text-sm font-black uppercase text-neo-lime shadow-hard-sm"
                >
                  {t(`${K}.useSuggestedName`, { suggestedName: flow.suggestedName })}
                </button>
              </div>
            )}

            {flow.formErrorKey && !flow.suggestedName && (
              <p
                role="alert"
                className={cn('animate-neo-shake rounded-neo border-3 border-neo-black bg-neo-red px-3 py-2 font-neo-body text-sm font-bold text-neo-white shadow-hard', rail && 'col-start-2')}
              >
                {t(flow.formErrorKey)}
              </p>
            )}

            {inColumn2(
              <PopPressButton
                type="submit"
                disabled={!flow.canSubmit}
                variant="primary"
                className="flex items-center justify-center gap-2 font-neo-display text-2xl font-black uppercase tracking-wide disabled:opacity-45"
              >
                <Sparkles aria-hidden="true" className="h-6 w-6" />
                {flow.isSubmitting ? t(`${K}.joining`) : t(`${K}.flow.go`)}
              </PopPressButton>
            )}

            {/* A held or in-flight tap says what it is waiting on. A button that
                just sits there is the silent no-op with a spinner painted on. */}
            {(flow.isHolding || flow.isSubmitting) && (
              <p
                role="status"
                className={cn('text-center font-neo-body text-sm font-bold text-neo-lime', rail && 'col-start-2')}
              >
                {t(flow.isSubmitting ? `${K}.flow.entering` : `${K}.preparing`)}
              </p>
            )}
          </form>
        )}
      </main>
      </div>
    </BoundedConfettiBurst>
  );
}

export default JoinFlow;
