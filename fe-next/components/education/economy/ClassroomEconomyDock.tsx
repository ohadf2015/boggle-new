'use client';

import { useEffect, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { CoinArt } from '@/components/ui/CoinArt';
import { useClassroomEconomy } from './useClassroomEconomy';
import PowerUpShop from './PowerUpShop';
import ClassroomBoardMoment from './ClassroomBoardMoment';
import { readyPowerUpCount } from './shopGoal';
import { StreakFlame } from './ClassroomStreakFlame';
import { publishEconomyStreak, useEconomyStreakStore } from './streakFlame';

const DOCK_BUTTON =
  'relative inline-flex min-h-11 items-center justify-center gap-2 whitespace-nowrap rounded-neo border-3 border-neo-black px-3 font-neo-display text-xs font-bold uppercase text-neo-navy shadow-hard-sm transition-transform duration-150 ease-out hover:-translate-y-px active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan';

interface ClassroomEconomyDockProps {
  gameCode: string;
}

function DockCash({ cash, gain }: { cash: number; gain: number }) {
  const { t } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  return (
    <span data-testid="dock-cash" className="absolute -top-3 start-2 inline-flex items-center gap-1 rounded-full border-2 border-neo-yellow bg-neo-navy px-1.5 py-0.5 text-xs font-black leading-none text-neo-yellow tabular-nums shadow-hard-sm">
      <CoinArt size={14} />
      <span className="sr-only">{t('economy.hud.cash', { cash })}</span>
      <m.span
        key={`${cash}-${gain}`}
        aria-hidden="true"
        dir="ltr"
        initial={reduced || gain <= 0 ? false : { scale: 1.5 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 420, damping: 14 }}
      >
        {cash}
      </m.span>
    </span>
  );
}

/**
 * Student-only economy surface for a classroom live round: two buttons in the
 * round tray under the board (thumb zone). Shop and board open in a sheet.
 */
export default function ClassroomEconomyDock({ gameCode }: ClassroomEconomyDockProps) {
  const { t } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const econ = useClassroomEconomy(gameCode);
  const [sheet, setSheet] = useState<'shop' | 'board' | null>(null);
  const powerUps = !!econ.snapshot?.config.powerUps;
  const ready = powerUps && econ.snapshot ? readyPowerUpCount(econ.snapshot) : 0;
  const cash = econ.snapshot?.cash ?? 0;
  const gain = econ.snapshot?.lastDelta?.kind === 'correct' ? econ.snapshot.lastDelta.delta : 0;
  const streak = econ.snapshot?.streak ?? 0;
  const multiplier = econ.snapshot?.multiplier ?? 1;
  const hudFlame = useEconomyStreakStore((s) => s.hudFlames > 0);

  useEffect(() => {
    publishEconomyStreak(econ.snapshot ? { streak, multiplier } : null);
  }, [econ.snapshot, streak, multiplier]);
  useEffect(() => () => publishEconomyStreak(null), []);

  const openSheet = (which: 'shop' | 'board') => {
    setSheet(which);
    if (which === 'board') econ.requestState();
  };

  const cashChip = <DockCash cash={cash} gain={gain} />;

  return (
    <>
      <div data-testid="economy-dock" className="relative z-40 mx-2 mb-1 flex shrink-0 flex-col gap-1.5 pt-2">
        <div className="flex items-center gap-2 lg:flex-col lg:items-start lg:gap-4">
          {!hudFlame && <StreakFlame streak={streak} multiplier={multiplier} />}
          {(econ.snapshot?.doubleCashMsLeft ?? 0) > 0 && (
            <span data-testid="hud-double" className="shrink-0 rounded-full border-2 border-neo-black bg-neo-cyan px-2 py-1 font-neo-display text-xs font-black text-neo-black tabular-nums">
              {t('economy.hud.doubleCash', { seconds: Math.ceil((econ.snapshot?.doubleCashMsLeft ?? 0) / 1000) })}
            </span>
          )}
          <div className={powerUps ? 'grid min-w-0 flex-1 grid-cols-2 gap-2 lg:w-full lg:grid-cols-1' : 'grid min-w-0 flex-1 grid-cols-1 lg:w-full'}>
            {powerUps && (
              <button type="button" onClick={() => openSheet('shop')} className={`${DOCK_BUTTON} bg-neo-lime`}>
                {t('economy.shop.title')}
                {cashChip}
                {ready > 0 && (
                  <>
                    <m.span
                      key={ready}
                      data-testid="shop-ready-count"
                      aria-hidden="true"
                      initial={reduced ? false : { scale: 0.4 }}
                      animate={{ scale: 1 }}
                      transition={{ type: 'spring', stiffness: 420, damping: 14 }}
                      className="absolute -end-2 -top-2 grid size-6 place-items-center rounded-full border-2 border-neo-black bg-neo-pink text-xs font-black text-neo-cream"
                    >
                      {ready}
                    </m.span>
                    <span className="sr-only">{t('economy.shop.readyCount', { count: ready })}</span>
                  </>
                )}
              </button>
            )}
            <button type="button" onClick={() => openSheet('board')} className={`${DOCK_BUTTON} bg-neo-cream`}>
              {t('economy.board.title')}
              {!powerUps && cashChip}
            </button>
          </div>
        </div>
        {econ.hint && (
          <p role="status" className="text-center text-xs font-bold text-neo-lime">
            {t('economy.hint.text', { letter: econ.hint.letter, length: econ.hint.length })}
          </p>
        )}
        {econ.error && (
          <m.p role="alert" initial={reduced ? false : { y: 4 }} animate={{ y: 0 }} className="text-center text-xs font-bold text-neo-pink">
            {t(`economy.error.${econ.error}`)}
          </m.p>
        )}
      </div>

      {sheet && (
        <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-neo border-t-3 border-neo-cream bg-neo-navy p-4 pb-6 text-neo-cream">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-neo-cream">{sheet === 'shop' ? t('economy.shop.title') : t('economy.board.title')}</span>
            <button type="button" onClick={() => setSheet(null)} className="min-h-11 px-3 text-sm font-bold text-neo-cream focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black">
              {t('economy.sheet.close')}
            </button>
          </div>
          {sheet === 'shop' && econ.snapshot && (
            <>
              <PowerUpShop snapshot={econ.snapshot} onBuy={econ.buy} />
              {econ.snapshot.hintsHeld > 0 && (
                <button
                  type="button"
                  onClick={econ.useHint}
                  className="mt-3 min-h-11 w-full rounded-neo border-3 border-neo-black bg-neo-yellow font-neo-display font-black uppercase text-neo-navy shadow-hard-sm focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-neo-cyan focus-visible:ring-offset-2 focus-visible:ring-offset-neo-black"
                >
                  {t('economy.hint.use', { count: econ.snapshot.hintsHeld })}
                </button>
              )}
            </>
          )}
          {sheet === 'board' && econ.board && <ClassroomBoardMoment board={econ.board} />}
        </div>
      )}
    </>
  );
}
