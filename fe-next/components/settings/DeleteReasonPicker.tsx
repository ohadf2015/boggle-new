'use client';

/**
 * Optional one-tap reason chips shared by the teacher interstitial and the
 * player confirm. Never blocks deletion. isTeacher splits the funnel.
 */
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import { TEACHER_DELETE_REASONS, type TeacherDeleteReason } from '@/lib/account/deleteAccountImpact';
import {
  trackTeacherDeleteReasonSelected,
  type TeacherDeleteSurface,
} from '@/lib/education/teacherDeleteTelemetry';

interface DeleteReasonPickerProps {
  reason: TeacherDeleteReason | null;
  onReasonChange: (reason: TeacherDeleteReason) => void;
  isDarkMode: boolean;
  surface: TeacherDeleteSurface;
  isTeacher: boolean;
}

export default function DeleteReasonPicker({
  reason,
  onReasonChange,
  isDarkMode,
  surface,
  isTeacher,
}: DeleteReasonPickerProps) {
  const { t } = useLanguage();
  const textSecondary = isDarkMode ? 'text-gray-300' : 'text-gray-700';
  const chipBase = 'px-3 py-2 rounded-neo border-2 text-xs font-bold min-h-[44px] transition-colors';

  const handleReason = (r: TeacherDeleteReason) => {
    onReasonChange(r);
    trackTeacherDeleteReasonSelected(r, surface, isTeacher);
  };

  return (
    <div data-testid="delete-reason-picker">
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
  );
}
