'use client';

/**
 * One adventure level inside a roguelike run: draft pick → server-dealt board →
 * clock (+ combat on elite/boss) → word list to /complete → next run link.
 * The HUD score uses the SAME `scoreWords` (relics, chain) the server settles
 * with, so what the player sees is what they get. The run token lives in state
 * + sessionStorage (`adv-run-w<N>`) so a reload resumes the run.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { isCombatKind, type PlayLevel } from '@/lib/adventure/play/levels';
import { scoreWords, chainsFrom } from '@/lib/adventure/play/scoreRun';
import { bossPhase, type BossPhase } from '@/lib/adventure/play/boss';
import { initCombat, step as combatStep, blockedTiles, type CombatEvent, type CombatFx, type CombatState } from '@/lib/adventure/play/combat';
import {
  BASE_HP, POTION_HEAL, POTION_HINTS, POTION_TIME_MS, hintCharges, revealsFullHint, type PotionId, type RelicId,
} from '@/lib/adventure/play/relics';
import type { OfferItem, PublicRun } from '@/lib/adventure/play/runToken';
import { eliteTrophy } from '@/lib/adventure/play/trophy';
import { isWordOnBoard } from '@/utils/clientWordValidator';
import { fetchWithAuth } from '@/utils/authFetch';
import { readRun, writeRun } from './runStorage';

export type RunPhase = 'loading' | 'error' | 'draft' | 'ready' | 'playing' | 'saving' | 'done';
export type SubmitResult = 'ok' | 'dup' | 'short' | 'invalid' | 'chain' | 'idle';

export interface RunResult {
  score: number;
  stars: number;
  bestStars: number;
  won: boolean;
  rewards: string[];
  validWords: string[];
  totalStars: number;
  points?: number[];
  targetsFound?: string[];
  nextRunToken?: string;
  nextRun?: PublicRun;
  offer?: OfferItem[];
  runOver?: boolean;
  runComplete?: boolean;
  /** Elite kill: the relic minted into the next run link. */
  trophy?: RelicId;
}

interface Options {
  world: number;
  level: number;
  language: string;
  isWord: (word: string) => Promise<boolean>;
}

const NO_POTIONS: Record<PotionId, number> = { heal: 0, time: 0, cleanse: 0, insight: 0 };
const ATTACK_FX = new Set(['hit', 'drain', 'freeze', 'curse', 'projectile', 'shuffle']);
/**
 * The server's attempt clock starts at the deal (/start), the player's at Start. Lingering on
 * the chapter / rule cards longer than this re-deals on the same run token before playing,
 * so the save can't land outside the server window (409 'expired') and fight stars stay fair.
 */
export const STALE_DEAL_MS = 8_000;
/** Normal level: once the foe (HP = top-star score) is K.O.'d, the level ends after this beat (letters land, K.O. stamp). */
export const FOE_KO_FINISH_MS = 1400;
/** How many combat fx batches the stage can look back on. */
const FX_FEED = 8;
export interface CombatFxEntry { id: number; fx: CombatFx[] }

