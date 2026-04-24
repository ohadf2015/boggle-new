'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { getActiveUpgradeIndicators, getUpgradeVisualEffect } from '@/lib/adventure';
import { getUpgrade } from '@/lib/adventure/upgradeConfig';

interface AdventureUpgradeHUDProps {
  upgradeState: Record<string, number>;
  upgradeTriggered: { upgradeId: string; effectValue: number } | null;
}

export function AdventureUpgradeHUD({ upgradeState, upgradeTriggered }: AdventureUpgradeHUDProps) {
  const { t } = useLanguage();
  const indicators = getActiveUpgradeIndicators(upgradeState);

  if (indicators.length === 0) return null;

  return (
    <div className="flex gap-1.5 items-center px-2 py-1">
      {indicators.map(({ upgradeId, hudIcon, tier }) => {
        const isTriggered = upgradeTriggered?.upgradeId === upgradeId;
        const upgrade = getUpgrade(upgradeId);
        const effect = getUpgradeVisualEffect(upgradeId);
        const maxTier = upgrade?.tiers.length ?? tier;

        return (
          <div
            key={upgradeId}
            className={`flex flex-col items-center transition-transform duration-300 ${
              isTriggered ? 'scale-125' : ''
            }`}
            title={upgrade ? t(upgrade.nameKey) : upgradeId}
          >
            <span
              className={`text-lg leading-none ${
                isTriggered
                  ? `animate-neo-pop drop-shadow-[0_0_8px_rgba(191,255,0,0.8)] ${effect?.triggerAnimation ?? ''}`
                  : ''
              }`}
            >
              {hudIcon}
            </span>
            <div className="flex gap-0.5 mt-0.5">
              {Array.from({ length: maxTier }, (_, i) => (
                <div
                  key={`tier-pip-${i}`}
                  className={`w-1 h-1 rounded-full ${
                    i < tier ? 'bg-neo-lime' : 'bg-neo-navy-light'
                  }`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
