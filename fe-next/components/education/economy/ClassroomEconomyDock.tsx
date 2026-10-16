'use client';

import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomEconomy } from './useClassroomEconomy';
import { ZERO_ECONOMY_SNAPSHOT } from '@/shared/constants/classroomEconomy';
import EconomyHud from './EconomyHud';
import PowerUpShop from './PowerUpShop';
import ClassroomBoardMoment from './ClassroomBoardMoment';
import { readyPowerUpCount } from './shopGoal';

const DOCK_BUTTON =
  'min-h-11 rounded-neo border-3 border-neo-black px-3 font-neo-display text-xs font-bold uppercase text-neo-navy shadow-hard-sm transition-transform duration-150 ease-out hover:-translate-y-px active:scale-[.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neo-cyan';

interface ClassroomEconomyDockProps {
  gameCode: string;
}

/**
 * Student-only economy surface for a classroom live round: a slim strip in the
 * round tray under the board (thumb zone). Shop and board open in a sheet.
 */
export default function ClassroomEconomyDock({ gameCode }: ClassroomEconomyDockProps) {
  const { t } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const econ = useClassroomEconomy(gameCode);
  const [sheet, setSheet] = useState<'shop' | 'board' | null>(null);
  const ready = econ.snapshot?.config.powerUps ? readyPowerUpCount(econ.snapshot) : 0;

  const openSheet = (which: 'shop' | 'board') => {
    setSheet(which);
    if (which === 'board') econ.requestState();
  };

  return (
    <>
      <div data-testid="economy-dock" className="relative z-40 mx-2 mb-1 flex shrink-0 flex-col gap-2 rounded-neo border-3 border-neo-cream bg-neo-navy-light px-3 py-2 shadow-hard">
        <EconomyHud snapshot={econ.snapshot ?? ZERO_ECONOMY_SNAPSHOT} />
        <div className={econ.snapshot?.config.powerUps ? 'grid grid-cols-2 gap-2' : 'grid grid-cols-1'}>
          {econ.snapshot?.config.powerUps && (
            <button type="button" onClick={() => openSheet('shop')} className={`${DOCK_BUTTON} relative bg-neo-lime`}>
              {t('economy.shop.title')}
              {ready > 0 && (
                <>
                  <m.span
                    key={ready}
                    data-testid="shop-ready-count"
                    aria-hidden="true"
                    initial={reduced ? false : { scale: 0.4 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 14 }}
                    className="absolute -end-2 -top-2 grid size-6 place-items-center rounded-full border-2 border-neo-black bg-neo-pink text-xs font-black text-white"
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
          </button>
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
        <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-neo border-t-3 border-neo-cream bg-neo-navy p-4 pb-6 text-white">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-bold text-white">{sheet === 'shop' ? t('economy.shop.title') : t('economy.board.title')}</span>
            <button type="button" onClick={() => setSheet(null)} className="min-h-11 px-3 text-sm font-bold text-white">
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
                  className="mt-3 min-h-11 w-full rounded-neo border-3 border-neo-black bg-neo-yellow font-neo-display font-black uppercase text-neo-navy shadow-hard-sm"
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