export function useAdventureRun({ world, level, language, isWord }: Options) {
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

  const tokenRef = useRef('');
  const pendingRunTokenRef = useRef('');
  const wordsRef = useRef<string[]>([]);
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

  const relics = useMemo(() => run?.relics ?? [], [run]);
  const kind = lvl?.kind;
  const scored = useMemo(() => scoreWords(words, { relics, kind }), [words, relics, kind]);
  const score = scored.score;
  const combatLevel = !!lvl && isCombatKind(lvl.kind);
  const bossHp = combatLevel && lvl ? Math.max(0, lvl.bossHp - score) : 0;
  const boss: BossPhase | null = lvl?.isBoss ? bossPhase(bossHp, lvl.bossHp) : null;
  const hintsLeft = Math.max(0, hintCharges(relics) + extraHints - hintsGiven.length);
  const potionsLeft = useMemo(() => {
    const out = { ...NO_POTIONS };
    for (const id of Object.keys(out) as PotionId[]) out[id] = Math.max(0, (run?.potions?.[id] ?? 0) - potionsUsed[id]);
    return out;
  }, [run, potionsUsed]);
  const targetsFound = useMemo(() => (targets ? words.filter((w) => targets.includes(w)) : []), [targets, words]);
  const chainLetter = kind === 'chain' && words.length ? Array.from(words[words.length - 1]).pop() ?? null : null;

  const startLevel = useCallback(async (runToken?: string, pick?: number, retried = false) => {
    const req = ++requestRef.current;
    setPhase('loading');
    try {
      const res = await fetchWithAuth('/api/adventure/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ world, level, language, ...(runToken ? { runToken } : {}), ...(pick != null ? { pick } : {}) }),
      });
      if (res.status === 400 && runToken && !retried) {
        // Stale / foreign run token: drop it and start a fresh run.
        writeRun(world, null);
        return startLevel(undefined, undefined, true);
      }
      if (!res.ok) throw new Error(`start ${res.status}`);
      const data = await res.json();
      if (req !== requestRef.current) return;
      tokenRef.current = data.token;
      dealtAtRef.current = Date.now();
      if (data.runToken) dealtRunTokenRef.current = data.runToken;
      const r: PublicRun | null = data.run ?? null;
      setRun(r);
      if (data.runToken && r) writeRun(world, { runToken: data.runToken, run: r });
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
  }, [world, level, language]);

  // New attempt: reset, then draft (stored offer for this level) or deal.
  useEffect(() => {
    setWords([]);
    wordsRef.current = [];
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
    const requests = requestRef;
    const stored = readRun(world);
    if (stored && stored.run.step === level && stored.run.offer?.length) {
      pendingRunTokenRef.current = stored.runToken;
      setRun(stored.run);
      setOffer(stored.run.offer);
      setPhase('draft');
    } else {
      void startLevel(stored && stored.run.step === level ? stored.runToken : undefined);
    }
    // Drop any in-flight /start from the previous attempt.
    return () => { requests.current += 1; };
  }, [world, level, language, attempt, startLevel]);

  /** Draft: take offer item `index`, or null to skip. */
  const choosePick = useCallback((index: number | null) => {
    setOffer(null);
    void startLevel(pendingRunTokenRef.current, index ?? undefined);
  }, [startLevel]);

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
          hpLeft: c ? c.hp : hpRef.current,
          potionsUsed: used,
          died: opts.died === true || !!c?.dead,
          reviveUsed: !!c?.revived,
        }),
      });
      if (!res.ok) throw new Error(`complete ${res.status}`);
      const data: RunResult = await res.json();
      if (data.nextRunToken && data.nextRun) {
        writeRun(world, { runToken: data.nextRunToken, run: { ...data.nextRun, offer: data.offer ?? data.nextRun.offer } });
      } else {
        writeRun(world, null);
      }
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
    if (isCombatKind(lvl.kind)) {
      combatRef.current = initCombat({
        enemyId: lvl.enemyId ?? `${lvl.kind}-w${world}`,
        world,
        enemyHp: lvl.bossHp,
        hp: run?.hp ?? BASE_HP,
        maxHp: run?.maxHp ?? BASE_HP,
        relics,
        size: grid.length,
        seed: tokenRef.current,
      });
      setCombat(combatRef.current);
    }
    setPhase('playing');
  }, [lvl, msLeft, world, run, relics, grid.length, startLevel]);

  // A stale-deal Start: play as soon as the fresh board lands.
  useEffect(() => {
    if (phase !== 'ready' || !autoBeginRef.current) return;
    autoBeginRef.current = false;
    begin();
  }, [phase, begin]);

  // Clock + combat tick.
  useEffect(() => {
    if (phase !== 'playing') return;
    const id = setInterval(() => {
      const now = Date.now();
      const left = Math.max(0, endAtRef.current - now);
      setMsLeft(left);
      if (combatRef.current) dispatchCombat({ type: 'tick', dt: now - lastTickRef.current });
      lastTickRef.current = now;
      if (left === 0) void finish();
    }, 200);
    return () => clearInterval(id);
  }, [phase, finish, dispatchCombat]);

  // Death ends the run; the enemy falling ends the level.
  useEffect(() => {
    if (phase === 'playing' && combat?.dead) void finish({ died: true });
  }, [phase, combat?.dead, finish]);
  // The reducer is the fight's single source (its HP is the same relic-scored points).
  const enemyDown = combat ? combat.defeated : bossHp === 0;
  useEffect(() => {
    if (phase === 'playing' && combatLevel && enemyDown) void finish();
  }, [phase, combatLevel, enemyDown, finish]);
  // Normal level: the foe's HP is the top-star score. K.O. = nothing left to win, so end
  // after the stamp instead of leaving a dead clock (hunt also needs its goal met).
  const topStar = lvl && !combatLevel ? lvl.stars[2] : 0;
  const huntMet = kind !== 'hunt' || targetsFound.length >= (lvl?.huntCount ?? targets?.length ?? 0);
  const foeKo = topStar > 0 && score >= topStar && huntMet;
  useEffect(() => {
    if (phase !== 'playing' || !foeKo) return;
    const id = setTimeout(() => { void finish(); }, FOE_KO_FINISH_MS);
    return () => clearTimeout(id);
  }, [phase, foeKo, finish]);
  // Every hunt target found: nothing left to hunt.
  useEffect(() => {
    if (phase === 'playing' && targets?.length && targetsFound.length >= targets.length) void finish();
  }, [phase, targets, targetsFound.length, finish]);

  const submitWord = useCallback(
    async (raw: string): Promise<SubmitResult> => {
      if (phase !== 'playing' || !lvl) return 'idle';
      const w = raw.toLowerCase().trim();
      if (w.length < lvl.minLength) return 'short';
      if (wordsRef.current.includes(w)) return 'dup';
      if (lvl.kind === 'chain' && !chainsFrom(wordsRef.current[wordsRef.current.length - 1] ?? null, w)) return 'chain';
      if (!isWordOnBoard(w, grid.map((r) => r.map((c) => c.toLowerCase())), language)) return 'invalid';
      if (!(await isWord(w))) return 'invalid';
      if (wordsRef.current.includes(w)) return 'dup';
      wordsRef.current = [...wordsRef.current, w];
      setWords(wordsRef.current);
      if (combatRef.current) {
        const pts = scoreWords(wordsRef.current, { relics, kind: lvl.kind }).points;
        dispatchCombat({ type: 'word', word: w, points: pts[pts.length - 1] ?? 0 });
      }
      return 'ok';
    },
    [phase, lvl, grid, language, isWord, relics, dispatchCombat],
  );

  /** Next unfound hint word (spends a charge), or null when out of charges / words. */
  const takeHint = useCallback((): string | null => {
    if (hintsLeft <= 0) return null;
    // Hunt levels: a hint must point at a hidden target first — a side word does not move the goal.
    const pool = [...(targets ?? []), ...hints];
    const next = pool.find((h) => !wordsRef.current.includes(h) && !hintsGiven.includes(h));
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
  const frozen = useMemo(() => blockedTiles(combat), [combat]);
  // Elite kill mints a relic (the server grants the same one in the next run link).
  const defeated = !!combat?.defeated;
  const trophy = useMemo<RelicId | null>(
    // Once the server has spoken, only its grant counts (a rejected kill mints nothing).
    () => (kind === 'elite' && defeated ? (result ? result.trophy ?? null : eliteTrophy(world, relics)) : null),
    [kind, defeated, result, world, relics],
  );
  /** The run as the screen should draw it: the minted trophy already in the relic bar. */
  const runShown = useMemo(
    () => (trophy && run && !run.relics.includes(trophy) ? { ...run, relics: [...run.relics, trophy] } : run),
    [run, trophy],
  );

  return {
    phase, grid, lvl, words, score, msLeft, frozen, bossHp, boss, bossHits, result,
    begin, submitWord, retry, finish, shiftClock,
    // roguelike
    run, offer, choosePick, points: scored.points,
    hints, hintsLeft, hintsGiven, takeHint, grantHint, revealFullHint: revealsFullHint(relics),
    targets, targetsFound, chainLetter,
    hp: combat ? combat.hp : hp, maxHp: combat ? combat.maxHp : run?.maxHp ?? BASE_HP,
    potionsLeft, drinkPotion,
    combat, dispatchCombat, combatFx, trophy, runShown,
  };
}
