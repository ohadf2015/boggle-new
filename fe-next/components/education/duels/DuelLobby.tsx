'use client';

/**
 * DuelLobby - Async Duel Lobby Component
 *
 * Displays pending challenges and available opponents.
 * Students can accept/decline challenges or create new ones.
 *
 * Features:
 * - Pending challenges list with Accept/Decline actions
 * - Available opponents grid from lobby presence
 * - Quick Match button for random opponent
 * - Challenge modal integration
 * - Neo-brutalist design
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDuelSocket, type OpponentInfo } from '@/hooks/useDuelSocket';
import { getPendingDuelsForStudent, type DuelRow } from '@/lib/supabase/education/duels';
import { cn } from '@/lib/utils';
import { Users, Swords } from 'lucide-react';
import dynamic from 'next/dynamic';

// Opens only when a student picks an opponent, so it stays out of the lobby's
// first load. No SSR needed for a modal that starts closed.
const DuelChallengeModal = dynamic(() => import('./DuelChallengeModal'), { ssr: false });

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface DuelLobbyProps {
  /** Classroom ID */
  classroomId: string;
  /** Current student ID */
  studentId: string;
  /** Available lessons for challenges */
  lessons: Array<{ id: string; name: string }>;
  /** Callback to switch to another tab (e.g. 'classmates') */
  onTabChange?: (tab: string) => void;
}

// ============================================
// COMPONENT
// ============================================

