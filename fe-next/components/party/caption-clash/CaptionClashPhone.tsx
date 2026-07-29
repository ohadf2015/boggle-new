'use client';

/**
 * Caption Clash — Phone Controller View
 * Shows: text input during writing, rapid-tap laugh during lineup, vote ballot during voting.
 */

import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { setInterval, clearInterval } from 'worker-timers';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { AdaptiveMotion } from '@/components/motion/AdaptiveMotion';
import { usePartySounds } from '@/hooks/usePartySounds';
import { useImeText } from '@/hooks/useImeText';
import { PartyPhoneShell } from '@/components/party/shared/PartyPhoneShell';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';

// ==================== Types ====================

interface CaptionSubmission {
  id: string;
  username: string;
  text: string;
  submittedAt: number;
}

interface ImageReadyData {
  imageUrl: string;
  imageId: string;
  round: number;
  totalRounds: number;
  isSpeedRound: boolean;
  isRoastRound: boolean;
  roastTarget?: string;
  writeTimeSeconds: number;
}

type PhonePhase = 'waiting' | 'writing' | 'submitted' | 'lineup' | 'voting' | 'voted' | 'crown';

// ==================== Props ====================

interface CaptionClashPhoneProps {
  socket: Socket | null;
  playerId: string | null;
  isSpectator: boolean;
  onSendInput: (input: { gameId: string; action: string; [key: string]: unknown }) => void;
}

// ==================== Component ====================

