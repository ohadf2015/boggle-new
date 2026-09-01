'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Swords, Trophy, Users } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DuelLobby, DuelHistory, DuelNotification } from '@/components/education/duels';
import { ClassmatesList } from '@/components/education/duels/ClassmatesList';
import { TopBackLink } from '@/components/navigation/TopBackLink';
import { getStudentClassroom, getLessons, getClassroomStudents, type Classroom, type VocabularyLesson, type ClassroomStudent } from '@/lib/supabase/education';
import { PageLoader } from '@/components/ui/PageLoader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

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
      try {
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
      } catch (error) {
        console.error('[DuelsPageClient] Failed to load data:', error);
        // Leave classroom null so empty state renders
      } finally {
        setLoading(false);
      }
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
      <TopBackLink className="mb-4" />
      <DuelNotification classroomId={classroom.id} />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList variant="underline" className="mb-6 h-auto gap-1 bg-transparent p-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                variant="underline"
                activeColor="lime"
                className="gap-2 px-6 py-3 font-bold normal-case"
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="lobby">
          <DuelLobby
            classroomId={classroom.id}
            studentId={user.id}
            lessons={lessonOptions}
          />
        </TabsContent>
        <TabsContent value="history">
          <DuelHistory studentId={user.id} />
        </TabsContent>
        <TabsContent value="classmates">
          <ClassmatesList
            classmates={classmates}
            classroomId={classroom.id}
            lessons={lessonOptions}
            currentUserId={user.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function DuelsPage() {
  // Students (including anonymous guests after classroom join) must reach the
  // lobby. A teacher-only gate redirected them to /education/access.
  return <DuelsPageClientInner />;
}
