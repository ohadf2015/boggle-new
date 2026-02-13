'use client';

/**
 * Duels Page Client Component
 *
 * Main page for async duels with lobby and history tabs.
 * Students can see pending challenges, available opponents, and duel history.
 *
 * Features:
 * - Tab navigation (Lobby | History)
 * - DuelNotification for persistent challenge alerts
 * - Classroom membership check
 * - Neo-brutalist tab design
 */

import { useState, useEffect } from 'react';
import { Swords, Trophy } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Loader } from '@/components/ui/Loader';
import DuelLobby from '@/components/education/duels/DuelLobby';
import { DuelHistory } from '@/components/education/duels/DuelHistory';
import DuelNotification from '@/components/education/duels/DuelNotification';

// ============================================
// TYPE DEFINITIONS
// ============================================

type TabType = 'lobby' | 'history';

interface ClassroomData {
  id: string;
  name: string;
}

interface LessonData {
  id: string;
  name: string;
}

// ============================================
// COMPONENT
// ============================================

export default function DuelsPageClient() {
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();

  // State
  const [activeTab, setActiveTab] = useState<TabType>('lobby');
  const [classroom, setClassroom] = useState<ClassroomData | null>(null);
  const [lessons, setLessons] = useState<LessonData[]>([]);
  const [loading, setLoading] = useState(true);

  // ============================================
  // EFFECTS
  // ============================================

  // Fetch classroom and lessons on mount
  useEffect(() => {
    async function fetchData() {
      if (!user) {
        setLoading(false);
        return;
      }

      // TODO: Replace with actual classroom fetch
      // For now, mock data for development
      setClassroom({ id: 'mock-classroom-id', name: 'Mock Classroom' });
      setLessons([
        { id: 'lesson-1', name: 'Lesson 1' },
        { id: 'lesson-2', name: 'Lesson 2' },
      ]);

      setLoading(false);
    }

    fetchData();
  }, [user]);

  // ============================================
  // RENDER HELPERS
  // ============================================

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neo-navy">
        <Loader size="lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neo-navy text-center p-8">
        <p className="text-neo-white text-xl">{t('joinClassroomToDuel')}</p>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neo-navy text-center p-8">
        <Swords className="w-16 h-16 text-neo-white/30 mb-4" />
        <h2 className="text-2xl font-neo-display font-bold text-neo-white mb-2">
          {t('joinClassroomToDuel')}
        </h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neo-navy">
      {/* Header */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-3 mb-6">
          <Swords className="w-10 h-10 text-neo-yellow" />
          <h1 className="text-3xl font-neo-display font-black text-neo-white">
            {t('duels')}
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b-3 border-neo-black mb-6">
          <button
            onClick={() => setActiveTab('lobby')}
            className={cn(
              'pb-3 px-4 font-neo-body font-bold text-lg transition-all',
              activeTab === 'lobby'
                ? 'text-neo-yellow border-b-4 border-neo-yellow'
                : 'text-neo-white/50 hover:text-neo-white'
            )}
          >
            <Swords className="w-5 h-5 inline mr-2" />
            {t('lobby')}
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={cn(
              'pb-3 px-4 font-neo-body font-bold text-lg transition-all',
              activeTab === 'history'
                ? 'text-neo-yellow border-b-4 border-neo-yellow'
                : 'text-neo-white/50 hover:text-neo-white'
            )}
          >
            <Trophy className="w-5 h-5 inline mr-2" />
            {t('history')}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'lobby' && (
          <DuelLobby
            classroomId={classroom.id}
            studentId={user.id}
            lessons={lessons}
          />
        )}

        {activeTab === 'history' && <DuelHistory studentId={user.id} />}
      </div>

      {/* Persistent challenge notifications */}
      <DuelNotification />
    </div>
  );
}
