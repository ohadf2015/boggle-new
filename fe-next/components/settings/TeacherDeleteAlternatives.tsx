'use client';

/**
 * The three lighter exits above the type-DELETE box.
 * A stop emails (when subscribed), B free-stays-free only when billing.renews
 * is false (otherwise a billing-portal note), C delete one class only when
 * the endpoint exists.
 */
import Link from 'next/link';
import { Mail, Heart, CheckCircle, Trash2, CreditCard } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import type { DeleteImpactSummary } from '@/lib/account/deleteAccountImpact';
import {
  trackTeacherDeleteAlternativeChosen,
  type TeacherDeleteSurface,
} from '@/lib/education/teacherDeleteTelemetry';

interface TeacherDeleteAlternativesProps {
  impact: DeleteImpactSummary;
  surface: TeacherDeleteSurface;
  isDarkMode: boolean;
  unsubscribeState: 'idle' | 'working' | 'done' | 'error';
  onStopEmails: () => void;
  onKeepAccount: () => void;
}

const cardClass = (isDarkMode: boolean, hover: string) =>
  cn(
    'flex items-center gap-2 p-3 rounded-neo border-3 text-start min-h-[44px] transition-colors',
    isDarkMode
      ? `border-slate-600 bg-neo-navy-elevated ${hover}`
      : `border-gray-300 bg-white ${hover}`
  );

export default function TeacherDeleteAlternatives({
  impact,
  surface,
  isDarkMode,
  unsubscribeState,
  onStopEmails,
  onKeepAccount,
}: TeacherDeleteAlternativesProps) {
  const { t, language } = useLanguage();
  const textPrimary = isDarkMode ? 'text-white' : 'text-neo-black';
  const textMuted = isDarkMode ? 'text-gray-400' : 'text-gray-600';
  const oneClass = impact.classrooms.length === 1;
  const className = impact.classrooms[0]?.name || t('settings.teacherDeleteUnnamedClass');
  const showKeepFree = impact.billing?.renews === false;
  const showProNote = impact.billing?.renews === true;
  const showDeleteClass = impact.perClassDeleteAvailable === true && impact.classrooms.length >= 1;
  const deleteHref = oneClass
    ? `/${language}/teacher/classroom/${impact.classrooms[0].id}`
    : `/${language}/teacher/classroom`;
  const portalHref = impact.billing?.portalUrl || `/${language}/teacher/upgrade`;

  const handleKeepFree = () => {
    trackTeacherDeleteAlternativeChosen('keep_free_account', impact, surface);
    onKeepAccount();
  };

  const titleKey = oneClass ? 'settings.teacherDeleteOneClass.oneClass' : 'settings.teacherDeleteOneClass.other';
  const hintKey = oneClass ? 'settings.teacherDeleteOneClassHint.oneClass' : 'settings.teacherDeleteOneClassHint.other';

  return (
    <div className="space-y-2">
      <p className={cn('text-xs font-bold uppercase', textMuted)}>
        {t('settings.teacherDeleteAlternativesTitle')}
      </p>
      <div className="grid gap-2 sm:grid-cols-3">
        {impact.emailSubscribed && unsubscribeState !== 'done' ? (
          <button
            type="button"
            onClick={onStopEmails}
            disabled={unsubscribeState === 'working'}
            className={cardClass(isDarkMode, 'hover:border-neo-cyan')}
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

        {showKeepFree ? (
          <button type="button" onClick={handleKeepFree} className={cardClass(isDarkMode, 'hover:border-green-500')}>
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
        ) : null}

        {showProNote ? (
          <div className={cn(cardClass(isDarkMode, ''), 'cursor-default')} data-testid="teacher-delete-pro-note">
            <CreditCard className="w-5 h-5 text-amber-500 shrink-0" />
            <span>
              <span className={cn('block text-xs', textMuted)}>
                {t('settings.teacherDeleteProActiveNote')}
              </span>
              <a
                href={portalHref}
                className={cn('block text-sm font-bold underline min-h-[44px] inline-flex items-center', textPrimary)}
              >
                {t('settings.teacherDeleteProActiveLink')}
              </a>
            </span>
          </div>
        ) : null}

        {showDeleteClass ? (
          <Link
            href={deleteHref}
            onClick={() => trackTeacherDeleteAlternativeChosen('delete_one_class', impact, surface)}
            className={cardClass(isDarkMode, 'hover:border-neo-red')}
            data-testid="teacher-delete-one-class"
          >
            <Trash2 className="w-5 h-5 text-neo-red shrink-0" />
            <span>
              <span className={cn('block text-sm font-bold', textPrimary)}>{t(titleKey)}</span>
              <span className={cn('block text-xs', textMuted)}>
                {t(hintKey).replace('{name}', className)}
              </span>
            </span>
          </Link>
        ) : null}
      </div>
      {unsubscribeState === 'error' ? (
        <a
          href={`/${language}/unsubscribe`}
          className={cn('inline-flex items-center min-h-[44px] text-xs font-bold underline', textMuted)}
        >
          {t('settings.teacherDeleteStopEmailsFallbackLink')}
        </a>
      ) : null}
    </div>
  );
}
