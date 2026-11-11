'use client';

import { Coins } from 'lucide-react';
import { LobbyOptionGroup, LobbySwitchRow } from './LobbyOptionParts';
import { useLanguage } from '@/contexts/LanguageContext';
import type { ClassroomEconomySnapshot } from '@/shared/constants/classroomEconomy';

export type ClassroomEconomyConfig = ClassroomEconomySnapshot['config'];

const ROWS: Array<{ key: keyof ClassroomEconomyConfig; label: string; hint: string }> = [
  { key: 'powerUps', label: 'economy.teacher.powerUps', hint: 'economy.teacher.powerUpsHint' },
  { key: 'wrongAnswerCost', label: 'economy.teacher.wrongCost', hint: 'economy.teacher.wrongCostHint' },
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
    <LobbyOptionGroup id="lobby-economy-label" title={t('economy.teacher.title')} icon={Coins}>
      {ROWS.map(({ key, label, hint }) => (
        <LobbySwitchRow
          key={key}
          testId={`economy-${key}`}
          label={t(label)}
          hint={t(hint)}
          checked={value[key]}
          onChange={(on) => onChange({ ...value, [key]: on })}
        />
      ))}
    </LobbyOptionGroup>
  );
}

export default LobbyEconomyToggles;