export default function DuelLobby({ classroomId, studentId, lessons, onTabChange }: DuelLobbyProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const {
    joinLobby,
    leaveLobby,
    acceptChallenge,
    declineChallenge,
    onLobbyUpdate,
    onChallengeReceived,
  } = useDuelSocket();

  // State
  const [opponents, setOpponents] = useState<OpponentInfo[]>([]);
  const [pendingChallenges, setPendingChallenges] = useState<DuelRow[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial pending challenges
  useEffect(() => {
    const fetchPendingChallenges = async () => {
      setIsLoading(true);
      try {
        const { data } = await getPendingDuelsForStudent(studentId);
        if (data) {
          setPendingChallenges(data);
        }
      } catch (error) {
        console.error('[DuelLobby] Failed to fetch pending challenges:', error);
        // Leave pendingChallenges empty so empty state renders
      } finally {
        setIsLoading(false);
      }
    };

    fetchPendingChallenges();
  }, [studentId]);

  // Refetch pending challenges when socket notifies
  const fetchPendingChallenges = useCallback(async () => {
    const { data } = await getPendingDuelsForStudent(studentId);
    if (data) {
      setPendingChallenges(data);
    }
  }, [studentId]);

  // Join/leave lobby on mount/unmount
  useEffect(() => {
    joinLobby(classroomId);

    return () => {
      leaveLobby(classroomId);
    };
  }, [classroomId, joinLobby, leaveLobby]);

  // Listen for lobby updates
  useEffect(() => {
    const cleanup = onLobbyUpdate((data) => {
      setOpponents(data.availableOpponents);
    });

    return cleanup;
  }, [onLobbyUpdate]);

  // Listen for challenge received events
  useEffect(() => {
    const cleanup = onChallengeReceived((data) => {
      // Add to pending challenges (will be fetched from DB in real flow)
      fetchPendingChallenges();
    });

    return cleanup;
  }, [onChallengeReceived, fetchPendingChallenges]);

  // Handle accept challenge
  const handleAccept = useCallback(
    (duelId: string) => {
      acceptChallenge(duelId);
      // Remove from local pending list
      setPendingChallenges((prev) => prev.filter((c) => c.id !== duelId));
      // U3 fix: Navigate to the duel game page after accepting
      router.push(`/${language}/education/duels/${duelId}`);
    },
    [acceptChallenge, router, language]
  );

  // Handle decline challenge
  const handleDecline = useCallback(
    (duelId: string) => {
      declineChallenge(duelId);
      // Remove from local pending list
      setPendingChallenges((prev) => prev.filter((c) => c.id !== duelId));
    },
    [declineChallenge]
  );

  // Handle quick match
  const handleQuickMatch = useCallback(() => {
    if (opponents.length === 0) return;

    // Pick random opponent
    const randomIndex = Math.floor(Math.random() * opponents.length);
    setSelectedOpponent(opponents[randomIndex]);
  }, [opponents]);

  // Handle opponent selection
  const handleSelectOpponent = useCallback((opponent: OpponentInfo) => {
    setSelectedOpponent(opponent);
  }, []);

  return (
    <div
      data-testid="duel-lobby-container"
      className={cn(
        'p-6 rounded-neo border-3 border-neo-black',
        'bg-neo-navy shadow-hard-sm'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-neo bg-neo-pink border-3 border-black flex items-center justify-center shadow-hard-sm">
          <Swords className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-2xl font-neo-display font-black text-neo-white uppercase tracking-tight italic">
          {t('duelLobbyTitle')}
        </h2>
        <span className="px-3 py-1 border-3 border-black text-[10px] font-black rounded-neo shadow-hard-sm uppercase tracking-widest bg-neo-pink text-white">
          {t('education.duels.pvp')}
        </span>
      </div>

      {/* Pending Challenges Section */}
      <section className="mb-8">
        <h3 className="text-lg font-neo-display font-black text-neo-lime uppercase tracking-wide mb-4">
          {t('pendingChallenges')}
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neo-cyan"></div>
          </div>
        ) : pendingChallenges.length === 0 ? (
          <p className="text-neo-white text-center py-4">{t('noPendingChallenges')}</p>
        ) : (
          <div className="space-y-3">
            {pendingChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className={cn(
                  'p-4 rounded-neo border-3 border-black',
                  'bg-neo-cream shadow-hard-sm',
                  'flex items-center justify-between gap-4'
                )}
              >
                <div className="flex-1">
                  <p className="text-black font-neo-body font-black">
                    {t('challengeFrom', { name: challenge.challenger_id })}
                  </p>
                  <p className="text-black/60 text-sm font-bold">
                    {lessons.find((l) => l.id === challenge.lesson_id)?.name || t('education.duels.unknownLesson')}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleAccept(challenge.id)}
                    className={cn(
                      'px-4 py-2 font-black rounded-neo',
                      'bg-neo-cyan text-black',
                      'border-3 border-black shadow-hard-sm',
                      'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
                      'transition-all duration-100',
                      'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
                    )}
                  >
                    {t('accept')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDecline(challenge.id)}
                    className={cn(
                      'px-4 py-2 font-black rounded-neo',
                      'bg-neo-pink text-white',
                      'border-3 border-black shadow-hard-sm',
                      'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
                      'transition-all duration-100',
                      'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-lime'
                    )}
                  >
                    {t('decline')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Match Button */}
      <div className="mb-6">
        <button
          type="button"
          onClick={handleQuickMatch}
          disabled={opponents.length === 0}
          className={cn(
            'w-full px-6 py-4 font-black text-lg rounded-neo font-neo-display uppercase tracking-tight',
            'bg-neo-lime text-black',
            'border-3 border-black shadow-hard',
            'hover:-translate-y-1 hover:shadow-hard-lg active:translate-y-0.5 active:shadow-hard-pressed',
            'animate-neo-press transition-all duration-100',
            'disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-hard',
            'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan'
          )}
        >
          <Swords className="w-6 h-6 inline me-2" aria-hidden="true" />
          {t('quickMatch')}
        </button>
      </div>

      {/* Available Opponents Section */}
      <section>
        <h3 className="text-lg font-neo-display font-black text-neo-cyan uppercase tracking-wide mb-4">
          {t('availableOpponents')}
        </h3>

        {opponents.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-10 h-10 mx-auto mb-3 text-neo-white" />
            <p className="text-neo-white mb-3">{t('education.duels.noClassmatesOnline')}</p>
            {onTabChange && (
              <button
                type="button"
                onClick={() => onTabChange('classmates')}
                className={cn(
                  'px-4 py-2 font-black rounded-neo',
                  'bg-neo-pink text-white',
                  'border-3 border-black shadow-hard-sm',
                  'hover:-translate-y-0.5 hover:shadow-hard active:translate-y-0.5 active:shadow-hard-pressed',
                  'transition-all duration-100',
                  'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan'
                )}
              >
                {t('education.duels.challengeSomeone')}
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {opponents.map((opponent) => (
              <button
                type="button"
                key={opponent.userId}
                onClick={() => handleSelectOpponent(opponent)}
                className={cn(
                  'p-4 rounded-neo border-3 border-black',
                  'bg-neo-cream shadow-hard-sm',
                  'hover:-translate-y-1 hover:shadow-hard',
                  'active:translate-y-0.5 active:shadow-hard-pressed',
                  'transition-all duration-100 cursor-pointer',
                  'flex flex-col items-center gap-2',
                  'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan'
                )}
              >
                {/* Avatar placeholder */}
                <div className="w-12 h-12 rounded-neo bg-neo-cyan border-3 border-black flex items-center justify-center relative shadow-hard-sm">
                  <span className="text-black font-black text-xl font-neo-display">
                    {(opponent.displayName ?? '?').charAt(0).toUpperCase()}
                  </span>
                  {/* Online indicator — neo-cyan glow */}
                  <div className="absolute -top-1.5 -inset-e-1.5 w-4 h-4 rounded-full bg-neo-cyan border-3 border-black shadow-[0_0_8px_var(--color-neo-cyan)]" aria-label={t('education.duels.online')} role="status" />
                </div>

                {/* Name */}
                <span className="text-black font-neo-body font-bold text-sm text-center">
                  {opponent.displayName ?? '?'}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* Challenge Modal */}
      {selectedOpponent && (
        <DuelChallengeModal
          opponent={selectedOpponent}
          lessons={lessons}
          classroomId={classroomId}
          onClose={() => setSelectedOpponent(null)}
        />
      )}
    </div>
  );
}
