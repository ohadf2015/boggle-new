'use client';

/**
 * One node on the act map. Four states, readable without colour alone:
 *  far     — dimmed, flat, not a button
 *  done    — cream badge with the step number it was walked on
 *  current — the "you are here" pin, ringed
 *  next    — full colour, lifted, pulsing, tappable (44px+ target)
 */
import { memo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useLanguageSafe } from '@/contexts/LanguageContext';
import type { MapNode } from '@/lib/adventure/play/runMap';
import { KIND_STYLE, nodeArt } from './mapKinds';
import type { MapScale, NodeStatus } from './mapLayout';
import { cn } from '@/lib/utils';

interface Props {
  node: MapNode;
  x: number;
  y: number;
  status: NodeStatus;
  world: number;
  /** 1-based position in the walked path, printed on cleared nodes. */
  step?: number;
  /** Standing here with the fight unplayed: the badge invites a resume. */
  resumable?: boolean;
  /** Badge size tier — the map grows with the screen, it does not just re-centre. */
  tier?: MapScale['node'];
  onSelect: (id: string) => void;
}

/** Per-tier badge sizes. A TV node is ~1.5× a phone node, not a scaled screenshot. */
const SIZE: Record<MapScale['node'], Record<string, string>> = {
  sm: { boss: 'w-[72px] h-[72px]', elite: 'w-[58px] h-[58px]', default: 'w-[52px] h-[52px]' },
  md: { boss: 'w-[92px] h-[92px]', elite: 'w-[72px] h-[72px]', default: 'w-[66px] h-[66px]' },
  lg: { boss: 'w-[112px] h-[112px]', elite: 'w-[88px] h-[88px]', default: 'w-[80px] h-[80px]' },
};
const GLYPH: Record<MapScale['node'], string> = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-11 h-11' };
const LABEL: Record<MapScale['node'], string> = { sm: 'text-[10px]', md: 'text-xs', lg: 'text-sm' };
/** Silhouette is half the vocabulary: the unknown node is the round one. */
const SHAPE: Record<string, string> = {
  event: 'rounded-full',
  boss: 'rounded-2xl',
  default: 'rounded-xl',
};

/**
 * What follows the kind in the node's spoken label. The node the player is
 * STANDING ON is neither tappable nor cleared, so it used to fall through to
 * "out of reach" — the one node that is, by definition, not.
 */
export type NodeLabelSuffix = 'youAreHere' | 'cleared' | 'outOfReach' | null;
export function nodeLabelSuffix(status: NodeStatus, tappable: boolean): NodeLabelSuffix {
  if (status === 'current') return 'youAreHere';
  if (status === 'done') return 'cleared';
  return tappable ? null : 'outOfReach';
}

function MapNodeButton({ node, x, y, status, world, step, resumable, tier = 'sm', onSelect }: Props) {
  const { t } = useLanguageSafe();
  const reduce = useReducedMotion();
  const style = KIND_STYLE[node.kind];
  const Icon = style.icon;
  const art = nodeArt(node.kind, world);
  const live = status === 'next' || status === 'current' || status === 'done';
  const tappable = status === 'next' || (status === 'current' && !!resumable);
  const label = t(style.labelKey);
  const size = SIZE[tier][node.kind] ?? SIZE[tier].default;
  const shape = SHAPE[node.kind] ?? SHAPE.default;
  const done = status === 'done';

  return (
    <div
      className="absolute flex flex-col items-center gap-1"
      style={{ left: `${x}%`, top: `${y}px`, transform: 'translate(-50%, -50%)' }}
      data-testid={`map-node-${node.id}`}
      data-status={status}
      data-kind={node.kind}
    >
      {status === 'current' && (
        <span className={cn('absolute -top-7 whitespace-nowrap rounded-md border-2 border-black bg-neo-lime px-1.5 py-0.5 font-bold uppercase tracking-wide text-black shadow-[2px_2px_0_#000]', LABEL[tier])}>
          {t('adventurePlay.map.youAreHere')}
        </span>
      )}
      <motion.button
        type="button"
        disabled={!tappable}
        onClick={() => tappable && onSelect(node.id)}
        aria-label={(() => {
          const suffix = nodeLabelSuffix(status, tappable);
          if (!suffix) return label;
          const stepped = suffix === 'cleared' && step ? ` ${step}` : '';
          return `${label} · ${t(`adventurePlay.map.${suffix}`)}${stepped}`;
        })()}
        animate={tappable && !reduce ? { scale: [1, 1.07, 1] } : { scale: 1 }}
        transition={tappable && !reduce ? { duration: 1.6, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.2 }}
        className={cn(
          'relative grid place-items-center border-[3px] border-black transition-colors',
          size, shape,
          live ? style.fill : 'bg-neo-navy-light',
          status === 'far' && 'opacity-40 grayscale shadow-none',
          // Cleared reads as SPENT at a glance: desaturated, sunk (no shadow), stamped.
          done && 'saturate-[.35] brightness-[.72] shadow-none',
          (status === 'next' || status === 'current') && 'shadow-[4px_4px_0_#000]',
          status === 'current' && 'ring-4 ring-neo-lime ring-offset-2 ring-offset-[#0f1b3d]',
          tappable ? 'cursor-pointer active:translate-y-0.5 active:shadow-none' : 'cursor-default',
        )}
      >
        {art ? (
          // eslint-disable-next-line @next/next/no-img-element -- static sprite, sized by the badge
          <img src={art} alt="" aria-hidden className="w-full h-full object-contain p-0.5 drop-shadow-[2px_2px_0_rgba(0,0,0,0.6)]" />
        ) : (
          <Icon className={cn(GLYPH[tier], live ? 'text-black' : 'text-neo-cream')} strokeWidth={2.5} aria-hidden />
        )}
        {done && (
          <>
            {/* A CORNER stamp, never a glyph over the glyph: "already played" has to
                be one glance AND the kind icon underneath must stay readable. */}
            <span className="absolute -bottom-1.5 -end-1.5 grid h-6 w-6 place-items-center rounded-full border-2 border-black bg-neo-lime text-black shadow-[2px_2px_0_#000]">
              <Check className="w-4 h-4" strokeWidth={4} aria-hidden />
            </span>
            {!!step && (
              <span className="absolute -bottom-1.5 -start-1.5 grid h-5 w-5 place-items-center rounded-full border-2 border-black bg-neo-cream text-[10px] font-bold tabular-nums text-black">
                {step}
              </span>
            )}
          </>
        )}
        {node.kind === 'elite' && status !== 'far' && (
          <span className="absolute -top-2 -end-2 rounded-md border-2 border-black bg-neo-yellow px-1 text-[9px] font-bold uppercase text-black">
            {t('adventurePlay.map.kind.elite')}
          </span>
        )}
      </motion.button>
      {(status === 'next' || status === 'current') && node.kind !== 'elite' && (
        <span className={cn('rounded-md border-2 border-black bg-black/75 px-1.5 py-0.5 font-bold uppercase tracking-wide text-neo-cream', LABEL[tier])}>
          {label}
        </span>
      )}
    </div>
  );
}

export default memo(MapNodeButton);
