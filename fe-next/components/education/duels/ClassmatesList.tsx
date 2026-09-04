'use client';

/**
 * ClassmatesList - Reusable Classmates List with Challenge Buttons
 *
 * Displays a list of classroom members with challenge icons.
 * Filters out the current user and supports limiting the number of items shown.
 *
 * Features:
 * - Displays avatar emoji + username per classmate
 * - ChallengeButton (icon variant) for each classmate
 * - Filters out current user
 * - Supports maxItems prop for limiting display
 * - Empty state when no classmates
 * - Neo-brutalist styling
 */

import { useLanguage } from '@/contexts/LanguageContext';
import { ChallengeButton } from './ChallengeButton';
import Avatar from '@/components/Avatar';
import type { ClassroomStudent } from '@/lib/supabase/education';
import { resolveDisplayName } from '@/lib/displayName';

// ============================================
// TYPE DEFINITIONS
// ============================================

interface ClassmatesListProps {
  /** List of classroom students */
  classmates: ClassroomStudent[];
  /** Classroom ID for challenge context */
  classroomId: string;
  /** Available lessons for duel challenges */
  lessons: Array<{ id: string; name: string }>;
  /** Current user ID to filter out from list */
  currentUserId: string;
  /** Maximum number of classmates to display (optional) */
  maxItems?: number;
}

// ============================================
// COMPONENT
// ============================================

export function ClassmatesList({
  classmates,
  classroomId,
  lessons,
  currentUserId,
  maxItems,
}: ClassmatesListProps) {
  const { t } = useLanguage();

  // Filter out current user
  const filteredClassmates = classmates.filter(
    (classmate) => classmate.student_id !== currentUserId
  );

  // Apply maxItems limit if provided
  const displayClassmates = maxItems
    ? filteredClassmates.slice(0, maxItems)
    : filteredClassmates;

  // Empty state
  if (displayClassmates.length === 0) {
    return (
      <div className="p-6 text-center text-neo-white">
        {t('noClassmatesFound')}
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="border-2 border-neo-black rounded-neo bg-neo-navy/30 p-3 space-y-2">
      {displayClassmates.map((classmate) => {
        // Extract profile data (Supabase returns array, normalize)
        const profile = Array.isArray(classmate.profiles)
          ? classmate.profiles[0]
          : classmate.profiles;

        // Same roster source as the teacher's list — and the same placeholder problem:
        // a classmate showed up as 'Player_<hex>' rather than by name.
        const displayName = resolveDisplayName(
          [profile?.display_name, profile?.username],
          t('common.unknown')
        );
        return (
          <div
            key={classmate.id}
            className="flex items-center justify-between p-3 rounded-neo bg-neo-navy/50 border-2 border-neo-black/30"
          >
            {/* Avatar + Name */}
            <div className="flex items-center gap-3">
              <Avatar customAvatar={profile?.avatar_config} userId={classmate.student_id} size="md" />
              <div className="font-neo-body font-bold text-neo-white">
                {displayName}
              </div>
            </div>

            {/* Challenge Button */}
            <ChallengeButton
              opponentId={classmate.student_id}
              opponentName={displayName}
              opponentAvatar={null}
              classroomId={classroomId}
              lessons={lessons}
              variant="icon"
            />
          </div>
        );
      })}
    </div>
  );
}
