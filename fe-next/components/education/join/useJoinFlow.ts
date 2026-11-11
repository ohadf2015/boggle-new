'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useJoinClassroom } from '@/hooks/useJoinClassroom';
import { trackEduClassroomJoin, trackJoinCodeStepRefused, trackStudentJoinStarted } from '@/lib/education/telemetry';
import logger from '@/utils/logger';
import { sanitizeJoinCode, joinCodeOverflows, JOIN_CODE_LENGTH } from './JoinCodeField';
import { useJoinTargetLookup } from './useJoinTargetLookup';
import { joinFailure } from './joinFailure';
import { setStoredUsername } from '@/utils/profileStorage';
import { joinSuccessHref } from '@/lib/navigation/eduExitTargets';
import type { JoinFlowState, JoinStep, JoinedClassroom, OwnClassRefusal } from './joinFlowState';

export type { JoinFlowState, JoinStep, JoinedClassroom } from './joinFlowState';

const CODE_TOO_LONG = 'eg2Fix.join.codeTooLong';

/**
 * How long a held tap waits for the session before going anyway.
 *
 * `useAuth` outside its provider returns `loading: true` and never flips. On
 * this screen that turns every tap into a queued intent that is never
 * replayed: "getting ready" for the rest of the lesson, nothing sent, nothing
 * logged — recurring pitfall class 4 with a spinner painted on it. The join
 * route is authoritative and `runGuestJoinPreflight` still refuses a bad code,
 * so a session we cannot resolve must cost the student a moment, not the game.
 */
const AUTH_HOLD_MS = 3000;

/** Named once: it is both set and withdrawn, in two different places. */
const NAME_REQUIRED_KEY = 'education.student.join.flow.nameRequired';

/**
 * Client UX for "a fifteen-year-old with a code is playing in ten seconds".
 *
 * Two rules shape everything here:
 *
 * 1. NOTHING waits on the code lookup. The sixth character moves the student
 *    to the nickname step synchronously; the lookup lands later and only
 *    *decorates* — a class name to confirm, or an inline "we didn't recognise
 *    that". Gating the step on it would rebuild the exact failure the join
 *    button already fought off: a class of thirty behind one school IP
 *    exhausts that route's rate limit, and the slow answer is a spinner
 *    standing between the student and their next keystroke.
 *
 * 2. NOTHING fails silently. Every refusal sets an inline, `role="alert"`
 *    string that stays on screen — never a toast that is gone before it is
 *    read (recurring pitfall class 4). And a bad code is only ever called a
 *    bad code when we are SURE: `unverified` carries on and lets the server
 *    decide.
 *
 * Correctness of the join itself still lives server-side; `runGuestJoinPreflight`
 * inside `useJoinClassroom` refuses a confidently-invalid code before any
 * anonymous account is minted, so being optimistic in the UI costs nothing.
 */
