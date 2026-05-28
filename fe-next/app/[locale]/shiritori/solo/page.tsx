'use client';

/**
 * Shiritori single-player — admin-gated preview that runs the same chain
 * rules as MP (shared/utils/shiritori) against the curated `BOT_DICT` pool.
 * Player words go through /api/dictionary/check (lang=ja) so we don't ship
 * the full server dict to the browser.
 *
 * Server-rendered MP landing page is kept at /shiritori; this is the play
 * surface for admins testing the rule loop solo.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bot, RotateCcw, Send, User, Trophy, Skull } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { pickShiritoriWord } from '@/backend/modules/shiritoriBot';
import {
  commitBotWord,
  commitPlayerWord,
  initialSpState,
  playerGivesUp,
  requiredHead,
  type SpState,
} from '@/lib/shiritori/sp/spEngine';
import { botPoolForDifficulty } from '@/lib/shiritori/sp/botDict';
import { HowToPlayCard } from '@/components/common/HowToPlayCard';

type Difficulty = 'easy' | 'medium' | 'hard';

const SEEDS: Record<Difficulty, string[]> = {
  easy: ['ねこ', 'いぬ', 'うみ', 'はな'],
  medium: ['さくら', 'たぬき', 'みなと'],
  hard: ['けいたい', 'にんじん', 'ろうそく'],
};

function pickSeed(d: Difficulty): string {
  const pool = SEEDS[d];
  return pool[Math.floor(Math.random() * pool.length)];
}

async function dictCheckJa(word: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/dictionary/check?lang=ja&word=${encodeURIComponent(word)}`);
    if (!res.ok) return false;
    const data: { isValid?: boolean } = await res.json();
    return !!data.isValid;
  } catch {
    return false;
  }
}

export default function ShiritoriSoloPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const { playSound } = useSoundEffects();
  const [locale, setLocale] = useState<string>('en');
  useEffect(() => { params.then(({ locale: l }) => setLocale(l)); }, [params]);

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [state, setState] = useState<SpState>(() => initialSpState(pickSeed('medium')));
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const chainEndRef = useRef<HTMLDivElement>(null);
  const wonFiredRef = useRef(false);

  const pool = useMemo(() => botPoolForDifficulty(difficulty), [difficulty]);
  const head = requiredHead(state);

  // Bot turn — fire-and-forget once turn flips to bot.
  useEffect(() => {
    if (state.phase !== 'playing' || state.turn !== 'bot') return;
    const id = window.setTimeout(() => {
      const pick = pickShiritoriWord(head, state.used, pool);
      setState((prev) => commitBotWord(prev, pick));
    }, 700 + Math.random() * 600);
    return () => window.clearTimeout(id);
  }, [state.phase, state.turn, head, state.used, pool]);

  // End-of-round ceremony — fire once per round.
  useEffect(() => {
    if (state.phase === 'playing') { wonFiredRef.current = false; return; }
    if (wonFiredRef.current) return;
    wonFiredRef.current = true;
    if (state.phase === 'won') {
      playSound('victoryFanfare');
      const rect = chainEndRef.current?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
      const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 3;
      SharedFxApp.spawnBurst('celebration', x, y);
      SharedFxApp.spawnBurst('sparkle-gold', x, y, { count: 18 });
    } else {
      playSound('wordRejected');
    }
  }, [state.phase, playSound]);

  // Auto-scroll the chain into view as it grows.
  useEffect(() => {
    chainEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
  }, [state.chain.length]);

  const newGame = useCallback((d: Difficulty) => {
    setDifficulty(d);
    setState(initialSpState(pickSeed(d)));
    setInput('');
    setError(null);
    wonFiredRef.current = false;
  }, []);

  const submit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.phase !== 'playing' || state.turn !== 'player' || pending) return;
    const word = input.trim();
    if (!word) return;
    setError(null);
    setPending(true);
    const ok = await dictCheckJa(word);
    const r = commitPlayerWord(state, word, ok);
    setPending(false);
    if (r.kind === 'err') {
      setError(t(`shiritori.solo.err.${r.reason}`));
      playSound('wordRejected');
      const el = inputRef.current;
      const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      if (el && !reduce) {
        el.classList.remove('animate-neo-shake');
        void el.offsetWidth;
        el.classList.add('animate-neo-shake');
      }
      return;
    }
    setState(r.state);
    setInput('');
    if (r.state.phase === 'playing') {
      playSound('wordAccepted');
      const rect = inputRef.current?.getBoundingClientRect();
      if (rect) SharedFxApp.spawnBurst('sparkle-valid', rect.left + rect.width / 2, rect.top + rect.height / 2);
    }
  }, [input, state, pending, playSound, t]);

  // Admin gate — hooks above this run on every render so order stays stable.
  // Dev bypass lets the game be reached locally (incl. /he RTL playtest).
  const isDev = process.env.NODE_ENV === 'development';
  if (!isAdmin && !isDev) {
    return (
      <main className="min-h-[100dvh] bg-neo-navy texture-halftone px-4 py-12 flex items-center justify-center">
        <p className="font-neo-body text-neo-white text-center max-w-sm">
          {t('shiritori.solo.adminOnly')}
        </p>
      </main>
    );
  }

  const ended = state.phase !== 'playing';
  const won = state.phase === 'won';

  return (
    <main className="min-h-[100dvh] bg-neo-navy texture-halftone px-4 py-8">
      <HowToPlayCard
        storageKey="shiritori-solo"
        title={t('shiritori.solo.howTo.title')}
        steps={[0, 1, 2].map((i) => t(`shiritori.solo.howTo.steps.${i}`))}
        cta={t('shiritori.solo.howTo.cta')}
        accent="lime"
      />
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <header className="flex items-center justify-between">
          <Link href={`/${locale}/shiritori`} className="inline-flex items-center gap-1.5 font-neo-body text-sm text-neo-white hover:text-neo-white">
            <ArrowLeft className="h-4 w-4" />
            {t('shiritori.solo.back')}
          </Link>
          <span className="font-neo-display font-black text-xs uppercase tracking-wide text-neo-white">
            {t('shiritori.solo.adminBadge')}
          </span>
        </header>

        <div className="text-center space-y-2">
          <h1 className="font-neo-display font-black text-3xl sm:text-4xl text-neo-white">
            {t('shiritori.solo.title')}
          </h1>
          <p className="font-neo-body text-sm text-neo-white">{t('shiritori.solo.tagline')}</p>
        </div>

        <div className="flex items-center justify-center gap-2" role="radiogroup" aria-label={t('shiritori.solo.difficultyLabel')}>
          {(['easy', 'medium', 'hard'] as const).map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={difficulty === d}
              onClick={() => newGame(d)}
              className={`rounded-neo border-2 border-black px-3 py-1.5 font-neo-display font-black text-xs uppercase tracking-wide shadow-hard-sm transition-transform ${
                difficulty === d
                  ? 'bg-neo-lime text-neo-navy'
                  : 'bg-neo-navy-light text-neo-white hover:text-neo-white'
              }`}
            >
              {t(`shiritori.solo.difficulty.${d}`)}
            </button>
          ))}
        </div>

        {!ended && state.turn === 'player' && (
          <p className="text-center font-neo-body text-sm text-neo-white">
            {t('shiritori.solo.headPrompt')}{' '}
            <span dir="ltr" className="inline-block rounded-neo border-2 border-black bg-neo-cyan px-2 py-0.5 font-neo-display font-black text-neo-navy">
              {head || '—'}
            </span>
          </p>
        )}

        <div
          dir="ltr"
          className="flex flex-wrap items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-navy-light p-4 shadow-hard min-h-[80px]"
        >
          {state.chain.map((w, i) => {
            const fromBot = i % 2 === 1; // alternating: player starts at 0, bot at 1
            const Icon = fromBot ? Bot : User;
            return (
              <span key={`${w}-${i}`} className="inline-flex items-center gap-1.5">
                {i > 0 && <span className="text-neo-white">→</span>}
                <span
                  className={`inline-flex items-center gap-1 rounded-neo border-2 border-black px-2.5 py-1 font-neo-display font-black text-base shadow-hard-sm ${
                    fromBot ? 'bg-neo-pink text-neo-navy' : 'bg-neo-lime text-neo-navy'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />
                  {w}
                </span>
              </span>
            );
          })}
          <div ref={chainEndRef} aria-hidden="true" />
        </div>

        {ended ? (
          <div className={`rounded-neo border-3 border-black p-5 text-center shadow-hard-lg space-y-3 ${won ? 'bg-neo-lime' : 'bg-neo-red'}`}>
            <h2 className="inline-flex items-center justify-center gap-2 font-neo-display font-black text-2xl uppercase text-neo-navy">
              {won ? <Trophy className="h-6 w-6" /> : <Skull className="h-6 w-6" />}
              {won ? t('shiritori.solo.won') : t('shiritori.solo.lost')}
            </h2>
            <p className="font-neo-body text-sm text-neo-navy/80">
              {t(`shiritori.solo.endReason.${state.endReason}`)}
            </p>
            <div className="flex justify-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => newGame(difficulty)}
                className="inline-flex items-center gap-2 rounded-neo border-3 border-black bg-neo-purple px-5 py-2.5 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard"
              >
                <RotateCcw className="h-4 w-4" />
                {t('shiritori.solo.again')}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <input
              ref={inputRef}
              type="text"
              dir="ltr"
              value={input}
              onChange={(e) => { setInput(e.target.value); if (error) setError(null); }}
              placeholder={t('shiritori.solo.inputPlaceholder')}
              aria-label={t('shiritori.solo.inputPlaceholder')}
              autoComplete="off"
              spellCheck={false}
              disabled={state.turn !== 'player' || pending}
              className="w-full rounded-neo border-3 border-black bg-neo-cream px-4 py-3 text-center font-neo-display font-black text-xl text-neo-navy shadow-hard outline-none focus:border-neo-purple disabled:opacity-50"
            />
            {error && <p className="text-center font-neo-body text-sm text-neo-red">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={state.turn !== 'player' || pending}
                className="flex flex-1 items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-lime px-5 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard disabled:opacity-50"
              >
                <Send className="h-4 w-4" />
                {pending ? t('shiritori.solo.checking') : t('shiritori.solo.submit')}
              </button>
              <button
                type="button"
                onClick={() => setState((s) => playerGivesUp(s))}
                disabled={state.turn !== 'player' || pending}
                className="rounded-neo border-3 border-black bg-neo-navy-light px-4 py-3 font-neo-display font-black text-xs uppercase tracking-wide text-neo-white shadow-hard-sm disabled:opacity-50"
              >
                {t('shiritori.solo.giveUp')}
              </button>
            </div>
            {state.turn === 'bot' && (
              <p className="text-center font-neo-body text-xs text-neo-white animate-pulse">
                {t('shiritori.solo.botThinking')}
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
