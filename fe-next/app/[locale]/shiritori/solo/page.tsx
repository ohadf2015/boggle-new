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
import toast from 'react-hot-toast';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Bot, Send, User, Trophy, Skull } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { GameStage } from '@/components/game/GameStage';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
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
import { useShiritoriGhostMultiplier } from '@/lib/shiritori/sp/useShiritoriGhostMultiplier';
import { ModeCoach } from '@/components/tutorial/ModeCoach';
import { SoloRewardCard } from '@/components/solo/SoloRewardCard';
import {
  awardSoloDaily,
  getSoloDateISO,
  isSoloDailyClaimed,
  pickDailyModifier,
} from '@/lib/solo/soloDaily';

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
    // POST-only route reading { word, language } from the body — a GET 405s and
    // silently rejected every player word.
    const res = await fetch('/api/dictionary/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, language: 'ja' }),
    });
    if (!res.ok) return false;
    const data: { isValid?: boolean } = await res.json();
    return !!data.isValid;
  } catch {
    return false;
  }
}

export default function ShiritoriSoloPage() {
  const { t } = useLanguage();
  const { canSeeInWorkModes } = useAuth();
  const { playSound } = useSoundEffects();
  const { locale } = useParams<{ locale: string }>();

  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [state, setState] = useState<SpState>(() => initialSpState(pickSeed('medium')));
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [score, setScore] = useState(0);
  const [winFlash, setWinFlash] = useState(0);
  const { isGhostTurn, multiplier, markTurnPlayed, reset: resetGhost } = useShiritoriGhostMultiplier();
  const inputRef = useRef<HTMLInputElement>(null);
  const chainEndRef = useRef<HTMLDivElement>(null);
  const wonFiredRef = useRef(false);

  // Solo Daily layer: shared per-day modifier + once-per-day coin award.
  // Shiritori content is always Japanese, so the daily is shared as lang 'ja'.
  const today = useMemo(() => getSoloDateISO(), []);
  const dailyModifier = useMemo(() => pickDailyModifier('shiritori', today), [today]);
  const [soloAward, setSoloAward] = useState<{ awarded: number; bonus: number; claimed: boolean } | null>(null);

  const pool = useMemo(() => botPoolForDifficulty(difficulty), [difficulty]);
  const head = requiredHead(state);

  // Full-screen game: hide global header / bottom-nav / footer so the play
  // surface owns the viewport (and surfaces the in-game mute FAB).
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

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
      setWinFlash((f) => f + 1);
      const cx = window.innerWidth / 2;
      // Layered ceremony: top-down confetti rain + a gold sparkle pop centred
      // on the chain, with a delayed second wave so the moment lingers.
      SharedFxApp.spawnBurst('celebration', cx, window.innerHeight * 0.18, { count: 40 });
      SharedFxApp.spawnBurst('victory-burst', cx, window.innerHeight * 0.4, { count: 24 });
      const rect = chainEndRef.current?.getBoundingClientRect();
      const x = rect ? rect.left + rect.width / 2 : cx;
      const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 3;
      SharedFxApp.spawnBurst('sparkle-gold', x, y, { count: 22 });
      window.setTimeout(() => SharedFxApp.spawnBurst('celebration', cx, window.innerHeight * 0.25, { count: 24 }), 360);
    } else {
      playSound('wordRejected');
    }

    // Once-per-day coin award; replays the same day are practice (claimed).
    const claimedBefore = isSoloDailyClaimed('shiritori', today, 'ja');
    const res = awardSoloDaily('shiritori', today, 'ja', score, state.phase === 'won');
    setSoloAward(
      res
        ? { awarded: res.awarded, bonus: res.bonus, claimed: false }
        : { awarded: 0, bonus: 0, claimed: claimedBefore },
    );
  }, [state.phase, playSound, today, score]);

  // Auto-scroll the chain into view as it grows.
  useEffect(() => {
    chainEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'end' });
  }, [state.chain.length]);

  const newGame = useCallback((d: Difficulty) => {
    setDifficulty(d);
    setState(initialSpState(pickSeed(d)));
    setInput('');
    setError(null);
    setScore(0);
    resetGhost();
    wonFiredRef.current = false;
    setSoloAward(null);
  }, [resetGhost]);

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
      const pts = word.length * multiplier;
      setScore((s) => s + pts);
      const rect = inputRef.current?.getBoundingClientRect();
      if (isGhostTurn) {
        toast(t('shiritori.solo.ghost.reveal'), {
          icon: '👻',
          style: { background: 'var(--popover)', color: 'var(--popover-foreground)' },
        });
        if (rect) SharedFxApp.spawnBurst('sparkle-gold', rect.left + rect.width / 2, rect.top + rect.height / 2, { count: 12 });
      } else {
        if (rect) SharedFxApp.spawnBurst('sparkle-valid', rect.left + rect.width / 2, rect.top + rect.height / 2);
      }
      markTurnPlayed();
      playSound('wordAccepted');
    }
  }, [input, state, pending, playSound, t, isGhostTurn, multiplier, markTurnPlayed]);

  // Admin gate — hooks above this run on every render so order stays stable.
  // Dev bypass lets the game be reached locally (incl. /he RTL playtest).
  const isDev = process.env.NODE_ENV === 'development';
  if (!canSeeInWorkModes && !isDev) {
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

  const header = (
    <div className="mx-auto w-full max-w-2xl space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <Link
          href={`/${locale}/shiritori`}
          className="inline-flex items-center gap-1.5 rounded-neo border-2 border-black bg-neo-navy-light px-2.5 py-1.5 font-neo-body text-xs text-neo-white shadow-hard-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('shiritori.solo.back')}
        </Link>
        <h1 className="truncate font-neo-display text-base font-black uppercase tracking-wide text-neo-white">
          {t('shiritori.solo.title')}
        </h1>
        {score > 0 ? (
          <span
            key={score}
            className="animate-neo-pop inline-flex items-center gap-1 rounded-neo border-2 border-black bg-neo-cyan px-2.5 py-1.5 font-neo-display text-sm font-black text-neo-navy shadow-hard-sm"
          >
            <Trophy className="h-3.5 w-3.5" aria-hidden="true" />
            {score}
          </span>
        ) : (
          <span className="font-neo-display text-[10px] font-black uppercase tracking-wide text-neo-white/70">
            {t('shiritori.solo.adminBadge')}
          </span>
        )}
      </div>

      <div className="flex items-center justify-center gap-2" role="radiogroup" aria-label={t('shiritori.solo.difficultyLabel')}>
        {(['easy', 'medium', 'hard'] as const).map((d) => (
          <button
            key={d}
            type="button"
            role="radio"
            aria-checked={difficulty === d}
            onClick={() => newGame(d)}
            className={`rounded-neo border-2 border-black px-3 py-1.5 font-neo-display text-xs font-black uppercase tracking-wide shadow-hard-sm transition-transform active:translate-y-0.5 ${
              difficulty === d ? 'bg-neo-lime text-neo-navy' : 'bg-neo-navy-light text-neo-white'
            }`}
          >
            {t(`shiritori.solo.difficulty.${d}`)}
          </button>
        ))}
      </div>

      {!ended && state.turn === 'player' && (
        <p className="text-center font-neo-body text-sm text-neo-white">
          {t('shiritori.solo.headPrompt')}{' '}
          <span dir="ltr" className="inline-block animate-neo-pop rounded-neo border-2 border-black bg-neo-cyan px-2 py-0.5 font-neo-display font-black text-neo-navy" key={head}>
            {head || '—'}
          </span>
        </p>
      )}
    </div>
  );

  const footer = ended ? null : (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl space-y-2">
      {error && <p className="text-center font-neo-body text-sm text-neo-red">{error}</p>}
      <div className="flex items-end gap-2">
        <div className="relative min-w-0 flex-1">
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
            className="w-full rounded-neo border-3 border-black bg-neo-cream px-4 py-3 text-center font-neo-display text-xl font-black text-neo-navy shadow-hard outline-none focus:border-neo-purple disabled:opacity-50"
          />
          {state.turn === 'player' && !pending && !ended && (
            <div className="pointer-events-none absolute inset-0 rounded-neo animate-pressure-border" aria-hidden="true" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setState((s) => playerGivesUp(s))}
          disabled={state.turn !== 'player' || pending}
          className="shrink-0 rounded-neo border-3 border-black bg-neo-navy-light px-3 py-3 font-neo-display text-[10px] font-black uppercase tracking-wide text-neo-white shadow-hard-sm disabled:opacity-50"
        >
          {t('shiritori.solo.giveUp')}
        </button>
      </div>
      <button
        type="submit"
        disabled={state.turn !== 'player' || pending}
        className="flex w-full items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-lime px-5 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform active:translate-y-0.5 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {pending
          ? t('shiritori.solo.checking')
          : state.turn === 'bot'
            ? t('shiritori.solo.botThinking')
            : t('shiritori.solo.submit')}
      </button>
    </form>
  );

  return (
    <GameStage accent="lime" header={header} footer={footer}>
      <ScreenFlashOverlay trigger={winFlash} colorClass="bg-neo-lime/40" />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3">
        <ModeCoach mode="shiritori" />

        {ended ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3">
            <div className={`w-full animate-neo-pop rounded-neo border-3 border-black p-5 text-center shadow-hard-lg space-y-3 ${won ? 'bg-neo-lime' : 'bg-neo-red'}`}>
              <h2 className="inline-flex items-center justify-center gap-2 font-neo-display text-2xl font-black uppercase text-neo-navy">
                {won ? <Trophy className="h-6 w-6" /> : <Skull className="h-6 w-6" />}
                {won ? t('shiritori.solo.won') : t('shiritori.solo.lost')}
              </h2>
              <p className="font-neo-body text-sm text-neo-navy/80">
                {t(`shiritori.solo.endReason.${state.endReason}`)}
              </p>
              {score > 0 && (
                <p className="font-neo-display text-lg font-black text-neo-navy">
                  {t('shiritori.solo.ghost.score')} {score}
                </p>
              )}
            </div>
            {soloAward && (
              <SoloRewardCard
                t={t}
                awarded={soloAward.awarded}
                bonus={soloAward.bonus}
                modifier={dailyModifier}
                claimed={soloAward.claimed}
                onPlayAgain={() => newGame(difficulty)}
              />
            )}
          </div>
        ) : (
          <div
            dir="ltr"
            className="flex flex-1 flex-wrap content-start items-start justify-center gap-2 rounded-neo border-3 border-black bg-neo-navy-light p-4 shadow-hard"
          >
            {state.chain.map((w, i) => {
              // Chain = [seed, player, bot, player, bot, …]. The seed at index 0
              // belongs to neither side (cyan, no icon); after it, player words
              // fall on odd indices and bot words on even indices.
              const isSeed = i === 0;
              const fromBot = !isSeed && i % 2 === 0;
              const Icon = fromBot ? Bot : User;
              const tone = isSeed
                ? 'bg-neo-cyan text-neo-navy'
                : fromBot
                  ? 'bg-neo-pink text-neo-navy'
                  : 'bg-neo-lime text-neo-navy';
              return (
                <span key={`${w}-${i}`} className="inline-flex items-center gap-1.5">
                  {i > 0 && <span className="text-neo-white">→</span>}
                  <span
                    className={`inline-flex animate-neo-pop items-center gap-1 rounded-neo border-2 border-black px-2.5 py-1 font-neo-display text-base font-black shadow-hard-sm ${tone}`}
                  >
                    {!isSeed && <Icon className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden="true" />}
                    {w}
                  </span>
                </span>
              );
            })}
            <div ref={chainEndRef} aria-hidden="true" />
          </div>
        )}
      </div>
    </GameStage>
  );
}