function CaptionClashPhoneInner({ socket, playerId, isSpectator, onSendInput }: CaptionClashPhoneProps) {
  const { t } = useLanguage();
  const partySounds = usePartySounds();
  const [phase, setPhase] = useState<PhonePhase>('waiting');
  const [imageData, setImageData] = useState<ImageReadyData | null>(null);
  const {
    value: captionText,
    isEmpty: captionEmpty,
    getValue: getCaption,
    reset: resetCaption,
    inputProps: captionInputProps,
  } = useImeText<HTMLTextAreaElement>({ maxLength: 200 });
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [submissions, setSubmissions] = useState<CaptionSubmission[]>([]);
  const [votedId, setVotedId] = useState<string | null>(null);
  const [currentReveal, setCurrentReveal] = useState<CaptionSubmission | null>(null);
  const laughThrottleRef = useRef(0);
  const submitGuard = useSubmitGuard();
  const voteGuard = useSubmitGuard();

  // Timer countdown
  useEffect(() => {
    if (timeRemaining <= 0) return;
    if (timeRemaining <= 5) partySounds.onCountdown(timeRemaining);
    const interval = setInterval(() => {
      setTimeRemaining(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [timeRemaining, partySounds]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onImageReady = (data: ImageReadyData) => {
      setImageData(data);
      setPhase('writing');
      resetCaption();
      setVotedId(null);
      setSubmissions([]);
      setCurrentReveal(null);
      setTimeRemaining(data.writeTimeSeconds);
      submitGuard.reset();
      voteGuard.reset();
      partySounds.onPhaseStart();
    };

    const onRevealCaption = (data: { submission: CaptionSubmission }) => {
      setPhase('lineup');
      setCurrentReveal(data.submission);
      partySounds.onReveal();
    };

    const onPhaseChange = (data: { phase: string; gameState: Record<string, unknown> | null }) => {
      const gs = data.gameState as Record<string, unknown> | null;
      if (gs?.phase === 'voting' && gs?.submissions) {
        setPhase('voting');
        setSubmissions(gs.submissions as CaptionSubmission[]);
        setTimeRemaining(20);
        partySounds.onPhaseTransition();
      }
    };

    const onVoteResults = () => {
      setPhase('crown');
      partySounds.onCrowned();
    };

    socket.on('party:caption:imageReady', onImageReady);
    socket.on('party:caption:revealCaption', onRevealCaption);
    socket.on('party:phaseChange', onPhaseChange);
    socket.on('party:caption:voteResults', onVoteResults);

    // Ask the server to replay current state — covers mounting on the start
    // transition (or a late join), where the one-shot imageReady was missed.
    socket.emit('party:requestState');

    return () => {
      socket.off('party:caption:imageReady', onImageReady);
      socket.off('party:caption:revealCaption', onRevealCaption);
      socket.off('party:phaseChange', onPhaseChange);
      socket.off('party:caption:voteResults', onVoteResults);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- partySounds is stable, adding it would cause socket re-registration
  }, [socket]);

  const handleSubmitCaption = useCallback(() => {
    if (phase !== 'writing') return;
    const text = getCaption();
    if (!text) return;
    submitGuard.run(() => {
      onSendInput({ gameId: 'caption-clash', action: 'submit-caption', text });
      setPhase('submitted');
      partySounds.onSubmit();
    });
  }, [getCaption, phase, onSendInput, partySounds, submitGuard]);

  const handleLaugh = useCallback(() => {
    if (!currentReveal) return;
    const now = Date.now();
    if (now - laughThrottleRef.current < 200) return; // Throttle to 5 taps/sec
    laughThrottleRef.current = now;
    onSendInput({ gameId: 'caption-clash', action: 'laugh', submissionId: currentReveal.id });
  }, [currentReveal, onSendInput]);

  const handleVote = useCallback((submissionId: string) => {
    if (votedId) return;
    voteGuard.run(() => {
      setVotedId(submissionId);
      onSendInput({ gameId: 'caption-clash', action: 'vote', submissionId });
      setPhase('voted');
      partySounds.onVote();
    });
  }, [votedId, onSendInput, partySounds, voteGuard]);

  // ==================== Render ====================

  // Writing phase — text input
  if ((phase === 'writing' || phase === 'submitted') && imageData) {
    return (
      <PartyPhoneShell>
        {/* Round badge */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-neo-white font-neo-body text-xs uppercase">
            {t('party.round') || 'Round'} {imageData.round}/{imageData.totalRounds}
          </span>
          <span className={`font-neo-display text-lg ${timeRemaining <= 5 ? 'text-neo-red animate-neo-wobble' : 'text-neo-white'}`}>
            {timeRemaining}s
          </span>
        </div>

        {/* Image preview (small) */}
        <div className="border-3 border-neo-black rounded-neo shadow-hard overflow-hidden mb-4 mx-auto w-48">
          <div className="bg-neo-gray aspect-video flex items-center justify-center text-3xl">
            🖼️
          </div>
        </div>

        {imageData.isRoastRound && (
          <div className="bg-neo-pink/20 border-2 border-neo-pink rounded-neo p-2 mb-3 text-center">
            <span className="text-neo-pink font-neo-display text-sm uppercase">
              {t('party.roastPrefix') || 'Roast:'} {imageData.roastTarget}
            </span>
          </div>
        )}

        {phase === 'submitted' ? (
          <div className="flex-1 flex items-center justify-center">
            <AdaptiveMotion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="text-center"
            >
              <div className="text-4xl mb-2">✅</div>
              <p className="font-neo-display text-neo-lime uppercase">
                {t('party.captionSubmitted') || 'Submitted!'}
              </p>
              <p className="text-neo-white font-neo-body text-sm mt-1">
                {t('party.waitingForOthers') || 'Waiting for others...'}
              </p>
            </AdaptiveMotion.div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <textarea
              {...captionInputProps}
              placeholder={t('party.writeCaptionPlaceholder') || 'Write your caption...'}
              maxLength={200}
              autoFocus
              className="
                flex-1 bg-neo-navy-elevated border-3 border-neo-pink/50 rounded-neo-lg
                p-4 text-neo-white font-neo-body text-lg
                placeholder:text-neo-white
                focus:outline-hidden focus:border-neo-pink
                resize-none
              "
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-neo-white text-sm font-neo-body">
                {captionText.length}/200
              </span>
              <button
                onClick={handleSubmitCaption}
                disabled={captionEmpty}
                className={`
                  bg-neo-pink border-3 border-neo-black rounded-neo shadow-hard
                  px-6 py-3 min-h-11 font-neo-display text-neo-black uppercase font-bold
                  transition-all duration-100
                  hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg
                  active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
                  ${captionEmpty ? 'opacity-30 cursor-not-allowed' : ''}
                `}
              >
                {t('party.submit') || 'Submit'}
              </button>
            </div>
          </div>
        )}
      </PartyPhoneShell>
    );
  }

  // Lineup phase — rapid-tap laugh button
  if (phase === 'lineup') {
    return (
      <PartyPhoneShell className="items-center justify-center">
        <p className="font-neo-display text-neo-white uppercase text-sm mb-6">
          {t('party.tapToLaugh') || 'Tap to laugh!'}
        </p>
        <button
          onPointerDown={handleLaugh}
          aria-label={t('party.tapToLaugh') || 'Tap to laugh!'}
          className="
            w-[min(40vh,16rem)] aspect-square max-w-[80vw] rounded-full
            bg-neo-pink border-4 border-neo-black shadow-hard-lg
            flex items-center justify-center text-[clamp(3rem,18vw,6rem)]
            transition-transform
            active:scale-90 active:shadow-hard-pressed
            select-none touch-none
          "
        >
          😂
        </button>
        <p className="mt-4 text-neo-white font-neo-body text-xs">
          {t('party.watchTheTv') || 'Watch the TV!'}
        </p>
      </PartyPhoneShell>
    );
  }

  // Voting phase — show all captions to pick from
  if ((phase === 'voting' || phase === 'voted') && submissions.length > 0) {
    return (
      <PartyPhoneShell bounded>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-neo-display text-neo-pink uppercase text-lg">
            {phase === 'voted' ? (t('party.voted') || 'Voted!') : (t('party.pickFavorite') || 'Pick your favorite')}
          </h2>
          {phase === 'voting' && (
            <span className={`font-neo-display text-lg ${timeRemaining <= 5 ? 'text-neo-red' : 'text-neo-white'}`}>
              {timeRemaining}s
            </span>
          )}
        </div>

        <div className="flex-1 min-h-0 flex flex-col gap-2 overflow-y-auto">
          {submissions.map((sub) => {
            const isSelected = votedId === sub.id;
            return (
              <button
                key={sub.id}
                onClick={() => handleVote(sub.id)}
                disabled={phase === 'voted'}
                className={`
                  border-3 border-neo-black rounded-neo p-3 min-h-11 text-start
                  transition-all duration-100
                  ${isSelected
                    ? 'bg-neo-pink text-neo-black shadow-hard-pink'
                    : phase === 'voted'
                      ? 'bg-neo-navy-elevated text-neo-white'
                      : 'bg-neo-navy-elevated text-neo-white shadow-hard hover:-translate-x-px hover:-translate-y-px active:translate-x-px active:translate-y-px active:shadow-hard-pressed'
                  }
                `}
              >
                <span className="font-neo-body text-sm">&ldquo;{sub.text}&rdquo;</span>
              </button>
            );
          })}
        </div>
      </PartyPhoneShell>
    );
  }

  // Crown phase — watch TV
  if (phase === 'crown') {
    return (
      <PartyPhoneShell className="items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-3">👑</div>
          <p className="font-neo-display text-neo-pink uppercase">
            {t('party.results') || 'Results!'}
          </p>
          <p className="text-neo-white font-neo-body text-sm mt-2">
            {t('party.watchTheTv') || 'Watch the TV!'}
          </p>
        </div>
      </PartyPhoneShell>
    );
  }

  // Default waiting
  return (
    <PartyPhoneShell className="items-center justify-center">
      <div className="animate-pulse text-neo-white font-neo-display">
        {t('party.starting') || 'Starting...'}
      </div>
    </PartyPhoneShell>
  );
}

const CaptionClashPhone = memo(CaptionClashPhoneInner);
CaptionClashPhone.displayName = 'CaptionClashPhone';
export default CaptionClashPhone;
