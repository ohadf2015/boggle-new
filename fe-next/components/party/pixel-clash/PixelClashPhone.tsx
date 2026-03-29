'use client';

/**
 * Pixel Clash — Phone Controller View
 * Shows: prompt input, pixel canvas for drawing, text input for guessing,
 * vote buttons. Adapts to current game mode and phase.
 */

import { memo, useEffect, useState, useCallback, useRef } from 'react';
import type { Socket } from 'socket.io-client';
import { useLanguage } from '@/contexts/LanguageContext';
import { PixelCanvas, type PixelGrid } from './PixelCanvas';

// ==================== Types ====================

interface AssignmentData {
  phase: string;
  content: string | PixelGrid;
  chainId: string;
  timeSeconds: number;
  gridSize: number;
}

interface RelayArtistStartData {
  prompt: string;
  gridSize: number;
  timeSeconds: number;
}

interface RelayBuildStartData {
  bandFragment: PixelGrid;
  startRow: number;
  endRow: number;
  gridSize: number;
  timeSeconds: number;
}

interface PhaseUpdateData {
  mode: string;
  phase: string;
  prompt?: string;
  timeSeconds: number;
  gridSize?: number;
}

type PhonePhase = 'waiting' | 'write-prompt' | 'drawing' | 'guessing' | 'relay-draw' | 'relay-build' | 'submitted' | 'watching';

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
  const [phase, setPhase] = useState<PhonePhase>('waiting');
  const [promptText, setPromptText] = useState('');
  const [guessText, setGuessText] = useState('');
  const [currentCanvas, setCurrentCanvas] = useState<PixelGrid | null>(null);
  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [relayPrompt, setRelayPrompt] = useState('');
  const [editableRange, setEditableRange] = useState<{ startRow: number; endRow: number } | null>(null);
  const [gridSize, setGridSize] = useState(10);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const canvasRef = useRef<PixelGrid | null>(null);

  // Timer
  useEffect(() => {
    if (timeRemaining <= 0) return;
    const interval = setInterval(() => setTimeRemaining(prev => Math.max(0, prev - 1)), 1000);
    return () => clearInterval(interval);
  }, [timeRemaining]);

  // Socket listeners
  useEffect(() => {
    if (!socket) return;

    const onPhaseUpdate = (data: PhaseUpdateData) => {
      if (data.gridSize) setGridSize(data.gridSize);
      setTimeRemaining(data.timeSeconds);

      if (data.phase === 'write-prompt') {
        setPhase('write-prompt');
        setPromptText('');
      } else if (data.phase === 'showdown-draw') {
        setPhase('drawing');
        setRelayPrompt(data.prompt || '');
        setCurrentCanvas(null);
        setEditableRange(null);
      } else if (data.phase === 'relay-artist') {
        // Only the artist gets the relay start event separately
        setPhase('watching');
      } else if (data.phase === 'gallery-reveal' || data.phase === 'relay-merge') {
        setPhase('watching');
      }
    };

    const onAssignment = (data: AssignmentData) => {
      setAssignment(data);
      setGridSize(data.gridSize);
      setTimeRemaining(data.timeSeconds);
      setEditableRange(null);

      if (data.phase === 'drawing') {
        setPhase('drawing');
        setCurrentCanvas(null);
      } else {
        setPhase('guessing');
        setGuessText('');
      }
    };

    const onRelayArtistStart = (data: RelayArtistStartData) => {
      setPhase('relay-draw');
      setRelayPrompt(data.prompt);
      setGridSize(data.gridSize);
      setTimeRemaining(data.timeSeconds);
      setCurrentCanvas(null);
      setEditableRange(null);
    };

    const onRelayBuildStart = (data: RelayBuildStartData) => {
      setPhase('relay-build');
      setGridSize(data.gridSize);
      setTimeRemaining(data.timeSeconds);
      setCurrentCanvas(data.bandFragment);
      setEditableRange({ startRow: data.startRow, endRow: data.endRow });
    };

    socket.on('party:pixel:phaseUpdate', onPhaseUpdate);
    socket.on('party:pixel:assignment', onAssignment);
    socket.on('party:pixel:relayArtistStart', onRelayArtistStart);
    socket.on('party:pixel:relayBuildStart', onRelayBuildStart);

    return () => {
      socket.off('party:pixel:phaseUpdate', onPhaseUpdate);
      socket.off('party:pixel:assignment', onAssignment);
      socket.off('party:pixel:relayArtistStart', onRelayArtistStart);
      socket.off('party:pixel:relayBuildStart', onRelayBuildStart);
    };
  }, [socket]);

  // Canvas change handler — also sends live updates for relay artist
  const handleCanvasChange = useCallback((grid: PixelGrid) => {
    canvasRef.current = grid;
    if (phase === 'relay-draw') {
      // Live update for progressive pixelation
      onSendInput({ gameId: 'pixel-clash', action: 'draw', canvas: grid, isRelay: true });
    }
  }, [phase, onSendInput]);

  const handleSubmitPrompt = useCallback(() => {
    if (!promptText.trim()) return;
    onSendInput({ gameId: 'pixel-clash', action: 'submit-prompt', text: promptText.trim() });
    setPhase('submitted');
  }, [promptText, onSendInput]);

  const handleSubmitDrawing = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (assignment?.chainId) {
      onSendInput({ gameId: 'pixel-clash', action: 'draw', canvas, chainId: assignment.chainId });
    } else if (phase === 'relay-draw') {
      onSendInput({ gameId: 'pixel-clash', action: 'draw', canvas, isRelay: true });
    } else if (phase === 'relay-build') {
      onSendInput({ gameId: 'pixel-clash', action: 'draw', canvas, isRelay: true, isBuilder: true });
    } else {
      onSendInput({ gameId: 'pixel-clash', action: 'draw', canvas });
    }
    setPhase('submitted');
  }, [assignment, phase, onSendInput]);

  const handleSubmitGuess = useCallback(() => {
    if (!guessText.trim() || !assignment?.chainId) return;
    onSendInput({ gameId: 'pixel-clash', action: 'guess', text: guessText.trim(), chainId: assignment.chainId });
    setPhase('submitted');
  }, [guessText, assignment, onSendInput]);

  // ==================== Render ====================

  // Write prompt (telephone mode)
  if (phase === 'write-prompt') {
    return (
      <div className="min-h-screen bg-neo-navy flex flex-col p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-neo-cream/50 font-neo-body text-xs uppercase">
            {t('party.writePrompt') || 'Write something to draw'}
          </span>
          <span className={`font-neo-display ${timeRemaining <= 5 ? 'text-neo-red' : 'text-neo-cream'}`}>
            {timeRemaining}s
          </span>
        </div>

        <input
          type="text"
          value={promptText}
          onChange={e => setPromptText(e.target.value.slice(0, 50))}
          placeholder={t('party.promptPlaceholder') || 'cat on a skateboard...'}
          maxLength={50}
          autoFocus
          className="
            bg-neo-navy-elevated border-3 border-neo-cyan/50 rounded-neo
            px-4 py-3 text-neo-cream font-neo-body text-lg
            placeholder:text-neo-cream/20
            focus:outline-none focus:border-neo-cyan
            mb-4
          "
        />

        <button
          onClick={handleSubmitPrompt}
          disabled={!promptText.trim()}
          className="
            bg-neo-cyan border-3 border-neo-black rounded-neo shadow-hard
            px-6 py-3 font-neo-display text-neo-black uppercase font-bold
            transition-all duration-100
            hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-hard-lg
            active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
            disabled:opacity-30 disabled:cursor-not-allowed
          "
        >
          {t('party.submit') || 'Submit'}
        </button>
      </div>
    );
  }

  // Drawing phase (telephone, showdown, or relay artist)
  if (phase === 'drawing' || phase === 'relay-draw' || phase === 'relay-build') {
    const showPrompt = phase === 'relay-draw' ? relayPrompt :
                       assignment?.phase === 'drawing' && typeof assignment.content === 'string' ? assignment.content as string : '';

    return (
      <div className="min-h-screen bg-neo-navy flex flex-col items-center p-3">
        <div className="flex items-center justify-between w-full mb-2">
          {showPrompt && (
            <span className="font-neo-display text-neo-cyan text-sm uppercase truncate max-w-[60%]">
              {showPrompt}
            </span>
          )}
          <span className={`font-neo-display ${timeRemaining <= 5 ? 'text-neo-red animate-neo-wobble' : 'text-neo-cream'}`}>
            {timeRemaining}s
          </span>
        </div>

        {/* Drawing reference (telephone: show the previous guess text) */}
        {assignment?.phase === 'drawing' && typeof assignment.content === 'string' && (
          <div className="bg-neo-navy-elevated border-2 border-neo-cyan/30 rounded-neo px-3 py-2 mb-2 w-full">
            <p className="font-neo-body text-neo-cream text-sm text-center">
              Draw: &ldquo;{assignment.content}&rdquo;
            </p>
          </div>
        )}

        <PixelCanvas
          gridSize={gridSize}
          initialGrid={currentCanvas || undefined}
          editableRange={editableRange}
          onChange={handleCanvasChange}
          maxSize={Math.min(320, typeof window !== 'undefined' ? window.innerWidth - 32 : 320)}
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
          {t('party.done') || 'Done'}
        </button>
      </div>
    );
  }

  // Guessing phase (telephone: see drawing, write guess)
  if (phase === 'guessing' && assignment) {
    return (
      <div className="min-h-screen bg-neo-navy flex flex-col items-center p-4">
        <div className="flex items-center justify-between w-full mb-3">
          <span className="text-neo-cream/50 font-neo-body text-xs uppercase">
            {t('party.whatIsThis') || 'What is this?'}
          </span>
          <span className={`font-neo-display ${timeRemaining <= 5 ? 'text-neo-red' : 'text-neo-cream'}`}>
            {timeRemaining}s
          </span>
        </div>

        {/* Show the drawing to guess */}
        {Array.isArray(assignment.content) && (
          <div className="mb-4">
            <PixelCanvas
              gridSize={gridSize}
              initialGrid={assignment.content as PixelGrid}
              readOnly
              maxSize={280}
            />
          </div>
        )}

        <input
          type="text"
          value={guessText}
          onChange={e => setGuessText(e.target.value.slice(0, 50))}
          placeholder={t('party.typeGuess') || 'Type your guess...'}
          maxLength={50}
          autoFocus
          className="
            w-full bg-neo-navy-elevated border-3 border-neo-cyan/50 rounded-neo
            px-4 py-3 text-neo-cream font-neo-body text-lg
            placeholder:text-neo-cream/20
            focus:outline-none focus:border-neo-cyan
            mb-3
          "
        />

        <button
          onClick={handleSubmitGuess}
          disabled={!guessText.trim()}
          className="
            bg-neo-cyan border-3 border-neo-black rounded-neo shadow-hard
            px-6 py-3 font-neo-display text-neo-black uppercase font-bold
            active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed
            disabled:opacity-30 disabled:cursor-not-allowed
          "
        >
          {t('party.submit') || 'Submit'}
        </button>
      </div>
    );
  }

  // Submitted / Watching
  if (phase === 'submitted' || phase === 'watching') {
    return (
      <div className="min-h-screen bg-neo-navy flex items-center justify-center p-4">
        <div className="text-center">
          <div className="text-4xl mb-3">{phase === 'submitted' ? '✅' : '👀'}</div>
          <p className="font-neo-display text-neo-cyan uppercase">
            {phase === 'submitted'
              ? (t('party.submitted') || 'Submitted!')
              : (t('party.watchTheTv') || 'Watch the TV!')}
          </p>
        </div>
      </div>
    );
  }

  // Default waiting
  return (
    <div className="min-h-screen bg-neo-navy flex items-center justify-center">
      <div className="animate-pulse text-neo-cream/50 font-neo-display">
        {t('party.starting') || 'Starting...'}
      </div>
    </div>
  );
}

const PixelClashPhone = memo(PixelClashPhoneInner);
PixelClashPhone.displayName = 'PixelClashPhone';
export default PixelClashPhone;
