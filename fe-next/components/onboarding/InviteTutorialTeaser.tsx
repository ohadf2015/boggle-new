'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { trackInviteTutorialStarted, trackInviteTutorialWordFound } from '@/utils/growthTracking';
import InviteContextBanner from './InviteContextBanner';

interface Props {
  roomCode: string;
  hostName?: string;
  onComplete: () => void;
  onSkip: () => void;
}

const TEASER_LETTERS = ['C', 'A', 'T', 'S'] as const;
const ADVANCE_DELAY_MS = 1200;
const MIN_WORD_LENGTH = 3;

// Hard-coded valid words for the preset CATS board. Deterministic, no network,
// suitable for a one-moment intro teaser (not real gameplay).
const VALID_TEASER_WORDS = new Set(['CAT', 'CATS', 'ACT', 'ACTS', 'AT', 'AS', 'SAT', 'TAS']);

type TeaserState = 'idle' | 'invalid' | 'celebrating';

/**
 * One-moment interactive demo for first-time invitees. Preset 4-letter row.
 * Tap to spell, submit. First valid word → celebration → auto-advance to
 * the room. Skip is always one tap away in the sticky banner.
 */
const InviteTutorialTeaser: React.FC<Props> = ({ roomCode, hostName, onComplete, onSkip }) => {
  const { t, dir } = useLanguage();
  const [selected, setSelected] = useState<number[]>([]);
  const [state, setState] = useState<TeaserState>('idle');
  const startedAtRef = useRef<number>(0);

  const word = selected.map((i) => TEASER_LETTERS[i]).join('');

  const handleTap = useCallback(
    (idx: number) => {
      if (state === 'celebrating') return;
      setState('idle');
      setSelected((cur) => (cur.includes(idx) ? cur : [...cur, idx]));
    },
    [state]
  );

  const handleClear = useCallback(() => {
    setSelected([]);
    setState('idle');
  }, []);

  const handleSubmit = useCallback(() => {
    if (word.length < MIN_WORD_LENGTH) {
      setState('invalid');
      return;
    }
    if (!VALID_TEASER_WORDS.has(word.toUpperCase())) {
      setState('invalid');
      return;
    }
    trackInviteTutorialWordFound({
      roomCode,
      word: word.toUpperCase(),
      secondsSinceStart: startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : 0,
    });
    setState('celebrating');
  }, [word, roomCode]);

  // Initialize tracking timer on mount
  useEffect(() => {
    startedAtRef.current = Date.now();
    trackInviteTutorialStarted({ roomCode });
  }, [roomCode]);

  // Auto-advance once celebrating
  useEffect(() => {
    if (state !== 'celebrating') return;
    const id = setTimeout(onComplete, ADVANCE_DELAY_MS);
    return () => clearTimeout(id);
  }, [state, onComplete]);

  return (
    <div dir={dir} className="flex flex-col w-full max-w-md mx-auto">
      <InviteContextBanner roomCode={roomCode} hostName={hostName} onSkip={onSkip} />

      <div className="px-6 py-8 flex flex-col items-center gap-6">
        <h2 className="text-xl font-neo-display font-black text-neo-white uppercase tracking-wide text-center">
          {t('invite.tutorial.prompt')}
        </h2>

        <div
          data-testid="teaser-board"
          className="flex gap-2"
          role="group"
          aria-label={t('invite.tutorial.prompt')}
        >
          {TEASER_LETTERS.map((letter, idx) => {
            const isSelected = selected.includes(idx);
            return (
              <button
                key={letter}
                data-testid={`teaser-tile-${letter}`}
                type="button"
                onClick={() => handleTap(idx)}
                aria-pressed={isSelected}
                className={`min-w-[64px] min-h-[64px] rounded-neo border-neo-thick font-neo-display font-black text-2xl uppercase shadow-hard transition-transform active:translate-y-px ${
                  isSelected ? 'bg-neo-lime text-neo-black' : 'bg-neo-navy-light text-neo-white'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        <p
          data-testid="teaser-current-word"
          className="font-mono text-xl text-neo-white min-h-[2rem]"
          aria-live="polite"
        >
          {word || '—'}
        </p>

        <div className="flex gap-3">
          <button
            data-testid="teaser-clear"
            type="button"
            onClick={handleClear}
            className="min-h-[44px] px-4 py-2 rounded-neo border-2 border-neo-cream/60 text-neo-white font-neo-display text-sm uppercase tracking-wide active:translate-y-px"
          >
            {t('invite.tutorial.clear')}
          </button>
          <button
            data-testid="teaser-submit"
            type="button"
            onClick={handleSubmit}
            disabled={selected.length < MIN_WORD_LENGTH || state === 'celebrating'}
            className="min-h-[44px] px-5 py-2 rounded-neo border-neo-thick bg-neo-lime text-neo-black font-neo-display font-black text-sm uppercase tracking-wide shadow-hard active:translate-y-px disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('invite.tutorial.submit')}
          </button>
        </div>

        {state === 'invalid' && (
          <p data-testid="teaser-invalid" className="text-neo-red font-neo-body text-sm" role="status">
            {t('invite.tutorial.invalid')}
          </p>
        )}

        {state === 'celebrating' && (
          <div
            data-testid="teaser-celebrate"
            className="px-4 py-2 rounded-neo bg-neo-lime text-neo-black font-neo-display font-black uppercase shadow-hard"
            role="status"
            aria-live="assertive"
          >
            {t('invite.tutorial.celebrate', { hostName: hostName || t('invite.banner.yourFriend') })}
          </div>
        )}
      </div>
    </div>
  );
};

export default InviteTutorialTeaser;
