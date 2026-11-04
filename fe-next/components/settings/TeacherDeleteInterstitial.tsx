'use client';

/**
 * Teacher-aware delete interstitial.
 *
 * Shown instead of the bare type-DELETE form when the account owns classrooms:
 * roster/class impact (and their reports), lighter exits, and an optional
 * reason picker. "Keep free" or a successful unsubscribe keeps the account;
 * "continue" reveals the irreversible form. The reason never blocks that.
 */
import { useEffect, useRef, useState } from 'react';
import { GraduationCap, ChevronDown } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { fetchWithAuth } from '@/utils/authFetch';
import { cn } from '@/lib/utils';
import {
  formatTeacherDeleteImpactSummary,
  type DeleteImpactSummary,
  type TeacherDeleteReason,
} from '@/lib/account/deleteAccountImpact';
import {
  trackTeacherDeleteAlternativeChosen,
  trackTeacherDeleteViewed,
  type TeacherDeleteSurface,
} from '@/lib/education/teacherDeleteTelemetry';
import DeleteReasonPicker from './DeleteReasonPicker';
import TeacherDeleteAlternatives from './TeacherDeleteAlternatives';

interface TeacherDeleteInterstitialProps {
  impact: DeleteImpactSummary;
  surface: TeacherDeleteSurface;
  isDarkMode: boolean;
  /** Selected reason, lifted so the parent can attach it to the DELETE body. */
  reason: TeacherDeleteReason | null;
  onReasonChange: (reason: TeacherDeleteReason) => void;
  /** "The free plan stays free" — parent closes the confirm UI entirely. */
  onKeepAccount: () => void;
  /** Reveal the irreversible type-DELETE form. */
  onContinueToDelete: () => void;
}

function noun(t: (key: string) => string, kind: 'class' | 'student' | 'round', n: number): string {
  return t(`settings.teacherDeleteNoun.${kind}.${n === 1 ? 'one' : 'other'}`);
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

  const classes = impact.classrooms.length;
  const students = impact.totalStudents;
  const rounds = impact.roundsPlayed;
  const summary = formatTeacherDeleteImpactSummary(
    t('settings.teacherDeleteImpactSummaryV2'),
    { classes, students, rounds },
    {
      classNoun: noun(t, 'class', classes),
      studentNoun: noun(t, 'student', students),
      roundNoun: noun(t, 'round', rounds),
    },
  );

  const textPrimary = isDarkMode ? 'text-white' : 'text-neo-black';
  const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-700';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-600';

  return (
    <div className="space-y-4" data-testid="teacher-delete-interstitial">
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
            <p className={cn('text-xs', textSecondary)} data-testid="teacher-delete-impact-summary">
              {summary}
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

      <TeacherDeleteAlternatives
        impact={impact}
        surface={surface}
        isDarkMode={isDarkMode}
        unsubscribeState={unsubscribeState}
        onStopEmails={handleStopEmails}
        onKeepAccount={onKeepAccount}
      />

      <DeleteReasonPicker
        reason={reason}
        onReasonChange={onReasonChange}
        isDarkMode={isDarkMode}
        surface={surface}
        isTeacher
      />

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
