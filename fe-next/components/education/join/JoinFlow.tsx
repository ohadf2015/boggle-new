'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { JOIN_CODE_LENGTH, joinCodeOverflows, sanitizeJoinCode } from './JoinCodeField';
import { useJoinFlow } from './useJoinFlow';
import { pickFunName } from './funName';
import { getStoredUsername } from '@/utils/profileStorage';
import { JoinSuccessPanel } from './JoinSuccessPanel';
import { JoinCodeStep } from './JoinCodeStep';
import { JoinNameStep } from './JoinNameStep';
import { JoinEndedPanel } from './JoinEndedPanel';
import { BoundedConfettiBurst } from '@/components/motion/BoundedConfettiBurst';

/**
 * The student's whole way in: code, nickname, playing.
 *
 * Two screens, one per decision, each with exactly one thing to do. Every
 * refusal is inline and stays on screen; the confirmation slot has a reserved
 * height so a late class name cannot move GO under a finger; this is a
 * dark-only surface, so the navy is hardcoded (recurring pitfall class 5).
 *
 * The layout is fluid CSS on every door: one column that grows with the
 * screen, two columns on a phone on its side, and a frame locked to the
 * viewport whose one inner region scrolls, so an open keyboard can never hide
 * the field or its button and the page itself never scrolls.
 */
export type JoinFlowVariant = 'standalone' | 'academy';

interface JoinFlowProps {
  /** From `/join/[code]` or `/join?code=` — the QR lands here pre-filled. */
  initialCode?: string;
  /** Called on successful join, before navigation. May return a Promise to delay it. */
  onSuccessBeforeNavigation?: () => Promise<void> | void;
  /**
   * `standalone` (default) paints its own navy and decorations in page flow.
   * `academy` owns the viewport with a transparent root, so the page's arena
   * backdrop shows through.
   */
  variant?: JoinFlowVariant;
}

const K = 'education.student.join';
const STEPS = ['code', 'name'] as const;

