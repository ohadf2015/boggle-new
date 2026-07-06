'use client';

/**
 * Quick Play hub — the spin → play → results loop.
 * One screen at a time, zero pre-game config. Random resolves at PLAY press.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import posthog from '@/lib/analytics/lazyPosthog';
import { QuickPlayWheel } from './QuickPlayWheel';
import { QuickModeAdapter } from './adapters/QuickModeAdapter';
import { QuickPlayResults, type QuickRival } from './QuickPlayResults';
import { shareChallenge } from './challengeShare';
import { quickRank } from './quickRank';
import { BackButton } from '@/components/ui/BackButton';
import { useBackOneLevel } from '@/hooks/useBackOneLevel';
import type { WheelSelection } from './wheelGeometry';
import { QUICK_MODES, type QuickMode, type QuickRoundConfig, type QuickRoundResult, type QuickSubmitOutcome } from './types';

type HubPhase = 'wheel' | 'loading' | 'playing' | 'results';

interface ChallengeInfo {
  id: string;
  mode: QuickMode;
  seed: string;
  challengerName: string;
  challengerScorePct: number;
}

interface QuickPlayHubProps {
  challengeId?: string | null;
}

export function QuickPlayHub({ challengeId }: QuickPlayHubProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [phase, setPhase] = useState<HubPhase>('wheel');
  const [selection, setSelection] = useState<WheelSelection>('random');
  const [roundIndex, setRoundIndex] = useState(1);
  const [config, setConfig] = useState<QuickRoundConfig | null>(null);
  const [result, setResult] = useState<QuickRoundResult | null>(null);
  const [outcome, setOutcome] = useState<QuickSubmitOutcome | null>(null);
  const [rival, setRival] = useState<QuickRival | null>(null);
  const [challenge, setChallenge] = useState<ChallengeInfo | null>(null);
  const [answered, setAnswered] = useState<{ name: string; theirPct: number; yourPct: number } | null>(null);
  const [totalPoints, setTotalPoints] = useState<number | null>(null);
  const [loadError, setLoadError] = useState(false);
  const goBack = useBackOneLevel();
  const submitting = useRef(false);

  // Loop closer: tell the challenger when someone answered their challenge.
  useEffect(() => {
    if (challengeId) return;
    let cancelled = false;
    fetch('/api/quick-play/challenge?mine=1')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.answered) return;
        setAnswered({
          name: d.answered.accepterName,
          theirPct: Number(d.answered.accepted_score_pct),
          yourPct: Number(d.answered.challenger_score_pct),
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [challengeId]);

  // Challenge deep link: lock mode+seed to the friend's board
  useEffect(() => {
    if (!challengeId) return;
    let cancelled = false;
    fetch(`/api/quick-play/challenge?id=${encodeURIComponent(challengeId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.id) return;
        setChallenge({
          id: d.id,
          mode: d.mode,
          seed: d.seed,
          challengerName: d.challengerName,
          challengerScorePct: Number(d.challenger_score_pct),
        });
        setSelection(d.mode);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [challengeId]);

  const handleSelect = useCallback((sel: WheelSelection, method: 'drag' | 'tap') => {
    setSelection(sel);
    posthog.capture('quick_play_mode_selected', { mode: sel, method, roundIndex });
  }, [roundIndex]);

  const handlePlay = useCallback(async () => {
    const mode: QuickMode =
      challenge?.mode ??
      (selection === 'random'
        ? QUICK_MODES[Math.floor(Math.random() * QUICK_MODES.length)]
        : selection);
    if (selection === 'random' && !challenge) {
      posthog.capture('quick_play_mode_selected', { mode, method: 'random', roundIndex });
    }
    setPhase('loading');
    setLoadError(false);
    try {
      const res = await fetch('/api/quick-play/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode, language, seed: challenge?.seed }),
      });
      if (!res.ok) throw new Error(`round fetch ${res.status}`);
      const round = (await res.json()) as QuickRoundConfig;
      setConfig(round);
      setPhase('playing');
    } catch {
      // Silent no-op on error is forbidden — surface it (a dead-looking PLAY
      // button is indistinguishable from a bug).
      setLoadError(true);
      setPhase('wheel');
    }
  }, [challenge, selection, language, roundIndex]);

  const handleDone = useCallback(
    async (r: QuickRoundResult) => {
      if (submitting.current) return;
      submitting.current = true;
      setResult(r);
      try {
        const res = await fetch('/api/quick-play/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mode: r.mode,
            language,
            seed: r.seed,
            score: r.score,
            wordsFound: r.wordsFound,
            durationMs: r.durationMs,
            challengeId: challenge?.id,
          }),
        });
        const out: QuickSubmitOutcome = res.ok
          ? await res.json()
          : { scorePct: r.scorePct, coins: 0, xp: 0, percentileToday: 0, history: [], totalPoints: 0 };
        setOutcome(out);
        if (out.totalPoints > 0) setTotalPoints(out.totalPoints);
        posthog.capture('quick_play_round_completed', {
          mode: r.mode,
          scorePct: r.scorePct,
          coins: out.coins,
          xp: out.xp,
          percentile: out.percentileToday,
          roundIndex,
        });
        if (challenge) {
          posthog.capture('quick_play_challenge_accepted', { mode: r.mode, seed: r.seed });
          setRival({
            name: challenge.challengerName,
            emoji: '🎯',
            theirValue: challenge.challengerScorePct,
            myValue: r.scorePct,
            type: 'challenge',
          });
          if (r.scorePct > challenge.challengerScorePct) {
            posthog.capture('quick_play_rival_beaten', { mode: r.mode, rivalType: 'challenge' });
          }
        } else if (user?.id) {
          try {
            const rres = await fetch(`/api/ghost-rival?userId=${user.id}`);
            if (rres.ok) {
              const rd = await rres.json();
              if (rd?.rival) {
                // Weekly ghost rivalry compares CUMULATIVE weekly points on both
                // sides (updateRivalScore already added this round server-side).
                const mine = Number(rd.player?.score ?? 0);
                const theirs = Number(rd.rival.score ?? 0);
                setRival({
                  name: rd.rival.display_name || rd.rival.username || 'Rival',
                  emoji: '👻',
                  theirValue: theirs,
                  myValue: mine,
                  type: 'weekly',
                });
                if (mine > theirs) {
                  posthog.capture('quick_play_rival_beaten', { mode: r.mode, rivalType: 'weekly' });
                }
              }
            }
          } catch {
            /* rival card is optional */
          }
        }
      } finally {
        submitting.current = false;
        setPhase('results');
      }
    },
    [challenge, language, roundIndex, user?.id]
  );

  const handleNextRound = useCallback(() => {
    setRoundIndex((i) => i + 1);
    setConfig(null);
    setResult(null);
    setOutcome(null);
    setRival(null);
    setChallenge(null); // challenge is a one-round contract
    setSelection('random');
    setPhase('wheel');
  }, []);

  const handleChallenge = useCallback(() => {
    if (result) void shareChallenge(result, language, t);
  }, [result, language, t]);

  if (phase === 'playing' && config) {
    return (
      <QuickModeAdapter config={config} onDone={handleDone} onQuit={handleNextRound} />
    );
  }

  if (phase === 'results' && result && outcome) {
    return (
      <QuickPlayResults
        result={result}
        outcome={outcome}
        rival={rival}
        onNextRound={handleNextRound}
        onChallenge={handleChallenge}
      />
    );
  }

  return (
    <div className="flex min-h-full flex-col bg-neo-navy pb-8" data-testid="quick-play-hub">
      <header className="flex items-center justify-between px-5 pt-6">
        <BackButton onClick={goBack} label={t('common.back')} isDarkMode />
        <div className="text-center">
          <h1 className="font-neo-display text-2xl font-bold tracking-wide text-neo-cream">
            {t('quickPlay.solo.title')}
          </h1>
          <span className="inline-block -rotate-2 rounded-lg border-2 border-black bg-neo-yellow px-2 py-0.5 text-[10px] font-bold tracking-[2px] text-black shadow-hard-sm">
            BETA
          </span>
        </div>
        <div className="flex items-center gap-2">
          {totalPoints !== null && (
            <div className="rounded-xl border-neo-thick border-black bg-neo-navy-elevated px-3 py-2 text-center font-neo-display text-xs font-semibold shadow-hard" data-testid="quick-rank-chip">
              <span className={quickRank(totalPoints).color}>
                {t(`quickPlay.solo.rank.${quickRank(totalPoints).key}`)}
              </span>
            </div>
          )}
          <div className="rounded-xl border-neo-thick border-black bg-neo-navy-elevated px-3 py-2 text-center font-neo-display text-xs font-semibold text-neo-cream shadow-hard">
            {t('quickPlay.solo.round')}
            <b className="block text-base text-neo-cozy">{roundIndex}</b>
          </div>
        </div>
      </header>

      {loadError && (
        <div className="mx-5 mt-4 rounded-2xl border-neo-thick border-black bg-neo-red p-3 text-center font-neo-display text-sm font-semibold text-white shadow-hard" data-testid="quick-load-error">
          {t('quickPlay.solo.loadError')}
        </div>
      )}

      {answered && !challenge && (
        <div className="mx-5 mt-4 rounded-2xl border-neo-thick border-black bg-neo-navy-elevated p-3 text-center font-neo-display text-sm font-semibold text-neo-cream shadow-hard" data-testid="quick-answered-banner">
          {t('quickPlay.solo.answeredBanner', {
            name: answered.name,
            theirPct: String(answered.theirPct),
            yourPct: String(answered.yourPct),
          })}
        </div>
      )}

      {challenge && (
        <div className="mx-5 mt-4 rounded-2xl border-neo-thick border-black bg-neo-cozy p-3 text-center font-neo-display text-sm font-semibold text-black shadow-hard" data-testid="quick-challenge-banner">
          {t('quickPlay.solo.challengeBanner', {
            name: challenge.challengerName,
            pct: String(challenge.challengerScorePct),
          })}
        </div>
      )}

      <div className="flex flex-1 items-center justify-center py-6">
        {phase === 'loading' ? (
          <div className="font-neo-display text-lg text-neo-cozy" data-testid="quick-play-loading">
            {t('quickPlay.solo.loading')}
          </div>
        ) : (
          <QuickPlayWheel selection={selection} onSelect={handleSelect} onPlay={handlePlay} />
        )}
      </div>
    </div>
  );
}
