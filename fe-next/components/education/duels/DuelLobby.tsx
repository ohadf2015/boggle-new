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
import { useLanguage } from '@/contexts/LanguageContext';
import { useDuelSocket, type OpponentInfo, type ChallengeReceivedData } from '@/hooks/useDuelSocket';
import { getPendingDuelsForStudent, type DuelRow } from '@/lib/supabase/education/duels';
import { cn } from '@/lib/utils';
import { Users, Swords } from 'lucide-react';
import DuelChallengeModal from './DuelChallengeModal';

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
}

// ============================================
// COMPONENT
// ============================================

export default function DuelLobby({ classroomId, studentId, lessons }: DuelLobbyProps) {
  const { t } = useLanguage();
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
      const { data } = await getPendingDuelsForStudent(studentId);
      if (data) {
        setPendingChallenges(data);
      }
      setIsLoading(false);
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
    },
    [acceptChallenge]
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
        'p-6 rounded-neo border-3 border-neo border-neo-black',
        'bg-neo-navy/80 shadow-hard-sm'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Swords className="w-8 h-8 text-neo-yellow" />
        <h2 className="text-2xl font-neo-display font-black text-neo-white">
          {t('duelLobbyTitle')}
        </h2>
      </div>

      {/* Pending Challenges Section */}
      <section className="mb-8">
        <h3 className="text-xl font-neo-display font-bold text-neo-white mb-4">
          {t('pendingChallenges')}
        </h3>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neo-cyan"></div>
          </div>
        ) : pendingChallenges.length === 0 ? (
          <p className="text-neo-white/50 text-center py-4">{t('noPendingChallenges')}</p>
        ) : (
          <div className="space-y-3">
            {pendingChallenges.map((challenge) => (
              <div
                key={challenge.id}
                className={cn(
                  'p-4 rounded-neo border-neo border-neo-black',
                  'bg-neo-navy shadow-hard-sm',
                  'flex items-center justify-between gap-4'
                )}
              >
                <div className="flex-1">
                  <p className="text-neo-white font-bold">
                    {t('challengeFrom', { name: challenge.challenger_id })}
                  </p>
                  <p className="text-neo-white/70 text-sm">
                    {lessons.find((l) => l.id === challenge.lesson_id)?.name || 'Unknown Lesson'}
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleAccept(challenge.id)}
                    className={cn(
                      'px-4 py-2 font-bold rounded-neo',
                      'bg-neo-lime text-neo-black',
                      'border-neo border-neo-black shadow-hard-sm',
                      'hover:shadow-hard transition-all'
                    )}
                  >
                    {t('accept')}
                  </button>
                  <button
                    onClick={() => handleDecline(challenge.id)}
                    className={cn(
                      'px-4 py-2 font-bold rounded-neo',
                      'bg-neo-pink text-neo-white',
                      'border-neo border-neo-black shadow-hard-sm',
                      'hover:shadow-hard transition-all'
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
          onClick={handleQuickMatch}
          disabled={opponents.length === 0}
          className={cn(
            'w-full px-6 py-4 font-black text-lg rounded-neo',
            'bg-neo-yellow text-neo-black',
            'border-neo border-neo-black shadow-hard',
            'hover:shadow-hard-lg transition-all',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          <Users className="w-6 h-6 inline mr-2" />
          {t('quickMatch')}
        </button>
      </div>

      {/* Available Opponents Section */}
      <section>
        <h3 className="text-xl font-neo-display font-bold text-neo-white mb-4">
          {t('availableOpponents')}
        </h3>

        {opponents.length === 0 ? (
          <p className="text-neo-white/50 text-center py-4">{t('noOpponentsOnline')}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {opponents.map((opponent) => (
              <button
                key={opponent.userId}
                onClick={() => handleSelectOpponent(opponent)}
                className={cn(
                  'p-4 rounded-neo border-neo border-neo-black',
                  'bg-neo-navy shadow-hard-sm',
                  'hover:shadow-hard hover:bg-neo-navy/80',
                  'transition-all cursor-pointer',
                  'flex flex-col items-center gap-2'
                )}
              >
                {/* Avatar placeholder */}
                <div className="w-12 h-12 rounded-full bg-neo-cyan flex items-center justify-center relative">
                  <span className="text-neo-black font-black text-xl">
                    {(opponent.displayName ?? '?').charAt(0).toUpperCase()}
                  </span>
                  {/* Online indicator */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-neo-lime border-neo border-neo-black"></div>
                </div>

                {/* Name */}
                <span className="text-neo-white font-bold text-sm text-center">
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
