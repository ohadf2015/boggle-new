'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { useDailyStreak } from '@/lib/wordTower/useDailyStreak';
import { biomeAt, floorsAt } from '@/lib/wordTowerV2/biomes';
import { totalScore } from '@/lib/wordTowerV2/run';
import { v2DailyNumericSeed } from '@/lib/wordTowerV2/daily';
import { utcDateKey } from '@/lib/wordTower/dailySeed';
import TowerCanvas, { type FrameStats } from './TowerCanvas';
import { V2Celebrations } from './V2Celebrations';
import { DailyGoalCard } from './DailyGoalCard';
import { V2Hud } from './V2Hud';
import { V2Dock } from './V2Dock';
import { V2RunResults } from './V2RunResults';
import { V2OverBar } from './V2OverBar';
import { RevengeHome } from './rivals/RevengeHome';
import { RivalsScreen } from './rivals/RivalsScreen';
import { towerBlocksFrom } from './rewards/useRunPayout';
import { useV2Dictionary } from './useV2Dictionary';
import { useV2Layout } from './useV2Layout';
import { useCanvasFeeds } from './useCanvasFeeds';
import { useRejectFlash, useWordWheel } from './useWordWheel';
import { useDailyGoalToast, useTenantArrivals } from './useRunCheers';
import { RunRewards } from './rewards/RunRewards';
import { useRewardsFlow } from './rewards/useRewardsFlow';
import { useEstate } from './useEstate';
import { DistrictScreen } from './estate/DistrictScreen';
import { useRivalTower } from './useRivalTower';
import { useTowerRun } from './useTowerRun';
import { useV2Ready } from './useV2Ready';
import { useDailyTower } from './useDailyTower';
import { BraceControl } from './rescue/BraceControl';
import { StabilityBrace } from './rescue/StabilityBrace';
import { type RescueReject, useBrace } from './rescue/useBrace';
import { WreckScene } from './WreckScene';
import { ConfirmationDialog } from '@/components/ui/ConfirmationDialog';
import { ModeCoach } from '@/components/tutorial/ModeCoach';
import { useV2Exit } from './useV2Exit';
import { useOverHold } from './useOverHold';
import { dailyDateLabel } from './dailyDateLabel';
import { GuidedWordCoach } from './guide/GuidedWordCoach';
import { useGuidedFirstWord } from './guide/useGuidedFirstWord';
import { resolveWt2Screen } from '@/lib/wordTowerV2/exitTracking';

/**
 * Word Tower v2.
 *
 * Two beats per turn: SPELL a word on the swipe wheel — the slab widens on the
 * hook letter by letter and snaps lime when the word is real — then TIME the
 * drop. Physics decides everything after release; the verdict, combo and
 * surprises are read off where the block actually settled.
 */

