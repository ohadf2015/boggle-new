'use client';

import { useEffect, useRef, useState, type KeyboardEvent, type CompositionEvent } from 'react';
import { SHIRITORI_TURN_MS } from '@/shared/constants/shiritoriConstants';

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
  /** Unix-ms when the current turn started — drives the countdown bar. */
  turnStartedAt?: number | null;
  /** i18n. Matches LanguageContext.t. */
  t: (
    key: string,
    fallbackOrParams?: string | Record<string, string | number>,
    params?: Record<string, string | number>,
  ) => string;
  /** Text direction — defaults to ltr for tests. */
  dir?: 'ltr' | 'rtl';
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
  turnStartedAt,
  t,
  dir = 'ltr',
}: ShiritoriViewProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const composingRef = useRef(false);
  const [value, setValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const TIMEOUT_SECS = SHIRITORI_TURN_MS / 1000;
  const [secsLeft, setSecsLeft] = useState<number>(() =>
    turnStartedAt ? Math.max(0, Math.ceil((SHIRITORI_TURN_MS - (Date.now() - turnStartedAt)) / 1000)) : TIMEOUT_SECS
  );

  useEffect(() => {
    if (finished || !turnStartedAt) return;
    const tick = () => setSecsLeft(Math.max(0, Math.ceil((SHIRITORI_TURN_MS - (Date.now() - turnStartedAt)) / 1000)));
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [turnStartedAt, finished]);

  const isMyTurn = !finished && currentPlayer === me;

  const submit = () => {
    // Read the live DOM value (IME may not have flushed to React state yet).
    const raw = (inputRef.current?.value ?? value).trim();
    if (!raw || !isMyTurn || isSubmitting) return;
    setIsSubmitting(true);
    onSubmit(raw);
    setValue('');
    if (inputRef.current) inputRef.current.value = '';
    // Re-enable input after a brief window so rapid double-clicks / double-Enter
    // cannot emit multiple socket events before the server has accepted the word.
    window.setTimeout(() => setIsSubmitting(false), 600);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // keyCode 229 = IME still composing — never submit on that Enter.
    if (e.key === 'Enter' && !composingRef.current && e.keyCode !== 229 && !isSubmitting) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 p-4 lg:max-w-3xl lg:grid lg:grid-cols-[1fr_11rem] lg:items-start lg:gap-6" dir={dir}>
      {/* Turn rail — stacks on top on mobile, becomes a right sidebar at lg so
          wide desktop viewports don't leave the chain floating in dead space. */}
      <aside className="lg:col-start-2 lg:row-start-1" data-testid="shiritori-turn-rail">
        <h3 className="mb-1.5 hidden font-neo-display text-[11px] font-bold uppercase tracking-wide text-neo-cream/70 lg:block">
          {t('shiritori.players')}
        </h3>
        <ul className="flex flex-wrap gap-2 lg:flex-col" aria-label={t('shiritori.players')}>
          {players.map((p) => (
            <li
              key={p.username}
              data-active={!finished && currentPlayer === p.username}
              className={`rounded-neo border-neo border-black px-3 py-1 font-neo-display text-sm shadow-hard ${
                p.eliminated
                  ? 'bg-neo-navy-light text-neo-white line-through'
                  : !finished && currentPlayer === p.username
                    ? 'bg-neo-lime text-black'
                    : 'bg-neo-navy-light text-neo-white'
              }`}
            >
              {p.username}
            </li>
          ))}
        </ul>
      </aside>

      <div className="flex flex-col gap-4 lg:col-start-1 lg:row-start-1">
        {/* Required head prompt */}
        {!finished && (
          <div className="text-center">
            <p className="font-neo-body text-sm text-neo-white">{t('shiritori.nextStartsWith')}</p>
            <p className="font-neo-display text-5xl font-bold text-neo-cyan" data-testid="required-head" dir="ltr">
              {requiredHead ?? t('shiritori.empty', '—')}
            </p>
          </div>
        )}

        {/* Turn countdown — depletes over SHIRITORI_TURN_MS, turns orange at ≤5s */}
        {!finished && turnStartedAt != null && (
          <div role="timer" className="overflow-hidden rounded-neo border-neo border-black bg-neo-navy-light">
            <div
              className={`h-2 transition-all duration-200 ${secsLeft <= 5 ? 'bg-neo-orange' : secsLeft <= 9 ? 'bg-neo-yellow' : 'bg-neo-lime'}`}
              style={{ width: `${Math.min(100, (secsLeft / TIMEOUT_SECS) * 100)}%` }}
            />
          </div>
        )}

        {/* Chain history */}
        <ol className="flex flex-wrap items-center gap-2" aria-label={t('shiritori.chain')} dir="ltr">
          {chain.map((w, i) => (
            <li
              key={`${w}-${i}`}
              className="shiritori-chip animate-neo-pop rounded-neo border-neo border-black bg-neo-pink px-3 py-1 font-neo-display text-black shadow-hard motion-reduce:animate-none"
            >
              {w}
            </li>
          ))}
        </ol>

        {/* Game over */}
        {finished ? (
          <div className="rounded-neo border-neo-thick border-black bg-neo-yellow p-4 text-center font-neo-display text-xl font-bold text-black shadow-hard" role="status" dir={dir}>
            {winner === me
              ? t('shiritori.youWin')
              : winner
                ? t('shiritori.winner', { winner, defaultValue: '{{winner}} wins!' })
                : t('shiritori.finished', 'Game over')}
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
                dir="ltr"
                className="flex-1 rounded-neo border-neo-thick border-black bg-neo-cream px-4 py-3 font-neo-body text-black shadow-hard disabled:opacity-50"
              />
              <button
                type="button"
                onClick={submit}
                disabled={!isMyTurn || value.trim().length === 0 || isSubmitting}
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
    </div>
  );
}
