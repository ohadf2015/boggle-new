'use client';

import { m } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import ConnectionsMascot from '../ConnectionsMascot';

interface PyramidOutOfLivesProps {
  isAdmin: boolean;
  reviveAd: { canShowAd: boolean; status: string; offer: () => void };
  onRevive: () => void;
  onAcceptLoss: () => void;
}

export default function PyramidOutOfLives({ isAdmin, reviveAd, onRevive: handleRevive, onAcceptLoss }: PyramidOutOfLivesProps) {
  const { t } = useLanguage();
  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 px-4 py-6">
      <m.div
        initial={{ y: 16, scale: 0.96 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 320, damping: 22 }}
        className="rounded-neo border-neo-thick border-neo-red bg-neo-navy-light p-5 text-center shadow-hard"
      >
        <ConnectionsMascot status="outOfLives" className="mb-2 h-20 w-20" />
        <h1 className="font-neo-display text-2xl font-black text-neo-red">{t('connections.outOfLives')}</h1>
        <p className="mt-2 font-neo-body text-sm text-neo-white/70">{t('connections.reviveDescription')}</p>
        <div className="mt-4 flex flex-col gap-3">
          {isAdmin ? (
            <m.button
              type="button"
              onClick={handleRevive}
              whileTap={{ scale: 0.96 }}
              className="rounded-neo border-neo-thick border-neo-cyan bg-neo-cyan px-5 py-2.5 font-neo-display font-black text-neo-navy shadow-hard"
            >
              {t('connections.adminRefill')}
            </m.button>
          ) : reviveAd.canShowAd ? (
            <m.button
              type="button"
              data-testid="pyramid-revive-ad"
              onClick={reviveAd.offer}
              whileTap={{ scale: 0.96 }}
              disabled={reviveAd.status === 'loading' || reviveAd.status === 'showing'}
              className="rounded-neo border-neo-thick border-neo-cyan bg-neo-cyan px-5 py-2.5 font-neo-display font-black text-neo-navy shadow-hard disabled:opacity-60"
            >
              {t('connections.reviveAd')}
            </m.button>
          ) : (
            <p className="font-neo-body text-xs text-neo-white/50">{t('connections.noAdAvailable')}</p>
          )}
          <m.button
            type="button"
            onClick={onAcceptLoss}
            whileTap={{ scale: 0.96 }}
            className="rounded-neo border-neo border-neo-white/20 bg-transparent px-5 py-2.5 font-neo-display font-black text-neo-white shadow-hard hover:bg-neo-white/10 transition-colors"
          >
            {t('connections.pyramid.acceptLoss')}
          </m.button>
        </div>
      </m.div>
    </div>
  );
}
