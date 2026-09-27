'use client';

/**
 * BlastHintToast — short floater explaining what the hint is pointing at.
 * Pairs with the per-cell highlights driven by useBlastHint state. Auto-
 * disappears when the hint expires (parent stops passing `target`).
 */

import { memo } from 'react';
import { Lightbulb } from 'lucide-react';
import type { HintTarget } from './utils/blastHintPicker';

interface BlastHintToastProps {
  target: HintTarget | null;
  t: (key: string) => string | undefined;
}

function formatHintText(target: HintTarget, t: (key: string) => string | undefined): string {
  // Color label uses existing blast.objective.color* keys.
  const colorTag = String(target.vars.color ?? '');
  const colorLabel = colorTag
    ? (t(`blast.objective.color${colorTag.charAt(0).toUpperCase()}${colorTag.slice(1)}`) || colorTag)
    : '';
  // Tile name uses blast.tileGuide.<type>.name.
  const tileType = String(target.vars.tileType ?? '');
  const tileLabel = tileType ? (t(`blast.tileGuide.${tileType}.name`) || tileType) : '';

  const template = t(`blast.hint.toast.${target.i18nKey}`) || defaultTemplate(target.i18nKey);
  return template
    .replace('{word}', String(target.vars.word ?? ''))
    .replace('{color}', colorLabel)
    .replace('{tileType}', tileLabel)
    .replace('{count}', String(target.vars.count ?? ''));
}

function defaultTemplate(key: string): string {
  switch (key) {
    case 'targetWord': return 'Try forming: {word}';
    case 'colorPower': return 'Look for {color} tiles';
    case 'collectType': return 'Find more {tileType}';
    case 'clearAllType': return 'Clear remaining {tileType}';
    default: return '';
  }
}

export const BlastHintToast = memo(function BlastHintToast({ target, t }: BlastHintToastProps) {
  if (!target) return null;

  return (
    <div
      data-testid="blast-hint-toast"
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute left-1/2 top-2 z-30 -translate-x-1/2 rounded-xl border-2 border-black bg-neo-yellow px-3 py-1.5 text-xs font-black uppercase tracking-wider text-neo-navy shadow-hard animate-neo-pop"
    >
      <span className="inline-flex items-center gap-1.5">
        <Lightbulb className="h-3.5 w-3.5" strokeWidth={3} />
        <span dir="auto">{formatHintText(target, t)}</span>
      </span>
    </div>
  );
});

export default BlastHintToast;
