'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ClipboardPaste, Sparkles } from 'lucide-react';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { JoinCodeField, JOIN_CODE_LENGTH, sanitizeJoinCode } from './JoinCodeField';
import { useJoinFlow } from './useJoinFlow';

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
 */
interface JoinFlowProps {
  /** From `/join/[code]` or `/join?code=` — the QR lands here pre-filled. */
  initialCode?: string;
}

const K = 'education.student.join';

export function JoinFlow({ initialCode = '' }: JoinFlowProps) {
  const { t, dir } = useLanguage();
  const flow = useJoinFlow(initialCode);
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
    <div
      dir={dir}
      className="relative flex min-h-dvh flex-col overflow-hidden bg-neo-navy text-neo-white"
    >
      {/* Loud, cheap, and behind everything — no layout cost, no tween. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -start-16 -top-16 h-56 w-56 rotate-12 rounded-neo border-3 border-neo-black bg-neo-purple/25" />
        <div className="absolute -end-20 top-1/3 h-64 w-64 -rotate-6 rounded-neo border-3 border-neo-black bg-neo-pink/20" />
        <div className="absolute -bottom-24 start-1/4 h-52 w-52 rotate-6 rounded-neo border-3 border-neo-black bg-neo-cyan/15" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6">
        <header className="mb-5 flex items-center justify-between gap-3">
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
            className="flex flex-col gap-4"
          >
            <div>
              <h1 className="font-neo-display text-4xl font-black uppercase leading-[0.95] tracking-tight text-neo-white sm:text-5xl">
                {t(`${K}.flow.codeHeadline`)}
              </h1>
              <p className="mt-2 font-neo-body text-base font-bold text-neo-cyan">
                {t(`${K}.flow.codeSub`)}
              </p>
            </div>

            <JoinCodeField
              value={flow.code}
              onChange={flow.setCode}
              onComplete={(next) => flow.advance(next)}
              label={t(`${K}.codeLabel`)}
              describedBy="join-code-note"
              invalid={!!flow.codeErrorKey || flow.codeRejected}
              autoFocus
            />

            <div id="join-code-note" className="min-h-[44px]">
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

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePaste}
                className="flex shrink-0 items-center gap-2 rounded-neo border-3 border-neo-black bg-neo-navy-light px-4 py-4 font-neo-display text-sm font-black uppercase text-neo-white shadow-hard transition-transform active:translate-y-0.5"
              >
                <ClipboardPaste aria-hidden="true" className="h-5 w-5" />
                {t(`${K}.pasteButton`)}
              </button>
              <button
                type="submit"
                className="flex-1 rounded-neo border-3 border-neo-black bg-neo-lime px-4 py-4 font-neo-display text-xl font-black uppercase tracking-wide text-neo-navy shadow-hard-lg transition-transform active:translate-y-0.5 active:shadow-hard-pressed"
              >
                {t(`${K}.flow.next`)}
              </button>
            </div>
          </form>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              flow.submit();
            }}
            className="flex flex-col gap-4"
          >
            {/* The code, and the way back to it. One control, so there is no
                second "change code" affordance to diverge from this one. */}
            <button
              type="button"
              onClick={flow.backToCode}
              aria-label={t(`${K}.flow.changeCode`)}
              /* Cream edge, not black: black on navy measures 1.23:1 and the
                 audit reads this control as borderless. */
              className="flex items-center gap-3 self-start rounded-neo border-[3px] border-neo-cream bg-neo-navy-light px-3 py-2 shadow-hard"
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
            <div data-testid="join-confirm-slot" className="min-h-[76px]">
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
                <div className="rounded-neo border-3 border-neo-black bg-neo-navy-light p-3 shadow-hard">
                  <div className="h-3 w-24 animate-pulse rounded-full bg-neo-cyan/40" />
                  <div className="mt-2 h-4 w-40 animate-pulse rounded-full bg-neo-cyan/25" />
                </div>
              ) : null}
            </div>

            <h1 className="font-neo-display text-3xl font-black uppercase leading-[0.95] tracking-tight text-neo-white sm:text-4xl">
              {t(flow.showNameField ? `${K}.flow.nameHeadline` : `${K}.flow.readyHeadline`)}
            </h1>

            {flow.showNameField ? (
              <div className="flex flex-col gap-2">
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
              <p className="font-neo-body text-base font-bold text-neo-white/80">
                {t(`${K}.flow.readySub`)}
              </p>
            )}

            {flow.suggestedName && (
              <div
                role="alert"
                className="flex flex-col gap-2 rounded-neo border-3 border-neo-black bg-neo-yellow p-3 shadow-hard"
              >
                <p className="font-neo-body text-sm font-bold text-neo-navy">
                  {t(`${K}.nameTaken`, { suggestedName: flow.suggestedName })}
                </p>
                <button
                  type="button"
                  onClick={() => flow.submit(flow.suggestedName ?? undefined)}
                  className="rounded-neo border-3 border-neo-black bg-neo-navy px-3 py-2 font-neo-display text-sm font-black uppercase text-neo-lime shadow-hard-sm"
                >
                  {t(`${K}.useSuggestedName`, { suggestedName: flow.suggestedName })}
                </button>
              </div>
            )}

            {flow.formErrorKey && !flow.suggestedName && (
              <p
                role="alert"
                className="animate-neo-shake rounded-neo border-3 border-neo-black bg-neo-red px-3 py-2 font-neo-body text-sm font-bold text-neo-white shadow-hard"
              >
                {t(flow.formErrorKey)}
              </p>
            )}

            <button
              type="submit"
              disabled={!flow.canSubmit}
              className="flex items-center justify-center gap-2 rounded-neo border-3 border-neo-black bg-neo-cyan px-4 py-5 font-neo-display text-2xl font-black uppercase tracking-wide text-neo-navy shadow-hard-lg transition-transform active:translate-y-0.5 active:shadow-hard-pressed disabled:opacity-45"
            >
              <Sparkles aria-hidden="true" className="h-6 w-6" />
              {flow.isSubmitting ? t(`${K}.joining`) : t(`${K}.flow.go`)}
            </button>

            {/* A held or in-flight tap says what it is waiting on. A button that
                just sits there is the silent no-op with a spinner painted on. */}
            {(flow.isHolding || flow.isSubmitting) && (
              <p
                role="status"
                className="text-center font-neo-body text-sm font-bold text-neo-lime"
              >
                {t(flow.isSubmitting ? `${K}.flow.entering` : `${K}.preparing`)}
              </p>
            )}
          </form>
        )}
      </main>
    </div>
  );
}

export default JoinFlow;
