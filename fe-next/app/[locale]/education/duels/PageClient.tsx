'use client';

import { useState, useEffect } from 'react';
import { Swords, Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { DuelLobby, DuelHistory, DuelNotification } from '@/components/education/duels';
import { getStudentClassroom, getLessons } from '@/lib/supabase/education';
import { cn } from '@/lib/utils';
import type { Classroom, VocabularyLesson } from '@/lib/supabase/education';

type Tab = 'lobby' | 'history';

export default function DuelsPageClient() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<Tab>('lobby');
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [lessons, setLessons] = useState<VocabularyLesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setLoading(true);
      const [classroomRes, lessonsRes] = await Promise.all([
        getStudentClassroom(user!.id),
        getLessons(user!.id),
      ]);
      if (classroomRes.data) setClassroom(classroomRes.data);
      if (lessonsRes.data) setLessons(lessonsRes.data);
      setLoading(false);
    }
    loadData();
  }, [user]);

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-neo-navy min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neo-cyan" />
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-neo-navy min-h-screen p-8">
        <Swords className="w-16 h-16 text-neo-white/30 mb-4" />
        <p className="text-neo-white/70 font-neo-body text-lg text-center">
          {t('joinClassroomToDuel')}
        </p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Swords }[] = [
    { id: 'lobby', label: t('lobby'), icon: Swords },
    { id: 'history', label: t('history'), icon: Trophy },
  ];

  const lessonOptions = lessons.map((l) => ({ id: l.id, name: l.name }));

  return (
    <div className="min-h-screen bg-neo-navy p-4 sm:p-6">
      <DuelNotification classroomId={classroom.id} />

      <div className="flex gap-1 mb-6 border-b-2 border-neo-white/10">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 px-6 py-3 font-bold transition-all',
                activeTab === tab.id
                  ? 'text-neo-yellow border-b-4 border-neo-yellow -mb-[2px]'
                  : 'text-neo-white/50 hover:text-neo-white/80'
              )}
            >
              <Icon className="w-5 h-5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'lobby' && (
        <DuelLobby
          classroomId={classroom.id}
          studentId={user.id}
          lessons={lessonOptions}
        />
      )}
      {activeTab === 'history' && <DuelHistory studentId={user.id} />}
    </div>
  );
}
