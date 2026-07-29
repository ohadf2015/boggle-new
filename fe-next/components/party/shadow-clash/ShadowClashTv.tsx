'use client';

/**
 * Shadow Clash — TV View (the narrator/stage)
 * Shows: dealing animation, night scene with narration,
 * dawn reveal, discussion timer, vote reveal, game over with all roles.
 */

import { memo, useEffect, useState } from 'react';
import { setInterval, clearInterval } from 'worker-timers';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { usePartySounds } from '@/hooks/usePartySounds';
import { shadowRoleLabel, shadowRoleEmoji } from '@/lib/party/shadowRoleLabel';
import { PartyConfettiBurst } from '@/components/party/shared/PartyConfettiBurst';

// ==================== Types ====================

interface DawnData {
  eliminated: string | null;
  role: string | null;
  saved: boolean;
  round: number;
  aliveCount: number;
}

interface VoteRevealData {
  votes: Record<string, string>;
  eliminated: string | null;
  role: string | null;
  noElimination: boolean;
  round: number;
}

interface GameOverData {
  winner: 'evil' | 'good';
  roles: Record<string, string>;
  eliminated: Array<{ username: string; role: string; eliminatedBy: string; round: number }>;
}

type TvPhase = 'waiting' | 'dealing' | 'night' | 'dawn' | 'discussion' | 'trial' | 'verdict' | 'game-over';

// ==================== Component ====================

