'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Delete, Shuffle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useHideNavigation } from '@/contexts/NavigationContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion';
import { isTypingTarget } from '@/lib/dom/isTypingTarget';
import { loadWordCraftDictionary } from '@/lib/word-craft/dictionary';
import { WordTowerWheel } from '@/components/wordTower/WordTowerWheel';
import { BIOME_THEME } from '@/components/wordTower/biomeTheme';
import { biomeAtHeight } from '@/lib/wordTowerV2/altitude';
import { MIN_WORD_LEN, isAcceptedWord, spinWheel } from '@/lib/wordTowerV2/wheel';
import { spendScramble, totalScore } from '@/lib/wordTowerV2/run';
import TowerCanvas, { type FrameStats, type GhostPreview } from './TowerCanvas';
import { V2Backdrop } from './V2Backdrop';
import { V2GameOver, V2Hud } from './V2Hud';
import { useTowerRun } from './useTowerRun';

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

export default function WordTowerV2() {
  const { t, language, dir } = useLanguage();
  const { playSound } = useSoundEffects();
  const reducedMotion = usePrefersReducedMotion();
  const game = useTowerRun();
  const { phase, heightM, run, hoist, drop, restart, setScrambles, previewWidth, seedDemo } = game;

  const dictRef = useRef<Set<string> | null>(null);
  const [dictReady, setDictReady] = useState(false);
  const [dictError, setDictError] = useState(false);
  const drawRef = useRef(0);
  const [wheel, setWheel] = useState<string[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [rejected, setRejected] = useState<string | null>(null);
  const [stats, setStats] = useState<FrameStats | null>(null);
  const [debug, setDebug] = useState(false);

  const dockRef = useRef<HTMLDivElement | null>(null);
  const dockPxRef = useRef(260);

  // The canvas frames the ground at the dock's real top edge.
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      dockPxRef.current = el.getBoundingClientRect().height;
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setDebug(params.has('debug'));
    if (params.has('demo')) seedDemo();
  }, [seedDemo]);

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

  useEffect(() => {
    drawRef.current = 0;
    setWheel(spinWheel(language as Parameters<typeof spinWheel>[0]));
    setSelected([]);
  }, [language]);

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

  // A distinct chime the moment the spelled letters become a real word.
  const wasValid = useRef(false);
  useEffect(() => {
    if (valid && !wasValid.current) playSound('matchFound', { volume: 0.45 });
    wasValid.current = valid;
  }, [valid, playSound]);

  const selectTile = useCallback(
    (i: number) => {
      if (phase !== 'composing') return;
      setSelected((sel) => {
        if (sel.includes(i)) return sel;
        const step = PENTATONIC[Math.min(sel.length, PENTATONIC.length - 1)];
        playSound('tileSelect', { rate: 2 ** (step / 12), volume: 0.5 });
        return [...sel, i];
      });
    },
    [phase, playSound],
  );

  const deselectTile = useCallback((i: number) => {
    setSelected((sel) => (sel.includes(i) ? sel.slice(0, sel.indexOf(i)) : sel));
  }, []);

  const submit = useCallback(() => {
    if (phase !== 'composing' || word.length === 0) return;
    if (!isAcceptedWord(word, wheel, dictRef.current)) {
      setRejected(word.length < MIN_WORD_LEN ? 'too_short' : 'not_in_dictionary');
      playSound('wordRejected');
      window.setTimeout(() => setRejected(null), 900);
      setSelected([]);
      return;
    }
    hoist(word);
    setSelected([]);
  }, [phase, word, wheel, hoist, playSound]);

  const scramble = useCallback(() => {
    const next = spendScramble(run);
    if (!next || phase === 'over') return;
    setScrambles(next);
    drawRef.current += 1;
    setWheel(spinWheel(language as Parameters<typeof spinWheel>[0], drawRef.current));
    setSelected([]);
    playSound('boardShuffle');
  }, [run, phase, setScrambles, language, playSound]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event) || phase === 'over') return;
      if (event.code === 'Space') {
        event.preventDefault();
        if (phase === 'swinging') drop();
        else submit();
        return;
      }
      if (phase !== 'composing') return;
      if (event.key === 'Backspace') setSelected((s) => s.slice(0, -1));
      else if (event.key === 'Enter') submit();
      else if (event.key.length === 1) {
        const letter = event.key.toLowerCase();
        const slot = wheel.findIndex((l, i) => l === letter && !selected.includes(i));
        if (slot !== -1) selectTile(slot);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, drop, submit, wheel, selected, selectTile]);

  // Hold the results a beat so the player watches their tower come down.
  const [showOver, setShowOver] = useState(false);
  useEffect(() => {
    if (phase !== 'over') {
      setShowOver(false);
      return;
    }
    const id = window.setTimeout(() => setShowOver(true), 1300);
    return () => window.clearTimeout(id);
  }, [phase]);

  const biome = biomeAtHeight(heightM);
  const score = totalScore(heightM, run.bonus);
  const accentHex = `#${BIOME_THEME[biome].block.toString(16).padStart(6, '0')}`;

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-neo-navy" dir={dir}>
      <V2Backdrop heightM={heightM} groundInsetPx={dockPxRef.current} reducedMotion={reducedMotion} />

      <TowerCanvas
        world={game.worldRef.current}
        labels={game.labelsRef.current}
        fxQueue={game.fxRef.current}
        getDockPx={getDockPx}
        getHangingId={getHangingId}
        getGhost={getGhost}
        getBestM={getBestM}
        bestLabel={t('wordTowerV2.bestFlag')}
        onFrameStats={debug ? setStats : undefined}
        onBeforeStep={game.onBeforeStep}
        className="absolute inset-0"
      />

      <V2Hud
        t={t}
        heightM={heightM}
        score={score}
        bestM={game.bestM}
        combo={run.combo}
        scrambles={run.scrambles}
        biome={biome}
        landing={game.landing}
        surprise={game.surprise}
        newBest={game.newBest}
      />
      {debug && stats ? (
        <div className="absolute end-3 top-14 z-20 font-mono text-[11px] text-neo-white/70">
          {stats.fps}fps · p95 {stats.p95Ms}ms · {stats.bodies}
        </div>
      ) : null}

      {/* Dock: a dark fade rather than a slab, so the sky reads through it. The
          canvas frames the ground at its top edge, and its height must never
          change between phases — the wheel morphs in place into the drop dial. */}
      <div
        ref={dockRef}
        className="absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-neo-navy via-neo-navy/90 to-transparent px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-12"
      >
        {rejected ? (
          <div className="absolute inset-x-0 top-1 z-40 mx-auto w-fit rounded-neo border-neo border-black bg-neo-red px-3 py-1 font-neo-display text-sm font-bold text-neo-navy shadow-hard animate-neo-shake">
            {t(`wordTower.error.${rejected}`)}
          </div>
        ) : null}
        <div className="mx-auto grid max-w-md grid-cols-[3.5rem_1fr_3.5rem] items-center gap-2">
          <button
            type="button"
            onClick={scramble}
            disabled={run.scrambles === 0 || phase !== 'composing'}
            aria-label={t('wordTower.hud.scramble')}
            className="relative flex h-14 w-14 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-purple text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-40 disabled:shadow-none"
          >
            <Shuffle className="h-6 w-6" aria-hidden />
            <span className="absolute -end-2 -top-2 rounded-full border-neo border-black bg-neo-cream px-1.5 font-neo-display text-xs font-black">
              {run.scrambles}
            </span>
          </button>

          {dictError ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mx-auto rounded-neo border-neo-thick border-black bg-neo-red px-6 py-3 font-neo-display text-base font-bold uppercase text-neo-navy shadow-hard"
            >
              {t('wordTower.loadError')}
            </button>
          ) : (
            <WordTowerWheel
              tray={wheel.map((l) => l.toUpperCase())}
              selected={selected}
              word={word.toUpperCase()}
              placing={phase === 'swinging'}
              aimBand={game.aim}
              canBuild={valid}
              intensity={Math.min(1, heightM / 40)}
              accentHex={accentHex}
              reducedMotion={reducedMotion}
              dir={dir}
              t={t}
              onSelectTile={selectTile}
              onDeselectTile={deselectTile}
              onSubmit={submit}
              onDrop={drop}
            />
          )}

          <button
            type="button"
            onClick={() => setSelected((s) => s.slice(0, -1))}
            disabled={selected.length === 0 || phase !== 'composing'}
            aria-label={t('wordTower.hud.backspace')}
            className="flex h-14 w-14 items-center justify-center rounded-neo border-neo-thick border-black bg-neo-cream text-neo-navy shadow-hard active:translate-x-[2px] active:translate-y-[2px] active:shadow-hard-pressed disabled:opacity-40 disabled:shadow-none"
          >
            <Delete className="h-6 w-6" aria-hidden />
          </button>
        </div>
      </div>

      {showOver ? (
        <V2GameOver
          t={t}
          peakM={game.peakM}
          score={totalScore(game.peakM, run.bonus)}
          bestM={game.bestM}
          bestCombo={run.bestCombo}
          isBest={game.newBest || game.peakM >= game.bestM - 0.01}
          onRestart={() => {
            restart();
            setSelected([]);
          }}
        />
      ) : null}
    </div>
  );
}
