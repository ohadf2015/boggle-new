'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import { getClassroomStudents, type ClassroomStudent } from '@/lib/supabase/teacher';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { NeoLoader } from '@/components/ui/NeoLoader';
import { Users, Mail, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
        <NeoLoader variant="mascot-letters" size="sm" text={t('common.loading')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-neo-pink/20 border-2 border-neo-pink rounded-neo p-4 text-center">
        <p className="text-neo-white font-neo-body">{t('teacher.classrooms.students.error')}</p>
      </div>
    );
  }

  if (students.length === 0) {
    return (
      <Card className="border-neo border-neo-black shadow-hard bg-neo-navy/50">
        <CardContent className="py-8 text-center">
          <Users className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <p className="text-neo-white font-neo-body mb-1">
            {t('teacher.classrooms.students.empty')}
          </p>
          <p className="text-slate-400 text-sm">
            {t('teacher.classrooms.students.emptyHint').replace('{{code}}', joinCode)}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {students.map((student) => {
        // Handle Supabase returning profiles as array or object
        const profile = Array.isArray(student.profiles) ? student.profiles[0] : student.profiles;
        const username = profile?.username || t('teacher.classrooms.students.unknown');
        const email = profile?.email || '';
        const avatarUrl = profile?.avatar_url;
        const joinedAt = formatDistanceToNow(new Date(student.joined_at), { addSuffix: true });

        return (
          <Card
            key={student.id}
            className="border-neo border-neo-black shadow-hard-sm bg-neo-navy/80 hover:shadow-hard transition-all"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {avatarUrl ? (
                    <Image
                      src={avatarUrl}
                      alt={username}
                      width={48}
                      height={48}
                      className="w-12 h-12 rounded-full border-2 border-neo-cyan object-cover"
                      unoptimized
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-neo-cyan/20 border-2 border-neo-cyan flex items-center justify-center">
                      <span className="text-neo-cyan font-neo-display text-xl">
                        {username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                </div>

                {/* Student Info */}
                <div className="flex-1 min-w-0">
                  <h4 className="text-neo-white font-neo-display text-lg truncate">
                    {username}
                  </h4>
                  {email && (
                    <div className={cn('flex items-center gap-2 text-slate-400 text-sm mt-1')}>
                      <Mail className="w-4 h-4 flex-shrink-0" />
                      <span className="truncate">{email}</span>
                    </div>
                  )}
                  <div className={cn('flex items-center gap-2 text-slate-400 text-sm mt-1')}>
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span>{joinedAt}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
