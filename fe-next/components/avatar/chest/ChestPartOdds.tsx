'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import { CHEST_DROP_ODDS, type ChestDropSource } from '@/lib/avatar/chestDrops';
import { RARITY_TOKENS } from '@/lib/avatar/rarity';

/**
 * The one small odds line for a chest's avatar part: "Avatar part: 80% rare ·
 * 17% epic · 3% legendary". Always shown before AND after opening, so the
 * chance is never hidden. Chests are earned by playing; none can be bought.
 */
export default function ChestPartOdds({ source, className = '' }: { source: ChestDropSource; className?: string }) {
  const { t } = useLanguage();
  const odds = CHEST_DROP_ODDS[source];
  return (
    <p data-testid="chest-part-odds" className={`text-[11px] font-bold text-neo-white/70 ${className}`}>
      {t('avatarChest.oddsLabel')}{' '}
      {(['rare', 'epic', 'legendary'] as const).map((r, i) => (
        <span key={r}>
          {i > 0 && <span className="text-neo-white/40"> · </span>}
          <span style={{ color: RARITY_TOKENS[r].hex }}>{`${odds[r]}% ${t(RARITY_TOKENS[r].labelKey)}`}</span>
        </span>
      ))}
    </p>
  );
}
