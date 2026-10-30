'use client';

import { Coins, ShoppingBag, XCircle, type LucideIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassroomEconomySnapshot } from '@/shared/constants/classroomEconomy';

export type ClassroomEconomyConfig = ClassroomEconomySnapshot['config'];

const ROWS: Array<{ key: keyof ClassroomEconomyConfig; label: string; hint: string; Icon: LucideIcon }> = [
  { key: 'powerUps', label: 'economy.teacher.powerUps', hint: 'economy.teacher.powerUpsHint', Icon: ShoppingBag },
  { key: 'wrongAnswerCost', label: 'economy.teacher.wrongCost', hint: 'economy.teacher.wrongCostHint', Icon: XCircle },
];

/** The teacher's switches for the in-round cash economy, stored on the room at create. */
export function LobbyEconomyToggles({
  value,
  onChange,
}: {
  value: ClassroomEconomyConfig;
  onChange: (next: ClassroomEconomyConfig) => void;
}) {
  const { t } = useLanguage();
  return (
    <section className="flex flex-col gap-2" aria-labelledby="lobby-economy-label">
      <div id="lobby-economy-label" className="flex items-center gap-1.5 font-neo-display text-sm font-bold text-neo-cream">
        <Coins className="size-4 text-neo-cream/70" strokeWidth={3} aria-hidden="true" />
        {t('economy.teacher.title')}
      </div>
      {ROWS.map(({ key, label, hint, Icon }) => (
        <div key={key} className="flex items-center justify-between gap-3 rounded-neo border-2 border-neo-cream/35 bg-neo-navy-light px-3 py-2">
          <span className="flex min-w-0 flex-col">
            <span className="inline-flex items-center gap-1.5 font-neo-display text-sm font-bold text-neo-cream">
              <Icon className="size-4 text-neo-cream/70" strokeWidth={3} aria-hidden="true" />
              {t(label)}
            </span>
            <span className="font-neo-body text-xs text-neo-cream/70">{t(hint)}</span>
          </span>
          <Switch checked={value[key]} onCheckedChange={(on) => onChange({ ...value, [key]: on })} aria-label={t(label)} />
        </div>
      ))}
    </section>
  );
}

export default LobbyEconomyToggles;
