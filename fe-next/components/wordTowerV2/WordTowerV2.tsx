'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Home } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { isTypingTarget } from '@/lib/dom/isTypingTarget';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import { biomeAt, floorsAt } from '@/lib/wordTowerV2/biomes';
import { impactThunk } from '@/lib/wordTowerV2/juice';
import { MIN_WORD_LEN, isAcceptedWord, spinWheel } from '@/lib/wordTowerV2/wheel';
import { spendScramble, totalScore } from '@/lib/wordTowerV2/run';
import { v2DailyNumericSeed, v2DailySeed } from '@/lib/wordTowerV2/daily';
import { saveRunSnapshot } from '@/lib/wordTowerV2/runPersist';
import { v2ShareCardPath } from '@/lib/wordTowerV2/shareCard';
import { utcDateKey } from '@/lib/wordTower/dailySeed';
import TowerCanvas, { type FrameStats, type GhostPreview } from './TowerCanvas';
import { V2Celebrations } from './V2Celebrations';
import { V2TopBar } from './V2TopBar';
import { V2Dock } from './V2Dock';
import { V2Results } from './V2Results';
import { RevengeHome } from './rivals/RevengeHome';
import { towerBlocksFrom } from './rewards/useRunPayout';
import { RunRewards } from './rewards/RunRewards';
import { useRewardsFlow } from './rewards/useRewardsFlow';
import { useEstate } from './useEstate';
import { DistrictScreen } from './estate/DistrictScreen';
import { perkChips } from './estate/estateArt';
import { EstateButton } from './estate/EstateButton';
import { PerkChips } from './estate/PerkChips';
import { useRivalTower } from './useRivalTower';
import { useTowerRun } from './useTowerRun';
import { confirmLeaveIfNeeded, useV2Ready } from './useV2Ready';
import { WreckScene } from './WreckScene';

/**
 * Word Tower v2.
 *
 * Two beats per turn: SPELL a word on the swipe wheel — the slab widens on the
 * hook letter by letter and snaps lime when the word is real — then TIME the
 * drop. Physics decides everything after release; the verdict, combo and
 * surprises are read off where the block actually settled.
 */

/** Pentatonic steps: every letter rings a higher note and no pair clashes. */
const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];

