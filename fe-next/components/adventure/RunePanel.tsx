'use client';

import { memo, useMemo } from 'react';
import { X, Gem, Shield, ShieldOff } from 'lucide-react';
import Image from 'next/image';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import { cn } from '@/lib/utils';
import {
  RUNE_CATALOG,
  RUNE_FORGE_COSTS,
  MAX_EQUIPPED_RUNES,
  type RuneDefinition,
  type RuneRarity,
} from '@/lib/adventure/runeCatalog';
import type { PlayerRune } from '@/types/adventure';

// ==============================================
// TYPES
// ==============================================

interface RunePanelProps {
  isOpen: boolean;
  onClose: () => void;
  runes: PlayerRune[];
  fragments: number;
  onForge: (runeId: string) => void;
  onEquip: (runeId: string) => void;
  onUnequip: (runeId: string) => void;
}

// ==============================================
// CONSTANTS
// ==============================================

const RARITY_BORDER: Record<RuneRarity, string> = {
  common: 'border-neo-white/30',
  rare: 'border-neo-cyan/50',
  epic: 'border-neo-pink/50',
  legendary: 'border-neo-yellow/60 ring-1 ring-neo-yellow/20',
};

const RARITY_BG: Record<RuneRarity, string> = {
  common: 'bg-neo-white/5',
  rare: 'bg-neo-cyan/10',
  epic: 'bg-neo-pink/10',
  legendary: 'bg-neo-yellow/10',
};

const RARITY_LABEL: Record<RuneRarity, string> = {
  common: 'text-neo-white',
  rare: 'text-neo-cyan',
  epic: 'text-neo-pink',
  legendary: 'text-neo-yellow',
};

// ==============================================
// COMPONENT
// ==============================================

