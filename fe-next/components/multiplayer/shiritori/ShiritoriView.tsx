'use client';

import { useRef, useState, type KeyboardEvent, type CompositionEvent } from 'react';
import { useGSAP } from '@gsap/react';
import gsap from 'gsap';

gsap.registerPlugin(useGSAP);

export interface ShiritoriPlayerView {
  username: string;
  eliminated: boolean;
}

export interface ShiritoriViewProps {
  /** Words played so far, oldest → newest. */
  chain: string[];
  /** Kana the next word must start with (null on the opening move). */
  requiredHead: string | null;
  players: ShiritoriPlayerView[];
  /** Whose turn it is. */
  currentPlayer: string | null;
  /** This client's username. */
  me: string;
  finished: boolean;
  winner: string | null;
  /** Last rejection reason to surface (cleared by parent on next accept). */
  lastError?: string | null;
  /** Submit a word for this turn. */
  onSubmit: (word: string) => void;
  /** i18n. */
  t: (key: string) => string;
}

/**
 * Presentational Shiritori game screen — turn rail, chain history, required-head
 * prompt, and an IME-aware kana input. Pure (props + callbacks), so it unit-tests
 * without sockets; the MP view maps socket state → these props (follow-up), and a
 * pixi.js chain-visual layer can be layered over the chain history later.
 *
 * IME: Japanese kana is entered via an IME composition session. We read the live
 * DOM value at submit time and gate Enter on keyCode 229 (the "still composing"
 * code) so a mid-composition Enter never submits a half-formed reading. See
 * feedback-android-gboard-hebrew-ime.
 */
export default function ShiritoriView({
  chain,
  requiredHead,
  players,
  currentPlayer,
  me,
  finished,
  winner,
  lastError,
  onSubmit,
  t,
}: ShiritoriViewProps) {
  const root = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const [value, setValue] = useState('');

  const isMyTurn = !finished && currentPlayer === me;

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      gsap.from('.shiritori-chip', { scale: 0.7, opacity: 0, stagger: 0.04, duration: 0.3, ease: 'back.out(2)' });
    },
    { scope: root, dependencies: [chain.length] },
  );

  const submit = () => {
    // Read the live DOM value (IME may not have flushed to React state yet).
    const raw = (inputRef.current?.value ?? value).trim();
    if (!raw || !isMyTurn) return;
    onSubmit(raw);
    setValue('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // keyCode 229 = IME still composing — never submit on that Enter.
    if (e.key === 'Enter' && !composingRef.current && e.keyCode !== 229) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div ref={root} className="mx-auto flex max-w-xl flex-col gap-4 p-4">
      {/* Turn rail */}
      <ul className="flex flex-wrap gap-2" aria-label={t('shiritori.players')}>
        {players.map((p) => (
          <li
            key={p.username}
            data-active={!finished && currentPlayer === p.username}
            className={`rounded-neo border-neo border-black px-3 py-1 font-neo-display text-sm shadow-hard ${
              p.eliminated
                ? 'bg-neo-navy-light text-neo-cream/40 line-through'
                : !finished && currentPlayer === p.username
                  ? 'bg-neo-lime text-black'
                  : 'bg-neo-navy-light text-neo-cream'
            }`}
          >
            {p.username}
          </li>
        ))}
      </ul>

      {/* Required head prompt */}
      {!finished && (
        <div className="text-center">
          <p className="font-neo-body text-sm text-neo-cream/70">{t('shiritori.nextStartsWith')}</p>
          <p className="font-neo-display text-5xl font-bold text-neo-cyan" data-testid="required-head">
            {requiredHead ?? '—'}
          </p>
        </div>
      )}

      {/* Chain history */}
      <ol className="flex flex-wrap items-center gap-2" aria-label={t('shiritori.chain')}>
        {chain.map((w, i) => (
          <li
            key={`${w}-${i}`}
            className="shiritori-chip rounded-neo border-neo border-black bg-neo-pink px-3 py-1 font-neo-display text-black shadow-hard"
          >
            {w}
          </li>
        ))}
      </ol>

      {/* Game over */}
      {finished ? (
        <div className="rounded-neo border-neo-thick border-black bg-neo-yellow p-4 text-center font-neo-display text-xl font-bold text-black shadow-hard" role="status">
          {winner === me ? t('shiritori.youWin') : `${winner ?? ''} ${t('shiritori.wins')}`}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              inputMode="text"
              lang="ja"
              autoComplete="off"
              disabled={!isMyTurn}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onCompositionStart={() => { composingRef.current = true; }}
              onCompositionEnd={(e: CompositionEvent<HTMLInputElement>) => { composingRef.current = false; setValue(e.currentTarget.value); }}
              onKeyDown={onKeyDown}
              placeholder={isMyTurn ? t('shiritori.yourTurn') : t('shiritori.waitTurn')}
              aria-label={t('shiritori.inputLabel')}
              className="flex-1 rounded-neo border-neo-thick border-black bg-neo-cream px-4 py-3 font-neo-body text-black shadow-hard disabled:opacity-50"
            />
            <button
              type="button"
              onClick={submit}
              disabled={!isMyTurn || value.trim().length === 0}
              className="rounded-neo border-neo-thick border-black bg-neo-lime px-5 py-3 font-neo-display font-bold text-black shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-50"
            >
              {t('shiritori.submit')}
            </button>
          </div>
          {lastError && (
            <p className="font-neo-body text-sm text-neo-red" role="alert">
              {t(`shiritori.error.${lastError}`)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
