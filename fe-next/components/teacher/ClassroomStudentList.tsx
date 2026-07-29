'use client';

import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassroomStudents, type ClassroomStudent } from '@/lib/supabase/education';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/PageLoader';
import { Users, Mail, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Avatar from '@/components/Avatar';

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
    <div className="space-y-2">
      {students.map((student, idx) => {
        // Handle Supabase returning profiles as array or object
        const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
        const username = profile?.username || t('teacher.classrooms.students.unknown');
        const email = profile?.email || '';
        const avatarConfig = profile?.avatar_config;
        const joinedAt = formatDistanceToNow(new Date(student.joined_at), { addSuffix: true });
        const accentBg = accentColors[idx % accentColors.length];

        return (
          <div
            key={student.id}
            className="flex items-center gap-3 p-3 border-2 border-black rounded-neo bg-neo-cream shadow-hard-sm hover:-translate-y-0.5 hover:shadow-hard transition-all"
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
          </div>
        );
      })}
    </div>
  );
}
