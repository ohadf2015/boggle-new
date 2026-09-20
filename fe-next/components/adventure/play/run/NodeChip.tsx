'use client';

/**
 * The room you are standing in, as a colour-coded chip — the HUD's answer to
 * Slay the Spire's map legend, so a fight, an elite and a boss never look the
 * same at a glance. Icon carries it on a phone; the name carries it on a TV.
 */
import { Swords, Crown, Skull, Gem, Coins, Flame, HelpCircle, type LucideIcon } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { NodeKind } from '@/lib/adventure/play/runMap';
import { NODE_CHIP } from './nodeKind';
import { cn } from '@/lib/utils';

const ICON: Record<NodeKind, LucideIcon> = {
  fight: Swords,
  elite: Crown,
  boss: Skull,
  treasure: Gem,
  shop: Coins,
  rest: Flame,
  event: HelpCircle,
};

export default function NodeChip({ kind, className }: { kind: NodeKind; className?: string }) {
  const { t } = useLanguageSafe();
  const Icon = ICON[kind];
  const name = t(`adventurePlay.map.kind.${kind}`);
  return (
    <span
      data-testid="node-chip"
      data-node-kind={kind}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full border-[3px] border-black px-1.5 py-0.5 font-neo-display text-[11px] font-black uppercase leading-none tracking-wide text-black shadow-[2px_2px_0_#000] sm:text-xs',
        NODE_CHIP[kind],
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0 stroke-[2.75]" aria-hidden />
      <span className="max-w-[4.5rem] truncate">{name}</span>
    </span>
  );
}
