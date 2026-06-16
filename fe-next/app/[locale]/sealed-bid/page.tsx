'use client';

/**
 * Sealed Bid single-player — admin-gated preview. Each round shows a letter
 * rack; the player secretly bids a word by TAPPING tiles (no typing), the bot
 * bids the obvious high-value word. Unique bid = double points, clash = half,
 * pass/invalid = zero. Rules live in the pure `sbEngine`; player words go
 * through /api/dictionary/check (lang follows the locale) so we don't ship the
 * full dictionary to the browser.
 *
 * Hebrew: the engine, rack, and dictionary all work in BASE-letter form (sofit
 * forms are normalized away in the he word list); we apply final letters only
 * for display via `toDisplay`, and flip text direction to RTL.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, Bot, Delete, Gavel, Send, Sparkles, Trophy, User, X } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import { GameStage } from '@/components/game/GameStage';
import { ScreenFlashOverlay } from '@/components/game/ScreenFlashOverlay';
import {
  advanceRound,
  commitBid,
  initialSbState,
  letterValue,
  MIN_WORD_LEN,
  type RoundResult,
  type SbState,
} from '@/lib/sealedBid/sp/sbEngine';
import { SealedBidShareCard } from '@/components/sealedBid/SealedBidShareCard';
import { SealedBidSessionSummary } from '@/components/sealedBid/SealedBidSessionSummary';
import { pickRounds, poolForLang, ROUNDS_PER_GAME } from '@/lib/sealedBid/sp/rounds';
import { toDisplay, wordFromChosen } from '@/lib/sealedBid/sp/rackBuilder';
import { SoloRewardCard } from '@/components/solo/SoloRewardCard';
import {
  awardSoloDaily,
  getSoloDateISO,
  isSoloDailyClaimed,
  pickDailyModifier,
} from '@/lib/solo/soloDaily';

async function dictCheck(word: string, lang: string): Promise<boolean> {
  try {
    // The route is POST-only and reads { word, language } from the JSON body —
    // a GET with query params 405s (which silently rejected every bid before).
    const res = await fetch('/api/dictionary/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word, language: lang }),
    });
    if (!res.ok) return false;
    const data: { isValid?: boolean } = await res.json();
    return !!data.isValid;
  } catch {
    return false;
  }
}

export default function SealedBidPage() {
  const { t } = useLanguage();
  const { canSeeInWorkModes } = useAuth();
  const { playSound } = useSoundEffects();
  const params = useParams<{ locale: string }>();
  const locale = params?.locale ?? 'en';
  const isHe = locale === 'he';
  const dir = isHe ? 'rtl' : 'ltr';
  const dictLang = isHe ? 'he' : 'en';

  // SSR-safe init: a DETERMINISTIC slice (no Math.random in render → no
  // hydration mismatch). We shuffle to a random draw in a mount effect below.
  const [state, setState] = useState<SbState>(() => initialSbState(poolForLang(locale).slice(0, ROUNDS_PER_GAME)));
  const [chosen, setChosen] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [history, setHistory] = useState<RoundResult[]>([]);
  const [winFlash, setWinFlash] = useState(0);
  const builtRef = useRef<HTMLDivElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);
  const didShuffleRef = useRef(false);
  const revealFiredRef = useRef(false);

  // Solo Daily layer: shared per-day modifier + once-per-day coin award.
  const today = useMemo(() => getSoloDateISO(), []);
  const dailyModifier = useMemo(() => pickDailyModifier('sealed-bid', today), [today]);
  const [soloAward, setSoloAward] = useState<{ awarded: number; bonus: number; claimed: boolean } | null>(null);

  // Full-screen game: hide global header / bottom-nav / footer so the play
  // surface owns the viewport (and surfaces the in-game mute FAB).
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  // Randomize the round order once, on the client only (post-hydration).
  useEffect(() => {
    if (didShuffleRef.current) return;
    didShuffleRef.current = true;
    setState(initialSbState(pickRounds(ROUNDS_PER_GAME, locale)));
    setChosen([]);
  }, [locale]);

  const round = state.rounds[state.index];
  const result = state.lastResult;
  const word = useMemo(() => wordFromChosen(round?.rack ?? '', chosen), [round, chosen]);
  const canLock = word.length >= MIN_WORD_LEN && !pending;

  const shakeBuilt = useCallback(() => {
    const el = builtRef.current;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (el && !reduce) {
      el.classList.remove('animate-neo-shake');
      void el.offsetWidth;
      el.classList.add('animate-neo-shake');
    }
  }, []);

  // Accumulate completed rounds for the share card.
  useEffect(() => {
    if (state.phase === 'revealed' && state.lastResult) {
      setHistory((h) => [...h, state.lastResult!]);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.lastResult]);

  // Reveal ceremony — fire once whenever a round flips to revealed.
  useEffect(() => {
    if (state.phase !== 'revealed' || !result) return;
    const rect = revealRef.current?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 3;
    if (result.outcome === 'unique') {
      playSound('wordAccepted');
      SharedFxApp.spawnBurst('sparkle-gold', x, y, { count: 16 });
    } else {
      playSound('wordRejected');
    }
  }, [state.phase, result, playSound]);

  // Final fanfare on the last reveal — fire once per game end + award daily coins.
  useEffect(() => {
    if (state.phase !== 'done') { revealFiredRef.current = false; return; }
    if (revealFiredRef.current) return;
    revealFiredRef.current = true;
    playSound('victoryFanfare');
    setWinFlash((f) => f + 1);
    SharedFxApp.spawnBurst('celebration', window.innerWidth / 2, window.innerHeight / 3);

    // Once-per-day coin award; replays the same day are practice (claimed).
    const claimedBefore = isSoloDailyClaimed('sealed-bid', today, dictLang);
    const res = awardSoloDaily('sealed-bid', today, dictLang, state.totalScore, state.totalScore > 0);
    setSoloAward(
      res
        ? { awarded: res.awarded, bonus: res.bonus, claimed: false }
        : { awarded: 0, bonus: 0, claimed: claimedBefore },
    );
  }, [state.phase, playSound, today, dictLang, state.totalScore]);

  const newGame = useCallback(() => {
    setState(initialSbState(pickRounds(ROUNDS_PER_GAME, locale)));
    setChosen([]);
    setError(null);
    setHistory([]);
  }, [locale]);

  const tapTile = useCallback((i: number) => {
    if (state.phase !== 'bidding' || pending) return;
    setChosen((c) => (c.includes(i) ? c : [...c, i]));
    if (error) setError(null);
  }, [state.phase, pending, error]);

  const backspace = useCallback(() => setChosen((c) => c.slice(0, -1)), []);
  const clear = useCallback(() => { setChosen([]); setError(null); }, []);

  const lockIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.phase !== 'bidding' || pending) return;
    if (word.length < MIN_WORD_LEN) return; // guarded by canLock; defensive
    setError(null);
    setPending(true);
    const ok = await dictCheck(word, dictLang);
    setPending(false);
    if (!ok) {
      setError(t('sealedBid.err.notWord'));
      playSound('wordRejected');
      shakeBuilt();
      return;
    }
    setState((s) => commitBid(s, word, true));
    setChosen([]);
  }, [word, dictLang, state.phase, pending, t, playSound, shakeBuilt]);

  const pass = useCallback(() => {
    if (state.phase !== 'bidding' || pending) return;
    setState((s) => commitBid(s, null, false));
    setChosen([]);
    setError(null);
  }, [state.phase, pending]);

  const next = useCallback(() => setState((s) => advanceRound(s)), []);

  // Admin gate — hooks above run on every render so order stays stable.
  // Dev bypass lets the preview be reached locally (incl. /he RTL playtest).
  const isDev = process.env.NODE_ENV === 'development';
  if (!canSeeInWorkModes && !isDev) {
    return (
      <main className="min-h-[100dvh] bg-neo-navy texture-halftone px-4 py-12 flex items-center justify-center">
        <p className="font-neo-body text-neo-white text-center max-w-sm">{t('sealedBid.adminOnly')}</p>
      </main>
    );
  }

  const resultKey = result
    ? result.outcome === 'unique' ? 'sealedBid.resultUnique'
      : result.outcome === 'clash' ? 'sealedBid.resultShared'
        : 'sealedBid.resultNone'
    : '';

  const usedTiles = new Set(chosen);

  // Header slot: back link, title/badge, round counter, score
  const header = (
    <div className="mx-auto w-full max-w-2xl space-y-2.5">
      <div className="flex items-center justify-between">
        <Link
          href={`/${locale}`}
          className="inline-flex items-center gap-1.5 rounded-neo border-2 border-black bg-neo-navy-light px-2.5 py-1.5 font-neo-body text-xs text-neo-white shadow-hard-sm"
        >
          <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          {t('sealedBid.title')}
        </Link>
        <h1 className="truncate font-neo-display text-base font-black uppercase tracking-wide text-neo-white">
          {t('sealedBid.title')}
        </h1>
        <span className="inline-flex items-center gap-1.5 font-neo-display font-black text-xs uppercase tracking-wide text-neo-white">
          <Gavel className="h-3.5 w-3.5" />
          {t('sealedBid.badge')}
        </span>
      </div>

      <div className="flex items-center justify-between gap-2">
        <span className="rounded-neo border-2 border-black bg-neo-navy-light px-3 py-1.5 font-neo-display font-black text-xs uppercase tracking-wide text-neo-white shadow-hard-sm">
          {t('sealedBid.roundLabel', { n: state.index + 1, total: state.rounds.length })}
        </span>
        <span className="rounded-neo border-2 border-black bg-neo-cyan px-3 py-1.5 font-neo-display font-black text-xs uppercase tracking-wide text-neo-navy shadow-hard-sm">
          {t('sealedBid.totalScore', { score: state.totalScore })}
        </span>
      </div>

      <p className="text-center font-neo-body text-sm text-neo-white/90">{t('sealedBid.instructions')}</p>
    </div>
  );

  // Footer slot: during bidding phase, the rack and word-builder controls; during revealed/done, null
  const footer =
    state.phase === 'bidding' ? (
      <div className="mx-auto w-full max-w-2xl space-y-3">
        {/* The rack — tappable tiles. Used tiles dim out. */}
        <div dir={dir} className="flex flex-wrap items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-navy-light p-4 shadow-hard">
          {round.rack.split('').map((ch, i) => {
            const used = usedTiles.has(i);
            const disabled = used || state.phase !== 'bidding' || pending;
            return (
              <button
                key={`${ch}-${i}`}
                type="button"
                onClick={() => tapTile(i)}
                disabled={disabled}
                aria-label={ch}
                className={`relative inline-flex h-12 w-12 items-center justify-center rounded-neo border-2 border-black font-neo-display font-black text-2xl shadow-hard-sm transition-transform ${
                  used ? 'bg-neo-navy text-neo-white/30' : 'bg-neo-cream text-neo-navy hover:-translate-y-0.5 active:translate-y-0 active:shadow-hard-pressed'
                } disabled:cursor-default`}
              >
                {/* Tiles show the BASE glyph — sofit forms only appear at word end (built strip / reveal). */}
                {ch}
                <span className="absolute -top-1.5 ltr:-right-1.5 rtl:-left-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-black bg-neo-cyan px-1 font-neo-body text-[10px] font-bold leading-none text-neo-navy">
                  {letterValue(ch)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Controls — backspace/clear edit the bid shown centre-stage; lock-in seals it. */}
        <form onSubmit={lockIn} className="space-y-2">
          {error && <p className="text-center font-neo-body text-sm text-neo-red">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={backspace}
              disabled={chosen.length === 0 || pending}
              aria-label={t('sealedBid.backspace')}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-neo border-3 border-black bg-neo-navy-light text-neo-white shadow-hard-sm disabled:opacity-40"
            >
              <Delete className="h-5 w-5 rtl:rotate-180" />
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={chosen.length === 0 || pending}
              aria-label={t('sealedBid.clear')}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-neo border-3 border-black bg-neo-navy-light text-neo-white shadow-hard-sm disabled:opacity-40"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!canLock}
              className="flex flex-1 items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-lime px-5 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard transition-transform active:translate-y-0.5 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {t('sealedBid.lockIn')}
            </button>
            <button
              type="button"
              onClick={pass}
              disabled={pending}
              className="rounded-neo border-3 border-black bg-neo-navy-light px-4 py-3 font-neo-display font-black text-xs uppercase tracking-wide text-neo-white shadow-hard-sm disabled:opacity-50"
            >
              {t('sealedBid.skip')}
            </button>
          </div>
        </form>
      </div>
    ) : null;

  return (
    <GameStage accent="cyan" header={header} footer={footer}>
      <ScreenFlashOverlay trigger={winFlash} colorClass="bg-neo-cyan/40" />
      <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3">
        {state.phase === 'done' ? (
          <div className="space-y-4">
            <div className="flex flex-1 items-center justify-center">
              <div className="w-full animate-neo-pop rounded-neo border-3 border-black bg-neo-cyan p-6 text-center shadow-hard-lg space-y-4">
                <h2 className="inline-flex items-center justify-center gap-2 font-neo-display font-black text-2xl uppercase text-neo-navy">
                  <Trophy className="h-6 w-6" />
                  {t('sealedBid.finalScore')}
                </h2>
                <p className="font-neo-display font-black text-5xl text-neo-navy">{state.totalScore}</p>
              </div>
            </div>
            {soloAward && (
              <SoloRewardCard
                t={t}
                awarded={soloAward.awarded}
                bonus={soloAward.bonus}
                modifier={dailyModifier}
                claimed={soloAward.claimed}
                onPlayAgain={newGame}
              />
            )}
            {history.length > 0 && (
              <SealedBidSessionSummary history={history} totalScore={state.totalScore} />
            )}
            {history.length > 0 && (
              <SealedBidShareCard history={history} totalScore={state.totalScore} />
            )}
          </div>
        ) : state.phase === 'revealed' && result ? (
          <div ref={revealRef} className="rounded-neo border-3 border-black bg-neo-navy-light p-5 text-center shadow-hard-lg space-y-3">
            <p className="font-neo-display font-black text-xs uppercase tracking-wide text-neo-white/80">{t('sealedBid.revealPhase')}</p>
            <div dir={dir} className="flex items-center justify-center gap-4">
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1 font-neo-body text-xs text-neo-white/80"><User className="h-3.5 w-3.5" />{t('sealedBid.youPicked')}</p>
                <p className="rounded-neo border-2 border-black bg-neo-lime px-3 py-1.5 font-neo-display font-black text-lg text-neo-navy shadow-hard-sm">{result.playerWord ? toDisplay(result.playerWord) : '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1 font-neo-body text-xs text-neo-white/80"><Bot className="h-3.5 w-3.5" />{t('sealedBid.botPicked')}</p>
                <p className="rounded-neo border-2 border-black bg-neo-pink px-3 py-1.5 font-neo-display font-black text-lg text-neo-navy shadow-hard-sm">{toDisplay(result.botWord)}</p>
              </div>
            </div>
            <p className={`inline-flex items-center justify-center gap-1.5 font-neo-display font-black text-lg uppercase ${result.outcome === 'unique' ? 'text-neo-lime' : result.outcome === 'clash' ? 'text-neo-orange' : 'text-neo-white/70'}`}>
              {result.outcome === 'unique' && <Sparkles className="h-5 w-5" />}
              {t(resultKey)}
            </p>
            <p className="font-neo-display font-black text-2xl text-neo-white">{t('sealedBid.pointsEarned', { pts: result.points })}</p>
            <button
              type="button"
              onClick={next}
              className="inline-flex items-center gap-2 rounded-neo border-3 border-black bg-neo-cyan px-5 py-2.5 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard"
            >
              {t('sealedBid.nextRound')}
              <ArrowRight className="h-4 w-4 rtl:rotate-180" />
            </button>
          </div>
        ) : (
          /* Bidding: the secret word being built takes centre stage above the rack. */
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
            <p className="font-neo-display font-black text-xs uppercase tracking-wide text-neo-white/80">
              {t('sealedBid.sealPhase')}
            </p>
            <div
              ref={builtRef}
              dir={dir}
              aria-live="polite"
              className="flex min-h-[88px] w-full max-w-sm items-center justify-center rounded-neo border-3 border-black bg-neo-cream px-5 py-4 font-neo-display font-black text-4xl tracking-widest text-neo-navy shadow-hard-lg"
            >
              {word ? (
                toDisplay(word)
              ) : (
                <span className="font-neo-body text-base font-normal tracking-normal text-neo-navy/50">
                  {t('sealedBid.tapHint')}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </GameStage>
  );
}
