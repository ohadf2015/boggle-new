'use client';

/** Level-kind chip: colored icon block + kind name. Shared by intro card and map (label comes from the caller's t()). */
import type { LevelKind } from '@/lib/adventure/play/levels';
import { cn } from '@/lib/utils';
import { KIND_META } from './levelKinds';

interface Props {
  kind: LevelKind;
  /** Translated kind name (`adventurePlay.variety.kind.<kind>`). */
  label: string;
  size?: 'sm' | 'md' | 'lg';
  /** Icon only (map nodes); the name goes to aria-label. */
  iconOnly?: boolean;
  className?: string;
}

const SIZES = {
  sm: { box: 'w-6 h-6', icon: 'w-3.5 h-3.5', text: 'text-[11px]' },
  md: { box: 'w-8 h-8', icon: 'w-5 h-5', text: 'text-sm' },
  lg: { box: 'w-12 h-12', icon: 'w-7 h-7', text: 'text-lg' },
};

export default function KindBadge({ kind, label, size = 'md', iconOnly, className }: Props) {
  const meta = KIND_META[kind];
  const Icon = meta.icon;
  const s = SIZES[size];
  const name = label;
  const icon = (
    <span className={cn('grid place-items-center rounded-lg border-[3px] border-black text-black shadow-[2px_2px_0_#000] shrink-0', meta.bg, s.box)}
      aria-label={iconOnly ? name : undefined} role={iconOnly ? 'img' : undefined} data-kind={kind}>
      <Icon className={s.icon} strokeWidth={2.75} aria-hidden />
    </span>
  );
  if (iconOnly) return <span className={className}>{icon}</span>;
  return (
    <span className={cn('inline-flex items-center gap-2', className)} data-kind={kind}>
      {icon}
      <span className={cn('font-neo-display font-bold uppercase tracking-wide', s.text)}>{name}</span>
    </span>
  );
}

/** 1-5 threat pips (skulls read as "danger" at a glance, TV-readable). */
export function ThreatPips({ threat, label, className }: { threat: number; label: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img"
      aria-label={label} data-testid="threat-pips" data-threat={threat}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn('h-2.5 w-2.5 rounded-[3px] border-2 border-black',
          i <= threat ? (threat >= 5 ? 'bg-neo-red' : threat >= 4 ? 'bg-neo-orange' : 'bg-neo-yellow') : 'bg-white/15')} />
      ))}
    </span>
  );
}
