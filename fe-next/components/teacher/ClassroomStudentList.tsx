'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassroomStudents, setStudentLevel, type ClassroomStudent } from '@/lib/supabase/education';
import type { VocabularyLevel } from '@/lib/supabase/education/types';
import { LEVEL_ORDER, levelLabelKey } from '@/lib/education/differentiation';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/PageLoader';
import { Mail, Calendar, SlidersHorizontal, ChevronDown } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { resolveDisplayName } from '@/lib/displayName';
import { InviteStudentsCta } from '@/components/teacher/classroom/InviteStudentsCta';
import { RosterRemoveButton } from '@/components/teacher/classroom/RosterRemoveButton';
import { lastPlayedLabel } from '@/components/teacher/home/HomeClassList';

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
      className="flex w-full border-2 border-black rounded-neo overflow-hidden bg-white shadow-hard-sm"
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
              'flex-1 min-w-0 min-h-[44px] px-2 truncate text-xs font-neo-display font-black uppercase tracking-wide text-black',
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
  const [nowMs] = useState(() => Date.now());
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

  const handleRemoved = useCallback((studentId: string) => {
    setStudents((prev) => prev.filter((s) => s.student_id !== studentId));
  }, []);

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
      <InviteStudentsCta
        classroomId={classroomId}
        joinCode={joinCode}
        studentCount={0}
      />
    );
  }

  return (
    <div className="space-y-2" dir={isRTL ? 'rtl' : 'ltr'}>
      <details className="group px-1 text-neo-cream/75 text-xs font-bold leading-snug">
        <summary className="inline-flex min-h-8 cursor-pointer list-none items-center gap-1.5 text-neo-cream hover:text-neo-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan rounded-sm">
          <SlidersHorizontal className="w-4 h-4 shrink-0" aria-hidden="true" />
          {t('teacher.levels.label')}
          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <p className="mt-1">{t('teacher.levels.legend')}</p>
      </details>

      {students.map((student) => {
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
        const joinedAt = lastPlayedLabel(student.joined_at, language, nowMs);

        return (
          <div
            key={student.id}
            data-student-row
            className="flex flex-wrap items-center gap-x-3 gap-y-2 p-3 border-2 border-black rounded-neo bg-neo-cream shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition"
          >
            {/* Avatar */}
            <div className="shrink-0">
              <Avatar customAvatar={avatarConfig} userId={student.student_id || student.id} size="lg" />
            </div>

            <div data-testid="roster-identity" className="flex-1 min-w-0">
              <h4 title={username} className="text-black font-neo-display font-black text-base truncate">
                {username}
              </h4>
              <p data-testid="roster-joined" className="flex items-center gap-1 text-black/60 text-xs mt-0.5 font-bold">
                <Calendar className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span className="truncate">{joinedAt}</span>
              </p>
              {email && (
                <div className="flex items-center gap-1.5 text-black/60 text-xs mt-0.5 font-bold">
                  <Mail className="w-3 h-3 shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
              )}
            </div>

            <RosterRemoveButton
              classroomId={classroomId}
              studentId={student.student_id}
              name={username}
              onRemoved={handleRemoved}
            />

            <div className="basis-full">
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
