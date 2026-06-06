'use client';

/**
 * Pixel Clash — Phone Controller View (Scribble Mode)
 * Freehand drawing canvas for Gartic Phone / Skribbl.io style gameplay.
 * Shows: prompt input, drawing canvas, text input for guessing, vote buttons.
 */

import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { setInterval, clearInterval } from 'worker-timers';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { DrawingCanvas, type DrawingData, type DrawingCanvasHandle } from './DrawingCanvas';
import { usePartySounds } from '@/hooks/usePartySounds';
import { useImeText } from '@/hooks/useImeText';
import { PartyPhoneShell } from '@/components/party/shared/PartyPhoneShell';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';

// ==================== Types ====================

interface AssignmentData {
  phase: string;
  content: string | DrawingData;
  chainId: string;
  timeSeconds: number;
}

interface RelayArtistStartData {
  prompt: string;
  timeSeconds: number;
}

interface RelayBuildStartData {
  referenceStrokes: DrawingData;
  timeSeconds: number;
}

interface PhaseUpdateData {
  mode: string;
  phase: string;
  prompt?: string;
  timeSeconds: number;
}

interface ShowdownCanvasesData {
  canvases: Array<{ id: string; strokes: DrawingData; number: number }>;
  prompt: string;
  timeSeconds: number;
}

type PhonePhase = 'waiting' | 'write-prompt' | 'drawing' | 'guessing' | 'relay-draw' | 'relay-build' | 'showdown-vote' | 'submitted' | 'watching';

// ==================== Props ====================

interface PixelClashPhoneProps {
  socket: Socket | null;
  playerId: string | null;
  isSpectator: boolean;
  onSendInput: (input: { gameId: string; action: string; [key: string]: unknown }) => void;
}

// ==================== Component ====================

