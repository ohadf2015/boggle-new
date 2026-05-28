'use client';

/**
 * Shadow Clash — Phone Controller View
 * Shows: role card, night action buttons, decoy screen for citizens,
 * discussion "Call Vote" button, vote ballot.
 */

import { memo, useEffect, useState, useCallback } from 'react';
import { setInterval, clearInterval } from 'worker-timers';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { usePartySounds } from '@/hooks/usePartySounds';

// ==================== Types ====================

type ShadowRole = 'shadow' | 'seer' | 'medic' | 'citizen';

interface RoleAssignedData {
  role: ShadowRole;
  team: 'evil' | 'good';
  partnerUsername?: string;
}

interface NightActionData {
  action: 'choose-target' | 'investigate' | 'protect' | 'wait';
  targets: string[];
  message: string;
}

interface SeerResultData {
  target: string;
  team: 'evil' | 'good';
}

interface VoteStartData {
  targets: string[];
  timeSeconds: number;
}

type PhonePhase = 'waiting' | 'role-reveal' | 'night-action' | 'night-waiting' | 'seer-result' | 'discussion' | 'voting' | 'voted' | 'eliminated' | 'watching';

const ROLE_CONFIG: Record<ShadowRole, { emoji: string; color: string; nameKey: string; bgGlow: string }> = {
  'shadow': { emoji: '🐺', color: 'text-neo-red', nameKey: 'party.roleShadow', bgGlow: 'bg-neo-red/10 border-neo-red' },
  seer: { emoji: '👁️', color: 'text-neo-purple', nameKey: 'party.roleSeer', bgGlow: 'bg-neo-purple/10 border-neo-purple' },
  medic: { emoji: '🛡️', color: 'text-neo-lime', nameKey: 'party.roleMedic', bgGlow: 'bg-neo-lime/10 border-neo-lime' },
  citizen: { emoji: '👤', color: 'text-neo-white', nameKey: 'party.roleCitizen', bgGlow: 'bg-neo-cream/5 border-neo-cream/30' },
};

// ==================== Props ====================

interface ShadowClashPhoneProps {
  socket: Socket | null;
  onSendInput: (input: { gameId: string; action: string; [key: string]: unknown }) => void;
}

// ==================== Component ====================

