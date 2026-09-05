'use client';

import React, { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { m } from 'framer-motion';
import { ArrowLeft, LogIn, ClipboardPaste } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { DirectionalIcon } from '@/components/ui/DirectionalIcon';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useJoinClassroom } from '@/hooks/useClassroom';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { EducationHeader } from '@/components/education/EducationHeader';
import { trackEduClassroomJoin } from '@/lib/education/telemetry';
import { lookupClassroomPreview, type ClassroomPreview } from '@/lib/education/classroomPreview';
import ClassroomPreviewCard from './ClassroomPreviewCard';

// Student classroom join form: code entry + confirmation + guest name input
interface JoinClassroomFormProps {
  initialCode?: string;
}

const JoinClassroomForm: React.FC<JoinClassroomFormProps> = ({ initialCode = '' }) => {
  const { t, dir, language } = useLanguage();
  const router = useRouter();
  const { joinClassroom } = useJoinClassroom();
  const { user, loading: authLoading } = useAuth();

  // Logged-out guests join by typing a name (no email/password needed).
  //
  // This stays `!user` ON PURPOSE. The name field is UI *added* for guests and
  // `disabled={… || (isGuest && !name.trim())}` needs `isGuest` true to require
  // a name, so folding `authLoading` in here would invert both guards: during
  // loading the name field would vanish AND the button would go live with an
  // empty name. Unresolved auth is a third state, handled separately below.
  const isGuest = !user;
  // Until the session resolves, the form is rendering one branch against state
  // that is about to change underneath it. A tap in that window is what made
  // the very first JOIN do nothing at all — no navigation, no error, no request
  // — and left the student to discover that a second tap works.
  const isAuthResolving = authLoading;
  /** A tap that landed before the form could act on it. Replayed on ready. */
  const [queuedJoin, setQueuedJoin] = useState(false);

  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ClassroomPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPreviewCodeRef = useRef<string>('');

  useEffect(() => {
    const normalized = code.trim().toUpperCase();
    if (normalized.length !== 6) {
      setPreview(null);
      // Forget what we last looked up, or retyping the character just deleted
      // matches the guard below and returns without re-fetching — the green
      // confirmation card then never comes back for the rest of the session.
      // Also clear the spinner this branch used to leave running forever.
      lastPreviewCodeRef.current = '';
      setIsLoadingPreview(false);
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
      return;
    }
    if (normalized === lastPreviewCodeRef.current) return;
    if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    setIsLoadingPreview(true);
    previewTimeoutRef.current = setTimeout(async () => {
      lastPreviewCodeRef.current = normalized;
      try {
        const result = await lookupClassroomPreview(normalized);
        setPreview(result);
      } catch {
        // The preview is a courtesy and must never gate the join. Swallow the
        // failure into "no confirmation available" — but ALWAYS clear the
        // spinner below, or a rejected lookup leaves the card loading forever.
        setPreview(null);
      } finally {
        setIsLoadingPreview(false);
      }
    }, 300);
    // Block body, not a concise `&&` expression: an arrow returning `a && clearTimeout(b)` is
    // typed `void | null`, which is not a valid EffectCallback cleanup and fails tsc.
    return () => {
      if (previewTimeoutRef.current) clearTimeout(previewTimeoutRef.current);
    };
  }, [code]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = text.trim().replace(/[^A-Za-z0-9]/g, '').slice(0, 6).toUpperCase();
      if (cleaned) {
        setCode(cleaned);
        if (codeError) setCodeError(false);
        toast.success(t('education.student.join.codePasted'));
      } else {
        toast.error(t('education.student.join.emptyClipboard'));
      }
    } catch {
      toast.error(t('education.student.join.clipboardError'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // A submit can still reach here while auth is unresolved — the Enter key, or
    // a tap that races the re-render. REMEMBER it rather than dropping it: the
    // student pressed the button, and the one thing this must never do is
    // nothing. It replays below the moment everything is ready.
    if (isAuthResolving) {
      setQueuedJoin(true);
      return;
    }

    const trimmedCode = code.trim();
    const trimmedName = name.trim();

    if (!trimmedCode || trimmedCode.length !== 6) {
      setCodeError(true);
      trackEduClassroomJoin({ result: 'invalid_code' });
      toast.error(t('education.student.join.invalidCode'));
      return;
    }

    if (isGuest && !trimmedName) {
      setNameError(true);
      toast.error(t('education.student.join.nameLabel'));
      return;
    }

    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await joinClassroom(
        trimmedCode.toUpperCase(),
        isGuest ? { guestName: trimmedName } : undefined
      );

      if (result.success) {
        trackEduClassroomJoin({
          result: 'success',
          classroomId: result.classroomId,
        });
        toast.success(t('education.student.join.success'));
        // A student who typed the LIVE GAME code came to PLAY, not to be enrolled. Walk them
        // straight into the room; the enrolment already happened server-side. Dropping them on
        // the hub instead was the last step of the dead end this whole path used to be.
        router.push(
          result.gameCode
            ? `/${language}/multiplayer?room=${result.gameCode}&classroom=true`
            : `/${language}/student`
        );
      } else if (result.code === 'STUDENT_LIMIT_REACHED') {
        trackEduClassroomJoin({ result: 'error' });
        const msg = t('education.student.join.classroomFull');
        toast.error(msg);
        setSubmitError(msg);
        setCodeError(true);
      } else {
        // Only say "that code is wrong" when the code really was wrong. Every
        // other failure (guest sign-in refused, network, server fault) used to
        // render the same line, which sends a student to re-check a code that
        // was fine and hides the real fault from us.
        const badCode = result.code === 'INVALID_CODE';
        const msg = t(badCode ? 'education.student.join.invalidCode' : 'common.error');
        trackEduClassroomJoin({ result: badCode ? 'not_found' : 'error' });
        toast.error(msg);
        setSubmitError(msg);
        setCodeError(true);
      }
    } catch (error) {
      trackEduClassroomJoin({ result: 'error' });
      const msg = t('common.error');
      toast.error(msg);
      setSubmitError(msg);
      setCodeError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Replay a tap that landed before the form could act on it. Waits for the
  // session AND for whatever that tap was still missing — a guest name — so the
  // student is never told off for a race they did not cause. Fires once.
  useEffect(() => {
    if (!queuedJoin || isAuthResolving || isSubmitting) return;
    if (code.trim().length !== 6) return;
    if (isGuest && !name.trim()) return;
    setQueuedJoin(false);
    void handleSubmit({ preventDefault: () => {} } as React.FormEvent);
    // handleSubmit is redefined every render; depending on it would re-fire the
    // queued intent. The guards above are the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queuedJoin, isAuthResolving, isSubmitting, code, name, isGuest]);

  return (
    <div dir={dir} className="min-h-dvh bg-neo-navy flex flex-col">
      <EducationHeader showBackButton />
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <m.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full max-w-md"
        >
        {/* Decorative only — the heading below carries the meaning. */}
        <Image
          src="/images/education/join-hero.webp"
          alt=""
          aria-hidden="true"
          width={448}
          height={250}
          priority
          className="mx-auto mb-4 w-full max-w-sm h-auto select-none"
        />
        <Card className="border-3 border-neo-black shadow-hard">
          <CardContent className="p-6 sm:p-8">
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-2xl sm:text-3xl font-black uppercase text-neo-white mb-2">
                {t('education.student.join.title')}
              </h1>
              <p className="text-sm text-neo-white">
                {t('education.student.join.subtitle')}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                {/*
                  Reserved slot, not a bare conditional. The confirmation card
                  resolves on a 300ms debounce PLUS a network round trip, so it
                  mounts late — often while the student is filling in their name
                  or already reaching for JOIN — and mounting it above the form
                  pushed the button down under a finger already in flight. That
                  is the "first tap does nothing, second tap works" report: the
                  tap landed where the button had just been. Holding the height
                  means the card can arrive whenever it likes without moving
                  anything below it.
                */}
                <div className="min-h-[92px]" data-testid="join-preview-slot">
                  {preview && <ClassroomPreviewCard name={preview.name} kind={preview.kind} isLoading={isLoadingPreview} />}
                </div>

              {isGuest && code.trim().length === 6 && (
                <div className="space-y-2">
                  <Label
                    htmlFor="student-name"
                    className="text-sm font-bold uppercase text-neo-white"
                  >
                    {t('education.student.join.nameLabel')}
                  </Label>
                  <Input
                    id="student-name"
                    ref={nameInputRef}
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (nameError) setNameError(false);
                    }}
                    required
                    maxLength={40}
                    autoComplete="off"
                    autoFocus
                    placeholder={t('education.student.join.namePlaceholder')}
                    aria-invalid={nameError ? 'true' : undefined}
                    aria-describedby={nameError ? 'name-error' : 'name-hint'}
                    className={cn(
                      "h-14 text-lg font-bold bg-neo-navy/50 border-neo-white/20 text-white placeholder:text-neo-white/50",
                      nameError && "border-red-500 bg-red-900/30 focus-visible:ring-red-500"
                    )}
                  />
                  <p id="name-hint" className="text-xs text-neo-lime">
                    {t('education.student.join.nameHint')}
                  </p>
                  {nameError && (
                    <p id="name-error" className="text-xs text-red-400" role="alert">
                      {t('education.student.join.nameLabel')}
                    </p>
                  )}
                </div>
              )}

              {/* Code Input */}
              <div className="space-y-2">
                <Label
                  htmlFor="classroom-code"
                  className="text-sm font-bold uppercase text-neo-white"
                >
                  {t('education.student.join.codeLabel')}
                </Label>
                <div className="relative">
                  <Input
                    id="classroom-code"
                    value={code}
                    onChange={(e) => {
                      const next = e.target.value.toUpperCase();
                      setCode(next);
                      if (codeError) setCodeError(false);
                      if (submitError) setSubmitError(null);
                      if (next.length < 6) setPreview(null);
                      if (next.length === 6 && preview && isGuest && !name.trim()) {
                        nameInputRef.current?.focus();
                      }
                    }}
                    required
                    placeholder="ABC123"
                    maxLength={6}
                    pattern="[A-Za-z0-9]{6}"
                    inputMode="text"
                    autoComplete="off"
                    autoFocus={!isGuest}
                    aria-invalid={codeError ? 'true' : undefined}
                    aria-describedby={codeError ? 'code-error' : 'code-hint'}
                    className={cn(
                      "h-14 text-xl text-center font-mono font-bold tracking-widest uppercase pe-14 bg-neo-navy/50 border-neo-white/20 text-white placeholder:text-neo-white/50",
                      codeError && "border-red-500 bg-red-900/30 focus-visible:ring-red-500"
                    )}
                  />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          size="icon"
                          variant="outline"
                          onClick={handlePaste}
                          className="absolute inset-e-2 top-1/2 -translate-y-1/2 h-10 w-10 bg-neo-lime hover:bg-neo-lime/90 text-neo-black border-neo border-neo-black shadow-hard-sm hover:shadow-hard hover:-translate-x-px hover:-translate-y-px active:shadow-hard-pressed transition-all"
                          aria-label={t('education.student.join.pasteButton')}
                        >
                          <ClipboardPaste className="w-4 h-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        {t('education.student.join.pasteButton')}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <p id="code-hint" className="text-xs text-neo-white">
                  {t('education.student.join.codeHint')}
                </p>
                {(codeError || submitError) && (
                  <p id="code-error" className="text-xs text-red-400" role="alert">
                    {submitError || t('education.student.join.invalidCode')}
                  </p>
                )}
              </div>

              {/* Submit Button — enabled only if preview confirmed + (for guests) name entered */}
              <Button
                type="submit"
                // The preview is a courtesy — it tells a student which room they are about to
                // enter. It must NEVER gate the join. Gating on `!preview` meant a failed, slow,
                // or rate-limited preview lookup left a student holding a valid code with a dead
                // button, and a class of 30 joining from one school IP would exhaust the preview
                // rate limit and lock out everyone after the first few.
                disabled={isAuthResolving || isSubmitting || code.trim().length !== 6 || (isGuest && !name.trim())}
                size="lg"
                className="w-full h-14 text-lg font-black uppercase bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black border-3 border-neo-black shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-px active:translate-y-px active:shadow-hard-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn className="me-2 w-5 h-5" />
                {isSubmitting
                  ? t('education.student.join.joining')
                  : t('education.student.join.button')
                }
              </Button>

              {/* A disabled button with no explanation is the same dead end in a
                  different costume. Say what is being waited on. */}
              {(isAuthResolving || queuedJoin) && (
                <p className="text-center text-sm font-neo-body text-neo-white/70">
                  {t('education.student.join.preparing')}
                </p>
              )}
            </form>

            {/* Back Link */}
            <div className="mt-6 pt-6 border-t border-neo-white/10">
              <button
                type="button"
                onClick={() => router.push(`/${language}/student`)}
                disabled={isSubmitting}
                className="flex items-center gap-2 text-sm text-neo-white hover:text-neo-cyan transition-colors disabled:opacity-50"
              >
                <DirectionalIcon icon={ArrowLeft} className="w-4 h-4" />
                {t('common.back')}
              </button>
            </div>
          </CardContent>
        </Card>
        </m.div>
      </div>
    </div>
  );
};

export default JoinClassroomForm;
