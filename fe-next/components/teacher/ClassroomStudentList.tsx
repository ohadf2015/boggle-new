'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassroomStudents, setStudentLevel, type ClassroomStudent } from '@/lib/supabase/education';
import type { VocabularyLevel } from '@/lib/supabase/education/types';
import { LEVEL_ORDER, levelLabelKey } from '@/lib/education/differentiation';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/PageLoader';
import { Users, Mail, Calendar, SlidersHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@/components/Avatar';
import { resolveDisplayName } from '@/lib/displayName';

/** Selected-segment fill per level. Unselected segments are plain white. */
const LEVEL_SELECTED_BG: Record<VocabularyLevel, string> = {
  support: 'bg-neo-cyan',
  core: 'bg-neo-lime',
  challenge: 'bg-neo-orange',
};

interface LevelControlProps {
  value: VocabularyLevel;
  onChange: (level: VocabularyLevel) => void;
  disabled?: boolean;
  label: string;
  t: (key: string) => string;
}

/**
 * 3-way segmented control: Support / Core / Challenge.
 *
 * `aria-pressed` toggle buttons inside a labelled group (not radios) so a
 * screen reader announces "Support, toggle button, pressed" per segment and a
 * tap on a touch screen needs no drag. Each segment is ≥44px tall (touch
 * target). Order and spacing are logical (flex + gap), so it mirrors correctly
 * under `dir="rtl"` with no directional margins.
 */
function LevelControl({ value, onChange, disabled, label, t }: LevelControlProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex w-full sm:w-auto border-2 border-black rounded-neo overflow-hidden bg-white shadow-hard-sm"
    >
      {LEVEL_ORDER.map((level, i) => {
        const selected = level === value;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={selected}
            disabled={disabled}
            onClick={() => onChange(level)}
            className={cn(
              'flex-1 sm:flex-none min-h-[44px] px-3 text-xs sm:text-sm font-neo-display font-black uppercase tracking-wide text-black',
              'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-inset',
              i > 0 && 'border-s-2 border-black',
              selected ? LEVEL_SELECTED_BG[level] : 'bg-white hover:bg-neo-cream',
              disabled && 'opacity-60 cursor-wait'
            )}
          >
            {t(levelLabelKey(level))}
          </button>
        );
      })}
    </div>
  );
}

interface ClassroomStudentListProps {
  classroomId: string;
  joinCode: string;
}

export default function ClassroomStudentList({ classroomId, joinCode }: ClassroomStudentListProps) {
  const { t, language } = useLanguage();
  const isRTL = language === 'he';
  const [students, setStudents] = useState<ClassroomStudent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  /** student_id → in-flight, so the control is disabled while its own save is pending. */
  const [savingLevelFor, setSavingLevelFor] = useState<Set<string>>(() => new Set());

  // Optimistic: paint the new level immediately, persist, roll back on failure.
  // Rollback restores the level captured BEFORE the click (not "the previous state"),
  // so two rapid clicks on different students cannot cross-revert each other.
  const handleLevelChange = useCallback(async (studentId: string, next: VocabularyLevel) => {
    const current = students.find((s) => s.student_id === studentId);
    if (!current || current.level === next) return;
    const previous = current.level;

    setStudents((prev) => prev.map((s) => (s.student_id === studentId ? { ...s, level: next } : s)));
    setSavingLevelFor((prev) => new Set(prev).add(studentId));

    const { error: saveError } = await setStudentLevel(classroomId, studentId, next);

    setSavingLevelFor((prev) => {
      const copy = new Set(prev);
      copy.delete(studentId);
      return copy;
    });

    if (saveError) {
      setStudents((prev) => prev.map((s) => (s.student_id === studentId ? { ...s, level: previous } : s)));
      toast.error(t('teacher.levels.saveFailed'));
      return;
    }
    toast.success(t('teacher.levels.saved'));
  }, [classroomId, students, t]);

  useEffect(() => {
    async function fetchStudents() {
      setIsLoading(true);
      setError(null);

      const { data, error: fetchError } = await getClassroomStudents(classroomId);

      if (fetchError) {
        setError(fetchError.message);
      } else {
        setStudents(data);
      }

      setIsLoading(false);
    }

    fetchStudents();
  }, [classroomId]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <PageLoader size="sm" text={t('common.loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neo-pink border-3 border-black rounded-neo p-4 text-center shadow-hard-sm">
        <p className="text-black font-neo-body font-bold">{t('teacher.classrooms.students.error')}</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <div className="border-3 border-black rounded-neo p-8 text-center bg-neo-cream shadow-hard-sm">
        <div className="w-14 h-14 rounded-neo bg-neo-cyan border-2 border-black flex items-center justify-center mx-auto mb-3 shadow-hard-sm">
          <Users className="w-8 h-8 text-black" />
        </div>
        <p className="text-black font-neo-body font-bold mb-1">
          {t('teacher.classrooms.students.empty')}
        </p>
        <p className="text-black/60 text-sm font-bold">
          {t('teacher.classrooms.students.emptyHint', { code: joinCode })}
        </p>
      </div>
    );
  }

  // Cycle through bold accent colors for visual interest
  const accentColors = ['bg-neo-cyan', 'bg-neo-lime', 'bg-neo-pink', 'bg-neo-orange'];

  return (
    <div className="space-y-2" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Legend: what each level does. One line, wraps on narrow screens. */}
      <div className="flex items-start gap-2 px-1 text-black/70 text-xs font-bold leading-snug">
        <SlidersHorizontal className="w-4 h-4 shrink-0 mt-px" aria-hidden="true" />
        <p>{t('teacher.levels.legend')}</p>
      </div>

      {students.map((student, idx) => {
        // Handle Supabase returning profiles as array or object
        const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
        // `username` is a DB placeholder ('Player_<8hex>') for anyone who never picked a
        // handle, and it is truthy — so `username || fallback` never fired and a teacher
        // saw "Player_570b3674" for a student whose display_name said "Victoria Delong".
        const username = resolveDisplayName(
          [profile?.display_name, profile?.username],
          t('teacher.classrooms.students.unknown')
        );
        const email = profile?.email || '';
        const avatarConfig = profile?.avatar_config;
        const joinedAt = formatDistanceToNow(new Date(student.joined_at), { addSuffix: true });
        const accentBg = accentColors[idx % accentColors.length];

        return (
          <div
            key={student.id}
            data-student-row
            className="flex flex-wrap items-center gap-3 p-3 border-2 border-black rounded-neo bg-neo-cream shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all"
          >
            {/* Avatar */}
            <div className="shrink-0">
              <Avatar customAvatar={avatarConfig} userId={student.student_id || student.id} size="lg" />
            </div>

            {/* Student Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-black font-neo-display font-black text-base truncate">
                {username}
              </h4>
              {email && (
                <div className={cn('flex items-center gap-1.5 text-black/60 text-xs mt-0.5 font-bold')}>
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
              )}
            </div>

            {/* Joined badge */}
            <div className={cn('flex items-center gap-1.5 text-xs font-black px-2 py-1 rounded-neo border-2 border-black shadow-hard-sm shrink-0', accentBg)}>
              <Calendar className="w-3 h-3 text-black" />
              <span className="text-black">{joinedAt}</span>
            </div>

            {/* Differentiation level — full-width row on phones, trailing on wider screens */}
            <div className="basis-full sm:basis-auto sm:ms-auto">
              <LevelControl
                value={student.level}
                onChange={(level) => void handleLevelChange(student.student_id, level)}
                disabled={savingLevelFor.has(student.student_id)}
                label={t('teacher.levels.label')}
                t={t}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