function ShadowClashPhoneInner({ socket, onSendInput }: ShadowClashPhoneProps) {
  const { t } = useLanguage();
  const partySounds = usePartySounds();
  const [phase, setPhase] = useState<PhonePhase>('waiting');
  const [myRole, setMyRole] = useState<RoleAssignedData | null>(null);
  const [nightAction, setNightAction] = useState<NightActionData | null>(null);
  const [seerResult, setSeerResult] = useState<SeerResultData | null>(null);
  const [voteTargets, setVoteTargets] = useState<string[]>([]);
  const [votedTarget, setVotedTarget] = useState<string | null>(null);
  const [nightActionDone, setNightActionDone] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);

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

    const onRoleAssigned = (data: RoleAssignedData) => {
      setMyRole(data);
      setPhase('role-reveal');
      partySounds.onPhaseStart();
    };

    const onNightAction = (data: NightActionData) => {
      setNightAction(data);
      setNightActionDone(false);
      setSeerResult(null);
      if (data.action === 'wait') {
        setPhase('night-waiting');
      } else {
        setPhase('night-action');
      }
    };

    const onSeerResult = (data: SeerResultData) => {
      setSeerResult(data);
      setPhase('seer-result');
    };

    const onDiscussionStart = (data: { timeSeconds: number }) => {
      setPhase('discussion');
      setTimeRemaining(data.timeSeconds);
      setVotedTarget(null);
      partySounds.onPhaseTransition();
    };

    const onVoteStart = (data: VoteStartData) => {
      setPhase('voting');
      setVoteTargets(data.targets);
      setTimeRemaining(data.timeSeconds);
      setVotedTarget(null);
      partySounds.onPhaseTransition();
    };

    const onEliminated = () => {
      setPhase('eliminated');
    };

    const onGameOver = () => {
      setPhase('watching');
      partySounds.onGameOver();
    };

    socket.on('party:shadow:roleAssigned', onRoleAssigned);
    socket.on('party:shadow:nightAction', onNightAction);
    socket.on('party:shadow:seerResult', onSeerResult);
    socket.on('party:shadow:discussionStart', onDiscussionStart);
    socket.on('party:shadow:voteStart', onVoteStart);
    socket.on('party:shadow:youWereEliminated', onEliminated);
    socket.on('party:shadow:gameOver', onGameOver);

    return () => {
      socket.off('party:shadow:roleAssigned', onRoleAssigned);
      socket.off('party:shadow:nightAction', onNightAction);
      socket.off('party:shadow:seerResult', onSeerResult);
      socket.off('party:shadow:discussionStart', onDiscussionStart);
      socket.off('party:shadow:voteStart', onVoteStart);
      socket.off('party:shadow:youWereEliminated', onEliminated);
      socket.off('party:shadow:gameOver', onGameOver);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- partySounds is stable, adding it would cause socket re-registration
  }, [socket]);

  const handleNightAction = useCallback((targetUsername: string) => {
    onSendInput({ gameId: 'shadow-clash', action: 'night-action', targetUsername });
    setNightActionDone(true);
    partySounds.onSubmit();
  }, [onSendInput, partySounds]);

  const handleVote = useCallback((targetUsername: string) => {
    onSendInput({ gameId: 'shadow-clash', action: 'vote', targetUsername });
    setVotedTarget(targetUsername);
    setPhase('voted');
    partySounds.onVote();
  }, [onSendInput, partySounds]);

  const handleCallVote = useCallback(() => {
    onSendInput({ gameId: 'shadow-clash', action: 'call-vote' });
  }, [onSendInput]);

  const roleConfig = myRole ? ROLE_CONFIG[myRole.role] : null;

  // ==================== Role Reveal ====================
  if (phase === 'role-reveal' && myRole && roleConfig) {
    return (
      <div className="min-h-screen bg-neo-navy flex flex-col items-center justify-center p-6">
        <AdaptiveMotion.div
          initial={{ rotateY: 180, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          className={`border-4 ${roleConfig.bgGlow} rounded-neo-xl p-8 shadow-hard-lg max-w-xs w-full text-center`}
        >
          <div className="text-7xl mb-4">{roleConfig.emoji}</div>
          <h2 className={`font-neo-display text-2xl uppercase ${roleConfig.color}`}>
            {t(roleConfig.nameKey) || myRole.role}
          </h2>
          <p className="font-neo-body text-neo-white text-sm mt-3">
            {myRole.role === 'shadow' && (t('party.shadowDesc') || 'Eliminate citizens without being caught')}
            {myRole.role === 'seer' && (t('party.seerDesc') || 'Investigate one player each night')}
            {myRole.role === 'medic' && (t('party.medicDesc') || 'Protect one player each night')}
            {myRole.role === 'citizen' && (t('party.citizenDesc') || 'Find and eliminate the Shadows')}
          </p>

          {myRole.partnerUsername && (
            <div className="mt-4 bg-neo-red/20 border-2 border-neo-red/40 rounded-neo px-3 py-2">
              <p className="text-neo-red text-xs font-neo-body">
                {t('party.yourPartner') || 'Your partner:'} <strong>{myRole.partnerUsername}</strong>
              </p>
            </div>
          )}
        </AdaptiveMotion.div>

        <p className="mt-6 text-neo-white font-neo-body text-xs">
          {t('party.dontShowAnyone') || "Don't show anyone!"}
        </p>
      </div>
    );
  }

  // ==================== Night Action ====================
  if (phase === 'night-action' && nightAction && roleConfig && !nightActionDone) {
    return (
      <div className="min-h-screen bg-[#0a0a15] flex flex-col p-4">
        {/* Role badge */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-2xl">{roleConfig.emoji}</span>
          <span className={`font-neo-display text-sm uppercase ${roleConfig.color}`}>
            {t(roleConfig.nameKey) || myRole?.role}
          </span>
        </div>

        <p className="font-neo-body text-neo-white mb-4">
          {nightAction.message}
        </p>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
          {nightAction.targets.map(target => (
            <button
              key={target}
              onClick={() => handleNightAction(target)}
              className={`
                border-3 border-neo-cream/20 rounded-neo p-3 text-left
                bg-neo-navy-elevated shadow-hard
                transition-all duration-100
                hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg
                active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
                ${myRole?.role === 'shadow' ? 'hover:border-neo-red/50' :
                  myRole?.role === 'seer' ? 'hover:border-neo-purple/50' :
                  'hover:border-neo-lime/50'}
              `}
            >
              <span className="font-neo-display text-neo-white">{target}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Night action done / waiting
  if (phase === 'night-action' && nightActionDone) {
    return (
      <div className="min-h-screen bg-[#0a0a15] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">✅</div>
          <p className="font-neo-body text-neo-white">
            {t('party.choiceMade') || 'Choice made. Wait for dawn...'}
          </p>
        </div>
      </div>
    );
  }

  // Night waiting (citizens - decoy screen)
  if (phase === 'night-waiting') {
    return (
      <div className="min-h-screen bg-[#0a0a15] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🌙</div>
          <p className="font-neo-body text-neo-white italic">
            {t('party.nightIsDark') || 'The night is dark...'}
          </p>
          {/* Fake activity indicator so nobody can tell who's acting */}
          <div className="mt-6 flex gap-1 justify-center">
            {[0, 1, 2].map(i => (
              <div
                key={`dot-${i}`}
                className="w-2 h-2 bg-neo-purple/30 rounded-full animate-pulse"
                style={{ animationDelay: `${i * 0.3}s` }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Seer result
  if (phase === 'seer-result' && seerResult) {
    const isEvil = seerResult.team === 'evil';
    return (
      <div className="min-h-screen bg-[#0a0a15] flex items-center justify-center p-4">
        <AdaptiveMotion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 10 }}
          className="text-center"
        >
          <div className="text-5xl mb-3">{isEvil ? '🔴' : '🔵'}</div>
          <p className="font-neo-display text-lg text-neo-white uppercase">{seerResult.target}</p>
          <p className={`font-neo-display text-2xl uppercase mt-2 ${isEvil ? 'text-neo-red' : 'text-neo-cyan'}`}>
            {isEvil ? (t('party.isShadow') || 'SHADOW!') : (t('party.isCitizen') || 'Not a Shadow')}
          </p>
          <p className="font-neo-body text-neo-white text-xs mt-4">
            {t('party.keepItSecret') || 'Use this wisely during discussion...'}
          </p>
        </AdaptiveMotion.div>
      </div>
    );
  }

  // ==================== Discussion ====================
  if (phase === 'discussion') {
    return (
      <div className="min-h-screen bg-neo-navy flex flex-col items-center justify-center p-4">
        {/* Role reminder (small, corner) */}
        {roleConfig && (
          <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-neo-navy-elevated border-2 border-neo-cream/15 rounded-neo px-2 py-1">
            <span className="text-sm">{roleConfig.emoji}</span>
            <span className={`text-xs font-neo-display ${roleConfig.color}`}>{myRole?.role}</span>
          </div>
        )}

        <div className="text-5xl mb-4">💬</div>
        <h2 className="font-neo-display text-neo-white text-xl uppercase">
          {t('party.discussFaceToFace') || 'Discuss!'}
        </h2>
        <p className="font-neo-body text-neo-white text-sm mt-1">
          {t('party.talkToEachOther') || 'Talk to each other — face to face!'}
        </p>

        <div className={`mt-6 font-neo-display text-3xl ${timeRemaining <= 10 ? 'text-neo-red animate-neo-wobble' : 'text-neo-white'}`}>
          {Math.floor(timeRemaining / 60)}:{String(timeRemaining % 60).padStart(2, '0')}
        </div>

        {/* Call Vote button */}
        <button
          onClick={handleCallVote}
          className="
            mt-8 bg-neo-red border-3 border-neo-black rounded-neo shadow-hard
            px-6 py-3 font-neo-display text-neo-black uppercase font-bold
            transition-all duration-100
            active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
          "
        >
          {t('party.callVote') || 'Call Vote!'}
        </button>
      </div>
    );
  }

  // ==================== Voting ====================
  if ((phase === 'voting' || phase === 'voted')) {
    return (
      <div className="min-h-screen bg-neo-navy flex flex-col p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-neo-display text-neo-red uppercase text-lg">
            {phase === 'voted' ? (t('party.voted') || 'Vote locked!') : (t('party.whoToEliminate') || 'Who to eliminate?')}
          </h2>
          {phase === 'voting' && (
            <span className={`font-neo-display ${timeRemaining <= 5 ? 'text-neo-red' : 'text-neo-white'}`}>
              {timeRemaining}s
            </span>
          )}
        </div>

        <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
          {voteTargets.map(target => {
            const isSkip = target === 'skip';
            const isSelected = votedTarget === target;
            return (
              <button
                key={target}
                onClick={() => phase === 'voting' && handleVote(target)}
                disabled={phase === 'voted'}
                className={`
                  border-3 border-neo-black rounded-neo p-3 text-left
                  transition-all duration-100
                  ${isSelected
                    ? 'bg-neo-red text-neo-black shadow-hard'
                    : phase === 'voted'
                      ? 'bg-neo-navy-elevated text-neo-white'
                      : isSkip
                        ? 'bg-neo-navy-elevated text-neo-white border-neo-cream/20 shadow-hard hover:border-neo-cream/40'
                        : 'bg-neo-navy-elevated text-neo-white shadow-hard hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px active:shadow-hard-pressed'
                  }
                `}
              >
                <span className="font-neo-display">
                  {isSkip ? `⏭️ ${t('party.skipVote') || 'Skip'}` : target}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ==================== Eliminated ====================
  if (phase === 'eliminated') {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-5xl mb-3">💀</div>
          <p className="font-neo-display text-neo-red text-xl uppercase">
            {t('party.youWereEliminated') || 'You were eliminated!'}
          </p>
          {roleConfig && (
            <p className={`font-neo-body ${roleConfig.color} text-sm mt-2`}>
              You were: {roleConfig.emoji} {myRole?.role}
            </p>
          )}
          <p className="font-neo-body text-neo-white text-sm mt-4">
            {t('party.watchFromBeyond') || 'Watch from beyond...'}
          </p>
        </div>
      </div>
    );
  }

  // Watching (game over on TV)
  if (phase === 'watching') {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">👀</div>
          <p className="font-neo-display text-neo-purple uppercase">
            {t('party.watchTheTv') || 'Watch the TV!'}
          </p>
        </div>
      </div>
    );
  }

  // Default
  return (
    <div className="min-h-screen bg-neo-navy flex items-center justify-center">
      <div className="animate-pulse text-neo-white font-neo-display">
        {t('party.starting') || 'Starting...'}
      </div>
    </div>
  );
}

const ShadowClashPhone = memo(ShadowClashPhoneInner);
ShadowClashPhone.displayName = 'ShadowClashPhone';
export default ShadowClashPhone;