export function useJoinFlow(
  initialCode = '',
  onSuccessBeforeNavigation?: () => Promise<void> | void,
  /** The device may belong to the previous student: no join starts on its own until they answer. */
  holdAutoJoin = false
): JoinFlowState {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { joinClassroom } = useJoinClassroom();

  const seedTooLong = joinCodeOverflows(initialCode);
  const seedCode = seedTooLong ? '' : sanitizeJoinCode(initialCode);
  const [code, setCodeState] = useState(seedCode);
  // The QR path lands here already: pre-filled code, straight to the nickname.
  // Computed in the initializer, not an effect, so there is no code-step frame
  // to flash (recurring pitfall class 5).
  const [step, setStep] = useState<JoinStep>(
    seedCode.length === JOIN_CODE_LENGTH ? 'name' : 'code'
  );
  const [name, setNameState] = useState('');
  const { target, targetCode, isChecking } = useJoinTargetLookup(code);

  // If initialCode resolves late (e.g. useParams hydration), sync it to state
  useEffect(() => {
    if (joinCodeOverflows(initialCode)) {
      setCodeState('');
      setStep('code');
      setCodeErrorKey(CODE_TOO_LONG);
      return;
    }
    const sanitized = sanitizeJoinCode(initialCode);
    if (sanitized.length === JOIN_CODE_LENGTH) {
      setCodeState(sanitized);
      setStep('name');
    }
  }, [initialCode]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeErrorKey, setCodeErrorKey] = useState<string | null>(seedTooLong ? CODE_TOO_LONG : null);
  const [refusalTick, setRefusalTick] = useState(0);
  const [formErrorKey, setFormErrorKey] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  /** The hold outlived its deadline: go without the session. */
  const [holdExpired, setHoldExpired] = useState(false);
  const [joined, setJoined] = useState<JoinedClassroom | null>(null);
  const [ended, setEnded] = useState(false);
  const [endedClassroomId, setEndedClassroomId] = useState<string | null>(null);
  const [ownClass, setOwnClass] = useState<OwnClassRefusal | null>(null);
  /** Synchronous: two taps in one frame must not send two joins. */
  const inFlight = useRef(false);
  /** Any real POST is the one automatic attempt: a failed or game-code join must not auto-retry. */
  const autoJoinStarted = useRef(false);

  // `!user`, not `useIsGuest`: the nickname field is UI added for guests, so it
  // must not vanish during the loading frame. Unresolved auth is the hold below.
  const isGuest = !user;
  const isAuthResolving = authLoading && !holdExpired;

  // `|| name` is not belt-and-braces, it is the whole fix. The first tap on GO
  // mints an anonymous auth user BEFORE the join route is called, so `user`
  // stops being null even when the join then fails. On `isGuest` alone the row
  // vanished on the retry and the student could no longer see — or change — the
  // name being submitted for them.
  const showNameField = isGuest || name.trim().length > 0;

  // A confident `invalid` sends the student back to fix the code, unless they
  // have already started typing a name: then the verdict only decorates.
  useEffect(() => {
    if (step !== 'name' || target?.verdict !== 'invalid' || targetCode !== code) return;
    if (isSubmitting || name.trim()) return;
    setStep('code');
    setCodeErrorKey('education.student.join.invalidCode');
  }, [step, target, targetCode, code, isSubmitting, name]);

  useEffect(() => {
    if (target?.verdict === 'ended' && targetCode === code && !isSubmitting) setEnded(true);
  }, [target, targetCode, code, isSubmitting]);

  /* ── Keep the sign-in return path alive from every entry point. ──────── */
  useEffect(() => {
    if (code.length !== JOIN_CODE_LENGTH || user) return;
    try {
      sessionStorage.setItem('joinClassroomReturnCode', code);
    } catch {
      // Private mode. The guest path does not depend on this.
    }
  }, [code, user]);

  const setCode = useCallback((next: string) => {
    setCodeState(sanitizeJoinCode(next));
    setCodeErrorKey(null);
  }, []);

  const setName = useCallback((next: string) => {
    setNameState(next);
    setNameError(false);
    // The suggestion was about the OLD name. Leaving it up over a name it was
    // never about is its own small lie.
    setSuggestedName(null);
    setFormErrorKey(null);
  }, []);

  /** The ONE way to leave the code step — the sixth character and the button
   *  both come through here, so the two routes cannot diverge (class 3). */
  const advance = useCallback(
    (codeArg?: string) => {
      // `codeArg` matters: the sixth keystroke calls this in the same event as
      // `setCode`, when the `code` in scope is still five characters long.
      const effective = sanitizeJoinCode(codeArg ?? code);
      if (effective.length !== JOIN_CODE_LENGTH) {
        setCodeErrorKey('education.student.join.flow.codeTooShort');
        setRefusalTick((n) => n + 1);
        trackJoinCodeStepRefused({ reason: 'too_short', attemptedCode: effective });
        return;
      }
      // Nothing WAITS on the lookup, but an answer already in `target` is used, so a
      // known-bad code gets a still frame to fix. `effective === code` matters: on the
      // sixth keystroke `target` still describes the previous code.
      if (effective === code && target?.verdict === 'invalid') {
        setCodeErrorKey('education.student.join.invalidCode');
        setRefusalTick((n) => n + 1);
        return;
      }
      setCodeErrorKey(null);
      setStep('name');
    },
    [code, target]
  );

  const refuseTooLong = useCallback(() => {
    setCodeState('');
    setStep('code');
    setCodeErrorKey(CODE_TOO_LONG);
  }, []);

  const backToCode = useCallback(() => {
    setStep('code');
    setFormErrorKey(null);
    setNameError(false);
    setSuggestedName(null);
  }, []);

  const typeNewCode = useCallback(() => {
    setEnded(false);
    setEndedClassroomId(null);
    setCodeState('');
    setNameState('');
    setCodeErrorKey(null);
    setFormErrorKey(null);
    setNameError(false);
    setSuggestedName(null);
    setStep('code');
  }, []);

  const submit = useCallback(
    (overrideName?: string) => {
      if (isSubmitting || inFlight.current || joined || ended) return;

      const trimmedCode = code.trim().toUpperCase();
      // Passed in rather than read from state because setState is async —
      // retrying off state here would resend the name that just collided.
      const trimmedName = (overrideName ?? name).trim();

      // What the STUDENT can fix is checked first, before anything we are
      // waiting on. Holding the tap for an unresolved session while the real
      // blocker is an empty nickname shows "getting ready…" over a problem one
      // second of typing would solve (recurring pitfall class 4).
      if (trimmedCode.length !== JOIN_CODE_LENGTH) {
        setCodeErrorKey('education.student.join.flow.codeTooShort');
        setStep('code');
        trackEduClassroomJoin({
          result: 'invalid_code',
          attemptedCode: trimmedCode,
          source:
            sanitizeJoinCode(initialCode).length === JOIN_CODE_LENGTH ? 'invite_link' : 'typed_code',
        });
        return;
      }
      if (showNameField && !trimmedName) {
        setNameError(true);
        setFormErrorKey(NAME_REQUIRED_KEY);
        return;
      }

      // Only now: a tap can land while the session is still resolving — the QR
      // path is exactly that window. REMEMBER it rather than dropping it: the
      // student pressed the button, and the one thing this must never do is
      // nothing.
      if (isAuthResolving) {
        setQueued(true);
        return;
      }

      setFormErrorKey(null);
      setSuggestedName(null);
      inFlight.current = true;
      autoJoinStarted.current = true;
      setIsSubmitting(true);

      void (async () => {
        const source =
          sanitizeJoinCode(initialCode).length === JOIN_CODE_LENGTH ? 'invite_link' : 'typed_code';
        // The funnel starts only once a real join POST is about to happen —
        // validation above already refused bad codes and empty names. The
        // completed/failed twin fires below on the join result.
        trackStudentJoinStarted({ source });
        try {
          const rehearsal = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('rehearsal') === '1';
          const result = await joinClassroom(
            trimmedCode,
            { ...(isGuest ? { guestName: trimmedName } : {}), ...(rehearsal ? { rehearsal: true } : {}) }
          );

          if (result.success) {
            const joinOutcome = result.alreadyMember ? 'already_member' : 'success';
            trackEduClassroomJoin({
              result: joinOutcome,
              classroomId: result.classroomId,
              attemptedCode: trimmedCode,
              // The ONLY signal that separates the two six-character systems —
              // they are shape-identical, so the resolution is the discriminator.
              matchedCodeType: result.gameCode ? 'game_code' : 'roster_code',
              source,
            });
            if (result.endedSessionCode && !result.gameCode) {
              setEndedClassroomId(result.classroomId ?? null);
              setEnded(true);
              return;
            }
            const keptName = result.displayName || trimmedName;
            if (keptName) setStoredUsername(keptName);

            // A live game code walks straight into the room; a roster join leaves for the class
            // view, with `joined` kept as the fallback panel if the push is skipped.
            const targetGameCode =
              result.gameCode ||
              (target?.verdict === 'game' ? target.gameCode || trimmedCode : null);
            if (!targetGameCode) toast.success(t('education.student.join.success'));
            if (!targetGameCode && result.classroomId) {
              setJoined({
                classroomId: result.classroomId,
                alreadyMember: !!result.alreadyMember,
              });
            }

            if (onSuccessBeforeNavigation) {
              try {
                await Promise.resolve(onSuccessBeforeNavigation());
              } catch (err) {
                if (process.env.NODE_ENV === 'development') {
                  logger.debug('onSuccessBeforeNavigation error:', err);
                }
              }
            }

            router.push(joinSuccessHref(language, targetGameCode));
            return;
          }

          const failure = joinFailure(result.code);
          trackEduClassroomJoin({ result: failure.outcome, attemptedCode: trimmedCode, source });

          if (failure.effect === 'name_taken') {
            // A problem the student can fix in a single tap should cost them a single tap.
            setSuggestedName(result.suggestedName ?? null);
            setNameError(true); setFormErrorKey(failure.formErrorKey ?? null);
          } else if (failure.effect === 'own_class' && result.classroomId) {
            setOwnClass({ classroomId: result.classroomId, liveGameCode: result.gameCode ?? null });
          } else if (failure.formErrorKey) {
            setFormErrorKey(failure.formErrorKey);
          } else if (failure.effect === 'ended') {
            setEnded(true);
          } else if (failure.effect === 'invalid_code') {
            setCodeErrorKey('education.student.join.invalidCode');
            setStep('code');
          } else {
            // Guest sign-in refused, network, server fault: "bad code" would send them to re-check a fine code.
            setFormErrorKey('common.error');
          }
        } catch {
          trackEduClassroomJoin({
            result: 'server_error',
            attemptedCode: trimmedCode,
            source,
          });
          setFormErrorKey('common.error');
        } finally {
          inFlight.current = false;
          setIsSubmitting(false);
        }
      })();
    },
    [
      code,
      name,
      isGuest,
      showNameField,
      isAuthResolving,
      isSubmitting,
      joined,
      ended,
      joinClassroom,
      language,
      router,
      t,
      target,
      onSuccessBeforeNavigation,
      initialCode,
    ]
  );

  // Invite link + signed-in student: join without a second GO tap.
  useEffect(() => {
    if (autoJoinStarted.current || joined || isSubmitting || inFlight.current) return;
    if (isAuthResolving || holdAutoJoin) return;
    if (!user) return;
    if (sanitizeJoinCode(initialCode).length !== JOIN_CODE_LENGTH) return;
    if (code.length !== JOIN_CODE_LENGTH) return;
    if (showNameField) return;
    autoJoinStarted.current = true;
    submit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthResolving, holdAutoJoin, user, initialCode, code, showNameField, joined, isSubmitting]);

  // A tap held before we knew whose device this is must not replay as the wrong student.
  useEffect(() => {
    if (holdAutoJoin) setQueued(false);
  }, [holdAutoJoin]);

  // The nickname question can be WITHDRAWN mid-flow. `showNameField` derives
  // from auth, which resolves LATE (recurring pitfall class 1): a student we
  // were asking for a name can turn out to be signed in a moment later. A
  // refusal about a field that no longer exists is a demand with no way to
  // satisfy it — no input to type in, and nothing that clears it.
  useEffect(() => {
    if (showNameField) return;
    setNameError(false);
    setSuggestedName(null);
    // Only the name-scoped refusal. A full classroom or a server fault is still
    // true and must stay on screen.
    setFormErrorKey((current) => (current === NAME_REQUIRED_KEY ? null : current));
  }, [showNameField]);

  // Arm the deadline the moment a tap is held. Cleared the instant the session
  // resolves or the tap is replayed, so a healthy session never reaches it.
  useEffect(() => {
    if (!queued || !isAuthResolving) return;
    const timer = setTimeout(() => setHoldExpired(true), AUTH_HOLD_MS);
    return () => clearTimeout(timer);
  }, [queued, isAuthResolving]);

  // Replay a tap that landed before the session resolved. Waits for the session
  // AND for whatever that tap was still missing, so the student is never told
  // off for a race they did not cause. Fires once.
  useEffect(() => {
    if (!queued || isAuthResolving || isSubmitting || holdAutoJoin) return;
    if (code.length !== JOIN_CODE_LENGTH) return;
    if (showNameField && !name.trim()) return;
    setQueued(false);
    setHoldExpired(false);
    submit();
    // `submit` is redefined every render; depending on it would re-fire the
    // queued intent. The guards above are the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queued, isAuthResolving, isSubmitting, holdAutoJoin, code, name, showNameField]);

  return {
    step,
    code,
    name,
    target,
    isChecking,
    isSubmitting,
    isHolding: queued && isAuthResolving,
    showNameField,
    codeRejected: target?.verdict === 'invalid',
    codeErrorKey,
    refusalTick,
    formErrorKey,
    nameError,
    suggestedName,
    joined,
    ended,
    endedClassroomId,
    ownClass,
    // Live unless a join is genuinely in flight. Disabling GO for a missing
    // nickname looked tidy and behaved as a silent no-op: the student taps a
    // grey button, nothing happens, and nothing on screen says why. `submit`
    // refuses an empty name INLINE instead (recurring pitfall class 4).
    canSubmit: !isSubmitting,
    setCode,
    setName,
    advance,
    refuseTooLong,
    backToCode,
    typeNewCode,
    submit,
  };
}

export default useJoinFlow;
