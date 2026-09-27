/**
 * Teacher tools strip — print sheet / printable pack with QR / share card.
 *
 * Deliberately PERSISTENT (visible before word one and on the end sticker):
 * the whole premise is that students write on paper, so the teacher must be
 * able to print BEFORE the game starts, not only after it ends. Single
 * instance so the test ids stay unique.
 */
'use client';

import { Check, Printer, QrCode, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface UnpluggedToolsBarProps {
  printSheetLabel: string;
  printPackLabel: string;
  shareLabel: string;
  shareCopiedLabel: string;
  shared: boolean;
  onPrintSheet: () => void;
  onPrintPack: () => void;
  onShare: () => void;
}

// `border-[3px]`, never `border-neo`: cn() merges `border-neo` and
// `border-neo-black` into one group and drops the WIDTH, leaving no border.
const TOOL =
  'flex-1 min-w-0 flex items-center justify-center gap-2 px-2 sm:px-4 py-2 sm:py-3 font-neo-body font-bold text-[clamp(0.7rem,1.1vw,1rem)] border-[3px] border-neo-black rounded-neo shadow-hard-sm active:shadow-hard-pressed active:translate-y-[1px]';

export function UnpluggedToolsBar({
  printSheetLabel,
  printPackLabel,
  shareLabel,
  shareCopiedLabel,
  shared,
  onPrintSheet,
  onPrintPack,
  onShare,
}: UnpluggedToolsBarProps) {
  return (
    <div data-testid="unplugged-tools" className="shrink-0 flex gap-2">
      <button
        type="button"
        data-testid="print-missed-words-practice-sheet"
        onClick={onPrintSheet}
        aria-label={printSheetLabel}
        className={cn(TOOL, 'bg-neo-cream text-neo-black')}
      >
        <Printer className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden />
        <span className="truncate hidden sm:inline">{printSheetLabel}</span>
      </button>
      <button
        type="button"
        data-testid="print-unplugged-reteach-pack"
        onClick={onPrintPack}
        aria-label={printPackLabel}
        className={cn(TOOL, 'bg-neo-cyan text-neo-black')}
      >
        <QrCode className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden />
        <span className="truncate hidden sm:inline">{printPackLabel}</span>
      </button>
      <button
        type="button"
        data-testid="share-miss-gap-practice"
        onClick={onShare}
        aria-label={shared ? shareCopiedLabel : shareLabel}
        className={cn(TOOL, 'bg-neo-white text-neo-black')}
      >
        {shared ? (
          <Check className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden />
        ) : (
          <Share2 className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" aria-hidden />
        )}
        <span className="truncate hidden sm:inline">
          {shared ? shareCopiedLabel : shareLabel}
        </span>
      </button>
    </div>
  );
}
