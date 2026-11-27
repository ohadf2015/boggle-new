'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSoundEffects } from '@/contexts/SoundEffectsContext';
import { GELT_COINS, normalizeHolidayWord, pathThroughCells, type Cell } from '@/lib/holidays/dailyBoard';
import type { LetterGrid } from '@/types';
import { flashAt, spawnBurst } from './holidayBurst';
import styles from './holidayDaily.module.css';
import HolidayGiftBox from './HolidayGiftBox';
import HolidayMascotPop from './HolidayMascotPop';
import { useHolidayDailyPlan } from './useHolidayDailyPlan';
import { useHolidayTiles } from './useHolidayTiles';

interface Props {
  grid: LetterGrid;
  puzzleDate: string;
  language: string;
  foundWords: readonly string[];
}

const NO_CELLS: Cell[] = [];

export default function HolidayBoardLayer({ grid, puzzleDate, language, foundWords }: Props) {
  const { t } = useLanguage();
  const sfx = useSoundEffects();
  const plan = useHolidayDailyPlan(grid, puzzleDate, language);
  const layerRef = useRef<HTMLDivElement>(null);
  const gelt = plan?.kind === 'nightly' ? plan.gelt : NO_CELLS;
  const { rects, board } = useHolidayTiles(layerRef, gelt);
  const seen = useRef<Set<string> | null>(null);
  const [cue, setCue] = useState(0);
  const [line, setLine] = useState<string | undefined>();
  const [mascotOn, setMascotOn] = useState(false);
  const giftWord = plan?.kind === 'advent' ? normalizeHolidayWord(plan.giftWord) : null;
  const giftFound = useMemo(() => !!giftWord && foundWords.some((w) => normalizeHolidayWord(w) === giftWord), [foundWords, giftWord]);

  useEffect(() => {
    if (!plan) return;
    const words = foundWords.map(normalizeHolidayWord);
    if (!seen.current) {
      seen.current = new Set(words);
      return;
    }
    const fresh = words.filter((w) => !seen.current!.has(w));
    fresh.forEach((w) => seen.current!.add(w));
    if (plan.kind !== 'nightly' || !fresh.length) return;
    const layer = layerRef.current;
    for (const w of fresh) {
      const path = pathThroughCells(w, grid, plan.gelt);
      if (!path) continue;
      const hits = new Set(plan.gelt.map((c) => `${c.row}-${c.col}`));
      for (const c of path.filter((p) => hits.has(`${p.row}-${p.col}`))) {
        const r = rects.find((x) => x.key === `${c.row}-${c.col}`);
        if (!r) continue;
        flashAt(layer, r);
        spawnBurst(layer, r.left + r.width / 2, r.top + r.height / 2, 'coin', 9);
      }
      sfx.playCoinCollectSound({ rate: 1.15 });
      setLine(t('holiday.daily.geltFound', 'Gelt! +{count}', { count: GELT_COINS }));
      setCue((n) => n + 1);
    }
  }, [foundWords, plan, grid, rects, sfx, t]);

  useEffect(() => {
    if (!cue) return;
    setMascotOn(true);
    const id = window.setTimeout(() => setMascotOn(false), 2600);
    return () => window.clearTimeout(id);
  }, [cue]);

  if (!plan) return null;

  return (
    <div ref={layerRef} className={styles.layer} data-testid="holiday-board-layer" data-kind={plan.kind}>
      {rects.map((r) => (
        <span
          key={r.key}
          aria-hidden="true"
          className={styles.shimmer}
          style={{ left: r.left, top: r.top, width: r.width, height: r.height }}
        />
      ))}
      <span className="sr-only">
        {plan.kind === 'nightly'
          ? t('holiday.daily.geltTiles', 'Night {night}: {count} gold gelt tiles are on the board. Words through them earn coins.', {
              night: plan.day,
              count: plan.gelt.length,
            })
          : t('holiday.daily.giftHidden', 'A {count}-letter gift is hidden', { count: plan.giftLength })}
      </span>
      {plan.kind === 'advent' && board && (
        <HolidayGiftBox
          length={plan.giftLength}
          found={giftFound}
          word={plan.giftWord}
          className="absolute"
          style={{ left: board.left + board.width, top: board.top + 4, transform: 'translate(-100%, -100%)' }}
          onOpened={() => {
            sfx.playGiftReceivedSound();
            setLine(t('holiday.daily.giftCheer', 'You found the gift!'));
            setCue((n) => n + 1);
          }}
        />
      )}
      {mascotOn && board && (
        <div className="absolute" style={{ left: board.left, top: board.top + board.height, transform: 'translate(-20%, -100%)' }}>
          <HolidayMascotPop holiday={plan.holiday} cue={cue} line={line} />
        </div>
      )}
    </div>
  );
}