export function JoinFlow({
  initialCode = '',
  onSuccessBeforeNavigation: externalCallback,
  variant = 'standalone',
}: JoinFlowProps) {
  const { t, dir } = useLanguage();
  const academy = variant === 'academy';
  const [showSuccessCelebration, setShowSuccessCelebration] = useState(false);

  // Confetti, then navigation: the celebration must not be erased instantly.
  const handleSuccessBeforeNavigation = useCallback(async () => {
    setShowSuccessCelebration(true);
    await new Promise((resolve) => setTimeout(resolve, 750));
    if (externalCallback) {
      await Promise.resolve(externalCallback());
    }
  }, [externalCallback]);

  const flow = useJoinFlow(initialCode, handleSuccessBeforeNavigation);
  const nameRef = useRef<HTMLInputElement>(null);
  const goRef = useRef<HTMLButtonElement>(null);
  const [pasteNoteKey, setPasteNoteKey] = useState<string | null>(null);
  const funNames = t('eduStudent.join.funNames');

  // Land on the nickname with the keyboard already up; a signed-in student
  // with nothing to type lands on GO.
  useEffect(() => {
    if (flow.step !== 'name') return;
    if (flow.showNameField) nameRef.current?.focus();
    else goRef.current?.focus();
  }, [flow.step, flow.showNameField]);

  // A name typed into the server markup lives only in the DOM until React adopts it.
  useEffect(() => {
    const typed = nameRef.current?.value;
    if (typed && !flow.name) flow.setName(typed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Invite link + guest: one GO, not type-a-name-from-blank. Wait until the
  // code lookup has spoken — a seeded name would look like "they started
  // typing" and block the invalid-code bounce back to the code step.
  useEffect(() => {
    if (flow.step !== 'name' || !flow.showNameField || flow.name.trim() || nameRef.current?.value.trim()) return;
    if (sanitizeJoinCode(initialCode).length !== JOIN_CODE_LENGTH) return;
    if (flow.isChecking || !flow.target || flow.target.verdict === 'invalid') return;
    const seed = getStoredUsername() || pickFunName(funNames, '');
    if (seed) flow.setName(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flow.step, flow.showNameField, initialCode, flow.isChecking, flow.target, funNames]);

  // Any refusal about the NAME — empty, or taken — puts the cursor back in the
  // field that fixes it, so the two refusals behave the same (class 3).
  useEffect(() => {
    if (flow.nameError) nameRef.current?.focus();
  }, [flow.nameError]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (joinCodeOverflows(text)) {
        setPasteNoteKey(null);
        flow.refuseTooLong();
        return;
      }
      const cleaned = sanitizeJoinCode(text);
      if (!cleaned) {
        setPasteNoteKey(`${K}.emptyClipboard`);
        return;
      }
      flow.setCode(cleaned);
      setPasteNoteKey(`${K}.codePasted`);
      if (cleaned.length === JOIN_CODE_LENGTH) flow.advance(cleaned);
    } catch {
      // Clipboard read is permission-gated on mobile Safari. Say so; typing still works.
      setPasteNoteKey(`${K}.clipboardError`);
    }
  };

  const currentStep = STEPS.indexOf(flow.step) + 1;

  return (
    <BoundedConfettiBurst trigger={showSuccessCelebration}>
      <div
        data-testid="join-root"
        dir={dir}
        className={cn(
          'flex flex-col overflow-hidden text-neo-white',
          academy
            ? 'fixed inset-x-0 top-0 bottom-[var(--cookie-consent-height,0px)]'
            : 'relative h-dvh bg-neo-navy pb-[var(--cookie-consent-height,0px)]'
        )}
      >
        {!academy && (
          <div data-testid="join-decor" aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -start-16 -top-16 h-56 w-56 rotate-12 rounded-neo border-3 border-neo-purple bg-neo-purple/20" />
            <div className="absolute -end-20 top-1/3 h-64 w-64 -rotate-6 rounded-neo border-3 border-neo-pink bg-neo-pink/20" />
            <div className="absolute -bottom-24 start-1/4 h-52 w-52 rotate-6 rounded-neo border-3 border-neo-cyan bg-neo-cyan/15" />
          </div>
        )}

        <div
          data-testid="join-scroll"
          className="relative z-10 flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto overscroll-contain"
        >
        <main
          data-testid="join-stage"
          className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6 short:justify-start short:py-3 sm:max-w-lg lg:max-w-xl tv:max-w-3xl [@media(orientation:landscape)_and_(max-height:520px)_and_(min-width:600px)]:max-w-3xl [@media(orientation:landscape)_and_(max-height:520px)_and_(min-width:600px)]:justify-center"
        >
          <header className="mb-5 flex items-center justify-between gap-3 short:mb-3 lg:mb-8">
            <span className="inline-block -rotate-2 rounded-neo border-3 border-neo-black bg-neo-lime px-3 py-1 font-neo-display text-lg font-black uppercase tracking-tight text-neo-navy shadow-hard lg:text-2xl">
              LexiClash
            </span>
            {!flow.joined && !showSuccessCelebration && !flow.ended && (
              <ol className="flex items-center gap-1.5" aria-label={t(`${K}.flow.steps`)}>
                {STEPS.map((s) => (
                  <li
                    key={s}
                    aria-current={flow.step === s ? 'step' : undefined}
                    className={cn(
                      'h-2.5 rounded-full border-2 border-neo-black transition-all lg:h-3',
                      flow.step === s ? 'w-8 bg-neo-cyan lg:w-10' : 'w-2.5 bg-neo-white/30 lg:w-3'
                    )}
                  >
                    {flow.step === s && (
                      <span className="sr-only">{t(`${K}.flow.stepOf`, { current: currentStep, total: STEPS.length })}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </header>

          {flow.joined ? (
            <JoinSuccessPanel
              mode="class"
              classroomId={flow.joined.classroomId}
              alreadyMember={flow.joined.alreadyMember}
              label={flow.target?.label}
            />
          ) : showSuccessCelebration ? (
            <JoinSuccessPanel mode="game" label={flow.target?.label} name={flow.name.trim() || undefined} />
          ) : flow.ended ? (
            <JoinEndedPanel
              code={flow.code}
              label={flow.target?.label}
              classroomId={flow.endedClassroomId}
              onNewCode={flow.typeNewCode}
            />
          ) : flow.step === 'code' ? (
            <JoinCodeStep flow={flow} pasteNoteKey={pasteNoteKey} onPaste={handlePaste} />
          ) : (
            <JoinNameStep flow={flow} nameRef={nameRef} goRef={goRef} />
          )}
        </main>
        </div>
      </div>
    </BoundedConfettiBurst>
  );
}

export default JoinFlow;
