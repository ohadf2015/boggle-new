'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Delete, Shuffle, ArrowUp } from 'lucide-react';
import { comboMult, type ApplyResult, type ValidationError } from '@/lib/wordTower/wordTowerManager';
import type { WordTowerBiomeId } from '@/shared/constants/wordTowerConstants';

export interface WordTowerHudProps {
  anchorLetter: string;
  tray: string[];
  selected: number[];
  word: string;
  heightM: number;
  personalBestM: number;
  combo: number;
  scramblesLeft: number;
  floorsCount: number;
  biomeId: WordTowerBiomeId;
  lastError: ValidationError | null;
  errorKey: number;
  lastResult: ApplyResult | null;
  resultKey: number;
  onSelectTile: (i: number) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSubmit: () => void;
  onScramble: () => void;
  /** Reports the bottom control-deck height (px) so the tower can ground just above it. */
  onDeckHeight?: (px: number) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
}

const TIER_KEY: Record<NonNullable<ApplyResult['tier']>, string> = {
  none: '',
  highRise: 'wordTower.celebration.highRise',
  tall: 'wordTower.celebration.tall',
  skyscraper: 'wordTower.celebration.skyscraper',
};

export function WordTowerHud(props: WordTowerHudProps) {
  const {
    anchorLetter, tray, selected, word, heightM, personalBestM, combo, scramblesLeft, floorsCount,
    biomeId, lastError, errorKey, lastResult, resultKey,
    onSelectTile, onBackspace, onClear, onSubmit, onScramble, onDeckHeight, t,
  } = props;

  const mult = comboMult(combo);
  const canSubmit = word.length >= 3;

  // Measure the control deck so the Pixi tower can ground exactly on top of it.
  const deckRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = deckRef.current;
    if (!el || !onDeckHeight) return;
    const report = () => onDeckHeight(el.offsetHeight);
    report();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(report);
    ro.observe(el);
    return () => ro.disconnect();
  }, [onDeckHeight]);

  const liveText = useMemo(() => {
    if (resultKey > 0 && lastResult) {
      const tier = lastResult.tier !== 'none' ? t(TIER_KEY[lastResult.tier]) + ' ' : '';
      return `${tier}${t('wordTower.a11y.height', { m: heightM.toFixed(0) })}${combo > 1 ? ' ' + t('wordTower.a11y.combo', { n: combo }) : ''}`;
    }
    return '';
  }, [resultKey, lastResult, heightM, combo, t]);

  return (
    <div className="pointer-events-none relative flex h-full flex-col justify-between">
      {/* Floating reward popup on each accepted word */}
      {resultKey > 0 && lastResult && (
        <div
          key={`pop-${resultKey}`}
          className="pointer-events-none absolute left-1/2 top-[30%] z-20 -translate-x-1/2 animate-[fadeInUp_0.6s_ease-out] text-center"
        >
          {lastResult.tier !== 'none' && (
            <div className="font-neo-display text-3xl font-extrabold uppercase tracking-wide text-neo-yellow drop-shadow-[3px_3px_0_#000]">
              {t(TIER_KEY[lastResult.tier])}
            </div>
          )}
          <div className="font-neo-display text-2xl font-bold text-neo-lime drop-shadow-[2px_2px_0_#000]">
            +{lastResult.meters.toFixed(1)} m
            {combo > 1 && <span className="ms-2 text-neo-orange">×{mult.toFixed(1)}</span>}
          </div>
        </div>
      )}
      {/* Top: one compact altitude readout — display-only, centered to clear the
          back button + share/leaderboard/restart controls on either side. */}
      <div className="pointer-events-none flex justify-center px-4 pt-16">
        <div className="flex items-baseline gap-2 rounded-neo border-neo-thick border-black bg-neo-navy/80 px-4 py-1.5 shadow-hard backdrop-blur-sm">
          <span className="font-neo-display text-2xl font-bold text-neo-white tabular-nums">
            {heightM.toFixed(0)}<span className="text-sm text-neo-cyan"> m</span>
          </span>
          <span className="font-neo-body text-[11px] uppercase tracking-wider text-neo-cyan">
            {t(`wordTower.biome.${biomeId}`)} · {t('wordTower.hud.floors', { n: floorsCount })}
          </span>
          {personalBestM > 0 && (
            <span className="font-neo-body text-[11px] font-bold text-neo-yellow">
              {t('wordTower.hud.best', { m: Math.round(personalBestM) })}
            </span>
          )}
        </div>
      </div>

      {/* Screen-reader live announcements */}
      <div aria-live="polite" className="sr-only">{liveText}</div>

      {/* Bottom controls — a solid "control deck" that grounds the rack and
          caps the play area (hides the busy parallax behind a clean surface). */}
      <div
        ref={deckRef}
        className="pointer-events-auto space-y-3 rounded-t-neo border-t-neo-thick border-black bg-neo-navy/95 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+1.25rem)] shadow-[0_-3px_0_rgba(0,0,0,0.5)] backdrop-blur-md"
      >
        {/* Word builder */}
        <div
          key={`builder-${errorKey}`}
          className={`flex items-center justify-center gap-1.5 ${lastError && errorKey > 0 ? 'animate-neo-shake' : ''}`}
        >
          <Tile letter={anchorLetter} variant="anchor" />
          {selected.map((idx, k) => (
            <Tile key={`${idx}-${k}`} letter={tray[idx] ?? ''} variant="selected" />
          ))}
        </div>
        {lastError && errorKey > 0 && (
          <p key={`err-${errorKey}`} className="text-center font-neo-body text-sm font-bold text-neo-red">
            {t(`wordTower.error.${lastError}`)}
          </p>
        )}

        {/* Tray */}
        <div className="mx-auto grid max-w-md grid-cols-6 gap-2">
          {tray.map((letter, i) => {
            const isSel = selected.includes(i);
            return (
              <button
                key={i}
                type="button"
                disabled={isSel}
                onClick={() => onSelectTile(i)}
                aria-label={t('wordTower.a11y.tile', { letter })}
                className={`flex aspect-square min-h-[44px] items-center justify-center rounded-neo border-neo-thick border-black font-neo-display text-2xl font-bold shadow-hard transition-transform active:translate-y-0.5 active:shadow-hard-pressed ${
                  isSel ? 'bg-neo-navy-light text-neo-white/30' : 'bg-neo-lime text-black hover:-translate-y-0.5'
                }`}
              >
                {letter}
              </button>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mx-auto flex max-w-md items-center gap-2">
          <button
            type="button"
            onClick={onScramble}
            disabled={scramblesLeft <= 0}
            className="flex items-center gap-1 rounded-neo border-neo-thick border-black bg-neo-purple px-3 py-3 font-neo-display font-bold text-neo-white shadow-hard disabled:opacity-40 active:translate-y-0.5 active:shadow-hard-pressed"
            aria-label={t('wordTower.hud.scramble')}
          >
            <Shuffle className="h-5 w-5" />
            <span className="tabular-nums">{scramblesLeft}</span>
          </button>
          <button
            type="button"
            onClick={onBackspace}
            disabled={selected.length === 0}
            className="rounded-neo border-neo-thick border-black bg-neo-navy-light px-3 py-3 text-neo-white shadow-hard disabled:opacity-40 active:translate-y-0.5 active:shadow-hard-pressed"
            aria-label={t('wordTower.hud.backspace')}
          >
            <Delete className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="flex flex-1 items-center justify-center gap-2 rounded-neo border-neo-thick border-black bg-neo-cyan py-3 font-neo-display text-lg font-bold text-black shadow-hard disabled:opacity-40 active:translate-y-0.5 active:shadow-hard-pressed"
          >
            <ArrowUp className="h-5 w-5" />
            {t('wordTower.hud.build')}
          </button>
        </div>
      </div>
    </div>
  );
}

function Tile({ letter, variant }: { letter: string; variant: 'anchor' | 'selected' }) {
  return (
    <span
      className={`flex h-11 w-11 items-center justify-center rounded-neo border-neo-thick border-black font-neo-display text-2xl font-bold shadow-hard ${
        variant === 'anchor'
          ? 'bg-neo-yellow text-black ring-2 ring-neo-yellow ring-offset-2 ring-offset-neo-navy'
          : 'bg-neo-cyan text-black'
      }`}
    >
      {letter}
    </span>
  );
}
