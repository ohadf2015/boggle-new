'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentPresence {
  username: string;
  joinedAt?: number;
}

interface ClassroomWaitingRoomProps {
  /** Game code being joined */
  gameCode: string;
  /** Students who have joined (username, join time) */
  students?: StudentPresence[];
  /** Translation function */
  t: (key: string, params?: Record<string, string | number>) => string;
}

/**
 * ClassroomWaitingRoom - Display for teacher while students join
 * Shows live student count and names as they arrive, sized for projector viewing.
 * Dark background for classroom projection.
 */
export function ClassroomWaitingRoom({
  gameCode,
  students = [],
  t,
}: ClassroomWaitingRoomProps) {
  const studentCount = students.length;

  // Limit display to last 10 joined students for readability
  const displayStudents = useMemo(() => {
    return [...students]
      .sort((a, b) => (b.joinedAt ?? 0) - (a.joinedAt ?? 0))
      .slice(0, 10);
  }, [students]);

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-8 bg-neo-navy">
      <div className="flex flex-col items-center gap-6 w-full max-w-2xl">
        {/* Header - Game Code */}
        <div className="text-center">
          <p className="text-sm sm:text-base text-neo-white/60 uppercase tracking-widest mb-2">
            {t('education.classroomGame.classCode')}
          </p>
          <p className="text-5xl sm:text-6xl font-black text-neo-cyan font-mono tracking-widest">
            {gameCode}
          </p>
        </div>

        {/* Waiting Headline */}
        <div className="text-center">
          <h2 className="text-3xl sm:text-5xl font-neo-display font-black text-neo-white mb-3">
            {t('education.classroomGame.waitingForStudents')}
          </h2>
          <p className="text-lg sm:text-2xl text-neo-lime font-bold">
            {t('education.classroomGame.studentCount', { count: studentCount })}
          </p>
        </div>

        {/* Student List - Large text for projector visibility */}
        {studentCount > 0 && displayStudents.length > 0 && (
          <div className="w-full mt-4">
            <div className="bg-neo-navy-light border-3 border-neo-cyan rounded-neo p-6">
              <p className="text-neo-white/60 uppercase text-sm font-bold mb-4 tracking-widest">
                {t('education.classroomGame.joinedStudents')}
              </p>
              <div className="space-y-2">
                {displayStudents.map((student) => (
                  <div
                    key={student.username}
                    className="flex items-center gap-3 p-3 bg-neo-navy rounded-neo border border-neo-cyan/30"
                  >
                    <Users className="w-5 h-5 text-neo-cyan shrink-0" />
                    <span className="text-lg sm:text-2xl font-neo-body font-bold text-neo-white">
                      {student.username}
                    </span>
                  </div>
                ))}
              </div>
              {studentCount > displayStudents.length && (
                <p className="text-neo-white/60 text-sm mt-4 text-center">
                  +{studentCount - displayStudents.length} {t('education.classroomGame.more')}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Empty State - Just waiting */}
        {studentCount === 0 && (
          <div className="mt-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-4 border-neo-cyan/20" />
                <div
                  className="absolute inset-0 rounded-full border-4 border-neo-cyan/80 border-t-neo-cyan border-r-neo-cyan border-b-transparent border-l-transparent animate-spin"
                  aria-hidden="true"
                />
              </div>
              <p className="text-neo-white/70 text-lg sm:text-xl font-neo-body">
                {t('education.classroomGame.noStudentsYet')}
              </p>
            </div>
          </div>
        )}

        {/* Footer - Instructions */}
        <div className="mt-8 text-center">
          <p className="text-sm sm:text-base text-neo-white/50">
            {t('education.classroomGame.studentsCanScan')}
          </p>
        </div>
      </div>
    </div>
  );
}
