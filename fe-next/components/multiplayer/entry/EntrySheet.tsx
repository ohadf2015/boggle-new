'use client';

import type { ReactNode } from 'react';
import { MpSheet } from '../shell/MpSheet';
import { useSheetSide } from './useSheetSide';
import './entrySheet.css';

/** The settle body: its direct children animate in (entrySheet.css). */
export const ENTRY_SHEET_BODY_CLASS = 'mp-entry-sheet-body';

export interface EntrySheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  testId?: string;
  children: ReactNode;
}

/**
 * The ONE way the entry opens a sheet (create, join, all arenas, language,
 * help): a bottom sheet on phone, a 560px end panel from `lg` (DESIGN §b.2).
 *
 * The panel never slides: it is painted where it rests from the first frame,
 * so a sheet looks the same whenever it is looked at and however it was opened
 * (a typed code, a room card, a header chip — pitfall class 3). The rows settle
 * in instead (transform only, reduced-motion aware); a row marked
 * `data-entry-cta` lands last with a small stamp.
 */
export function EntrySheet({ open, onClose, title, testId, children }: EntrySheetProps) {
  const side = useSheetSide();
  return (
    <MpSheet open={open} onClose={onClose} title={title} side={side} entrance="static" testId={testId}>
      <div className={`${ENTRY_SHEET_BODY_CLASS} flex flex-col gap-4`}>{children}</div>
    </MpSheet>
  );
}