function ShadowClashTvInner({ socket }: { socket: Socket | null }) {
  const { t } = useLanguage();
  const partySounds = usePartySounds();
  const [phase, setPhase] = useState<TvPhase>('waiting');
  const [round, setRound] = useState(0);
  const [dawnData, setDawnData] = useState<DawnData | null>(null);
  const [voteData, setVoteData] = useState<VoteRevealData | null>(null);
  const [gameOverData, setGameOverData] = useState<GameOverData | null>(null);
  const [aliveUsernames, setAliveUsernames] = useState<string[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [eliminatedHistory, setEliminatedHistory] = useState<Array<{ username: string; role: string }>>([]);

  // Timer
  useEffect(() => {
    if (timeRemaining <= 0) return;
    if (timeRemaining <= 5) partySounds.onCountdown(timeRemaining);
    const interval = setInterval(() => setTimeRemaining(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, partySounds]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    // Map any server phase onto a TV screen. Previously this only handled
    // 'dealing', so a TV that refreshed or joined mid-game stayed stuck on the
    // "Starting…" spinner. Handling every phase lets the stage recover (F3).
    const PHASE_TO_TV: Record<string, TvPhase> = {
      dealing: 'dealing',
      night: 'night',
      discussion: 'discussion',
      trial: 'trial',
      voting: 'trial',
      'game-over': 'game-over',
      results: 'game-over',
    };
    const onPhaseChange = (data: { phase: string; gameState: Record<string, unknown> | null }) => {
      const gs = data.gameState;
      const next = PHASE_TO_TV[(gs?.phase as string) ?? data.phase];
      if (next) setPhase(next);
      if (gs?.alivePlayers) setAliveUsernames(gs.alivePlayers as string[]);
    };

    const onNightStart = (data: { round: number; aliveCount: number }) => {
      setPhase('night');
      setRound(data.round);
      setTimeRemaining(30);
      setDawnData(null);
      partySounds.onPhaseStart();
    };

    const onDawn = (data: DawnData) => {
      setPhase('dawn');
      setDawnData(data);
      partySounds.onReveal();
      if (data.eliminated && data.role) {
        setEliminatedHistory(prev => [...prev, { username: data.eliminated!, role: data.role! }]);
        setAliveUsernames(prev => prev.filter(u => u !== data.eliminated));
      }
    };

    const onDiscussionStart = (data: { alivePlayerUsernames: string[]; timeSeconds: number; round: number }) => {
      setPhase('discussion');
      setAliveUsernames(data.alivePlayerUsernames);
      setTimeRemaining(data.timeSeconds);
      setRound(data.round);
    };

    const onTrialStart = (data: { timeSeconds: number }) => {
      setPhase('trial');
      setTimeRemaining(data.timeSeconds);
    };

    const onVoteReveal = (data: VoteRevealData) => {
      setPhase('verdict');
      setVoteData(data);
      partySounds.onReveal();
      if (data.eliminated && data.role) {
        setEliminatedHistory(prev => [...prev, { username: data.eliminated!, role: data.role! }]);
        setAliveUsernames(prev => prev.filter(u => u !== data.eliminated));
      }
    };

    const onGameOver = (data: GameOverData) => {
      setPhase('game-over');
      setGameOverData(data);
      partySounds.onGameOver();
    };

    socket.on('party:phaseChange', onPhaseChange);
    socket.on('party:shadow:nightStart', onNightStart);
    socket.on('party:shadow:dawn', onDawn);
    socket.on('party:shadow:discussionStart', onDiscussionStart);
    socket.on('party:shadow:trialStart', onTrialStart);
    socket.on('party:shadow:voteReveal', onVoteReveal);
    socket.on('party:shadow:gameOver', onGameOver);

    // Ask the server to replay current state in case this TV mounted mid-game
    // (refresh / late host screen). The server broadcasts a phaseChange the TV
    // now maps onto a screen above, so the stage recovers instead of hanging.
    socket.emit('party:requestState');

    return () => {
      socket.off('party:phaseChange', onPhaseChange);
      socket.off('party:shadow:nightStart', onNightStart);
      socket.off('party:shadow:dawn', onDawn);
      socket.off('party:shadow:discussionStart', onDiscussionStart);
      socket.off('party:shadow:trialStart', onTrialStart);
      socket.off('party:shadow:voteReveal', onVoteReveal);
      socket.off('party:shadow:gameOver', onGameOver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- partySounds is stable, adding it would cause socket re-registration
  }, [socket]);

  // ==================== Dealing ====================
  if (phase === 'dealing') {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <AdaptiveMotion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', damping: 10, duration: 1 }}
          className="text-8xl mb-6"
        >
          🐺
        </AdaptiveMotion.div>
        <h1 className="font-neo-display text-neo-purple text-4xl uppercase">Shadow Clash</h1>
        <p className="font-neo-body text-neo-white mt-3 animate-pulse">
          {t('party.dealingRoles') || 'Dealing roles...'}
        </p>
        <p className="font-neo-body text-neo-white text-sm mt-1">
          {t('party.checkYourPhone') || 'Check your phone!'}
        </p>

        {/* Player circles */}
        <div className="flex flex-wrap justify-center gap-3 mt-8 max-w-2xl">
          {aliveUsernames.map((name, i) => (
            <AdaptiveMotion.div
              key={name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="bg-neo-navy-elevated border-3 border-neo-purple/40 rounded-neo-lg px-4 py-2 shadow-hard"
            >
              <span className="font-neo-display text-neo-white">{name}</span>
            </AdaptiveMotion.div>
          ))}
        </div>
      </div>
    );
  }

  // ==================== Night ====================
  if (phase === 'night') {
    return (
      <div className="min-h-screen bg-[#0a0a15] flex flex-col items-center justify-center p-8 relative overflow-hidden">
        {/* Stars */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(1px 1px at 20% 30%, rgba(255,255,255,0.3), transparent), radial-gradient(1px 1px at 70% 60%, rgba(255,255,255,0.2), transparent), radial-gradient(1px 1px at 40% 80%, rgba(255,255,255,0.4), transparent), radial-gradient(1px 1px at 80% 20%, rgba(255,255,255,0.3), transparent)',
        }} />

        <div className="relative z-10 text-center">
          <div className="text-6xl mb-4">🌙</div>
          <h2 className="font-neo-display text-neo-purple text-3xl uppercase">
            {t('party.nightFalls') || 'Night Falls...'}
          </h2>
          <p className="font-neo-body text-neo-white mt-2">
            Round {round}
          </p>

          {/* Narration sequence */}
          <div className="mt-8 space-y-4">
            <AdaptiveMotion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="font-neo-body text-neo-white italic text-lg"
            >
              {t('party.shadowsAwaken') || 'Shadows awaken... choose your victim.'}
            </AdaptiveMotion.p>
            <AdaptiveMotion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 8 }}
              className="font-neo-body text-neo-white italic text-lg"
            >
              {t('party.seerInvestigates') || 'The Seer opens their eyes...'}
            </AdaptiveMotion.p>
            <AdaptiveMotion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 15 }}
              className="font-neo-body text-neo-white italic text-lg"
            >
              {t('party.medicProtects') || 'The Medic extends their protection...'}
            </AdaptiveMotion.p>
          </div>

          <div className="mt-8 font-neo-display text-neo-white text-xl">
            {timeRemaining}s
          </div>
        </div>
      </div>
    );
  }

  // ==================== Dawn ====================
  if (phase === 'dawn' && dawnData) {
    return (
      <div className="min-h-screen bg-linear-to-b from-[#1a1020] to-[#2a1530] flex flex-col items-center justify-center p-8">
        <div className="text-6xl mb-4">🌅</div>

        {dawnData.saved ? (
          <AdaptiveMotion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center"
          >
            <h2 className="font-neo-display text-neo-lime text-3xl uppercase">
              {t('party.someoneWasSaved') || 'Someone was saved!'}
            </h2>
            <p className="font-neo-body text-neo-white mt-2">
              🛡️ {t('party.medicSaved') || 'The Medic protected their target.'}
            </p>
          </AdaptiveMotion.div>
        ) : dawnData.eliminated ? (
          <AdaptiveMotion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', damping: 12 }}
            className="text-center"
          >
            <h2 className="font-neo-display text-neo-red text-3xl uppercase mb-4">
              {dawnData.eliminated} {t('party.wasEliminated') || 'was eliminated'}
            </h2>
            <AdaptiveMotion.div
              initial={{ rotateY: 180, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ delay: 1.5, duration: 0.6 }}
              className="inline-block bg-neo-navy-elevated border-4 border-neo-purple rounded-neo-lg px-6 py-3 shadow-hard-purple"
            >
              <span className="font-neo-display text-neo-purple text-xl uppercase">
                {dawnData.role ? shadowRoleLabel(dawnData.role, t) : ''}
              </span>
            </AdaptiveMotion.div>
          </AdaptiveMotion.div>
        ) : (
          <h2 className="font-neo-display text-neo-white text-2xl uppercase">
            {t('party.peacefulNight') || 'A peaceful night...'}
          </h2>
        )}
      </div>
    );
  }

  // ==================== Discussion ====================
  if (phase === 'discussion') {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <h2 className="font-neo-display text-neo-white text-3xl uppercase mb-2">
          {t('party.discuss') || 'Discuss!'}
        </h2>
        <p className="font-neo-body text-neo-white mb-6">
          {t('party.whoIsTheShadow') || 'Who is the Shadow among you?'}
        </p>

        {/* Timer */}
        <div className={`font-neo-display text-5xl mb-8 ${timeRemaining <= 10 ? 'text-neo-red animate-neo-wobble' : 'text-neo-white'}`}>
          {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
        </div>

        {/* Living players */}
        <div className="flex flex-wrap justify-center gap-3 max-w-3xl">
          {aliveUsernames.map(name => (
            <div
              key={name}
              className="bg-neo-navy-elevated border-3 border-neo-cream/30 rounded-neo-lg px-4 py-2 shadow-hard"
            >
              <span className="font-neo-display text-neo-white">{name}</span>
            </div>
          ))}
        </div>

        {/* Eliminated history */}
        {eliminatedHistory.length > 0 && (
          <div className="mt-8 text-center">
            <p className="text-neo-white font-neo-body text-xs uppercase mb-2">{t('party.eliminatedTitle') || 'Eliminated'}</p>
            <div className="flex gap-2 justify-center">
              {eliminatedHistory.map((e, i) => (
                <span key={`${e.username}-${i}`} className="text-neo-red/50 font-neo-body text-sm line-through">
                  {e.username} ({shadowRoleEmoji(e.role)})
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // ==================== Trial ====================
  if (phase === 'trial') {
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <h2 className="font-neo-display text-neo-red text-3xl uppercase mb-4">
          {t('party.vote') || 'Vote!'}
        </h2>
        <div className={`font-neo-display text-4xl ${timeRemaining <= 5 ? 'text-neo-red animate-neo-wobble' : 'text-neo-white'}`}>
          {timeRemaining}s
        </div>
        <p className="font-neo-body text-neo-white mt-4">
          {t('party.voteOnPhone') || 'Cast your vote on your phone!'}
        </p>
      </div>
    );
  }

  // ==================== Verdict ====================
  if (phase === 'verdict' && voteData) {
    const voteEntries = Object.entries(voteData.votes);
    return (
      <div className="min-h-screen bg-neo-abyss flex flex-col items-center justify-center p-8">
        <h2 className="font-neo-display text-neo-white text-2xl uppercase mb-6">
          {t('party.theVotes') || 'The votes are in...'}
        </h2>

        {/* Vote reveal one by one */}
        <div className="space-y-2 mb-8 max-w-md w-full">
          {voteEntries.map(([voter, target], i) => (
            <AdaptiveMotion.div
              key={voter}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.5 }}
              className="flex items-center justify-between bg-neo-navy-elevated border-2 border-neo-cream/20 rounded-neo px-4 py-2"
            >
              <span className="font-neo-body text-neo-white text-sm">{voter}</span>
              <span className="text-neo-white">→</span>
              <span className={`font-neo-display text-sm ${target === 'skip' ? 'text-neo-white' : 'text-neo-red'}`}>
                {target === 'skip' ? `⏭️ ${t('party.skip') || 'Skip'}` : target}
              </span>
            </AdaptiveMotion.div>
          ))}
        </div>

        {/* Elimination result */}
        <AdaptiveMotion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: voteEntries.length * 0.5 + 0.5, type: 'spring' }}
          className="text-center"
        >
          {voteData.eliminated ? (
            <>
              <h3 className="font-neo-display text-neo-red text-2xl uppercase">
                {voteData.eliminated} {t('party.isEliminated') || 'is eliminated!'}
              </h3>
              <div className="mt-3 bg-neo-navy-elevated border-3 border-neo-purple rounded-neo-lg px-5 py-2 inline-block shadow-hard-purple">
                <span className="font-neo-display text-neo-purple text-lg">
                  {voteData.role ? shadowRoleLabel(voteData.role, t) : ''}
                </span>
              </div>
            </>
          ) : (
            <h3 className="font-neo-display text-neo-white text-xl">
              {t('party.noConsensus') || 'No consensus. No one eliminated.'}
            </h3>
          )}
        </AdaptiveMotion.div>
      </div>
    );
  }

  // ==================== Game Over ====================
  if (phase === 'game-over' && gameOverData) {
    const isGoodWin = gameOverData.winner === 'good';
    return (
      <div className={`min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden ${isGoodWin ? 'bg-linear-to-b from-neo-abyss to-[#0a1a0a]' : 'bg-linear-to-b from-neo-abyss to-[#1a0a0a]'}`}>
        <PartyConfettiBurst accent={isGoodWin ? 'neo-lime' : 'neo-purple'} />
        <AdaptiveMotion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', damping: 8 }}
          className="text-8xl mb-4"
        >
          {isGoodWin ? '🛡️' : '🐺'}
        </AdaptiveMotion.div>

        <h1 className={`font-neo-display text-4xl uppercase ${isGoodWin ? 'text-neo-lime' : 'text-neo-red'}`}>
          {isGoodWin
            ? (t('party.citizensWin') || 'Citizens Win!')
            : (t('party.shadowsWin') || 'Shadows Win!')}
        </h1>

        {/* All roles revealed */}
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-2xl">
          {Object.entries(gameOverData.roles).map(([username, role], i) => {
            const isShadow = role === 'shadow';
            const wasEliminated = gameOverData.eliminated.some(e => e.username === username);
            return (
              <AdaptiveMotion.div
                key={username}
                initial={{ opacity: 0, rotateY: 180 }}
                animate={{ opacity: 1, rotateY: 0 }}
                transition={{ delay: i * 0.3 }}
                className={`
                  border-3 rounded-neo-lg px-4 py-3 text-center
                  ${isShadow ? 'border-neo-red bg-neo-red/10 shadow-hard' : 'border-neo-cream/30 bg-neo-navy-elevated shadow-hard'}
                  ${wasEliminated ? 'opacity-50' : ''}
                `}
              >
                <p className="font-neo-display text-neo-white text-sm">{username}</p>
                <p className={`font-neo-display text-xs mt-1 ${isShadow ? 'text-neo-red' : 'text-neo-purple'}`}>
                  {shadowRoleLabel(role, t)}
                </p>
                {wasEliminated && <p className="text-neo-white text-xs mt-0.5">💀</p>}
              </AdaptiveMotion.div>
            );
          })}
        </div>
      </div>
    );
  }

  // Default
  return (
    <div className="min-h-screen bg-neo-abyss flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">🐺</div>
        <h1 className="font-neo-display text-neo-purple text-3xl uppercase">Shadow Clash</h1>
        <p className="text-neo-white font-neo-body mt-2 animate-pulse">
          {t('party.starting') || 'Starting...'}
        </p>
      </div>
    </div>
  );
}

const ShadowClashTv = memo(ShadowClashTvInner);
ShadowClashTv.displayName = 'ShadowClashTv';
export default ShadowClashTv;
