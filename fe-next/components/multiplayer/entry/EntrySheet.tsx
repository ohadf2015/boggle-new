'use client';

import { useEffect, useRef, type ComponentType, type ReactNode, type SVGProps } from 'react';
import { cn } from '@/lib/utils';
import { MpSheet } from '../shell/MpSheet';
import { MpPrimaryCta, type MpPrimaryCtaProps } from '../shell/MpPrimaryCta';
import { CtaGlint } from './CtaGlint';
import { useEntrySfx } from './useEntrySfx';
import { useSheetSide } from './useSheetSide';
import './entrySheet.css';

/** The settle body: its direct children animate in (entrySheet.css). */
export const ENTRY_SHEET_BODY_CLASS = 'mp-entry-sheet-body';
/**
 * The scope that stills MpSheet's slide (entrySheet.css). MpSheet is
 * FOUNDATION's and keeps sliding for every other piece; only a sheet opened
 * through EntrySheet sits inside this scope.
 */
export const ENTRY_SHEET_AT_REST_CLASS = 'mp-entry-sheet-at-rest';

const TONE = {
  lime: 'bg-neo-lime',
  pink: 'bg-neo-pink',
  cyan: 'bg-neo-cyan',
  yellow: 'bg-neo-yellow',
  purple: 'bg-neo-purple',
} as const;

export interface EntrySheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** The sheet's icon, on a tile in the title (each sheet reads at a glance). */
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  tone?: keyof typeof TONE;
  testId?: string;
  children: ReactNode;
}

/**
 * The ONE way the entry opens a sheet (create, join, all arenas, language,
 * help): a bottom sheet on phone, a 560px end panel from `lg` (DESIGN §b.2).
 *
 * The panel never slides: it is painted where it rests from the first frame,
 * so a sheet looks the same whenever it is looked at and however it was opened
 * (a typed code, a room card, a header chip — pitfall class 3). The stilling
 * lives in the entry's own stylesheet, scoped to a box-less wrapper, so MpSheet
 * itself is untouched. The rows settle in instead (transform only,
 * reduced-motion aware); a row marked `data-entry-cta` lands last with a small
 * stamp and a glint.
 *
 * A sheet renders outside MpScreen, so it carries its own TV unit (`--mp-u`):
 * the CTA inside matches the footer's 96px TV height.
 */
export function EntrySheet({ open, onClose, title, icon: Icon, tone = 'cyan', testId, children }: EntrySheetProps) {
  const side = useSheetSide();
  const sfx = useEntrySfx();
  const wasOpen = useRef(false);

  useEffect(() => {
    if (open && !wasOpen.current) sfx.open();
    wasOpen.current = open;
  }, [open, sfx]);

  const heading = Icon ? (
    <span className="inline-flex items-center gap-2 tv:gap-3 tv:text-3xl">
      <span
        data-testid="entry-sheet-icon"
        aria-hidden="true"
        className={cn(
          'inline-flex h-7 w-7 tv:h-11 tv:w-11 shrink-0 items-center justify-center rounded-neo border-2 border-neo-black text-neo-black shadow-hard-sm',
          TONE[tone],
        )}
      >
        <Icon className="h-4 w-4 tv:h-6 tv:w-6" />
      </span>
      {title}
    </span>
  ) : (
    title
  );

  if (!open) return null;

  return (
    <div className={cn(ENTRY_SHEET_AT_REST_CLASS, 'contents')}>
      <MpSheet open onClose={onClose} title={heading} side={side} testId={testId}>
        <div className={cn(ENTRY_SHEET_BODY_CLASS, 'flex flex-col gap-4 tv:gap-6 [--mp-u:1] tv:[--mp-u:1.5]')}>{children}</div>
      </MpSheet>
    </div>
  );
}

/**
 * A sheet's one primary action: lands last (`data-entry-cta`) and catches a
 * single glint once it has landed — a hard-edged bar, transform only, clipped to
 * the button, never over the label for long.
 */
export function EntrySheetCta(props: MpPrimaryCtaProps) {
  return (
    <div data-entry-cta="" className="relative">
      <MpPrimaryCta {...props} className={cn('shadow-hard-lg', props.className)} />
      <CtaGlint />
    </div>
  );
}
