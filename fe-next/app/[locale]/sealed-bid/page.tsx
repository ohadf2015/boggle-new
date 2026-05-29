'use client';

/**
 * Sealed Bid single-player — admin-gated preview. Each round shows a 7-letter
 * rack; the player secretly bids a word, the bot bids the obvious high-value
 * word. Unique bid = double points, clash = half, pass/invalid = zero. Rules
 * live in the pure `sbEngine`; player words go through /api/dictionary/check
 * (lang=en) so we don't ship the full dictionary to the browser.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Bot, Gavel, RotateCcw, Send, Sparkles, Trophy, User } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { SharedFxApp } from '@/lib/pixiFx/SharedFxApp';
import {
  advanceRound,
  canFormFromRack,
  commitBid,
  initialSbState,
  MIN_WORD_LEN,
  type SbState,
} from '@/lib/sealedBid/sp/sbEngine';
import { pickRounds } from '@/lib/sealedBid/sp/rounds';

async function dictCheckEn(word: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/dictionary/check?lang=en&word=${encodeURIComponent(word)}`);
    if (!res.ok) return false;
    const data: { isValid?: boolean } = await res.json();
    return !!data.isValid;
  } catch {
    return false;
  }
}

export default function SealedBidPage({ params }: { params: Promise<{ locale: string }> }) {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const { playSound } = useSoundEffects();
  const [locale, setLocale] = useState<string>('en');
  useEffect(() => { params.then(({ locale: l }) => setLocale(l)); }, [params]);

  const [state, setState] = useState<SbState>(() => initialSbState(pickRounds()));
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const revealRef = useRef<HTMLDivElement>(null);

  const round = state.rounds[state.index];
  const result = state.lastResult;

  const shakeInput = useCallback(() => {
    const el = inputRef.current;
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (el && !reduce) {
      el.classList.remove('animate-neo-shake');
      void el.offsetWidth;
      el.classList.add('animate-neo-shake');
    }
  }, []);

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

  // Final fanfare on the last reveal.
  useEffect(() => {
    if (state.phase !== 'done') return;
    playSound('victoryFanfare');
    SharedFxApp.spawnBurst('celebration', window.innerWidth / 2, window.innerHeight / 3);
  }, [state.phase, playSound]);

  const newGame = useCallback(() => {
    setState(initialSbState(pickRounds()));
    setInput('');
    setError(null);
  }, []);

  const lockIn = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (state.phase !== 'bidding' || pending) return;
    const word = input.trim();
    if (!word) return;
    setError(null);
    if (word.length < MIN_WORD_LEN || !canFormFromRack(word, round.rack)) {
      setError(t('sealedBid.err.notInRack'));
      playSound('wordRejected');
      shakeInput();
      return;
    }
    setPending(true);
    const ok = await dictCheckEn(word);
    setPending(false);
    if (!ok) {
      setError(t('sealedBid.err.notWord'));
      playSound('wordRejected');
      shakeInput();
      return;
    }
    setState((s) => commitBid(s, word, true));
    setInput('');
  }, [input, state.phase, pending, round, t, playSound, shakeInput]);

  const pass = useCallback(() => {
    if (state.phase !== 'bidding' || pending) return;
    setState((s) => commitBid(s, null, false));
    setInput('');
    setError(null);
  }, [state.phase, pending]);

  const next = useCallback(() => setState((s) => advanceRound(s)), []);

  // Admin gate — hooks above run on every render so order stays stable.
  // Dev bypass lets the preview be reached locally (incl. /he RTL playtest).
  const isDev = process.env.NODE_ENV === 'development';
  if (!isAdmin && !isDev) {
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

  return (
    <main className="min-h-[100dvh] bg-neo-navy texture-halftone px-4 py-8">
      <div className="mx-auto w-full max-w-2xl space-y-5">
        <header className="flex items-center justify-between">
          <Link href={`/${locale}`} className="inline-flex items-center gap-1.5 font-neo-body text-sm text-neo-white">
            <ArrowLeft className="h-4 w-4" />
            {t('sealedBid.title')}
          </Link>
          <span className="inline-flex items-center gap-1.5 font-neo-display font-black text-xs uppercase tracking-wide text-neo-white">
            <Gavel className="h-3.5 w-3.5" />
            {t('sealedBid.badge')}
          </span>
        </header>

        <div className="text-center space-y-2">
          <h1 className="font-neo-display font-black text-3xl sm:text-4xl text-neo-white">{t('sealedBid.title')}</h1>
          <p className="font-neo-body text-sm text-neo-white/90">{t('sealedBid.instructions')}</p>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="rounded-neo border-2 border-black bg-neo-navy-light px-3 py-1.5 font-neo-display font-black text-xs uppercase tracking-wide text-neo-white shadow-hard-sm">
            {t('sealedBid.roundLabel', { n: state.index + 1, total: state.rounds.length })}
          </span>
          <span className="rounded-neo border-2 border-black bg-neo-cyan px-3 py-1.5 font-neo-display font-black text-xs uppercase tracking-wide text-neo-navy shadow-hard-sm">
            {t('sealedBid.totalScore', { score: state.totalScore })}
          </span>
        </div>

        {/* The rack */}
        <div dir="ltr" className="flex flex-wrap items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-navy-light p-4 shadow-hard">
          {round.rack.split('').map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="inline-flex h-11 w-11 items-center justify-center rounded-neo border-2 border-black bg-neo-cream font-neo-display font-black text-2xl text-neo-navy shadow-hard-sm"
            >
              {ch}
            </span>
          ))}
        </div>

        {state.phase === 'done' ? (
          <div className="rounded-neo border-3 border-black bg-neo-cyan p-6 text-center shadow-hard-lg space-y-4">
            <h2 className="inline-flex items-center justify-center gap-2 font-neo-display font-black text-2xl uppercase text-neo-navy">
              <Trophy className="h-6 w-6" />
              {t('sealedBid.finalScore')}
            </h2>
            <p className="font-neo-display font-black text-5xl text-neo-navy">{state.totalScore}</p>
            <button
              type="button"
              onClick={newGame}
              className="inline-flex items-center gap-2 rounded-neo border-3 border-black bg-neo-lime px-5 py-2.5 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard"
            >
              <RotateCcw className="h-4 w-4" />
              {t('sealedBid.playAgain')}
            </button>
          </div>
        ) : state.phase === 'revealed' && result ? (
          <div ref={revealRef} className="rounded-neo border-3 border-black bg-neo-navy-light p-5 text-center shadow-hard-lg space-y-3">
            <p className="font-neo-display font-black text-xs uppercase tracking-wide text-neo-white/80">{t('sealedBid.revealPhase')}</p>
            <div dir="ltr" className="flex items-center justify-center gap-4">
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1 font-neo-body text-xs text-neo-white/80"><User className="h-3.5 w-3.5" />{t('sealedBid.youPicked')}</p>
                <p className="rounded-neo border-2 border-black bg-neo-lime px-3 py-1.5 font-neo-display font-black text-lg text-neo-navy shadow-hard-sm">{result.playerWord || '—'}</p>
              </div>
              <div className="space-y-1">
                <p className="inline-flex items-center gap-1 font-neo-body text-xs text-neo-white/80"><Bot className="h-3.5 w-3.5" />{t('sealedBid.botPicked')}</p>
                <p className="rounded-neo border-2 border-black bg-neo-pink px-3 py-1.5 font-neo-display font-black text-lg text-neo-navy shadow-hard-sm">{result.botWord}</p>
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
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={lockIn} className="space-y-3">
            <p className="text-center font-neo-display font-black text-xs uppercase tracking-wide text-neo-white/80">{t('sealedBid.sealPhase')}</p>
            <input
              ref={inputRef}
              type="text"
              dir="ltr"
              value={input}
              onChange={(e) => { setInput(e.target.value.toUpperCase()); if (error) setError(null); }}
              placeholder={t('sealedBid.timerLabel')}
              aria-label={t('sealedBid.timerLabel')}
              autoComplete="off"
              spellCheck={false}
              disabled={pending}
              className="w-full rounded-neo border-3 border-black bg-neo-cream px-4 py-3 text-center font-neo-display font-black text-xl uppercase tracking-widest text-neo-navy shadow-hard outline-none focus:border-neo-cyan disabled:opacity-50"
            />
            {error && <p className="text-center font-neo-body text-sm text-neo-red">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={pending}
                className="flex flex-1 items-center justify-center gap-2 rounded-neo border-3 border-black bg-neo-lime px-5 py-3 font-neo-display font-black uppercase tracking-wide text-neo-navy shadow-hard disabled:opacity-50"
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
        )}
      </div>
    </main>
  );
}