function PixelClashPhoneInner({ socket, playerId, isSpectator, onSendInput }: PixelClashPhoneProps) {
  const { t } = useLanguage();
  const partySounds = usePartySounds();
  const [phase, setPhase] = useState<PhonePhase>('waiting');
  const {
    value: promptText,
    isEmpty: promptEmpty,
    getValue: getPrompt,
    reset: resetPrompt,
    inputProps: promptInputProps,
  } = useImeText<HTMLInputElement>({ maxLength: 50 });
  const {
    value: guessText,
    isEmpty: guessEmpty,
    getValue: getGuess,
    reset: resetGuess,
    inputProps: guessInputProps,
  } = useImeText<HTMLInputElement>({ maxLength: 50 });
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [relayPrompt, setRelayPrompt] = useState('');
  const [relayReference, setRelayReference] = useState<DrawingData | null>(null);
  const [showdownCanvases, setShowdownCanvases] = useState<ShowdownCanvasesData | null>(null);
  const [showdownVote, setShowdownVote] = useState<{ best: string; funniest: string }>({ best: '', funniest: '' });
  const [timeRemaining, setTimeRemaining] = useState(0);
  const canvasHandleRef = useRef<DrawingCanvasHandle>(null);
  const strokesRef = useRef<DrawingData>([]);
  const submitGuard = useSubmitGuard();

  // Canvas size must track the live viewport: a one-shot read froze the canvas
  // at its mount width, so a rotate/resize left it the wrong size (R3). Cap at
  // 320 on phones, but let tablets use more width (up to 420).
  const [canvasSize, setCanvasSize] = useState(320);
  useEffect(() => {
    const measure = () => setCanvasSize(Math.min(420, Math.max(200, window.innerWidth - 32)));
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

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

    const onPhaseUpdate = (data: PhaseUpdateData) => {
      setTimeRemaining(data.timeSeconds);
      submitGuard.reset();
      partySounds.onPhaseTransition();

      if (data.phase === 'write-prompt') {
        // Legacy — prompts now auto-assigned, but keep for safety
        setPhase('write-prompt');
        resetPrompt();
        strokesRef.current = [];
      } else if (data.phase === 'drawing') {
        // Telephone mode: assignment comes separately via party:pixel:assignment
        // Just set the timer, assignment handler sets the actual phase
        strokesRef.current = [];
      } else if (data.phase === 'guessing') {
        strokesRef.current = [];
      } else if (data.phase === 'showdown-draw') {
        setPhase('drawing');
        setRelayPrompt(data.prompt || '');
        strokesRef.current = [];
      } else if (data.phase === 'relay-artist') {
        setPhase('watching');
      } else if (data.phase === 'gallery-reveal' || data.phase === 'relay-merge' || data.phase === 'crown') {
        setPhase('watching');
      }
    };

    const onAssignment = (data: AssignmentData) => {
      setAssignment(data);
      setTimeRemaining(data.timeSeconds);
      strokesRef.current = [];
      submitGuard.reset();

      if (data.phase === 'drawing') {
        setPhase('drawing');
      } else {
        setPhase('guessing');
        resetGuess();
      }
    };

    const onRelayArtistStart = (data: RelayArtistStartData) => {
      setPhase('relay-draw');
      setRelayPrompt(data.prompt);
      setTimeRemaining(data.timeSeconds);
      strokesRef.current = [];
      submitGuard.reset();
    };

    const onRelayBuildStart = (data: RelayBuildStartData) => {
      setPhase('relay-build');
      setTimeRemaining(data.timeSeconds);
      setRelayReference(data.referenceStrokes);
      strokesRef.current = [];
      submitGuard.reset();
    };

    const onShowdownCanvases = (data: ShowdownCanvasesData) => {
      setPhase('showdown-vote');
      setShowdownCanvases(data);
      setTimeRemaining(data.timeSeconds);
      setShowdownVote({ best: '', funniest: '' });
      submitGuard.reset();
    };

    socket.on('party:pixel:phaseUpdate', onPhaseUpdate);
    socket.on('party:pixel:assignment', onAssignment);
    socket.on('party:pixel:relayArtistStart', onRelayArtistStart);
    socket.on('party:pixel:relayBuildStart', onRelayBuildStart);
    socket.on('party:pixel:showdownCanvases', onShowdownCanvases);

    // Replay current state if we mounted mid-phase (one-shot events missed).
    socket.emit('party:requestState');

    return () => {
      socket.off('party:pixel:phaseUpdate', onPhaseUpdate);
      socket.off('party:pixel:assignment', onAssignment);
      socket.off('party:pixel:relayArtistStart', onRelayArtistStart);
      socket.off('party:pixel:relayBuildStart', onRelayBuildStart);
      socket.off('party:pixel:showdownCanvases', onShowdownCanvases);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- partySounds is stable, adding it would cause socket re-registration
  }, [socket]);

  // Track strokes on stroke end
  const handleStrokeEnd = useCallback((paths: DrawingData) => {
    strokesRef.current = paths;
  }, []);

  // Live path streaming for relay artist
  const handleLiveUpdate = useCallback((paths: DrawingData) => {
    strokesRef.current = paths;
    if (phase === 'relay-draw') {
      onSendInput({ gameId: 'pixel-clash', action: 'live-stroke', paths });
    }
  }, [phase, onSendInput]);

  const handleSubmitPrompt = useCallback(() => {
    const text = getPrompt();
    if (!text) return;
    submitGuard.run(() => {
      onSendInput({ gameId: 'pixel-clash', action: 'submit-prompt', text });
      setPhase('submitted');
      partySounds.onSubmit();
    });
  }, [getPrompt, onSendInput, partySounds, submitGuard]);

  const handleSubmitDrawing = useCallback(() => {
    const strokes = strokesRef.current;
    if (strokes.length === 0) return;
    submitGuard.run(() => {
      if (assignment?.chainId) {
        onSendInput({ gameId: 'pixel-clash', action: 'draw', strokes, chainId: assignment.chainId });
      } else if (phase === 'relay-draw') {
        onSendInput({ gameId: 'pixel-clash', action: 'draw', strokes, isRelay: true });
      } else if (phase === 'relay-build') {
        onSendInput({ gameId: 'pixel-clash', action: 'draw', strokes, isRelay: true, isBuilder: true });
      } else {
        // Showdown
        onSendInput({ gameId: 'pixel-clash', action: 'draw', strokes });
      }
      setPhase('submitted');
      partySounds.onSubmit();
    });
  }, [assignment, phase, onSendInput, partySounds, submitGuard]);

  const handleSubmitGuess = useCallback(() => {
    if (!assignment?.chainId) return;
    const text = getGuess();
    if (!text) return;
    submitGuard.run(() => {
      onSendInput({ gameId: 'pixel-clash', action: 'guess', text, chainId: assignment.chainId });
      setPhase('submitted');
      partySounds.onSubmit();
    });
  }, [getGuess, assignment, onSendInput, partySounds, submitGuard]);

  const handleSubmitVote = useCallback(() => {
    if (!showdownVote.best) return;
    submitGuard.run(() => {
      onSendInput({ gameId: 'pixel-clash', action: 'vote', best: showdownVote.best, funniest: showdownVote.funniest });
      setPhase('submitted');
      partySounds.onVote();
    });
  }, [showdownVote, onSendInput, partySounds, submitGuard]);

  // Timer display - inline to avoid component-during-render lint error
  const timerBadge = (
    <span className={`font-neo-display text-lg ${timeRemaining <= 5 ? 'text-neo-red animate-neo-wobble' : 'text-neo-white'}`}>
      {timeRemaining}s
    </span>
  );

  // ==================== Write Prompt (Telephone) ====================
  if (phase === 'write-prompt') {
    return (
      <PartyPhoneShell>
        <div className="flex items-center justify-between mb-3">
          <span className="text-neo-white font-neo-body text-xs uppercase">
            {t('party.writePrompt')}
          </span>
          {timerBadge}
        </div>

        <input
          type="text"
          {...promptInputProps}
          placeholder={t('party.promptPlaceholder')}
          maxLength={50}
          autoFocus
          className="
            bg-neo-navy-elevated border-3 border-neo-cyan/50 rounded-neo
            px-4 py-3 text-neo-white font-neo-body text-lg
            placeholder:text-neo-white
            focus:outline-hidden focus:border-neo-cyan mb-4
          "
        />

        <button
          onClick={handleSubmitPrompt}
          disabled={promptEmpty}
          className={`
            bg-neo-cyan border-3 border-neo-black rounded-neo shadow-hard
            px-6 py-3 min-h-11 font-neo-display text-neo-black uppercase font-bold
            transition-all duration-100
            hover:-translate-x-px hover:-translate-y-px hover:shadow-hard-lg
            active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
            ${promptEmpty ? 'opacity-30 cursor-not-allowed' : ''}
          `}
        >
          {t('party.submit')}
        </button>
      </PartyPhoneShell>
    );
  }

  // ==================== Drawing Phase ====================
  if (phase === 'drawing' || phase === 'relay-draw' || phase === 'relay-build') {
    const showPrompt = phase === 'relay-draw'
      ? relayPrompt
      : assignment?.phase === 'drawing' && typeof assignment.content === 'string'
        ? assignment.content as string
        : relayPrompt;

    return (
      <PartyPhoneShell className="items-center">
        <div className="flex items-center justify-between w-full mb-2">
          {showPrompt && (
            <span className="font-neo-display text-neo-cyan text-sm uppercase truncate max-w-[60%]">
              {showPrompt}
            </span>
          )}
          {timerBadge}
        </div>

        {/* Drawing reference for telephone: show the text prompt */}
        {assignment?.phase === 'drawing' && typeof assignment.content === 'string' && (
          <div className="bg-neo-navy-elevated border-2 border-neo-cyan/30 rounded-neo px-3 py-2 mb-2 w-full">
            <p className="font-neo-body text-neo-white text-sm text-center">
              {t('party.draw')}: &ldquo;{assignment.content}&rdquo;
            </p>
          </div>
        )}

        <DrawingCanvas
          ref={canvasHandleRef}
          width={canvasSize}
          height={canvasSize}
          initialPaths={relayReference || undefined}
          onStrokeEnd={handleStrokeEnd}
          onStrokeUpdate={phase === 'relay-draw' ? handleLiveUpdate : undefined}
        />

        <button
          onClick={handleSubmitDrawing}
          className="
            mt-3 bg-neo-cyan border-3 border-neo-black rounded-neo shadow-hard
            px-6 py-2.5 font-neo-display text-neo-black uppercase font-bold text-sm
            transition-all duration-100
            active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
          "
        >
          {t('party.done')}
        </button>
      </PartyPhoneShell>
    );
  }

  // ==================== Guessing Phase (Telephone) ====================
  if (phase === 'guessing' && assignment) {
    return (
      <PartyPhoneShell className="items-center">
        <div className="flex items-center justify-between w-full mb-3">
          <span className="text-neo-white font-neo-body text-xs uppercase">
            {t('party.whatIsThis')}
          </span>
          {timerBadge}
        </div>

        {/* Show the drawing to guess */}
        {Array.isArray(assignment.content) && (
          <div className="mb-4">
            <DrawingCanvas
              width={280}
              height={280}
              initialPaths={assignment.content as DrawingData}
              readOnly
            />
          </div>
        )}

        <input
          type="text"
          {...guessInputProps}
          placeholder={t('party.typeGuess')}
          maxLength={50}
          autoFocus
          className="
            w-full bg-neo-navy-elevated border-3 border-neo-cyan/50 rounded-neo
            px-4 py-3 text-neo-white font-neo-body text-lg
            placeholder:text-neo-white
            focus:outline-hidden focus:border-neo-cyan mb-3
          "
        />

        <button
          onClick={handleSubmitGuess}
          disabled={guessEmpty}
          className={`
            bg-neo-cyan border-3 border-neo-black rounded-neo shadow-hard
            px-6 py-3 min-h-11 font-neo-display text-neo-black uppercase font-bold
            active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
            ${guessEmpty ? 'opacity-30 cursor-not-allowed' : ''}
          `}
        >
          {t('party.submit')}
        </button>
      </PartyPhoneShell>
    );
  }

  // ==================== Showdown Vote ====================
  if (phase === 'showdown-vote' && showdownCanvases) {
    return (
      <PartyPhoneShell>
        <div className="flex items-center justify-between mb-3">
          <span className="font-neo-display text-neo-cyan text-sm uppercase">
            {t('party.pickFavorite')}
          </span>
          {timerBadge}
        </div>

        <p className="text-neo-white font-neo-body text-xs mb-3">
          &ldquo;{showdownCanvases.prompt}&rdquo;
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {showdownCanvases.canvases.map((entry) => {
            const isBest = showdownVote.best === entry.id;
            const isFunniest = showdownVote.funniest === entry.id;
            const isSelf = entry.id === playerId;
            return (
              <button
                key={entry.id}
                disabled={isSelf}
                onClick={() => {
                  if (!showdownVote.best) {
                    setShowdownVote(prev => ({ ...prev, best: entry.id }));
                  } else if (!showdownVote.funniest && entry.id !== showdownVote.best) {
                    setShowdownVote(prev => ({ ...prev, funniest: entry.id }));
                  }
                }}
                className={`
                  p-2 rounded-neo border-3 transition-all
                  ${isBest ? 'border-neo-lime bg-neo-lime/10' : isFunniest ? 'border-neo-pink bg-neo-pink/10' : 'border-neo-cream/20'}
                  ${isSelf ? 'opacity-40 cursor-not-allowed' : 'hover:border-neo-cream/50'}
                `}
              >
                <DrawingCanvas
                  width={Math.floor((canvasSize - 40) / 2)}
                  height={Math.floor((canvasSize - 40) / 2)}
                  initialPaths={entry.strokes}
                  readOnly
                />
                <span className="text-neo-white text-xs font-neo-body mt-1 block">#{entry.number}</span>
                {isBest && <span className="text-neo-lime text-xs font-bold">{t('party.bestLabel') || 'Best'}</span>}
                {isFunniest && <span className="text-neo-pink text-xs font-bold">{t('party.funniestLabel') || 'Funniest'}</span>}
              </button>
            );
          })}
        </div>

        {showdownVote.best && (
          <button
            onClick={handleSubmitVote}
            className="
              bg-neo-lime border-3 border-neo-black rounded-neo shadow-hard
              px-6 py-3 font-neo-display text-neo-black uppercase font-bold
              active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
            "
          >
            {t('party.vote')}
          </button>
        )}
      </PartyPhoneShell>
    );
  }

  // ==================== Submitted / Watching ====================
  if (phase === 'submitted' || phase === 'watching') {
    return (
      <PartyPhoneShell className="items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3">{phase === 'submitted' ? '✅' : '👀'}</div>
          <p className="font-neo-display text-neo-cyan uppercase">
            {phase === 'submitted'
              ? t('party.submitted')
              : t('party.watchTheTv')}
          </p>
        </div>
      </PartyPhoneShell>
    );
  }

  // Default waiting
  return (
    <PartyPhoneShell className="items-center justify-center">
      <div className="animate-pulse text-neo-white font-neo-display">
        {t('party.starting')}
      </div>
    </PartyPhoneShell>
  );
}

const PixelClashPhone = memo(PixelClashPhoneInner);
PixelClashPhone.displayName = 'PixelClashPhone';
export default PixelClashPhone;
