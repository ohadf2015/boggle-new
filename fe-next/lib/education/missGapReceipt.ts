/**
 * "You already did this one" — a device-local receipt for ONE assignment.
 *
 * The completion itself lives on the server (`miss_gap_homework_runs`), and the
 * class streak has exactly one source, also the server. This file deliberately
 * stores neither. It answers a narrower question the server cannot answer for a
 * guest student — the progress route hands a named roster only to a signed-in
 * caller, so a phone with no account cannot ask "was one of those runs mine?".
 *
 * What it holds is that phone's own last run of that assignment: accuracy and
 * the day. Nobody else's number is in here, so there is nothing for a later
 * server read to contradict (pitfalls Class 1 — the streak's dual-source bug is
 * exactly what this must not become).
 *
 * Written at the moment the server accepts the run, not when the student taps
 * "done": a marker written on dismissal is a marker that a reload erases.
 */

import { getJsonFromLocalStorage, saveJsonToLocalStorage } from '@/utils/storageHelpers';
import { normalizeDueDate } from './missGapAsyncAssignment';

export interface MissGapReceipt {
  /** 0-100, as the run was scored. */
  accuracy: number;
  /** YYYY-MM-DD the run was recorded, or '' when the stored day was junk. */
  completedOn: string;
}

const storageKey = (classKey: string, dueDate: string) =>
  `lexiclash_miss_gap_receipt_${encodeURIComponent(classKey)}|${dueDate}`;

function clampAccuracy(value: unknown): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

/** The receipt for this device's run of this assignment, or null. */
export function readMissGapReceipt(
  classKey: string,
  dueDate: string,
): MissGapReceipt | null {
  if (!classKey) return null;
  const stored = getJsonFromLocalStorage<Partial<MissGapReceipt> | null>(
    storageKey(classKey, dueDate),
    null,
  );
  if (!stored || typeof stored !== 'object') return null;
  if (stored.accuracy === undefined && stored.completedOn === undefined) return null;
  return {
    accuracy: clampAccuracy(stored.accuracy),
    completedOn: normalizeDueDate(String(stored.completedOn ?? '')),
  };
}

/** Record that this device finished this assignment. */
export function writeMissGapReceipt(
  classKey: string,
  dueDate: string,
  receipt: MissGapReceipt,
): void {
  if (!classKey) return;
  saveJsonToLocalStorage(storageKey(classKey, dueDate), {
    accuracy: clampAccuracy(receipt.accuracy),
    completedOn: normalizeDueDate(receipt.completedOn),
  });
}