export default function WordTowerV2({ daily = false }: { daily?: boolean } = {}) {
  const { t, language, dir } = useLanguage();
  const { playSound } = useSoundEffects();
  const reducedMotion = usePrefersReducedMotion();
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
  const { phase, heightM, run, hoist, cancelHoist, drop, restart, setScrambles, previewWidth, seedDemo } = game;

  /**
   * Desktop/TV: the wheel moves to a SIDE panel and the canvas becomes the play
   * column, so the camera can spend the height on floors instead of sky (see
   * camera.ts `dockSide`). Gated on aspect as well as width: a tall 1024px
   * window keeps the phone framing, which is the one that is pinned by tests.
   */
  const [wide, setWide] = useState(false);
  const wideRef = useRef(false);
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px) and (min-aspect-ratio: 6/5)');
    const apply = () => {
      wideRef.current = mq.matches;
      setWide(mq.matches);
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  // Perks reach the run through a ref, so they can never re-render mid-drop.
  const setRunPerks = game.setPerks;
  useEffect(() => {
    setRunPerks(estateApi.perks);
  }, [setRunPerks, estateApi.perks]);

  // Variable rewards: coins per landing, the streak meter, the end-of-run chest.
  const rewardsFlow = useRewardsFlow({ game, estateApi, run, heightM, phase, playSound });

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
  useEffect(() => {
    const onHide = () => void bankRun(true);
    window.addEventListener('pagehide', onHide);
    return () => {
      window.removeEventListener('pagehide', onHide);
      void bankRun(true);
    };
  }, [bankRun]);
  const exitGame = useCallback(async () => {
    if (!confirmLeaveIfNeeded(phase, run.floors, t)) return;
    // Never strand the player on a slow network: navigate after at most 1.5s.
    await Promise.race([bankRun(), new Promise((r) => window.setTimeout(r, 1500))]);
    router.push(`/${language}`);
  }, [bankRun, router, language, phase, run.floors, t]);

  const dictRef = useRef<Set<string> | null>(null);
  const [dictReady, setDictReady] = useState(false);
  const [dictError, setDictError] = useState(false);
  const drawRef = useRef(0);
  const [wheel, setWheel] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);
  const [stats, setStats] = useState<FrameStats | null>(null);
  const [debug, setDebug] = useState(false);
  // Free look sends the camera home on every hoist, so the swing a player has to
  // time is always framed — see TowerCanvas `homeKey`.
  const [homeKey, setHomeKey] = useState(0);
  useEffect(() => {
    if (phase === 'swinging') setHomeKey((k) => k + 1);
  }, [phase]);

  // Shared by the top bar (which renders the coin chip) and ImpactBurst (which
  // flies landing coins into its exact rect), so the number never changes off-screen.
  const coinsRef = useRef<HTMLDivElement | null>(null);

  const dockRef = useRef<HTMLDivElement | null>(null);
  const dockPxRef = useRef(260);

  // The top bar's REAL bottom edge, for the camera (camera.ts `hudPx`). It
  // wraps to a second row and sits under the notch, so the fixed 96px the
  // camera assumed let the hanging slab slide under it. Callback ref: the bar
  // unmounts for the results / district and must be re-observed when it returns.
  const rootRef = useRef<HTMLDivElement | null>(null);
  const hudPxRef = useRef(0);
  const [barEl, setBarEl] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!barEl || !root) return;
    const measure = () => {
      hudPxRef.current = Math.round(barEl.getBoundingClientRect().bottom - root.getBoundingClientRect().top + 16);
      root.style.setProperty('--wt2-hud', `${hudPxRef.current}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(barEl);
    return () => ro.disconnect();
  }, [barEl]);
  const getHudPx = useCallback(() => hudPxRef.current, []);

  // The canvas frames the ground at the dock's real top edge. A SIDE dock
  // covers nothing at the bottom, so it contributes 0 — measuring its
  // full-height panel there would collapse the whole play area.
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const measure = () => {
      dockPxRef.current = wideRef.current ? 0 : el.getBoundingClientRect().height;
      // CSS var, not state: the first-floor hint sits above the dock without a re-render.
      el.parentElement?.style.setProperty('--wt2-dock', `${dockPxRef.current}px`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebug(params.has('debug'));
  }, []);

  // Gameplay owns the whole screen — the global bottom nav covered the dock.
  const setIsInGame = useHideNavigation();
  useEffect(() => {
    setIsInGame(true);
    return () => setIsInGame(false);
  }, [setIsInGame]);

  useEffect(() => {
    let cancelled = false;
    setDictError(false);
    loadWordCraftDictionary(language as Parameters<typeof loadWordCraftDictionary>[0])
      .then((set) => {
        if (cancelled) return;
        dictRef.current = set;
        setDictReady(true);
      })
      .catch(() => {
        // Without this the wheel stays dead with no explanation.
        if (!cancelled) {
          setDictReady(false);
          setDictError(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [language]);

  // Fresh letters per run AND after every hoisted word, so each turn is a new
  // little anagram rather than the same seven letters all run.
  const [runSeed, setRunSeed] = useState('');
  useEffect(() => setRunSeed(daily ? v2DailySeed(undefined, language) : `wt2-${Date.now()}`), [daily, language]);
  const deal = useCallback(
    (draw: number) => {
      if (!runSeed) return;
      drawRef.current = draw;
      setWheel(spinWheel(language as Parameters<typeof spinWheel>[0], draw, runSeed));
      setSelected([]);
    },
    [language, runSeed],
  );
  useEffect(() => deal(0), [deal]);

  const word = useMemo(() => selected.map((i) => wheel[i]).join(''), [selected, wheel]);
  const valid = dictReady && isAcceptedWord(word, wheel, dictRef.current);

  // The slab on the hook, read by the canvas every frame.
  const ghostRef = useRef<GhostPreview | null>(null);
  ghostRef.current =
    phase === 'composing' && word.length > 0 ? { word, widthPx: previewWidth(word), valid } : null;
  const getGhost = useCallback(() => ghostRef.current, []);
  const getDockPx = useCallback(() => dockPxRef.current, []);
  const getHangingId = useCallback(() => game.hangingRef.current?.id ?? null, [game.hangingRef]);
  const bestRef = useRef(game.bestM);
  bestRef.current = game.bestM;
  const getBestM = useCallback(() => bestRef.current, []);
  const sceneMRef = useRef(heightM);
  sceneMRef.current = heightM;
  const getSceneM = useCallback(() => sceneMRef.current, []);
  // Tenants: the run owns the total; the HUD counts up as each one actually
  // arrives on screen, capped by the run so it can never run ahead of it.
  const [arrived, setArrived] = useState(0);
  const arrivedRef = useRef(0);
  useEffect(() => {
    if (run.tenants === 0) {
      arrivedRef.current = 0;
      setArrived(0);
    }
  }, [run.tenants]);
  const onTenantArrive = useCallback(() => {
    arrivedRef.current += 1;
    setArrived(arrivedRef.current);
    playSound('coinCollect', { volume: 0.3, rate: 1 + (arrivedRef.current % 6) * 0.08 });
  }, [playSound]);

  // Brick-on-brick: a thunk on contact, heavier for a harder landing.
  const onImpact = useCallback(
    (speed: number) => {
      const thunk = impactThunk(speed);
      if (thunk) playSound('bossHit', thunk);
    },
    [playSound],
  );

  // A distinct chime the moment the spelled letters become a real word.
  const wasValid = useRef(false);
  useEffect(() => {
    if (valid && !wasValid.current) playSound('matchFound', { volume: 0.45 });
    wasValid.current = valid;
  }, [valid, playSound]);

  /**
   * Take a wheel slot, resolved against the LATEST selection. Resolving outside
   * the updater read a stale `selected` when keys arrived faster than renders,
   * so a doubled letter ("aa") took the same slot twice and dropped one.
   */
  const takeSlot = useCallback(
    (resolve: (sel: number[]) => number) => {
      if (phase !== 'composing') return;
      setSelected((sel) => {
        const i = resolve(sel);
        return i === -1 || sel.includes(i) ? sel : [...sel, i];
      });
    },
    [phase],
  );

  // One pentatonic note per letter added — outside the updater (StrictMode runs those twice).
  const prevLen = useRef(0);
  useEffect(() => {
    if (selected.length > prevLen.current) {
      const step = PENTATONIC[Math.min(selected.length - 1, PENTATONIC.length - 1)];
      playSound('tileSelect', { rate: 2 ** (step / 12), volume: 0.5 });
    }
    prevLen.current = selected.length;
  }, [selected.length, playSound]);

  const selectTile = useCallback((i: number) => takeSlot(() => i), [takeSlot]);

  const deselectTile = useCallback((i: number) => {
    setSelected((sel) => (sel.includes(i) ? sel.slice(0, sel.indexOf(i)) : sel));
  }, []);

  /** The wheel exactly as it was before the last submit, for the undo. */
  const preSubmitRef = useRef<{ wheel: string[]; selected: number[]; draw: number } | null>(null);
  /**
   * The wheel auto-builds a valid word 700ms after the last tile change
   * (WordTowerWheel AUTO_BUILD_MS). A word restored by the undo looks exactly
   * like "the player just finished spelling it", so the slab went straight back
   * onto the hook and the undo undid itself. This swallows that one auto-fire:
   * same selection, within a beat of the undo. A BUILD tap comes later and works.
   */
  const undoGuardRef = useRef<{ key: string; until: number } | null>(null);

  const submit = useCallback(() => {
    if (phase !== 'composing' || word.length === 0) return;
    const guard = undoGuardRef.current;
    if (guard && guard.key === selected.join(',') && performance.now() < guard.until) return;
    if (!isAcceptedWord(word, wheel, dictRef.current)) {
      setRejected(word.length < MIN_WORD_LEN ? 'too_short' : 'not_in_dictionary');
      playSound('wordRejected');
      window.setTimeout(() => setRejected(null), 900);
      setSelected([]);
      return;
    }
    preSubmitRef.current = { wheel, selected, draw: drawRef.current };
    hoist(word);
    deal(drawRef.current + 1);
  }, [phase, word, wheel, selected, hoist, playSound, deal]);

  /**
   * Put the hanging word back: the slab leaves the physics world and the wheel
   * returns to the exact letters it was spelled from, still selected, ready to
   * be edited. Legal only while it hangs — once dropped, physics owns it.
   */
  const putBack = useCallback(() => {
    if (!cancelHoist()) return;
    const prev = preSubmitRef.current;
    if (!prev) return;
    preSubmitRef.current = null;
    undoGuardRef.current = { key: prev.selected.join(','), until: performance.now() + 1100 };
    drawRef.current = prev.draw;
    setWheel(prev.wheel);
    setSelected(prev.selected);
  }, [cancelHoist]);

  /**
   * Release the slab. The undo snapshot dies WITH the turn: once physics owns
   * the floor there is nothing to put back, and a snapshot that outlived its
   * turn would let the next slab's undo restore the previous turn's letters.
   */
  const dropFloor = useCallback(() => {
    preSubmitRef.current = null;
    undoGuardRef.current = null;
    drop();
  }, [drop]);

  const scramble = useCallback(() => {
    const next = spendScramble(run);
    if (!next || phase === 'over') return;
    setScrambles(next);
    deal(drawRef.current + 1);
    playSound('boardShuffle');
  }, [run, phase, setScrambles, deal, playSound]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event) || phase === 'over' || smashing) return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (phase === 'swinging') dropFloor();
        else submit();
        return;
      }
      // Above the composing gate on purpose: taking the word back is the one
      // thing the player can do while the slab is on the hook.
      if (phase === 'swinging' && (event.key === 'Backspace' || event.key === 'Escape')) {
        event.preventDefault();
        putBack();
        return;
      }
      if (phase !== 'composing') return;
      if (event.key === 'Backspace') setSelected((s) => s.slice(0, -1));
      else if (event.key === 'Enter') submit();
      else if (event.key.length === 1) {
        const letter = event.key.toLowerCase();
        takeSlot((sel) => wheel.findIndex((l, i) => l === letter && !sel.includes(i)));
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, dropFloor, submit, wheel, takeSlot, smashing, putBack]);

  // Hold the results a beat so the player watches their tower come down.
  // The player closed the results card to look at the tower that fell. Cleared
  // the moment the run leaves 'over', so a new run never opens pre-dismissed.
  const [resultsDismissed, setResultsDismissed] = useState(false);

  const [showOver, setShowOver] = useState(false);
  useEffect(() => {
    if (phase !== 'over') {
      setShowOver(false);
      setResultsDismissed(false);
      return;
    }
    const id = window.setTimeout(() => setShowOver(true), 1300);
    return () => window.clearTimeout(id);
  }, [phase]);

  const myWords = Array.from(game.labelsRef.current.values()).slice(0, 30);
  const longestWord = myWords.reduce((a, w) => (w.length > a.length ? w : a), '');
  const scoreMultEarly = estateApi.perks.scoreMult;
  const liveScore = Math.round(totalScore(heightM, run.bonus) * scoreMultEarly);
  const { dailyLocked, dailyRank } = useV2Ready({
    daily,
    isAdmin: !!isAdmin,
    canSeeInWorkModes: !!canSeeInWorkModes,
    language,
    phase,
    floors: run.floors,
    peakM: game.peakM,
    score: liveScore,
    longestWord,
    resultsShown: showOver || forceResults,
    seedDemo,
    setForceResults,
    setSmashing,
    t,
  });

  useEffect(() => {
    if (phase === 'over' || run.floors <= 0) return;
    saveRunSnapshot(
      { daily, date: utcDateKey(), words: myWords, peakM: game.peakM, floors: run.floors },
      window.sessionStorage,
    );
  }, [daily, phase, run.floors, game.peakM, myWords]);

  // Smash round target: the friend who sent the link, else your own tower.
  const smashWords = rival?.words ?? (myWords.length >= 3 ? myWords : null);
  const rivalName = rival?.name || t('wordTowerV2.wreck.friend');
  const shareMine = () =>
    share({
      name: profile?.display_name ?? profile?.username ?? '',
      words: myWords,
      text: t('wordTowerV2.wreck.shareText', { m: game.peakM.toFixed(1) }),
    });

  const biomeNow = biomeAt(floorsAt(heightM));
  // Landmark perk: the district multiplies what the run is worth.
  const scoreMult = estateApi.perks.scoreMult;
  const score = Math.round(totalScore(heightM, run.bonus) * scoreMult);
  const accentHex = `#${biomeNow.accent.toString(16).padStart(6, '0')}`;
  // ONE source for the play column's box: the reward layer's impact FX is
  // positioned in canvas px, so its container must share this exact rect (on
  // RTL desktop the two differ by the whole side panel).
  const canvasClass = wide ? 'absolute bottom-0 start-0 top-0 end-[22rem] xl:end-[26rem]' : 'absolute inset-0';

  return (
    <div ref={rootRef} className="relative h-dvh w-full overflow-hidden bg-neo-navy" dir={dir}>
      {/* The smash round covers everything: don't run a second Pixi loop under it. */}
      {!smashing && !raiding ? (
        <TowerCanvas
          world={game.worldRef.current}
          labels={game.labelsRef.current}
          fxQueue={game.fxRef.current}
          getDockPx={getDockPx}
          getHudPx={getHudPx}
          getHangingId={getHangingId}
          getHangVx={game.getHangVx}
          getGhost={getGhost}
          getBestM={getBestM}
          bestLabel={t('wordTowerV2.bestFlag')}
          rulerSide={dir === 'rtl' ? 'left' : 'right'}
          onFrameStats={debug ? setStats : undefined}
          onBeforeStep={game.onBeforeStep}
          onImpact={onImpact}
          onTenantArrive={onTenantArrive}
          onLandPoint={rewardsFlow.fx.report}
          getSceneM={getSceneM}
          homeKey={homeKey}
          reducedMotion={reducedMotion}
          dockSide={wide ? 'inline' : 'bottom'}
          className={canvasClass}
        />
      ) : null}

      {phase !== 'over' && !smashing && !district && run.floors === 0 && !rival && perkChips(estateApi.perks).length > 0 ? (
        <PerkChips t={t} perks={estateApi.perks} onOpen={() => setDistrict(true)} />
      ) : null}

      {phase !== 'over' && !smashing && !district ? (
        <V2TopBar
          t={t}
          heightM={heightM}
          score={score}
          bestM={game.bestM}
          run={run}
          tenants={Math.min(arrived, run.tenants)}
          estate={estateApi.estate}
          runCoins={rewardsFlow.rewards.coins}
          raids={estateApi.inbox.length}
          coinsRef={coinsRef}
          onOpenEstate={() => setDistrict(true)}
          risk={game.risk}
          onExit={exitGame}
          barRef={setBarEl}
          wide={wide}
          reducedMotion={reducedMotion}
        />
      ) : null}
      <RunRewards
        t={t}
        flow={rewardsFlow}
        points={game.callout?.points ?? 0}
        canvasClass={canvasClass}
        counterRef={coinsRef}
        hideInRun={smashing || district || showOver}
        showChest={showOver}
        wide={wide}
        reducedMotion={reducedMotion}
      />
      <V2Celebrations t={t} callout={game.callout} banners={game.banners} onBannerDone={game.shiftBanner} swinging={phase === 'swinging'} />
      {/* One hint at a time, only on the first floor: spell it, then edit it,
          then drop it. It sits ABOVE the dock and never over the tower. */}
      {phase !== 'over' && run.floors === 0 && heightM < 0.5 && !rival ? (
        <div className="pointer-events-none absolute inset-x-4 bottom-[calc(var(--wt2-dock,17rem)+0.75rem)] z-20 mx-auto w-fit max-w-xs rounded-neo border-neo-thick border-black bg-neo-cream px-3 py-1.5 text-center font-neo-display text-sm font-bold text-neo-navy shadow-hard animate-neo-pop lg:max-w-sm lg:px-5 lg:py-2.5 lg:text-lg">
          {t(
            phase === 'swinging'
              ? 'wordTowerV2.hint.drop'
              : selected.length >= 2
                ? 'wordTowerV2.editHint'
                : 'wordTowerV2.hint.spell',
          )}
        </div>
      ) : null}
      {rival && phase === 'composing' && run.floors === 0 ? (
        <div className="pointer-events-none absolute inset-x-4 top-[calc(var(--wt2-hud,7rem)+0.5rem)] z-20 mx-auto max-w-sm rounded-neo border-neo-thick border-black bg-neo-pink px-3 py-2 text-center font-neo-display text-base font-bold text-neo-navy shadow-hard animate-neo-pop">
          {t('wordTowerV2.wreck.challenge', { name: rivalName })}
        </div>
      ) : null}
      {copied ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/3 z-[60] mx-auto w-fit rounded-neo border-neo-thick border-black bg-neo-lime px-4 py-2 font-neo-display text-lg font-black text-neo-navy shadow-hard animate-neo-pop">
          {t('wordTowerV2.wreck.copied')}
        </div>
      ) : null}
      {debug && stats ? (
        <div className="absolute end-3 top-14 z-20 font-mono text-[11px] text-neo-white/70">
          {stats.fps}fps · p95 {stats.p95Ms}ms · {stats.bodies}
        </div>
      ) : null}

      <V2Dock
        t={t}
        dockRef={dockRef}
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
        canPutBack={!!preSubmitRef.current}
        onScramble={scramble}
        onSelectTile={selectTile}
        onDeselectTile={deselectTile}
        onSubmit={submit}
        onDrop={dropFloor}
        onPutBack={putBack}
        onBackspace={() => setSelected((s) => s.slice(0, -1))}
      />

      {((showOver && rewardsFlow.resultsReady) || forceResults) && !resultsDismissed ? (
        <V2Results
          t={t}
          peakM={game.peakM}
          score={Math.round(totalScore(game.peakM, run.bonus) * scoreMult)}
          bestM={game.bestM}
          isBest={game.newBest || game.peakM >= game.bestM - 0.01}
          run={run}
          badges={game.runBadges}
          unlocked={game.unlockedRef.current}
          stats={game.statsRef.current}
          onRestart={() => {
            if (dailyLocked) return;
            preSubmitRef.current = null;
            undoGuardRef.current = null;
            restart();
            setRunSeed(daily ? v2DailySeed(undefined, language) : `wt2-${Date.now()}`);
          }}
          onHome={() => router.push(`/${language}`)}
          onClose={() => {
            setForceResults(false);
            setResultsDismissed(true);
          }}
          smashLabel={rival ? t('wordTowerV2.wreck.smash', { name: rivalName }) : t('wordTowerV2.wreck.smashOwn')}
          onSmash={smashWords ? () => setSmashing(true) : undefined}
          onShare={myWords.length >= 3 ? shareMine : undefined}
          recapSrc={v2ShareCardPath({
            heightM: game.peakM,
            floors: run.floors,
            biome: biomeNow.id,
            topWord: longestWord,
            name: profile?.display_name ?? profile?.username ?? '',
          })}
          dailyLocked={dailyLocked}
          dailyRank={dailyRank}
          rivals={{
            estate: estateApi,
            balls: run.balls,
            reducedMotion,
            myTower: towerBlocksFrom(game.worldRef.current, game.labelsRef.current),
            onRaidOpen: setRaiding,
          }}
          extra={
            <EstateButton
              t={t}
              estate={estateApi.estate}
              raids={estateApi.inbox.length}
              variant="panel"
              onOpen={() => setDistrict(true)}
            />
          }
        />
      ) : null}

      {/* Closing the results card shows the fallen tower — but it must never be
          a dead end, so the three ways on stay pinned above the dock. */}
      {resultsDismissed && phase === 'over' && !smashing && !district ? (
        <div className="absolute inset-x-0 bottom-[calc(var(--wt2-dock,17rem)+0.75rem)] z-40 mx-auto flex w-fit items-center gap-2 px-3">
          <button
            type="button"
            onClick={() => setResultsDismissed(false)}
            className="rounded-neo border-neo border-black bg-neo-cream px-3 py-1.5 font-neo-display text-sm font-bold text-neo-navy shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            {t('wordTowerV2.results.badges')}
          </button>
          {!dailyLocked ? (
          <button
            type="button"
            onClick={() => {
              restart();
              setRunSeed(daily ? v2DailySeed(undefined, language) : `wt2-${Date.now()}`);
            }}
            className="rounded-neo border-neo-thick border-black bg-neo-pink px-4 py-1.5 font-neo-display text-base font-black uppercase text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed"
          >
            {t('common.playAgain')}
          </button>
          ) : null}
          <button
            type="button"
            onClick={() => router.push(`/${language}`)}
            aria-label={t('wordTowerV2.results.home')}
            className="flex h-9 w-9 items-center justify-center rounded-neo border-neo border-black bg-neo-navy text-neo-cream shadow-hard-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
          >
            <Home className="h-4 w-4" aria-hidden />
          </button>
        </div>
      ) : null}

      {district ? <DistrictScreen t={t} estate={estateApi} onClose={() => setDistrict(false)} /> : null}

      {/* Someone raided you while you were away: their tower, the grievance and
          a free REVENGE — before any run, not after one. */}
      {phase !== 'over' && !smashing && !district && !showOver && !forceResults && run.floors === 0 ? (
        /* Only with nothing standing. `raiding` unmounts TowerCanvas, so opening
           a raid ON TOP of a live run would tear down the Pixi loop mid-tower —
           an entry point this flow has never had. Surfacing the pill mid-run is
           worth doing, but not on an unverified suspend. */
        <RevengeHome t={t} estate={estateApi} balls={run.balls} reducedMotion={reducedMotion} onRaidOpen={setRaiding} />
      ) : null}

      {smashing && smashWords ? (
        <WreckScene
          t={t}
          title={rival ? t('wordTowerV2.wreck.title', { name: rivalName }) : t('wordTowerV2.wreck.titleOwn')}
          words={smashWords}
          balls={run.balls}
          reducedMotion={reducedMotion}
          onShare={shareMine}
          onClose={() => {
            setSmashing(false);
            preSubmitRef.current = null;
            undoGuardRef.current = null;
            restart();
            setRunSeed(daily ? v2DailySeed(undefined, language) : `wt2-${Date.now()}`);
          }}
        />
      ) : null}
    </div>
  );
}
