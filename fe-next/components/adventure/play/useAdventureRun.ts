'use client';

/**
 * One adventure level inside a roguelike run: draft pick → server-dealt board →
 * clock (+ combat on elite/boss) → word list to /complete → next run link.
 * The HUD score uses the SAME `scoreWords` (relics, chain) the server settles
 * with, so what the player sees is what they get. The run token lives in state
 * + localStorage (`adv-run-w<N>`) so a reload resumes the run.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isCombatKind, type PlayLevel } from '@/lib/adventure/play/levels';
import { scoreWords, chainsFrom } from '@/lib/adventure/play/scoreRun';
import { bossPhase, type BossPhase } from '@/lib/adventure/play/boss';
import { initCombat, step as combatStep, blockedTiles, type CombatEvent, type CombatState } from '@/lib/adventure/play/combat';
import {
  BASE_HP, POTION_HEAL, POTION_HINTS, POTION_TIME_MS, hintCharges, revealsFullHint, type PotionId, type RelicId,
} from '@/lib/adventure/play/relics';
import type { OfferItem, PublicRun } from '@/lib/adventure/play/runToken';
import { isPlayNode, type NodeKind, type RunMap } from '@/lib/adventure/play/runMap';
import type { NodeState } from '@/lib/adventure/play/nodeResolve';
import { eliteTrophy } from '@/lib/adventure/play/trophy';
import { isWordOnBoard } from '@/utils/clientWordValidator';
import { fetchWithAuth } from '@/utils/authFetch';
import { trackGameStart, trackGameEnd, trackGrowthEvent } from '@/utils/growthTracking';
import { clearClearedNodes } from '@/components/adventure/map/clearedNodes';
import { useCoinActions } from '@/contexts/CoinContext';
import { holdAdventureLevelUp } from './heldLevelUp';
import { readRun, writeRun, readCarry, writeCarry } from './runStorage';
import {
  NO_POTIONS, potionsLeftOf, ecosystemOf, reachableNodes, combatSetupOf, nextHintWord, settleCompletedRun, runWithTrophy,
} from './runHelpers';
import { useLiveCombo, useRunClock, useRunEndings } from './useRunTimers';
import { STALE_DEAL_MS, ADVENTURE_MODE, type RunPhase, type SubmitResult, type RunResult, type CombatFxEntry } from './runTypes';

export {
  STALE_DEAL_MS, FOE_KO_FINISH_MS, ADVENTURE_MODE,
  type RunPhase, type SubmitResult, type RunResult, type EcosystemGains, type CombatFxEntry,
} from './runTypes';

interface Options {
  world: number;
  level: number;
  language: string;
  isWord: (word: string) => Promise<boolean | null>;
  /** Roguelike: the act-map node to play. Omitted = the run's current node (or row 0). */
  nodeId?: string;
  /**
   * Open on the ACT MAP instead of dealing a board: the player picks the node.
   * Opt-in so the old level-driven entry (and its tests) keep working.
   */
  mapFirst?: boolean;
}

const ATTACK_FX = new Set(['hit', 'drain', 'freeze', 'curse', 'projectile', 'shuffle']);
/** How many combat fx batches the stage can look back on. */
const FX_FEED = 8;

