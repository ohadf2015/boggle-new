'use client';

import { useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useClassroomEconomy } from './useClassroomEconomy';
import EconomyHud from './EconomyHud';
import PowerUpShop from './PowerUpShop';
import RewardChest from './RewardChest';
import ClassroomBoardMoment from './ClassroomBoardMoment';

interface ClassroomEconomyDockProps {
  gameCode: string;
}

/**
 * Student-only economy surface for a classroom live round. The HUD is a slim
 * strip, so play never scrolls. Shop and board open in a sheet on demand.
 */
export default function ClassroomEconomyDock({ gameCode }: ClassroomEconomyDockProps) {
  const { t } = useLanguage();
  const reduced = useReducedMotion() ?? false;
  const econ = useClassroomEconomy(gameCode);
  const [sheet, setSheet] = useState<'shop' | 'board' | null>(null);

  const openSheet = (which: 'shop' | 'board') => {
    setSheet(which);
    if (which === 'board') econ.requestState();
  };

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-40 flex items-center justify-between gap-2 bg-neo-navy/95 px-3 py-2">
        {econ.snapshot ? <EconomyHud snapshot={econ.snapshot} /> : <span className="text-xs text-white/70">{t('economy.hud.loading')}</span>}
        <div className="flex gap-2">
          {econ.snapshot?.config.powerUps && (
            <button
              type="button"
              onClick={() => openSheet('shop')}
              className="min-h-11 rounded-md border-2 border-black bg-neo-lime px-3 text-xs font-bold text-neo-navy"
            >
              {t('economy.shop.title')}
            </button>
          )}
          <button
            type="button"
            onClick={() => openSheet('board')}
            className="min-h-11 rounded-md border-2 border-black bg-neo-cream px-3 text-xs font-bold text-neo-navy"
          >
            {t('economy.board.title')}
          </button>
        </div>
      </div>

      {econ.hint && (
        <div role="status" className="fixed inset-x-0 top-14 z-40 text-center text-xs font-bold text-neo-lime">
          {t('economy.hint.text', { letter: econ.hint.letter, length: econ.hint.length })}
        </div>
      )}

      {sheet && (
        <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-2xl border-t-4 border-neo-cream bg-neo-navy p-4 pb-6">
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
                  className="mt-3 min-h-11 w-full rounded-lg border-2 border-black bg-neo-cream font-bold text-neo-navy"
                >
                  {t('economy.hint.use', { count: econ.snapshot.hintsHeld })}
                </button>
              )}
            </>
          )}
          {sheet === 'board' && econ.board && <ClassroomBoardMoment board={econ.board} />}
        </div>
      )}

      {econ.error && (
        <m.div role="alert" initial={reduced ? false : { y: 8 }} animate={{ y: 0 }} className="fixed inset-x-0 bottom-20 z-50 text-center text-xs text-neo-pink">
          {t(`economy.error.${econ.error}`)}
        </m.div>
      )}

      {econ.chest && <RewardChest reveal={econ.chest} onClose={econ.clearChest} />}
    </>
  );
}
