'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MpSheet } from '../shell/MpSheet';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import type { MpStandingRow } from './mpStandings';
import { MpStandingsBoard, type MpStandingsBoardProps } from './MpStandingsBoard';
import { MpStandingRowItem } from './MpStandingRow';

type TFn = (key: string, params?: Record<string, string | number>) => string;

interface FullStandingsProps {
  open: boolean;
  onClose: () => void;
  rows: MpStandingRow[];
  t: TFn;
}

export function MpFullStandings({ open, onClose, rows, t }: FullStandingsProps) {
  const isDesktop = useIsDesktop();
  const meRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    // My row is sticky, so its own box reads as in view; centre its natural slot via the row above.
    if (open) (meRef.current?.previousElementSibling ?? meRef.current)?.scrollIntoView?.({ block: 'center' });
  }, [open]);
  if (!open) return null;
  const title = t('mpUi.results.allStandings', { count: rows.length });
  // Portalled out of the stage: its isolate stacking would put the footer on top, and its pointer-down skips the reveal.
  return createPortal(
    <div data-testid="mp-full-standings-root" onPointerDown={(e) => e.stopPropagation()}>
    <MpSheet open onClose={onClose} title={title} side={isDesktop ? 'end' : 'bottom'} testId="mp-full-standings">
      <ol
        data-testid="mp-full-standings-list"
        tabIndex={0}
        aria-label={title}
        className="flex flex-col gap-[calc(6px*var(--mp-u,1))] py-1 tv:[--mp-u:1.4] outline-none focus-visible:ring-2 focus-visible:ring-neo-lime"
      >
        {rows.map((r) => (
          <MpStandingRowItem key={r.username} ref={r.isMe ? meRef : undefined} row={r} shown layout="list" t={t} />
        ))}
      </ol>
    </MpSheet>
    </div>,
    document.body,
  );
}

interface SectionProps extends Omit<MpStandingsBoardProps, 'onShowAll'> {
  allRows: MpStandingRow[];
  /** Lets the stage pause auto-continue while someone is looking for a friend. */
  onOpenChange?: (open: boolean) => void;
}

export function MpStandingsSection({ allRows, onOpenChange, ...board }: SectionProps) {
  const [open, setOpen] = useState(false);
  const setAndReport = useCallback((next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  }, [onOpenChange]);
  const show = useCallback(() => setAndReport(true), [setAndReport]);
  const hide = useCallback(() => setAndReport(false), [setAndReport]);
  return (
    <>
      <MpStandingsBoard {...board} onShowAll={board.hiddenCount > 0 ? show : undefined} />
      <MpFullStandings open={open} onClose={hide} rows={allRows} t={board.t} />
    </>
  );
}