export function useAdventureRun({ world, level, language, isWord, nodeId, mapFirst }: Options) {
  const [phase, setPhase] = useState<RunPhase>('loading');
  const [grid, setGrid] = useState<string[][]>([]);
  const [lvl, setLvl] = useState<PlayLevel | null>(null);
  const [words, setWords] = useState<string[]>([]);
  const [msLeft, setMsLeft] = useState(0);
  const [bossHits, setBossHits] = useState(0);
  const [result, setResult] = useState<RunResult | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [run, setRun] = useState<PublicRun | null>(null);
  const [offer, setOffer] = useState<OfferItem[] | null>(null);
  const [hints, setHints] = useState<string[]>([]);
  const [hintsGiven, setHintsGiven] = useState<string[]>([]);
  const [extraHints, setExtraHints] = useState(0);
  const [targets, setTargets] = useState<string[] | undefined>(undefined);
  const [hp, setHp] = useState(BASE_HP);
  const [potionsUsed, setPotionsUsed] = useState<Record<PotionId, number>>(NO_POTIONS);
  const [combat, setCombat] = useState<CombatState | null>(null);
  const [combatFx, setCombatFx] = useState<CombatFxEntry[]>([]);
  const fxSeqRef = useRef(0);
  // --- Act map (server-derived from the run seed; never computed here).
  const [map, setMap] = useState<RunMap | null>(null);
  const [currentNode, setCurrentNode] = useState<string | null>(null);
  const [reachable, setReachable] = useState<string[]>([]);
  const [nodeState, setNodeState] = useState<NodeState | null>(null);

  const tokenRef = useRef('');
  // Ref: refreshCoins changes identity when the profile reloads; finish() must stay stable.
  const { refreshCoins } = useCoinActions();
  const refreshCoinsRef = useRef(refreshCoins);
  refreshCoinsRef.current = refreshCoins;
  const pendingRunTokenRef = useRef('');
  const wordsRef = useRef<string[]>([]);
  /** Find time of each word (ms since Start), aligned with wordsRef — combo + speed. */
  const timesRef = useRef<number[]>([]);
  const lastPointsRef = useRef(0);
  const endAtRef = useRef(0);
  const lastTickRef = useRef(0);
  const finishingRef = useRef(false);
  const combatRef = useRef<CombatState | null>(null);
  const hpRef = useRef(BASE_HP);
  const potionsUsedRef = useRef<Record<PotionId, number>>(NO_POTIONS);
  const requestRef = useRef(0);
  const dealtAtRef = useRef(0);
  const dealtRunTokenRef = useRef('');
  const autoBeginRef = useRef(false);
  const startedAtRef = useRef(0);
  const nodeKindRef = useRef<NodeKind | undefined>(undefined);
  const currentNodeRef = useRef<string | null>(null);

  const relics = useMemo(() => run?.relics ?? [], [run]);
  const kind = lvl?.kind;
  // timesRef is written in the same step as `words`, so this memo sees them aligned.
  const scored = useMemo(() => scoreWords(words, { relics, kind, language, times: timesRef.current }), [words, relics, kind, language]);
  const score = scored.score;
  const liveCombo = useLiveCombo(scored);
  const combatLevel = !!lvl && isCombatKind(lvl.kind);
  const bossHp = combatLevel && lvl ? Math.max(0, lvl.bossHp - score) : 0;
  const boss: BossPhase | null = lvl?.isBoss ? bossPhase(bossHp, lvl.bossHp) : null;
  // Rest-site hint upgrades ride on the run (`bh`), on top of the relic charges.
  const hintsLeft = Math.max(0, hintCharges(relics) + (run?.bh ?? 0) + extraHints - hintsGiven.length);
  const potionsLeft = useMemo(() => potionsLeftOf(run, potionsUsed), [run, potionsUsed]);
  const targetsFound = useMemo(() => (targets ? words.filter((w) => targets.includes(w)) : []), [targets, words]);
  const chainLetter = kind === 'chain' && words.length ? Array.from(words[words.length - 1]).pop() ?? null : null;

  /**
   * Everything ONE board's attempt owns. Every fresh deal goes through this —
   * the attempt effect and the in-place `newRun()` alike — so no path can reset
   * half of it (the missing half was `finishingRef`, which latches `finish()`).
   */
  const resetAttempt = useCallback(() => {
    setWords([]);
    wordsRef.current = [];
    timesRef.current = [];
    lastPointsRef.current = 0;
    setResult(null);
    setOffer(null);
    setHintsGiven([]);
    setExtraHints(0);
    potionsUsedRef.current = NO_POTIONS;
    setPotionsUsed(NO_POTIONS);
    combatRef.current = null;
    setCombat(null);
    setCombatFx([]);
    setBossHits(0);
    finishingRef.current = false;
    autoBeginRef.current = false;
  }, []);

  /** Fold a `{ runToken, run, map, currentNode, reachable }` view from either endpoint into state. */
  const applyView = useCallback((data: Record<string, unknown>) => {
    const r = (data.run ?? null) as PublicRun | null;
    setRun(r);
    if (data.map) setMap(data.map as RunMap);
    if ('currentNode' in data) setCurrentNode((data.currentNode ?? null) as string | null);
    if (Array.isArray(data.reachable)) setReachable(data.reachable as string[]);
    if (typeof data.runToken === 'string' && r) {
      dealtRunTokenRef.current = data.runToken;
      pendingRunTokenRef.current = data.runToken;
      writeRun(world, { runToken: data.runToken, run: r });
    }
    return r;
  }, [world]);

  const startLevel = useCallback(async (runToken?: string, pick?: number, retried = false, node?: string) => {
    const req = ++requestRef.current;
    setPhase('loading');
    try {
      const res = await fetchWithAuth('/api/adventure/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          world, level, language,
          ...(node ?? nodeId ? { nodeId: node ?? nodeId } : {}),
          ...(runToken ? { runToken } : {}), ...(pick != null ? { pick } : {}),
        }),
      });
      if (res.status === 400 && runToken && !retried) {
        // Stale / foreign / v1 run token (`code: 'run_version'`): drop it, start fresh.
        writeRun(world, null);
        return startLevel(undefined, undefined, true, node);
      }
      if (!res.ok) throw new Error(`start ${res.status}`);
      const data = await res.json();
      if (req !== requestRef.current) return;
      tokenRef.current = data.token;
      dealtAtRef.current = Date.now();
      nodeKindRef.current = data.nodeKind;
      currentNodeRef.current = data.currentNode ?? null;
      setNodeState(null);
      const r = applyView(data);
      hpRef.current = r?.hp ?? BASE_HP;
      setHp(hpRef.current);
      setHints(Array.isArray(data.hints) ? data.hints : []);
      setTargets(Array.isArray(data.targets) ? data.targets : undefined);
      setGrid(data.grid);
      setLvl(data.level);
      setMsLeft((data.seconds ?? data.level.seconds) * 1000);
      setPhase('ready');
    } catch (err) {
      console.error('[adventure] start failed', err);
      if (req === requestRef.current) setPhase('error');
    }
  }, [world, level, language, nodeId, applyView]);

  /**
   * The map half of a run: mint one, step onto a non-play node, or act on the
   * node we stand on. Every reply carries the whole view, so the map on screen
   * is always the server's map.
   */
  const callNode = useCallback(async (payload: Record<string, unknown>, retried = false): Promise<void> => {
    const req = ++requestRef.current;
    setPhase('loading');
    try {
      const runToken = pendingRunTokenRef.current || dealtRunTokenRef.current;
      // A mint (no run yet) brings the last run's relics + potions along.
      const carryToken = runToken ? null : readCarry();
      const res = await fetchWithAuth('/api/adventure/node', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world, ...(runToken ? { runToken } : {}), ...(carryToken ? { carryToken } : {}), ...payload }),
      });
      if (res.status === 400 && runToken && !retried) {
        const code = await res.json().then((d) => d?.code).catch(() => null);
        if (code === 'run_version') {
          // v1 token: the run cannot be resumed, so open a fresh one on the map.
          writeRun(world, null);
          pendingRunTokenRef.current = '';
          dealtRunTokenRef.current = '';
          return callNode({}, true);
        }
      }
      if (!res.ok) throw new Error(`node ${res.status}`);
      const data = await res.json();
      if (req !== requestRef.current) return;
      if (carryToken) writeCarry(null); // spent: the new run holds the haul now
      const r = applyView(data);
      hpRef.current = r?.hp ?? BASE_HP;
      setHp(hpRef.current);
      setOffer(r?.offer ?? null);
      setNodeState((data.node ?? null) as NodeState | null);
      setPhase(data.node ? 'node' : 'map');
    } catch (err) {
      console.error('[adventure] node failed', err);
      if (req === requestRef.current) setPhase('error');
    }
  }, [world, applyView]);

  /** Open the act map for this world (mints a run when there is none). */
  const openMap = useCallback(() => callNode({}), [callNode]);
  /**
   * Abandon whatever run is stored and open a brand-new act map (the run-over
   * restart). This happens IN PLACE (no remount), so it must run the SAME reset
   * a fresh attempt does. Clearing a hand-picked subset here left the dead run's
   * words and score on the next board, and left `finishingRef` latched — so that
   * board's K.O. never settled: a dead end with no result screen and nothing to
   * press but "back to map".
   */
  const newRun = useCallback(() => {
    // Abandoning a live run still keeps its haul for the next one.
    const live = pendingRunTokenRef.current || dealtRunTokenRef.current;
    if (live) writeCarry(live);
    writeRun(world, null);
    // The dead run's board spec: left in place, the header fell back to its level number.
    setLvl(null);
    clearClearedNodes(world);
    pendingRunTokenRef.current = '';
    dealtRunTokenRef.current = '';
    resetAttempt();
    return callNode({});
  }, [world, callNode, resetAttempt]);
  /** Act on the node the run stands on (shop buy, rest choice, event answer). */
  const nodeChoice = useCallback((choice: number) => callNode({ choice }), [callNode]);

  /** Commit to a node: a fight deals a board, anything else resolves server-side. */
  const chooseNode = useCallback((id: string) => {
    const node = map?.nodes.find((n) => n.id === id);
    if (node && !isPlayNode(node.kind)) return callNode({ nodeId: id });
    setNodeState(null);
    return startLevel(pendingRunTokenRef.current || dealtRunTokenRef.current || undefined, undefined, false, id);
  }, [map, callNode, startLevel]);

  // New attempt: reset, then draft (stored offer for this level) or deal.
  useEffect(() => {
    resetAttempt();
    const requests = requestRef;
    const stored = readRun(world);
    if (stored && stored.run.offer?.length) {
      // A draft is pending from the last cleared node — take it before moving.
      pendingRunTokenRef.current = stored.runToken;
      setRun(stored.run);
      setOffer(stored.run.offer);
      setPhase('draft');
    } else if (mapFirst) {
      // The map is the entry point: prime the token FIRST — /node with no token
      // mints a fresh run, which would silently throw away the run in progress.
      pendingRunTokenRef.current = stored ? stored.runToken : '';
      dealtRunTokenRef.current = '';
      void callNode({});
    } else {
      void startLevel(stored ? stored.runToken : undefined);
    }
    // Drop any in-flight /start from the previous attempt.
    return () => { requests.current += 1; };
  }, [world, level, language, attempt, startLevel, callNode, mapFirst, resetAttempt]);

  /**
   * Draft: take offer item `index`, or null to skip. The pick is applied on the
   * MAP endpoint (not /start) because the run is still standing on the node it
   * just cleared — the next board is dealt once the player picks their node.
   */
  const choosePick = useCallback((index: number | null) => {
    setOffer(null);
    void callNode({ pick: index ?? null });
  }, [callNode]);

  const finish = useCallback(async (opts: { died?: boolean } = {}) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setPhase('saving');
    const c = combatRef.current;
    const used = Object.fromEntries(Object.entries(potionsUsedRef.current).filter(([, n]) => n > 0));
    try {
      const res = await fetchWithAuth('/api/adventure/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: tokenRef.current,
          words: wordsRef.current,
          at: timesRef.current,
          hpLeft: c ? c.hp : hpRef.current,
          potionsUsed: used,
          died: opts.died === true || !!c?.dead,
          reviveUsed: !!c?.revived,
        }),
      });
      if (!res.ok) throw new Error(`complete ${res.status}`);
      const data: RunResult = await res.json();
      trackGameEnd(
        ADVENTURE_MODE, data.score ?? 0, data.validWords?.length ?? 0, !!data.won,
        startedAtRef.current ? Math.round((Date.now() - startedAtRef.current) / 1000) : undefined,
        { world, nodeKind: data.nodeKind ?? nodeKindRef.current, stars: data.stars ?? 0, runComplete: !!data.runComplete },
      );
      const nextToken = settleCompletedRun(world, data, dealtRunTokenRef.current || pendingRunTokenRef.current);
      pendingRunTokenRef.current = nextToken;
      dealtRunTokenRef.current = nextToken;
      // Milestone coins and the banked purse land in the app-wide wallet.
      if ((data.coinsGained ?? 0) > 0 || (data.purseCoins ?? 0) > 0) void refreshCoinsRef.current().catch(() => undefined);
      holdAdventureLevelUp(data.levelUp, !(data.nextRunToken && data.nextRun));
      setResult(data);
      setPhase('done');
    } catch (err) {
      console.error('[adventure] complete failed', err);
      setPhase('error');
    }
  }, [world]);

  const dispatchCombat = useCallback((ev: CombatEvent) => {
    const cur = combatRef.current;
    if (!cur) return;
    const next = combatStep(cur, ev);
    combatRef.current = next;
    if (next.fx.some((f) => ATTACK_FX.has(f))) setBossHits((n) => n + 1);
    if (next.fx.length) {
      const entry = { id: ++fxSeqRef.current, fx: next.fx };
      setCombatFx((feed) => [...feed.slice(1 - FX_FEED), entry]);
    }
    setCombat(next);
  }, []);

  const begin = useCallback(() => {
    if (!lvl) return;
    if (Date.now() - dealtAtRef.current > STALE_DEAL_MS && dealtRunTokenRef.current) {
      // Same run (the draft pick is already inside this token), fresh board + attempt clock.
      autoBeginRef.current = true;
      void startLevel(dealtRunTokenRef.current);
      return;
    }
    endAtRef.current = Date.now() + msLeft;
    lastTickRef.current = Date.now();
    startedAtRef.current = Date.now();
    // Stable mode label across every adventure node — trackGameEnd dedupes on it.
    trackGameStart(ADVENTURE_MODE, { world, level: lvl.level, levelKind: lvl.kind, nodeKind: nodeKindRef.current, nodeId: currentNodeRef.current });
    // Fights are nodes too: same funnel event NodeScreen fires for shop/rest/treasure/event.
    trackGrowthEvent('adventure_node_entered', { world, nodeKind: nodeKindRef.current ?? lvl.kind });
    combatRef.current = initCombat(combatSetupOf(lvl, world, run, relics, grid.length, tokenRef.current));
    setCombat(combatRef.current);
    setPhase('playing');
  }, [lvl, msLeft, world, run, relics, grid.length, startLevel]);

  // A stale-deal Start: play as soon as the fresh board lands.
  useEffect(() => {
    if (phase !== 'ready' || !autoBeginRef.current) return;
    autoBeginRef.current = false;
    begin();
  }, [phase, begin]);

  useRunClock({ phase, endAtRef, lastTickRef, combatRef, setMsLeft, dispatchCombat, finish });
  // The reducer is the fight's single source (its HP is the same relic-scored points).
  const enemyDown = combat ? combat.defeated : bossHp === 0;
  // Normal level: the foe's HP is the top-star score (hunt also needs its goal met).
  const topStar = lvl && !combatLevel ? lvl.stars[2] : 0;
  const huntMet = kind !== 'hunt' || targetsFound.length >= (lvl?.huntCount ?? targets?.length ?? 0);
  const foeKo = topStar > 0 && score >= topStar && huntMet;
  useRunEndings({
    phase, dead: !!combat?.dead, combatLevel, enemyDown, foeKo,
    allTargetsFound: !!targets?.length && targetsFound.length >= targets.length, finish,
  });

  const submitWord = useCallback(
    async (raw: string): Promise<SubmitResult> => {
      if (phase !== 'playing' || !lvl) return 'idle';
      const w = raw.toLowerCase().trim();
      if (w.length < lvl.minLength) return 'short';
      if (wordsRef.current.includes(w)) return 'dup';
      if (lvl.kind === 'chain' && !chainsFrom(wordsRef.current[wordsRef.current.length - 1] ?? null, w)) return 'chain';
      if (!isWordOnBoard(w, grid.map((r) => r.map((c) => c.toLowerCase())), language)) return 'invalid';
      const known = await isWord(w);
      if (known === null) return 'retry';
      if (!known) return 'invalid';
      if (wordsRef.current.includes(w)) return 'dup';
      wordsRef.current = [...wordsRef.current, w];
      timesRef.current = [...timesRef.current, Math.max(0, Date.now() - startedAtRef.current)];
      setWords(wordsRef.current);
      const pts = scoreWords(wordsRef.current, { relics, kind: lvl.kind, language, times: timesRef.current }).points;
      lastPointsRef.current = pts[pts.length - 1] ?? 0;
      if (combatRef.current) dispatchCombat({ type: 'word', word: w, points: lastPointsRef.current });
      return 'ok';
    },
    [phase, lvl, grid, language, isWord, relics, dispatchCombat],
  );

  /** Next unfound hint word (spends a charge), or null when out of charges / words. */
  const takeHint = useCallback((): string | null => {
    if (hintsLeft <= 0) return null;
    const next = nextHintWord(targets, hints, wordsRef.current, hintsGiven);
    if (!next) return null;
    setHintsGiven((g) => [...g, next]);
    return next;
  }, [hints, hintsGiven, hintsLeft, targets]);

  /** Drink a potion if one is left. Cleanse only works mid-fight. */
  const drinkPotion = useCallback((id: PotionId): boolean => {
    if (phase !== 'playing' || potionsLeft[id] <= 0) return false;
    const inFight = !!combatRef.current;
    if (id === 'cleanse' && !inFight) return false;
    if (id === 'heal') {
      if (inFight) dispatchCombat({ type: 'potion', id });
      else {
        hpRef.current = Math.min(run?.maxHp ?? BASE_HP, hpRef.current + POTION_HEAL);
        setHp(hpRef.current);
      }
    } else if (id === 'cleanse') dispatchCombat({ type: 'potion', id });
    else if (id === 'time') endAtRef.current += POTION_TIME_MS;
    else if (id === 'insight') setExtraHints((n) => n + POTION_HINTS);
    potionsUsedRef.current = { ...potionsUsedRef.current, [id]: potionsUsedRef.current[id] + 1 };
    setPotionsUsed(potionsUsedRef.current);
    return true;
  }, [phase, potionsLeft, run, dispatchCombat]);

  /** Bonus hint charge (a deed's drop). Client-only, like the insight potion; only mid-level. */
  const grantHint = useCallback(() => { if (phase === 'playing') setExtraHints((n) => n + 1); }, [phase]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  /** Client-only clock nudge (bomb-level penalties): moves the deadline, never into the past. */
  const shiftClock = useCallback((ms: number) => {
    if (phase === 'playing') endAtRef.current = Math.max(Date.now(), endAtRef.current + ms);
  }, [phase]);
  // Keyed on the tiles, not `combat`: the fight ticks 5x/s and a fresh Set every
  // tick broke GridComponent's memo, re-rendering every tile right through a drag.
  const frozenKey = combat?.tiles.map((t) => t.key).sort().join() ?? '';
  // eslint-disable-next-line react-hooks/exhaustive-deps -- frozenKey IS the tile set
  const frozen = useMemo(() => blockedTiles(combat), [frozenKey]);
  // Elite kill mints a relic (the server grants the same one in the next run link).
  const defeated = !!combat?.defeated;
  // Once the server has spoken, only its grant counts (a rejected kill mints nothing).
  const trophy = useMemo<RelicId | null>(
    () => (kind === 'elite' && defeated ? (result ? result.trophy ?? null : eliteTrophy(world, relics)) : null),
    [kind, defeated, result, world, relics],
  );
  const runShown = useMemo(() => runWithTrophy(run, trophy), [run, trophy]);

  const ecosystem = useMemo(() => ecosystemOf(result), [result]);
  const nextNodes = useMemo(() => reachableNodes(map, reachable), [map, reachable]);

  return {
    phase, grid, lvl, words, score, msLeft, frozen, bossHp, boss, bossHits, result,
    begin, submitWord, retry, finish, shiftClock,
    // act map
    map, currentNode, reachable, nextNodes, chooseNode, openMap, newRun, nodeState, nodeChoice, ecosystem,
    // roguelike
    run, offer, choosePick, points: scored.points, combo: liveCombo,
    /** Points the last accepted word scored (combo + speed + relics) — what the server credits. */
    lastWordPoints: () => lastPointsRef.current,
    hints, hintsLeft, hintsGiven, takeHint, grantHint, revealFullHint: revealsFullHint(relics),
    targets, targetsFound, chainLetter,
    hp: combat ? combat.hp : hp, maxHp: combat ? combat.maxHp : run?.maxHp ?? BASE_HP,
    potionsLeft, drinkPotion,
    combat, dispatchCombat, combatFx, trophy, runShown,
  };
}
