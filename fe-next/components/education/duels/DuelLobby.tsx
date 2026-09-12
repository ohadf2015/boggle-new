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
import { AsyncDuelTurnCard } from './AsyncDuelTurnCard';
import {
  rememberSentTaunt,
  readSentTaunt,
  duelTauntById,
  type DuelTauntId,
} from '@/lib/education/duelTaunts';
import {
  resolveDuelOpponentName,
  rememberChallengerName,
  rememberStudentName,
} from '@/lib/education/duelOpponentNames';

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
  /**
   * studentId -> display name. Without it the pending list printed raw uuids
   * ("challengeFrom 9f2c…"), which is how this screen read for months.
   */
  opponentNames?: Record<string, string>;
}

// ============================================
// COMPONENT
// ============================================

export default function DuelLobby({
  classroomId,
  studentId,
  lessons,
  onTabChange,
  opponentNames = {},
}: DuelLobbyProps) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const {
    joinLobby,
    leaveLobby,
    acceptChallenge,
    declineChallenge,
    sendTaunt,
    onLobbyUpdate,
    onChallengeReceived,
    onTauntReceived,
    onDuelStarted,
  } = useDuelSocket();

  // State
  const [opponents, setOpponents] = useState<OpponentInfo[]>([]);

  /**
   * The server's roster is every socket in the classroom room — this student's
   * own included. Offering yourself as an opponent is a dead tile and one more
   * thing to read before the real classmate, so the exclusion lives here.
   */
  const visibleOpponents = opponents.filter((opponent) => opponent.userId !== studentId);
  const [pendingChallenges, setPendingChallenges] = useState<DuelRow[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<OpponentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  /** duelId -> sticker this device already sent. */
  const [sentTaunts, setSentTaunts] = useState<Record<string, DuelTauntId>>({});
  /** duelId -> sticker the other student threw back. */
  const [incomingTaunts, setIncomingTaunts] = useState<Record<string, DuelTauntId>>({});
  /**
   * duelId -> the name `duel:challenge-received` carried. The classroom roster
   * can come back empty for a student (own-row RLS), so this and the live
   * presence roster below are the sources that actually have a name in them.
   */
  const [challengerNames, setChallengerNames] = useState<Record<string, string>>({});

  /** userId -> display name for everyone currently in the lobby. */
  const presenceNames: Record<string, string> = {};
  for (const opponent of opponents) {
    if (opponent.userId && opponent.displayName) {
      presenceNames[opponent.userId] = opponent.displayName;
    }
  }

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
      /**
       * `duel:lobby-update` carries two different payloads under one name: the
       * lobby handler sends `{ availableOpponents }`, lifecycle.ts announces a
       * new challenge with `{ action, duelId }` and no roster
       * (recurring-pitfalls Class 3). Trusting the second one set the roster to
       * `undefined` and threw on the next render — the challenged student's
       * lobby dropped into the error boundary the instant a challenge landed.
       */
      if (!Array.isArray(data?.availableOpponents)) return;
      /**
       * The roster is the only place a classmate's name is reliably available,
       * and the duel SCREEN cannot read it (own-row RLS on `profiles` hands
       * back a null row with error:null). Bank every name here so the
       * scoreboard and the reveal can say who you are playing.
       */
      for (const opponent of data.availableOpponents) {
        if (opponent?.userId && opponent?.displayName) {
          rememberStudentName(opponent.userId, opponent.displayName);
        }
      }
      setOpponents(data.availableOpponents);
    });

    return cleanup;
  }, [onLobbyUpdate]);

  // Listen for challenge received events
  useEffect(() => {
    const cleanup = onChallengeReceived((data) => {
      /**
       * The event is the only place the challenger's NAME ever appears — the
       * duel row carries an id. Keep it, and persist it, before the refetch
       * re-renders the card.
       */
      if (data?.duelId && data?.challengerName) {
        setChallengerNames((prev) => ({ ...prev, [data.duelId]: data.challengerName }));
        rememberChallengerName(data.duelId, data.challengerName);
      }
      // Add to pending challenges (will be fetched from DB in real flow)
      fetchPendingChallenges();
    });

    return cleanup;
  }, [onChallengeReceived, fetchPendingChallenges]);

  /**
   * The CHALLENGER's way in. Accepting pushes the acceptor to the duel screen;
   * the challenger is still here, and their socket — put in the duel room by
   * the accept handler — receives `duel:started`. With no listener that event
   * went nowhere and they watched the lobby while their own duel ran out its
   * clock (recurring-pitfalls Class 4).
   */
  useEffect(() => {
    if (!onDuelStarted) return;
    return onDuelStarted((data) => {
      if (!data?.duelId) return;
      router.push(`/${language}/education/duels/${data.duelId}`);
    });
  }, [onDuelStarted, router, language]);

  // A sticker thrown back lands on the matching turn card.
  useEffect(() => {
    if (!onTauntReceived) return;
    return onTauntReceived((data) => {
      const taunt = duelTauntById(data.stickerId);
      if (!taunt) return;
      setIncomingTaunts((prev) => ({ ...prev, [data.duelId]: taunt.id }));
    });
  }, [onTauntReceived]);

  // Handle taunt send — optimistic locally, best-effort over the socket.
  const handleTaunt = useCallback(
    (duelId: string, tauntId: DuelTauntId) => {
      setSentTaunts((prev) => ({ ...prev, [duelId]: tauntId }));
      rememberSentTaunt(duelId, tauntId);
      sendTaunt?.(duelId, tauntId);
    },
    [sendTaunt]
  );

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
    /**
     * No outer card. The locked shell frames and pads this surface already, so
     * a bordered box here was a third nested rectangle around the turn cards —
     * and its black edge on a navy fill measures 1.23:1. The pieces inside
     * carry the one card style.
     */
    <div data-testid="duel-lobby-container" className="bg-neo-navy">
      {/* Header — the title row lost its duplicate PVP chip and its decorative
          icon tile; the tab strip above already says where you are. */}
      <h2 className="mb-3 font-neo-display text-xl font-black uppercase italic tracking-tight text-neo-white">
        {t('duelLobbyTitle')}
      </h2>

      {/* Pending Challenges Section */}
      <section className="mb-6">
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
              <AsyncDuelTurnCard
                key={challenge.id}
                duelId={challenge.id}
                opponentName={resolveDuelOpponentName({
                  duelId: challenge.id,
                  challengerId: challenge.challenger_id,
                  fromChallenge: challengerNames,
                  fromPresence: presenceNames,
                  fromRoster: opponentNames,
                  fallback: t('common.opponent'),
                })}
                duelType={challenge.duel_type === 'realtime' ? 'realtime' : 'async'}
                lessonName={
                  lessons.find((l) => l.id === challenge.lesson_id)?.name ||
                  t('education.duels.unknownLesson')
                }
                opponentScore={challenge.challenger_score ?? 0}
                sentTaunt={sentTaunts[challenge.id] ?? readSentTaunt(challenge.id)}
                incomingTaunt={incomingTaunts[challenge.id] ?? null}
                onAccept={handleAccept}
                onDecline={handleDecline}
                onTaunt={handleTaunt}
              />
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
            'bg-neo-lime text-neo-black',
            'border-[3px] border-neo-black shadow-hard',
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

      {/* Available Opponents Section — one card style: solid navy, 3px cream
          edge (black on navy is 1.23:1), hard shadow. */}
      <section
        data-testid="duel-lobby-opponents"
        className="rounded-neo border-[3px] border-neo-cream bg-neo-navy p-3 shadow-hard"
      >
        <h3 className="text-base font-neo-display font-black text-neo-cyan uppercase tracking-wide mb-3">
          {t('availableOpponents')}
        </h3>

        {visibleOpponents.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-10 h-10 mx-auto mb-3 text-neo-white" />
            <p className="text-neo-white mb-3">{t('education.duels.noClassmatesOnline')}</p>
            {onTabChange && (
              <button
                type="button"
                onClick={() => onTabChange('classmates')}
                className={cn(
                  'px-4 py-2 font-black rounded-neo',
                  'bg-neo-pink text-neo-black',
                  'border-[3px] border-neo-black shadow-hard-sm',
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
            {visibleOpponents.map((opponent) => (
              <button
                type="button"
                key={opponent.userId}
                onClick={() => handleSelectOpponent(opponent)}
                className={cn(
                  'p-4 rounded-neo border-[3px] border-neo-black',
                  // The fill is cream, so the tile must set its own text colour:
                  // inheriting cream-on-cream measures 1.02:1.
                  'bg-neo-cream text-neo-black shadow-hard-sm',
                  'hover:-translate-y-1 hover:shadow-hard',
                  'active:translate-y-0.5 active:shadow-hard-pressed',
                  'transition-all duration-100 cursor-pointer',
                  'flex flex-col items-center gap-2',
                  'focus:outline-hidden focus-visible:ring-2 focus-visible:ring-neo-cyan'
                )}
              >
                {/* Avatar placeholder */}
                <div className="w-12 h-12 rounded-neo bg-neo-cyan border-[3px] border-neo-black flex items-center justify-center relative shadow-hard-sm">
                  <span className="text-black font-black text-xl font-neo-display">
                    {(opponent.displayName ?? '?').charAt(0).toUpperCase()}
                  </span>
                  {/* Online indicator — neo-cyan glow */}
                  <div className="absolute -top-1.5 -inset-e-1.5 w-4 h-4 rounded-full bg-neo-cyan border-[3px] border-neo-black shadow-[0_0_8px_var(--color-neo-cyan)]" aria-label={t('education.duels.online')} role="status" />
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
