'use client';

/**
 * Quick Play hub — the spin → play → results loop.
 * One screen at a time, zero pre-game config. Tapping/dragging to a mode
 * plays it immediately; Random resolves at that same instant.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useAnnouncer } from '@/components/GameAnnouncer';
import posthog from '@/lib/analytics/lazyPosthog';
import { QuickPlayModePicker } from './QuickPlayModePicker';
import { QuickModeAdapter } from './adapters/QuickModeAdapter';
import { QuickPlayResults, type QuickRival } from './QuickPlayResults';
import type { CollectedWord } from './QuickWordsCollected';
import { recordGuestRound, quickCoinsFor, quickXpFor, recentAveragePct } from '@/lib/quickPlay/guestProgress';
import { getQuickPlayWordProgress } from '@/lib/quickPlay/wordCollection';
import { shareChallenge } from './challengeShare';
import { quickRank } from './quickRank';
import { BackButton } from '@/components/ui/BackButton';
import { LoadingDancer } from '@/components/ui/LoadingDancer';
import { BaseErrorBoundary } from '@/components/ErrorBoundaries';
import { captureError } from '@/utils/sentry';
import { useBackOneLevel } from '@/hooks/useBackOneLevel';
import type { WheelSelection } from './wheelGeometry';
import { strikeHoldMs } from './lightningPath';
import { QUICK_MODES, type QuickMode, type QuickRoundConfig, type QuickRoundResult, type QuickSubmitOutcome } from './types';

type HubPhase = 'wheel' | 'loading' | 'playing' | 'results';

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  const { announce } = useAnnouncer();
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
  const [collected, setCollected] = useState<CollectedWord[]>([]);
  const [collectionTotal, setCollectionTotal] = useState(0);
  const [dayStreak, setDayStreak] = useState(0);
  const [loadError, setLoadError] = useState(false);
  /** Resolved mode the lightning bolt is locked onto during loading. */
  const [strikeMode, setStrikeMode] = useState<QuickMode | null>(null);
  const goBack = useBackOneLevel();
  const submitting = useRef(false);
  const loadingRef = useRef(false);
  const wheelHeadingRef = useRef<HTMLHeadingElement>(null);

  // Phase changes swap the whole screen with no page navigation, so screen
  // readers get no automatic signal and sighted keyboard focus is stranded
  // on an unmounted control. Announce the change; move focus back to the
  // wheel heading whenever we return to it (results/playing own their focus).
  useEffect(() => {
    if (phase === 'wheel') wheelHeadingRef.current?.focus();
    else if (phase === 'loading') announce(t('quickPlay.solo.loading'));
    else if (phase === 'playing') announce(t(`quickPlay.solo.mode.${config?.mode ?? 'classic'}`));
  }, [phase, config?.mode, announce, t]);

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

  // Tapping a mode node or releasing the drag knob fires an electric strike
  // toward that mode, holds a visible loading state on the wheel, then enters
  // play after board fetch + a minimum hold (so fast APIs don't skip the beat).
  const handlePlay = useCallback(async (
    sel: WheelSelection,
    method: 'drag' | 'tap',
    /**
     * The challenge in force for THIS round. Passed explicitly because the
     * results screen clears the challenge and starts the next round in the
     * same tick: a closed-over `challenge` is still the old one at that point,
     * so tapping "Blast" after a challenge round replayed the challenge's mode
     * AND seed. `undefined` means "whatever state says"; `null` means none.
     */
    challengeOverride?: ChallengeInfo | null
  ) => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    const activeChallenge = challengeOverride === undefined ? challenge : challengeOverride;
    const mode: QuickMode =
      activeChallenge?.mode ??
      (sel === 'random'
        ? QUICK_MODES[Math.floor(Math.random() * QUICK_MODES.length)]
        : sel);
    // Lock UI to the resolved mode (for Random, show the picked mode on the bolt).
    setSelection(mode);
    setStrikeMode(mode);
    posthog.capture('quick_play_mode_selected', { mode: sel, method, roundIndex });
    if (sel === 'random' && !activeChallenge) {
      posthog.capture('quick_play_mode_selected', { mode, method: 'random', roundIndex });
    }
    setPhase('loading');
    setLoadError(false);
    const hold = strikeHoldMs(prefersReducedMotion());
    const started = Date.now();
    try {
      const res = await fetch('/api/quick-play/round', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // recentPct lets the server aim the rival field at THIS player: without
        // it a beginner passes nobody and a strong player passes everyone,
        // every round. Local history, so guests are covered too; 0 = unknown.
        body: JSON.stringify({ mode, language, seed: activeChallenge?.seed, recentPct: recentAveragePct() }),
      });
      if (!res.ok) throw new Error(`round fetch ${res.status}`);
      const round = (await res.json()) as QuickRoundConfig;
      const elapsed = Date.now() - started;
      if (elapsed < hold) await sleep(hold - elapsed);
      setConfig(round);
      setStrikeMode(null);
      setPhase('playing');
    } catch {
      // Silent no-op on error is forbidden — surface it (a dead-looking wheel
      // tap is indistinguishable from a bug).
      setLoadError(true);
      setStrikeMode(null);
      setPhase('wheel');
    } finally {
      loadingRef.current = false;
    }
  }, [challenge, language, roundIndex]);

  const handleDone = useCallback(
    async (r: QuickRoundResult) => {
      if (submitting.current) return;
      submitting.current = true;
      setResult(r);
      try {
        // Local first: the day streak has no server home, and a signed-out
        // player's whole progression lives here (submit is auth-gated, so it
        // used to hand guests a row of zeros).
        const local = recordGuestRound({ mode: r.mode, scorePct: r.scorePct });
        setDayStreak(local.dayStreak);

        // Which of this round's words the player had never found before. Never
        // fatal: a collection lookup that fails costs the ★ badges, not the
        // results screen.
        try {
          const roundWords = r.words ?? [];
          const progress = await getQuickPlayWordProgress(roundWords, user?.id ?? null);
          const isNew = new Set(progress.new.map((w) => w.toLowerCase()));
          setCollected(roundWords.map((w) => ({ ...w, isNew: isNew.has(w.word.toLowerCase()) })));
          setCollectionTotal(progress.total);
        } catch {
          setCollected((r.words ?? []).map((w) => ({ ...w, isNew: false })));
        }
        let out: QuickSubmitOutcome = {
          scorePct: r.scorePct,
          coins: quickCoinsFor(r.scorePct),
          xp: quickXpFor(r.scorePct),
          percentileToday: 0,
          history: local.history,
          totalPoints: local.points,
        };
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
          if (res.ok) out = await res.json();
        } catch {
          // Network failure on submit — fall through with the zero-outcome
          // default so results still render instead of stranding the round.
        }
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
            // Deterministic avatar from the challenge id so the rival reads as a
            // real player, not a bare target emoji.
            avatarUserId: challenge.id,
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
                  // Real player → seed a real avatar off their id.
                  avatarUserId: rd.rival.id ? String(rd.rival.id) : undefined,
                  avatarConfig: rd.rival.custom_avatar ?? null,
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

  /**
   * Back to the wheel — unless the player already named the mode they want on
   * the results screen, in which case that choice IS the decision and a trip
   * through the picker is a tax on it.
   */
  const handleNextRound = useCallback((mode?: QuickMode) => {
    setRoundIndex((i) => i + 1);
    setConfig(null);
    setResult(null);
    setOutcome(null);
    setRival(null);
    setChallenge(null); // challenge is a one-round contract
    setCollected([]);
    setSelection(mode ?? 'random');
    setStrikeMode(null);
    // `null`, not the state value: setChallenge above has not applied yet, and
    // the stale one would replay the challenge's board under a new mode.
    if (mode) void handlePlayRef.current?.(mode, 'tap', null); // it owns the phase from here
    else setPhase('wheel');
  }, []);

  // handlePlay is declared above but closes over `challenge`, which this
  // callback clears — a direct dependency would rebuild it every round and
  // re-fire the effects keyed on it. A ref keeps one stable identity.
  const handlePlayRef = useRef<typeof handlePlay | null>(null);
  handlePlayRef.current = handlePlay;

  const handleChallenge = useCallback(() => {
    if (result) void shareChallenge(result, language, t);
  }, [result, language, t]);

  if (phase === 'playing' && config) {
    /* A throw inside a mode adapter used to unmount the whole page: the round
       never appeared AND the hub went with it, so there was no way back to the
       picker — and nothing was reported, so it never reached Sentry. Contain it
       here (one boundary for all four modes) and route the player back. */
    return (
      <BaseErrorBoundary
        onError={(err) =>
          captureError(err, { feature: 'quick-play-round', mode: config.mode, seed: config.seed })
        }
        fallback={
          <div
            data-testid="quick-round-error"
            className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 bg-neo-navy p-6 text-center"
          >
            <p className="font-neo-display text-lg text-neo-white">
              {t('errors.errorHeading', "Let's Get You Back!")}
            </p>
            <button
              type="button"
              data-testid="quick-round-error-retry"
              onClick={() => handleNextRound()}
              className="rounded-neo border-neo-thick border-black bg-neo-lime px-6 py-3 font-neo-display text-neo-black shadow-hard active:shadow-hard-pressed"
            >
              {t('common.retry', 'Try Again')}
            </button>
          </div>
        }
      >
        <QuickModeAdapter config={config} onDone={handleDone} onQuit={handleNextRound} />
      </BaseErrorBoundary>
    );
  }

  if (phase === 'results' && result && outcome) {
    return (
      <QuickPlayResults
        result={result}
        outcome={outcome}
        rival={rival}
        rivals={config?.ghosts ?? []}
        collected={collected}
        collectionTotal={collectionTotal}
        isGuest={!user?.id}
        dayStreak={dayStreak}
        onNextRound={handleNextRound}
        onChallenge={handleChallenge}
      />
    );
  }

  return (
    <div
      className="relative flex min-h-0 flex-1 flex-col overflow-x-hidden overflow-y-auto bg-neo-navy pb-8 animate-[fadeInUp_0.25s_ease-out_0s_both]"
      data-testid="quick-play-hub"
    >
      {/* Arcade atmosphere — soft color blobs, non-interactive */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
        data-testid="quick-hub-atmosphere"
      >
        <div className="absolute -left-16 top-24 h-48 w-48 rounded-full bg-neo-lime/10 blur-3xl" />
        <div className="absolute -right-12 top-40 h-56 w-56 rounded-full bg-neo-pink/10 blur-3xl" />
        <div className="absolute bottom-24 left-1/3 h-40 w-40 rounded-full bg-neo-purple/10 blur-3xl" />
      </div>

      <header className="relative z-[1] flex items-center justify-between px-4 pt-5 sm:px-5 sm:pt-6">
        <BackButton onClick={goBack} label={t('common.back')} isDarkMode />
        <div className="text-center">
          <h1
            ref={wheelHeadingRef}
            tabIndex={-1}
            className="font-neo-display text-xl font-bold tracking-wide text-neo-cream outline-none drop-shadow-[0_2px_0_rgba(0,0,0,0.45)] sm:text-2xl"
          >
            {t('quickPlay.solo.title')}
          </h1>
          <span className="inline-block -rotate-2 rounded-lg border-2 border-black bg-neo-yellow px-2 py-0.5 text-[10px] font-bold tracking-[2px] text-black shadow-hard-sm">
            BETA
          </span>
        </div>
        <div className="flex items-stretch divide-x-2 divide-black rtl:divide-x-reverse rounded-xl border-neo-thick border-black bg-neo-navy-elevated text-center font-neo-display text-xs font-semibold shadow-hard" data-testid="quick-header-stats">
          {totalPoints !== null && (
            <div className="px-3 py-2" data-testid="quick-rank-chip">
              <span className={quickRank(totalPoints).color}>
                {t(`quickPlay.solo.rank.${quickRank(totalPoints).key}`)}
              </span>
            </div>
          )}
          <div className="px-3 py-2 text-neo-cream">
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

      {/* Board build is a real wait (fetch + a held beat). A dancing mascot is
          what the rest of the app puts on a loading surface — the static pose +
          CSS dance, not the heavy animated loop. */}
      {phase === 'loading' && (
        <div className="relative z-[2] -mb-2 flex flex-col items-center gap-1" data-testid="quick-loading-mascot">
          <LoadingDancer styleKey="arcade" className="h-20 w-20 sm:h-24 sm:w-24" />
          <span className="font-neo-display text-xs tracking-wide text-neo-cream/80">
            {t('quickPlay.solo.loading')}
          </span>
        </div>
      )}

      <div className="relative z-[1] flex min-h-0 flex-1 items-center justify-center overflow-x-hidden overflow-y-auto px-2 py-4 sm:py-6">
        {/* Mode picker stays mounted during loading so selection state is visible.
            Loading state dims siblings and disables random while selected card locks. */}
        {(phase === 'wheel' || phase === 'loading') && (
          <QuickPlayModePicker
            selection={selection}
            pendingMode={phase === 'loading' ? strikeMode : null}
            onSelect={handlePlay}
          />
        )}
      </div>

      {/* Bottom band reservation: the PWA install prompt (fixed bottom-4) and the
          AdMob anchor both sit over this screen and would cover the Random bar.
          It belongs OUT here as a flex sibling, not inside the picker — the
          centring row above is what positions the cards, so a spacer inside it
          gets centred too and pushes the whole grid upward by half its height. */}
      <div
        className="h-[calc(5rem+var(--admob-banner-height,0px))] flex-none"
        data-testid="quick-picker-bottom-spacer"
        aria-hidden="true"
      />
    </div>
  );
}
