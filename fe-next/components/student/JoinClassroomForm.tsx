'use client';

import React, { useRef, useState } from 'react';
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
import { sanitizeClassroomCode } from '@/components/student/classroomCode';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';
import { EducationHeader } from '@/components/education/EducationHeader';
import { trackEduClassroomJoin } from '@/lib/education/telemetry';

/**
 * JoinClassroomForm - Student classroom join form
 *
 * Allows students to join a teacher's classroom using a 6-character code.
 * Features:
 * - Clipboard paste support
 * - Real-time validation
 * - Neo-brutalist design
 * - RTL support
 * - Optional initialCode prop for shareable invite links
 */

interface JoinClassroomFormProps {
  /** Optional pre-filled code from shareable invite link */
  initialCode?: string;
}

const JoinClassroomForm: React.FC<JoinClassroomFormProps> = ({ initialCode = '' }) => {
  const { t, dir, language } = useLanguage();
  const router = useRouter();
  const { joinClassroom } = useJoinClassroom();
  const { user } = useAuth();

  // Logged-out students join as an anonymous guest by typing a name — no
  // email/password account required. The session then persists on this device.
  const isGuest = !user;

  const [code, setCode] = useState(initialCode);
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [nameError, setNameError] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Handle paste from clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const cleaned = sanitizeClassroomCode(text);
      if (cleaned) {
        setCode(cleaned);
        if (codeError) setCodeError(false);
        toast.success(t('education.student.join.codePasted'));
      } else {
        toast.error(t('education.student.join.emptyClipboard'));
      }
    } catch {
      // Clipboard API not available or permission denied
      toast.error(t('education.student.join.clipboardError'));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();

    // Validate code format (6 alphanumeric characters)
    const sanitizedCode = sanitizeClassroomCode(code);
    if (!sanitizedCode) {
      setCodeError(true);
      trackEduClassroomJoin({ result: 'invalid_code' });
      toast.error(t('education.student.join.invalidCode'));
      return;
    }

    // Guests must supply a name (becomes their display name + in-game username).
    if (isGuest && !trimmedName) {
      setNameError(true);
      toast.error(t('education.student.join.nameRequired'));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await joinClassroom(
        sanitizedCode,
        isGuest ? { guestName: trimmedName } : undefined
      );

      if (result.success) {
        trackEduClassroomJoin({
          result: 'success',
          classroomId: result.classroomId,
        });
        toast.success(t('education.student.join.success'));
        // Redirect to student dashboard
        router.push(`/${language}/student`);
      } else if (result.code === 'STUDENT_LIMIT_REACHED') {
        // Full class. `result.error` is the server's English reason and names our free
        // tier — never render it; the student can neither read it in their locale nor
        // act on it.
        trackEduClassroomJoin({ result: 'error' });
        toast.error(t('education.student.join.classroomFull'));
        setCodeError(true);
      } else {
        // Everything else is a code the server could not resolve. Branching on the code
        // rather than on English prose is what keeps this correct in all six locales.
        trackEduClassroomJoin({ result: result.code === 'INVALID_CODE' ? 'not_found' : 'error' });
        toast.error(t('education.student.join.invalidCode'));
        setCodeError(true);
      }
    } catch (error) {
      trackEduClassroomJoin({ result: 'error' });
      toast.error(t('common.error'));
      setCodeError(true);
    } finally {
      setIsSubmitting(false);
    }
  };

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
              {/* Name Input — guests only (account-less join) */}
              {isGuest && (
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
                    autoCapitalize="words"
                    autoCorrect="off"
                    className={cn(
                      "h-14 text-lg font-bold bg-neo-navy/50 border-neo-white/20 text-white placeholder:text-neo-white/50",
                      nameError && "border-neo-red bg-neo-red/10 focus-visible:ring-neo-red"
                    )}
                  />
                  <p id="name-hint" className="text-xs text-neo-lime">
                    {t('education.student.join.nameHint')}
                  </p>
                  {nameError && (
                    <p id="name-error" className="text-xs text-neo-red font-bold" role="alert">
                      {t('education.student.join.nameRequired')}
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
                    dir="ltr"
                    value={code}
                    onChange={(e) => {
                      const sanitized = sanitizeClassroomCode(e.target.value);
                      if (sanitized) {
                        setCode(sanitized);
                        if (codeError) setCodeError(false);
                        // Auto-advance: a full 6-char code moves a guest who still
                        // needs a name straight to the name field.
                        if (isGuest && !name.trim()) {
                          nameInputRef.current?.focus();
                        }
                      } else {
                        // Keep the raw value for partial entry (user still typing)
                        const partial = e.target.value.toUpperCase();
                        setCode(partial);
                        if (codeError) setCodeError(false);
                      }
                    }}
                    required
                    placeholder={t('education.student.join.codePlaceholder')}
                    maxLength={6}
                    inputMode="text"
                    autoComplete="off"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    autoFocus={!isGuest}
                    aria-invalid={codeError ? 'true' : undefined}
                    aria-describedby={codeError ? 'code-error' : 'code-hint'}
                    className={cn(
                      "h-14 text-xl text-center font-mono font-bold tracking-widest uppercase pe-14 bg-neo-navy/50 border-neo-white/20 text-white placeholder:text-neo-white/50",
                      codeError && "border-neo-red bg-neo-red/10 focus-visible:ring-neo-red"
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
                {codeError && (
                  <p id="code-error" className="text-xs text-neo-red font-bold" role="alert">
                    {t('education.student.join.codeNotRecognised')}
                  </p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting || !code.trim() || code.length !== 6 || (isGuest && !name.trim())}
                size="lg"
                className="w-full h-14 text-lg font-black uppercase bg-neo-cyan hover:bg-neo-cyan/90 text-neo-black border-3 border-neo-black shadow-hard hover:shadow-hard-lg hover:translate-x-[-2px] hover:translate-y-[-2px] active:translate-x-px active:translate-y-px active:shadow-hard-pressed transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <LogIn className="me-2 w-5 h-5" />
                {isSubmitting
                  ? t('education.student.join.joining')
                  : t('education.student.join.button')
                }
              </Button>
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