export default function WordTowerV2({ daily = false }: { daily?: boolean } = {}) {
  const { t, language, dir } = useLanguage();
  const { playSound } = useSoundEffects();
  const reducedMotion = usePrefersReducedMotion();
  const { recordPlay } = useDailyStreak();

  const dailyDateFormatted = useMemo(() => (daily ? dailyDateLabel(language) : undefined), [daily, language]);
  const game = useTowerRun({
    seed: daily ? v2DailyNumericSeed(undefined, language) : undefined,
    scriptedSwing: daily,
  });
  const { profile, canSeeInWorkModes, isAdmin } = useAuth();
  const router = useRouter();
  const { rival, share, copied } = useRivalTower(language);
  const [smashing, setSmashing] = useState(false);
  // A raid (rival board -> their tower) owns the whole screen like the smash round.
  const [raiding, setRaiding] = useState(false);
  /** Review hook only (`?demo=1&results=1`): show the end-of-run board now. */
  const [forceResults, setForceResults] = useState(false);
  /** The empire: one instance for the whole screen (perks, coins, district). */
  const estateApi = useEstate();
  const [district, setDistrict] = useState(false);
  const [rivalsOpen, setRivalsOpen] = useState(false);
  const { phase, heightM, run, hoist, cancelHoist, drop, restart, setScrambles, seedDemo } = game;

  // The daily tower persists across days: restored on open, saved as it grows.
  const hangingIdRef = useMemo(
    () => ({
      get current() {
        return game.hangingRef.current?.id ?? null;
      },
    }),
    [game.hangingRef],
  );
  const dailyTower = useDailyTower({
    daily,
    language,
    phase,
    worldRef: game.worldRef,
    labelsRef: game.labelsRef,
    hangingIdRef,
    restoreTower: game.restoreTower,
  });
  const { goalToast, dismissGoalToast } = useDailyGoalToast(daily, dailyTower.targetM, dailyTower.targetHit, playSound);
  /** Floors standing right now: this run's plus the ones restored from earlier days. */
  const towerFloors = run.floors + (daily ? dailyTower.restoredFloors : 0);

  const layout = useV2Layout();
  const { wide, canvasClass } = layout;

  // Perks reach the run through a ref, so they can never re-render mid-drop.
  const setRunPerks = game.setPerks;
  useEffect(() => {
    setRunPerks(estateApi.perks);
  }, [setRunPerks, estateApi.perks]);

  // Variable rewards: coins per landing, the streak meter, the end-of-run chest.
  const rewardsFlow = useRewardsFlow({ game, estateApi, run, heightM, phase, playSound });
  // The daily never holds its results for the server: coins fill in when they land.
  const resultsReady = daily || rewardsFlow.resultsReady;

  const { dictRef, dictReady, dictError } = useV2Dictionary(language);

  // Emergency brace (coins off the run, a free one from upgrades, or a rescue word).
  const { rejected, flash: flashReject } = useRejectFlash(playSound);
  const onRescueReject = useCallback(
    (reason: RescueReject) => flashReject(reason === 'rescue_short' ? 'wordTowerV2.brace.short' : reason),
    [flashReject],
  );
  const braceApi = useBrace({
    brace: game.brace,
    freeBraces: estateApi.perks.freeBraces,
    district: estateApi.estate.district,
    runCoins: rewardsFlow.rewards.coins,
    floors: run.floors,
    risk: game.risk,
    over: phase === 'over',
    onReject: onRescueReject,
  });

  // The server keeps the best height too (word_tower_estates.best_m); the device
  // copy alone forgot it on every new phone or cleared cache.
  const adoptBest = game.adoptBest;
  useEffect(() => {
    if (estateApi.status === 'ready') adoptBest(estateApi.estate.bestM);
  }, [estateApi.status, estateApi.estate.bestM, adoptBest]);

  /**
   * Leaving with a tower still standing BANKS it (coins, floors, best height,
   * the rival copy). Before, only a collapse reported the run, so walking away
   * mid-run — the exit, a closed tab, the back button — threw it all away.
   * Once per run (useRunPayout), keepalive so the POST outlives the page.
   */
  const bankRun = rewardsFlow.bank;
  const flushDaily = dailyTower.flush;
  useEffect(() => {
    const onHide = () => {
      flushDaily({ keepalive: true });
      void bankRun(true);
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      void bankRun(true);
    };
  }, [bankRun, flushDaily]);
  /**
   * A tower still standing is never "game over" any more — only a total
   * collapse is. So the exit is the CASH OUT: it ends the run on purpose and
   * the chest + results follow (they carry the way home). With nothing built
   * it just leaves.
   */
  const { finish } = game;

  const getScreen = useCallback(() => {
    return resolveWt2Screen({
      dictError,
      dictReady,
      phase,
      showOver: phase === 'over',
      resultsReady,
      forceResults,
      district,
      raiding,
      smashing,
      floors: towerFloors,
    });
  }, [dictError, dictReady, phase, resultsReady, forceResults, district, raiding, smashing, towerFloors]);

  const exitFlow = useV2Exit({
    phase,
    floors: towerFloors,
    daily,
    finish,
    bankRun,
    router,
    language,
    getScreen,
    t,
    flushDaily: () => flushDaily({ keepalive: false }),
  });

  const [stats, setStats] = useState<FrameStats | null>(null);
  // Shared by the top bar (which renders the coin chip) and ImpactBurst (which
  // flies landing coins into its exact rect), so the number never changes off-screen.
  const coinsRef = useRef<HTMLDivElement | null>(null);

  const keysBlocked = smashing || rivalsOpen || raiding;
  const ww = useWordWheel({
    daily, language, phase, run, hoist, cancelHoist, drop, setScrambles,
    dictRef, dictReady, braceApi, flashReject, playSound, recordPlay, keysBlocked,
  });
  const { wheel, selected, word, valid, resetForRun } = ww;
  const guide = useGuidedFirstWord({ daily, dict: dictRef.current, dictReady, dictError, wheel, selected, phase, towerFloors, floors: run.floors });

  const feeds = useCanvasFeeds({ game, estateApi, word, valid, playSound });
  const { tenantsShown, onTenantArrive } = useTenantArrivals(run.tenants, playSound);

  const overHold = useOverHold(phase, daily);
  const { showOver, resultsDismissed } = overHold;

  const myWords = Array.from(game.labelsRef.current.values()).slice(0, 30);
  const longestWord = myWords.reduce((a, w) => (w.length > a.length ? w : a), '');
  // Landmark perk: the district multiplies what the run is worth.
  const score = Math.round(totalScore(heightM, run.bonus) * estateApi.perks.scoreMult);
  const { dailyRank, refreshRank } = useV2Ready({
    daily,
    isAdmin: !!isAdmin,
    canSeeInWorkModes: !!canSeeInWorkModes,
    language,
    phase,
    floors: run.floors,
    peakM: game.peakM,
    heightM: game.heightM,
    score,
    resultsShown: showOver || forceResults,
    seedDemo,
    setForceResults,
    setSmashing,
  });

  const showBrace = phase !== 'over' && !smashing && !district;
  const stabilitySlot = useMemo(
    () =>
      showBrace ? <StabilityBrace t={t} risk={game.risk} api={braceApi} reducedMotion={reducedMotion} /> : undefined,
    [showBrace, t, game.risk, braceApi, reducedMotion],
  );

  /**
   * New run. The daily tower comes back as the day's checkpoint (a collapse
   * only costs today's growth); the free tower starts from an empty lot.
   */
  const restartRun = useCallback(() => {
    restart();
    resetForRun();
    if (daily) {
      dailyTower.resume();
      refreshRank();
    }
  }, [restart, resetForRun, daily, dailyTower, refreshRank]);

  // Smash round target: only the friend who sent the link. Wrecking your OWN
  // tower was removed — there is no reason to knock down what you just built.
  const smashWords = rival?.words ?? null;
  const rivalName = rival?.name || t('wordTowerV2.wreck.friend');
  const shareMine = () =>
    share({
      name: profile?.display_name ?? profile?.username ?? '',
      words: myWords,
      text: t('wordTowerV2.wreck.shareText', { m: game.peakM.toFixed(1) }),
    });

  const biomeNow = biomeAt(floorsAt(heightM));
  const accentHex = `#${biomeNow.accent.toString(16).padStart(6, '0')}`;

  return (
    <div ref={layout.rootRef} className="relative h-dvh w-full shrink-0 overflow-hidden bg-neo-navy" dir={dir}>
      {/* The smash round covers everything: don't run a second Pixi loop under it. */}
      {!smashing && !raiding ? (
        <TowerCanvas
          world={game.worldRef.current}
          labels={game.labelsRef.current}
          fxQueue={game.fxRef.current}
          getDockPx={layout.getDockPx}
          getHudPx={layout.getHudPx}
          getHangingId={feeds.getHangingId}
          getHangVx={game.getHangVx}
          getCraneX={game.getCraneX}
          getPerfectWindowMult={feeds.getPerfectWindowMult}
          getGhost={feeds.getGhost}
          getBestM={feeds.getBestM}
          bestLabel={t('wordTowerV2.bestFlag')}
          rulerSide={dir === 'rtl' ? 'left' : 'right'}
          onFrameStats={layout.debug ? setStats : undefined}
          onBeforeStep={game.onBeforeStep}
          onImpact={feeds.onImpact}
          onTenantArrive={onTenantArrive}
          onLandPoint={rewardsFlow.fx.report}
          getSceneM={feeds.getSceneM}
          homeKey={feeds.homeKey}
          reducedMotion={reducedMotion}
          getGear={feeds.getGear}
          dockSide={wide ? 'inline' : 'bottom'}
          className={canvasClass}
        />
      ) : null}

      {phase !== 'over' && !smashing && !district && !raiding && guide.status === 'off' && !guide.path ? <ModeCoach mode="wordTower" /> : null}
      <GuidedWordCoach t={t} guide={guide} swinging={phase === 'swinging'} selected={selected} reducedMotion={reducedMotion} />
      {phase !== 'over' && !smashing && !district ? (
        <V2Hud
          t={t}
          heightM={heightM}
          score={score}
          bestM={game.bestM}
          run={run}
          tenants={tenantsShown}
          estate={estateApi.estate}
          runCoins={rewardsFlow.rewards.coins - braceApi.spent}
          raids={estateApi.inbox.length}
          coinsRef={coinsRef}
          onOpenEstate={() => setDistrict(true)}
          onOpenRivals={phase === 'composing' ? () => setRivalsOpen(true) : undefined}
          onExit={exitFlow.goHome}
          barRef={layout.setBarEl}
          wide={wide}
          reducedMotion={reducedMotion}
          daily={daily}
          dailyDateKey={daily ? utcDateKey() : undefined}
          dailyDateFormatted={dailyDateFormatted}
          dailyTarget={daily ? { growthM: dailyTower.growthM, targetM: dailyTower.targetM } : undefined}
          hasTower={towerFloors > 0}
        />
      ) : null}
      <RunRewards
        t={t}
        flow={rewardsFlow}
        points={game.callout?.points ?? 0}
        canvasClass={canvasClass}
        counterRef={coinsRef}
        hideInRun={smashing || district || showOver}
        showChest={showOver && !daily}
        wide={wide}
        reducedMotion={reducedMotion}
      />
      {phase !== 'over' && !smashing && !district ? <BraceControl t={t} api={braceApi} reducedMotion={reducedMotion} /> : null}
      <V2Celebrations
        t={t}
        callout={game.callout}
        banners={game.banners}
        onBannerDone={game.shiftBanner}
        swinging={phase === 'swinging'}
        rivalChallenge={!!rival && phase === 'composing' && run.floors === 0}
      />
      {rival && phase === 'composing' && run.floors === 0 ? (
        <div className="pointer-events-none absolute inset-x-4 top-[calc(var(--wt2-hud,7rem)+0.5rem)] z-20 mx-auto max-w-sm rounded-neo border-neo-thick border-black bg-neo-pink px-3 py-2 text-center font-neo-display text-base font-bold text-neo-navy shadow-hard animate-neo-pop">
          {t('wordTowerV2.wreck.challenge', { name: rivalName })}
        </div>
      ) : null}
      {goalToast ? (
        <DailyGoalCard t={t} growthM={dailyTower.growthM} onKeepClimbing={dismissGoalToast} onBank={exitFlow.goHome} />
      ) : null}
      {copied ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-[60] mx-auto w-fit rounded-neo border-neo-thick border-black bg-neo-lime px-4 py-2 font-neo-display text-lg font-black text-neo-navy shadow-hard animate-neo-pop">
          {t('wordTowerV2.wreck.copied')}
        </div>
      ) : null}
      {layout.debug && stats ? (
        <div className="absolute end-3 top-14 z-20 font-mono text-[11px] text-neo-white/70">
          {stats.fps}fps · p95 {stats.p95Ms}ms · {stats.bodies}
        </div>
      ) : null}

      <V2Dock
        t={t}
        dockRef={layout.dockRef}
        wide={wide}
        dir={dir}
        swinging={phase === 'swinging'}
        composing={phase === 'composing'}
        rejected={rejected}
        dictError={dictError}
        scrambles={run.scrambles}
        wheel={wheel}
        selected={selected}
        word={word}
        valid={valid}
        intensity={Math.min(1, heightM / 40)}
        accentHex={accentHex}
        reducedMotion={reducedMotion}
        canPutBack={ww.canPutBack}
        stabilitySlot={stabilitySlot}
        onScramble={ww.scramble}
        onSelectTile={ww.selectTile}
        onDeselectTile={ww.deselectTile}
        onSubmit={ww.submit}
        onDrop={ww.dropFloor}
        onPutBack={ww.putBack}
        onBackspace={ww.backspace}
        onClearWord={ww.clearWord}
      />

      {((showOver && resultsReady) || forceResults) && !resultsDismissed ? (
        <V2RunResults
          t={t}
          language={language}
          game={game}
          estateApi={estateApi}
          payoutStatus={rewardsFlow.payoutStatus}
          daily={daily}
          dailyTower={dailyTower}
          dailyRank={dailyRank}
          dailyDateFormatted={dailyDateFormatted}
          biomeId={biomeNow.id}
          playerName={profile?.display_name ?? profile?.username ?? ''}
          longestWord={longestWord}
          rivalName={rivalName}
          celebrate={overHold.celebrate && !forceResults}
          reducedMotion={reducedMotion}
          onRestart={restartRun}
          onHome={exitFlow.goHome}
          onClose={() => {
            setForceResults(false);
            overHold.dismiss();
          }}
          onSmash={smashWords ? () => setSmashing(true) : undefined}
          onShare={myWords.length >= 3 ? shareMine : undefined}
          onRaidOpen={setRaiding}
          onOpenDistrict={() => setDistrict(true)}
        />
      ) : null}

      {/* Closing the results card shows the fallen tower — but it must never be
          a dead end, so the three ways on stay pinned above the dock. */}
      {resultsDismissed && phase === 'over' && !smashing && !district ? (
        <V2OverBar
          t={t}
          daily={daily}
          language={language}
          onBadges={overHold.reopen}
          onRestart={restartRun}
          onHome={exitFlow.goHome}
        />
      ) : null}

      {rivalsOpen && phase !== 'over' ? (
        <RivalsScreen
          t={t}
          estate={estateApi}
          myTower={towerBlocksFrom(game.worldRef.current, game.labelsRef.current)}
          myHeightM={heightM}
          balls={run.balls}
          reducedMotion={reducedMotion}
          onClose={() => setRivalsOpen(false)}
          onRaidOpen={setRaiding}
        />
      ) : null}

      {district ? <DistrictScreen t={t} estate={estateApi} onClose={() => setDistrict(false)} /> : null}

      <ConfirmationDialog {...exitFlow.leaveDialog} />

      {/* Someone raided you while you were away: their tower, the grievance and
          a free REVENGE — before any run, not after one. */}
      {phase !== 'over' && !smashing && !district && !showOver && !forceResults && towerFloors === 0 ? (
        /* Only with nothing standing. `raiding` unmounts TowerCanvas, so opening
           a raid ON TOP of a live run would tear down the Pixi loop mid-tower —
           an entry point this flow has never had. Surfacing the pill mid-run is
           worth doing, but not on an unverified suspend. */
        <RevengeHome t={t} estate={estateApi} balls={run.balls} reducedMotion={reducedMotion} onRaidOpen={setRaiding} />
      ) : null}

      {smashing && smashWords ? (
        <WreckScene
          t={t}
          title={t('wordTowerV2.wreck.title', { name: rivalName })}
          words={smashWords}
          balls={run.balls}
          reducedMotion={reducedMotion}
          onShare={shareMine}
          onClose={() => {
            setSmashing(false);
            restartRun();
          }}
        />
      ) : null}
    </div>
  );
}