const RunePanel = memo<RunePanelProps>(({
  isOpen, onClose, runes, fragments, onForge, onEquip, onUnequip,
}) => {
  const { t } = useLanguageSafe();

  const ownedMap = useMemo(() => {
    const map = new Map<string, PlayerRune>();
    for (const r of runes) map.set(r.runeId, r);
    return map;
  }, [runes]);

  const equippedCount = useMemo(
    () => runes.filter(r => r.equipped).length,
    [runes],
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div
        data-testid="rune-panel"
        className={cn(
          'w-full max-w-lg max-h-[85dvh] flex flex-col',
          'bg-neo-navy border-3 border-black rounded-neo shadow-hard-lg',
          'overflow-hidden',
          'animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300'
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b-3 border-black bg-neo-navy-light">
          <div>
            <h2 className="font-neo-display text-xl text-neo-white uppercase tracking-tight">
              {t('adventure.runes.title')}
            </h2>
            <div className="flex items-center gap-3 mt-1">
              <span
                data-testid="rune-fragments"
                className="flex items-center gap-1 text-xs font-bold text-neo-purple"
              >
                <Gem className="w-3.5 h-3.5" />
                {fragments}
              </span>
              <span
                data-testid="rune-equipped-count"
                className="flex items-center gap-1 text-xs font-bold text-neo-cyan"
              >
                <Shield className="w-3.5 h-3.5" />
                {equippedCount}/{MAX_EQUIPPED_RUNES}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="rune-panel-close"
            className="p-2 rounded-neo border-2 border-neo-white/20 hover:bg-neo-white/10 transition-colors"
          >
            <X className="w-5 h-5 text-neo-white" />
          </button>
        </div>

        {/* Rune Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 gap-3">
            {RUNE_CATALOG.map((def) => (
              <RuneCard
                key={def.id}
                def={def}
                playerRune={ownedMap.get(def.id)}
                fragments={fragments}
                equippedCount={equippedCount}
                onForge={onForge}
                onEquip={onEquip}
                onUnequip={onUnequip}
                t={t}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});

RunePanel.displayName = 'RunePanel';

// ==============================================
// RUNE CARD
// ==============================================

interface RuneCardProps {
  def: RuneDefinition;
  playerRune: PlayerRune | undefined;
  fragments: number;
  equippedCount: number;
  onForge: (runeId: string) => void;
  onEquip: (runeId: string) => void;
  onUnequip: (runeId: string) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const RuneCard = memo<RuneCardProps>(({
  def, playerRune, fragments, equippedCount, onForge, onEquip, onUnequip, t,
}) => {
  const owned = !!playerRune;
  const equipped = playerRune?.equipped ?? false;
  const canAfford = fragments >= RUNE_FORGE_COSTS[def.rarity];
  const slotsFull = equippedCount >= MAX_EQUIPPED_RUNES;

  return (
    <div
      data-testid={`rune-card-${def.id}`}
      data-owned={String(owned)}
      className={cn(
        'flex flex-col items-center p-3 rounded-neo border-2 transition-all',
        owned
          ? `${RARITY_BORDER[def.rarity]} ${RARITY_BG[def.rarity]}`
          : 'border-neo-white/10 bg-neo-white/2 opacity-60',
        equipped && 'ring-2 ring-neo-lime/40'
      )}
    >
      {/* Rune Image */}
      <div className={cn('w-14 h-14 relative mb-2', !owned && 'grayscale opacity-40')}>
        <Image
          src={`/images/runes/rune-${def.id}.webp`}
          alt={t(def.nameKey)}
          fill
          className="object-contain"
          sizes="56px"
        />
      </div>

      {/* Name */}
      <span className={cn(
        'text-xs font-bold text-center leading-tight',
        owned ? 'text-neo-white' : 'text-neo-white'
      )}>
        {owned ? t(def.nameKey) : t('adventure.runes.unknown')}
      </span>

      {/* Rarity */}
      <span className={cn(
        'text-[9px] font-black uppercase mt-0.5',
        RARITY_LABEL[def.rarity]
      )}>
        {t(`adventure.runes.rarity.${def.rarity}`)}
      </span>

      {/* Description (owned only) */}
      {owned && (
        <span className="text-[10px] text-neo-white text-center mt-1 leading-tight">
          {t(def.descriptionKey)}
        </span>
      )}

      {/* Action button */}
      <div className="mt-2 w-full">
        {!owned ? (
          <button
            data-testid={`rune-forge-${def.id}`}
            disabled={!canAfford}
            onClick={() => onForge(def.id)}
            className={cn(
              'w-full py-1.5 text-[10px] font-black uppercase rounded-neo border-2 transition-colors',
              canAfford
                ? 'border-neo-purple/40 bg-neo-purple/20 text-neo-purple hover:bg-neo-purple/30'
                : 'border-neo-white/10 bg-neo-white/5 text-neo-white cursor-not-allowed'
            )}
          >
            {t('adventure.runes.forge')} ({RUNE_FORGE_COSTS[def.rarity]})
          </button>
        ) : equipped ? (
          <button
            data-testid={`rune-unequip-${def.id}`}
            onClick={() => onUnequip(def.id)}
            className="w-full py-1.5 text-[10px] font-black uppercase rounded-neo border-2 border-neo-pink/40 bg-neo-pink/20 text-neo-pink hover:bg-neo-pink/30 transition-colors flex items-center justify-center gap-1"
          >
            <ShieldOff className="w-3 h-3" />
            {t('adventure.runes.unequip')}
          </button>
        ) : (
          <button
            data-testid={`rune-equip-${def.id}`}
            disabled={slotsFull}
            onClick={() => onEquip(def.id)}
            className={cn(
              'w-full py-1.5 text-[10px] font-black uppercase rounded-neo border-2 transition-colors flex items-center justify-center gap-1',
              slotsFull
                ? 'border-neo-white/10 bg-neo-white/5 text-neo-white cursor-not-allowed'
                : 'border-neo-lime/40 bg-neo-lime/20 text-neo-lime hover:bg-neo-lime/30'
            )}
          >
            <Shield className="w-3 h-3" />
            {t('adventure.runes.equip')}
          </button>
        )}
      </div>
    </div>
  );
});

RuneCard.displayName = 'RuneCard';

export default RunePanel;
