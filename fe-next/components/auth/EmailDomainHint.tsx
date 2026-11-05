'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import type { EmailHint } from '@/lib/auth/emailDomainHint';

/**
 * Shown under the email field and echoed on the check-email screen.
 * A suggestion or a no-MX warning holds the first submit; "send anyway"
 * is the explicit ack. Never blocks a domain we could not check.
 */
export function EmailDomainHint({
  hint,
  onApply,
  onAcknowledge,
  showTeacherToggle,
  teacherIntent,
  onTeacherIntent,
}: {
  hint: EmailHint | null;
  onApply: (email: string) => void;
  onAcknowledge: () => void;
  showTeacherToggle: boolean;
  teacherIntent: boolean;
  onTeacherIntent: (next: boolean) => void;
}) {
  const { t } = useLanguage();
  if (!hint?.suggestion && hint?.mx !== false && !showTeacherToggle) return null;

  return (
    <div className="mt-2 space-y-2 text-sm">
      {hint?.suggestion && (
        <p role="status" className="rounded-neo border-2 border-neo-lime bg-neo-lime/15 p-2 text-neo-lime">
          {t('auth.emailHint.suggest', undefined, { email: hint.suggestion })}
          <button
            type="button"
            data-testid="email-hint-apply"
            onClick={() => onApply(hint.suggestion!)}
            className="ms-2 font-black underline decoration-2 underline-offset-2"
          >
            {t('auth.emailHint.useSuggestion')}
          </button>
        </p>
      )}
      {hint?.mx === false && (
        <p role="alert" className="text-neo-red font-semibold">
          {t('auth.emailHint.noMx')}
          <button
            type="button"
            data-testid="email-hint-anyway"
            onClick={onAcknowledge}
            className="ms-2 underline decoration-2 underline-offset-2"
          >
            {t('auth.emailHint.useAnyway')}
          </button>
        </p>
      )}
      {showTeacherToggle && (
        <label className="flex min-h-11 items-center gap-2 font-bold text-neo-white">
          <input
            type="checkbox"
            data-testid="email-teacher-toggle"
            checked={teacherIntent}
            onChange={(e) => onTeacherIntent(e.target.checked)}
            className="size-5 accent-neo-lime"
          />
          {t('auth.emailHint.teacherToggle')}
        </label>
      )}
    </div>
  );
}
