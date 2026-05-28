'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Swords, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DuelLobby, DuelHistory, DuelNotification } from '@/components/education/duels';
import { ClassmatesList } from '@/components/education/duels/ClassmatesList';
import { getStudentClassroom, getLessons, getClassroomStudents, type Classroom, type VocabularyLesson, type ClassroomStudent } from '@/lib/supabase/education';
import { cn } from '@/lib/utils';
import { PageLoader } from '@/components/ui/PageLoader';

type Tab = 'lobby' | 'history' | 'classmates';

function DuelsPageClientInner() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('lobby');
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [lessons, setLessons] = useState<VocabularyLesson[]>([]);
  const [classmates, setClassmates] = useState<ClassroomStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      router.push(`/${language}/education`);
      return;
    }

    async function loadData() {
      setLoading(true);
      const [classroomRes, lessonsRes] = await Promise.all([
        getStudentClassroom(user!.id),
        getLessons(user!.id),
      ]);
      if (classroomRes.data) {
        setClassroom(classroomRes.data);
        // Fetch classmates when classroom is available
        const studentsRes = await getClassroomStudents(classroomRes.data.id);
        if (studentsRes.data) setClassmates(studentsRes.data);
      }
      if (lessonsRes.data) setLessons(lessonsRes.data);
      setLoading(false);
    }
    loadData();
  }, [user, router, language]);

  if (!user) return null;

  if (loading) {
    return <PageLoader text={t('education.duels.findingClassmates')} size="lg" nested mascotVariant="knight" />;
  }

  if (!classroom) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neo-navy min-h-dvh p-8">
        <Swords className="w-16 h-16 text-neo-white mb-4" />
        <p className="text-neo-white font-neo-body text-lg text-center">
          {t('education.duels.joinClassroomToDuel')}
        </p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Swords }[] = [
    { id: 'lobby', label: t('education.duels.lobby'), icon: Swords },
    { id: 'history', label: t('education.duels.history'), icon: Trophy },
    { id: 'classmates', label: t('education.duels.classmates'), icon: Users },
  ];

  const lessonOptions = lessons.map((l) => ({ id: l.id, name: l.name }));

  return (
    <div className="min-h-dvh bg-neo-navy p-4 sm:p-6">
      <DuelNotification classroomId={classroom.id} />

      <div className="flex gap-1 mb-6 border-b-2 border-neo-white/10" role="tablist">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              aria-controls={`tabpanel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 font-bold transition-all',
                activeTab === tab.id
                  ? 'text-neo-lime border-b-4 border-neo-lime -mb-[2px]'
                  : 'text-neo-white hover:text-neo-white'
              )}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'lobby' && (
        <div role="tabpanel" id="tabpanel-lobby" aria-labelledby="tab-lobby">
          <DuelLobby
            classroomId={classroom.id}
            studentId={user.id}
            lessons={lessonOptions}
          />
        </div>
      )}
      {activeTab === 'history' && (
        <div role="tabpanel" id="tabpanel-history" aria-labelledby="tab-history">
          <DuelHistory studentId={user.id} />
        </div>
      )}
      {activeTab === 'classmates' && (
        <div role="tabpanel" id="tabpanel-classmates" aria-labelledby="tab-classmates">
          <ClassmatesList
            classmates={classmates}
            classroomId={classroom.id}
            lessons={lessonOptions}
            currentUserId={user.id}
          />
        </div>
      )}
    </div>
  );
}

import { TeacherGate } from '@/components/education/TeacherGate';

export default function DuelsPage() {
  return <TeacherGate><DuelsPageClientInner /></TeacherGate>;
}
