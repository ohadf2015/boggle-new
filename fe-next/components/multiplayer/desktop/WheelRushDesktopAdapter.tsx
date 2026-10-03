import { memo, useMemo } from 'react';
import { ModeDesktopAdapter, type DesktopAdapterBaseProps, type ModeDesktopConfig } from './ModeDesktopAdapter';
import { ThemedPanel } from './ThemedPanel';
import { SpinCounter } from './insights/SpinCounter';
import { RarityHeatChip } from './insights/RarityHeatChip';
import { useLanguage } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';

export interface WheelRushDesktopAdapterProps extends DesktopAdapterBaseProps {
  fogProgress: number;
  currentSpin?: number;
  totalSpins?: number;
  lastWordRarity?: 'common' | 'uncommon' | 'rare' | 'legendary' | null;
}

/** Wheel Rush desktop shell — config over the shared ModeDesktopAdapter. */
function WheelRushDesktopAdapterImpl({ fogProgress, currentSpin, totalSpins, lastWordRarity, ...base }: WheelRushDesktopAdapterProps) {
  const { t } = useLanguage();
  const fogPct = Math.max(0, Math.min(1, fogProgress)) * 100;
  const config = useMemo<ModeDesktopConfig>(
    () => ({
      mode: 'wheel-rush',
      testPrefix: 'wr',
      modeNameKey: 'mp.modeName.wheelRush',
      timerColor: 'pink',
      timerSize: 88,
      badgeLayout: 'stacked',
      badgeExtra: currentSpin != null && totalSpins != null ? <SpinCounter current={currentSpin} total={totalSpins} /> : null,
      secondaryExtra: (
        <ThemedPanel mode="wheel-rush" variant="rail" header={t('mp.insights.fogHeader')} testId="wr-fog-meter">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-neo-display font-bold uppercase opacity-60 tracking-wide">
              {t('mp.insights.fogLabel')}
            </span>
            <span className={cn('text-xs tabular-nums font-bold', fogPct > 0 ? 'text-neo-pink' : 'opacity-60')}>
              {fogPct > 0 ? `${Math.round(fogPct)}%` : '—'}
            </span>
          </div>
          <div className="h-2 bg-foreground/10 rounded-full overflow-hidden border border-foreground/10">
            <div
              className={cn('h-full rounded-full origin-left rtl:origin-right transition-transform duration-500', fogPct > 0 ? 'bg-neo-pink' : 'bg-neo-lime/30')}
              style={{ transform: `scaleX(${(fogPct > 0 ? fogPct : 100) / 100})` }}
              aria-label={t('mp.insights.fogAriaLabel', { percent: Math.round(fogPct) })}
            />
          </div>
        </ThemedPanel>
      ),
      ladderExtra: lastWordRarity ? <div className="mb-2"><RarityHeatChip rarity={lastWordRarity} /></div> : null,
    }),
    [t, currentSpin, totalSpins, fogPct, lastWordRarity],
  );
  return <ModeDesktopAdapter {...base} config={config} />;
}

export const WheelRushDesktopAdapter = memo(WheelRushDesktopAdapterImpl);
