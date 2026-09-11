'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useJoinClassroom } from '@/hooks/useClassroom';
import { trackEduClassroomJoin } from '@/lib/education/telemetry';
import { resolveJoinTarget, type JoinTarget } from './joinTarget';
import { sanitizeJoinCode, JOIN_CODE_LENGTH } from './JoinCodeField';

export type JoinStep = 'code' | 'name';

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
export interface JoinFlowState {
  step: JoinStep;
  code: string;
  name: string;
  /** Resolved class/teacher behind the code, or null while unknown. */
  target: JoinTarget | null;
  isChecking: boolean;
  isSubmitting: boolean;
  /** Held tap waiting on an unresolved session. */
  isHolding: boolean;
  /** Guests type a nickname; so does anyone who already typed one. */
  showNameField: boolean;
  /** True once we are SURE the code is wrong. `unverified` never sets this. */
  codeRejected: boolean;
  codeErrorKey: string | null;
  formErrorKey: string | null;
  nameError: boolean;
  suggestedName: string | null;
  canSubmit: boolean;
  setCode: (next: string) => void;
  setName: (next: string) => void;
  /** Pass the freshest code when the caller has it (the sixth keystroke). */
  advance: (codeArg?: string) => void;
  backToCode: () => void;
  submit: (overrideName?: string) => void;
}

export function useJoinFlow(initialCode = ''): JoinFlowState {
  const router = useRouter();
  const { t, language } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { joinClassroom } = useJoinClassroom();

  const seedCode = sanitizeJoinCode(initialCode);
  const [code, setCodeState] = useState(seedCode);
  // The QR path lands here already: pre-filled code, straight to the nickname.
  // Computed in the initializer, not an effect, so there is no code-step frame
  // to flash (recurring pitfall class 5).
  const [step, setStep] = useState<JoinStep>(
    seedCode.length === JOIN_CODE_LENGTH ? 'name' : 'code'
  );
  const [name, setNameState] = useState('');
  const [target, setTarget] = useState<JoinTarget | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeErrorKey, setCodeErrorKey] = useState<string | null>(null);
  const [formErrorKey, setFormErrorKey] = useState<string | null>(null);
  const [nameError, setNameError] = useState(false);
  const [suggestedName, setSuggestedName] = useState<string | null>(null);
  const [queued, setQueued] = useState(false);
  /** The hold outlived its deadline: go without the session. */
  const [holdExpired, setHoldExpired] = useState(false);

  const lastLookedUp = useRef('');
  const lookupSeq = useRef(0);

  // `!user`, deliberately, not `useIsGuest`. That hook answers
  // `!loading && !isAuthenticated`, which is right for HIDING things from
  // guests but inverts here: the nickname field is UI *added* for them, so
  // during the loading frame it would vanish AND the button would go live with
  // an empty name. Unresolved auth is a third state, handled by the hold below.
  const isGuest = !user;
  const isAuthResolving = authLoading && !holdExpired;

  // `|| name` is not belt-and-braces, it is the whole fix. The first tap on GO
  // mints an anonymous auth user BEFORE the join route is called, so `user`
  // stops being null even when the join then fails. On `isGuest` alone the row
  // vanished on the retry and the student could no longer see — or change — the
  // name being submitted for them.
  const showNameField = isGuest || name.trim().length > 0;

  /* ── The lookup. Decorates; never gates. ─────────────────────────────── */
  useEffect(() => {
    if (code.length !== JOIN_CODE_LENGTH) {
      setTarget(null);
      setIsChecking(false);
      // Forget what we last asked about, or retyping the character just deleted
      // matches the guard below and never re-fetches — the confirmation would
      // then never come back for the rest of the session.
      lastLookedUp.current = '';
      return;
    }
    if (code === lastLookedUp.current) return;
    lastLookedUp.current = code;
    const seq = ++lookupSeq.current;
    setIsChecking(true);
    void (async () => {
      let result: JoinTarget;
      try {
        result = await resolveJoinTarget(code);
      } catch {
        // A lookup we could not perform is not evidence of a bad code.
        result = { verdict: 'unverified' };
      }
      // A slower answer for an older code must not overwrite a newer one.
      if (seq !== lookupSeq.current) return;
      setTarget(result);
      setIsChecking(false);
    })();
  }, [code]);

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
        return;
      }
      setCodeErrorKey(null);
      setStep('name');
    },
    [code]
  );

  const backToCode = useCallback(() => {
    setStep('code');
    setFormErrorKey(null);
    setNameError(false);
    setSuggestedName(null);
  }, []);

  const submit = useCallback(
    (overrideName?: string) => {
      if (isSubmitting) return;

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
        trackEduClassroomJoin({ result: 'invalid_code' });
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
      setIsSubmitting(true);

      void (async () => {
        try {
          const result = await joinClassroom(
            trimmedCode,
            isGuest ? { guestName: trimmedName } : undefined
          );

          if (result.success) {
            trackEduClassroomJoin({ result: 'success', classroomId: result.classroomId });
            toast.success(t('education.student.join.success'));
            // A student who typed the LIVE GAME code came to PLAY, not to be
            // enrolled. Walk them straight in; the enrolment already happened.
            router.push(
              result.gameCode
                ? `/${language}/multiplayer?room=${result.gameCode}&classroom=true`
                : `/${language}/student`
            );
            return;
          }

          trackEduClassroomJoin({
            result: result.code === 'INVALID_CODE' ? 'not_found' : 'error',
          });

          if (result.code === 'NAME_TAKEN') {
            // A problem the student can fix in a single tap should cost them a
            // single tap — not a generic error and a guess.
            setSuggestedName(result.suggestedName ?? null);
            setNameError(true);
          } else if (result.code === 'STUDENT_LIMIT_REACHED') {
            setFormErrorKey('education.student.join.classroomFull');
          } else if (result.code === 'INVALID_CODE') {
            // Only say "that code is wrong" when the code really was wrong —
            // and then put the student back on the field they have to fix.
            setCodeErrorKey('education.student.join.invalidCode');
            setStep('code');
          } else {
            // Guest sign-in refused, network, server fault. Saying "bad code"
            // here sends a student to re-check a code that was fine.
            setFormErrorKey('common.error');
          }
        } catch {
          trackEduClassroomJoin({ result: 'error' });
          setFormErrorKey('common.error');
        } finally {
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
      joinClassroom,
      language,
      router,
      t,
    ]
  );

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
    if (!queued || isAuthResolving || isSubmitting) return;
    if (code.length !== JOIN_CODE_LENGTH) return;
    if (showNameField && !name.trim()) return;
    setQueued(false);
    setHoldExpired(false);
    submit();
    // `submit` is redefined every render; depending on it would re-fire the
    // queued intent. The guards above are the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queued, isAuthResolving, isSubmitting, code, name, showNameField]);

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
    formErrorKey,
    nameError,
    suggestedName,
    // Live unless a join is genuinely in flight. Disabling GO for a missing
    // nickname looked tidy and behaved as a silent no-op: the student taps a
    // grey button, nothing happens, and nothing on screen says why. `submit`
    // refuses an empty name INLINE instead (recurring pitfall class 4).
    canSubmit: !isSubmitting,
    setCode,
    setName,
    advance,
    backToCode,
    submit,
  };
}

export default useJoinFlow;
