'use client';

/**
 * Teacher-aware delete interstitial (t_b5825a0a).
 *
 * Shown INSTEAD of the bare type-DELETE form when the account owns classrooms:
 * roster/class impact, two lighter exits (stop the value emails, keep the free
 * account), and a reason picker. Choosing "keep free" or successfully
 * unsubscribing keeps the account; "continue" reveals the irreversible form.
 *
 * Emits teacher_delete_viewed on mount, teacher_delete_reason_selected,
 * teacher_delete_alternative_chosen. The final confirm press is tracked by the
 * parent (it owns the DELETE call).
 */
import { useEffect, useRef, useState } from 'react';
import { GraduationCap, Mail, Heart, ChevronDown, CheckCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import { cn } from '@/lib/utils';
import {
  TEACHER_DELETE_REASONS,
  type DeleteImpactSummary,
  type TeacherDeleteReason,
} from '@/lib/account/deleteAccountImpact';
import {
  trackTeacherDeleteAlternativeChosen,
  trackTeacherDeleteReasonSelected,
  trackTeacherDeleteViewed,
  type TeacherDeleteSurface,
} from '@/lib/education/teacherDeleteTelemetry';

interface TeacherDeleteInterstitialProps {
  impact: DeleteImpactSummary;
  surface: TeacherDeleteSurface;
  isDarkMode: boolean;
  /** Selected reason, lifted so the parent can attach it to the DELETE body. */
  reason: TeacherDeleteReason | null;
  onReasonChange: (reason: TeacherDeleteReason) => void;
  /** "Keep my free account" — parent closes the confirm UI entirely. */
  onKeepAccount: () => void;
  /** Reveal the irreversible type-DELETE form. */
  onContinueToDelete: () => void;
}

export default function TeacherDeleteInterstitial({
  impact,
  surface,
  isDarkMode,
  reason,
  onReasonChange,
  onKeepAccount,
  onContinueToDelete,
}: TeacherDeleteInterstitialProps) {
  const { t } = useLanguage();
  const [unsubscribeState, setUnsubscribeState] = useState<'idle' | 'working' | 'done' | 'error'>('idle');
  const viewedRef = useRef(false);

  useEffect(() => {
    if (viewedRef.current) return;
    viewedRef.current = true;
    trackTeacherDeleteViewed(impact, surface);
  }, [impact, surface]);

  const handleStopEmails = async () => {
    if (unsubscribeState === 'working' || unsubscribeState === 'done') return;
    setUnsubscribeState('working');
    try {
      const res = await fetchWithAuth('/api/email/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ daily_email_subscribed: false }),
        requireSession: true,
      });
      if (!res.ok) {
        setUnsubscribeState('error');
        return;
      }
      setUnsubscribeState('done');
      trackTeacherDeleteAlternativeChosen('unsubscribe_emails', impact, surface);
    } catch {
      setUnsubscribeState('error');
    }
  };

  const handleKeepFree = () => {
    trackTeacherDeleteAlternativeChosen('keep_free_account', impact, surface);
    onKeepAccount();
  };

  const handleReason = (r: TeacherDeleteReason) => {
    onReasonChange(r);
    trackTeacherDeleteReasonSelected(r, surface);
  };

  const textPrimary = isDarkMode ? 'text-white' : 'text-neo-black';
  const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const chipBase = 'px-3 py-2 rounded-neo border-2 text-xs font-bold min-h-[44px] transition-colors';

  return (
    <div className="space-y-4" data-testid="teacher-delete-interstitial">
      {/* Class impact */}
      <div
        className={cn(
          'p-3 rounded-neo border-2',
          isDarkMode ? 'bg-neo-navy-elevated border-slate-600' : 'bg-amber-50 border-amber-300'
        )}
      >
        <div className="flex items-start gap-2">
          <GraduationCap className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className={cn('text-sm font-bold', textPrimary)}>
              {t('settings.teacherDeleteImpactTitle')}
            </p>
            <p className={cn('text-xs', textSecondary)}>
              {t('settings.teacherDeleteImpactSummary')
                .replace('{students}', String(impact.totalStudents))
                .replace('{classes}', String(impact.classrooms.length))
                .replace('{rounds}', String(impact.roundsPlayed))}
            </p>
            <ul className={cn('text-xs space-y-0.5', textMuted)}>
              {impact.classrooms.map((c) => (
                <li key={c.id}>
                  {(c.name || t('settings.teacherDeleteUnnamedClass')) +
                    ' — ' +
                    t('settings.teacherDeleteRosterCount').replace('{count}', String(c.studentCount))}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Alternatives */}
      <p className={cn('text-xs font-bold uppercase', textMuted)}>
        {t('settings.teacherDeleteAlternativesTitle')}
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {impact.emailSubscribed && unsubscribeState !== 'done' ? (
          <button
            type="button"
            onClick={handleStopEmails}
            disabled={unsubscribeState === 'working'}
            className={cn(
              'flex items-center gap-2 p-3 rounded-neo border-3 text-start min-h-[44px] transition-colors',
              isDarkMode
                ? 'border-slate-600 bg-neo-navy-elevated hover:border-neo-cyan'
                : 'border-gray-300 bg-white hover:border-neo-cyan'
            )}
          >
            <Mail className="w-5 h-5 text-neo-cyan shrink-0" />
            <span>
              <span className={cn('block text-sm font-bold', textPrimary)}>
                {unsubscribeState === 'working'
                  ? t('settings.teacherDeleteStopEmailsWorking')
                  : t('settings.teacherDeleteStopEmails')}
              </span>
              <span className={cn('block text-xs', textMuted)}>
                {unsubscribeState === 'error'
                  ? t('settings.teacherDeleteStopEmailsError')
                  : t('settings.teacherDeleteStopEmailsHint')}
              </span>
            </span>
          </button>
        ) : (
          <div
            className={cn(
              'flex items-center gap-2 p-3 rounded-neo border-3 min-h-[44px]',
              isDarkMode ? 'border-green-700 bg-neo-navy-elevated' : 'border-green-300 bg-green-50'
            )}
            role="status"
          >
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <span className={cn('text-sm font-bold', textPrimary)}>
              {t('settings.teacherDeleteStopEmailsDone')}
            </span>
          </div>
        )}
        <button
          type="button"
          onClick={handleKeepFree}
          className={cn(
            'flex items-center gap-2 p-3 rounded-neo border-3 text-start min-h-[44px] transition-colors',
            isDarkMode
              ? 'border-slate-600 bg-neo-navy-elevated hover:border-green-500'
              : 'border-gray-300 bg-white hover:border-green-500'
          )}
        >
          <Heart className="w-5 h-5 text-green-500 shrink-0" />
          <span>
            <span className={cn('block text-sm font-bold', textPrimary)}>
              {t('settings.teacherDeleteKeepFree')}
            </span>
            <span className={cn('block text-xs', textMuted)}>
              {t('settings.teacherDeleteKeepFreeHint')}
            </span>
          </span>
        </button>
      </div>

      {/* Reason picker */}
      <div>
        <p className={cn('text-xs font-bold mb-2', textSecondary)}>
          {t('settings.teacherDeleteReasonTitle')}
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('settings.teacherDeleteReasonTitle')}>
          {TEACHER_DELETE_REASONS.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={reason === r}
              onClick={() => handleReason(r)}
              className={cn(
                chipBase,
                reason === r
                  ? 'border-neo-red bg-neo-red/10 text-neo-red'
                  : isDarkMode
                    ? 'border-slate-600 text-gray-300 hover:border-slate-400'
                    : 'border-gray-300 text-gray-600 hover:border-gray-400'
              )}
            >
              {t(`settings.teacherDeleteReason.${r}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Continue to the irreversible step */}
      <button
        type="button"
        onClick={onContinueToDelete}
        className={cn(
          'flex items-center justify-center gap-1 w-full px-4 py-2 rounded-neo border-3 font-bold text-sm min-h-[44px] transition-colors',
          isDarkMode
            ? 'border-slate-600 text-gray-300 hover:border-neo-red hover:text-neo-red'
            : 'border-gray-300 text-gray-600 hover:border-neo-red hover:text-neo-red'
        )}
      >
        {t('settings.teacherDeleteContinue')}
        <ChevronDown className="w-4 h-4" />
      </button>
    </div>
  );
}
