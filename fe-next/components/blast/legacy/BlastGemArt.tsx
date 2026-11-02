import type { BlastGemKind } from '@/shared/types/blast';
import { GEM_PALETTE } from './blastGemVisuals';

/** Hand-cut brilliant: crown, table and pavilion facets in the gem's own light/dark tints. */
export function BlastGemArt({ gem, className }: { gem: BlastGemKind; className?: string }) {
  const p = GEM_PALETTE[gem];
  const ink = '#0b1530';
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label={gem} data-gem={gem}>
      <polygon points="14,12 50,12 60,26 32,58 4,26" fill={p.face} stroke={ink} strokeWidth="3" strokeLinejoin="round" />
      <polygon points="14,12 50,12 44,26 20,26" fill={p.light} />
      <polygon points="14,12 20,26 4,26" fill={p.face} opacity="0.85" />
      <polygon points="50,12 60,26 44,26" fill={p.dark} opacity="0.55" />
      <polygon points="4,26 20,26 32,58" fill={p.dark} opacity="0.35" />
      <polygon points="60,26 44,26 32,58" fill={p.dark} opacity="0.7" />
      <polygon points="20,26 44,26 32,58" fill={p.face} />
      <polygon points="24,15 31,15 26,22 21,22" fill="#fff" opacity="0.75" />
      <polygon points="4,26 60,26" fill="none" stroke={ink} strokeWidth="2" />
      <polyline points="20,26 32,58 44,26" fill="none" stroke={ink} strokeWidth="1.5" opacity="0.5" />
    </svg>
  );
}
