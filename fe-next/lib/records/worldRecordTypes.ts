import type { CustomAvatarConfig } from '@/shared/types/customAvatar';
import type { RecordUnit } from './recordKeys';

/** One game's world record as the API serves it. Client-safe: no server imports. */
export interface WorldRecord {
  recordKey: string;
  mode: string;
  labelKey: string;
  unit: RecordUnit;
  holderId: string;
  holderName: string;
  score: number;
  setAt: string;
  avatarConfig: CustomAvatarConfig | null;
  title: string | null;
}

type HolderLike = Pick<WorldRecord, 'recordKey' | 'holderId'>;

export function isRecordHolder(records: readonly HolderLike[] | null | undefined, userId: string | null | undefined): boolean {
  if (!userId || !records) return false;
  return records.some((r) => r.holderId === userId);
}

export function recordsHeldBy(records: readonly HolderLike[] | null | undefined, userId: string | null | undefined): string[] {
  if (!userId || !records) return [];
  return records.filter((r) => r.holderId === userId).map((r) => r.recordKey);
}

/** Points (or metres) still needed to beat the record outright; a tie does not take it. 0 = already beaten. */
export function gapToRecord(record: number, score: number): number {
  const diff = record - score;
  if (diff < 0) return 0;
  return Math.floor(diff) + 1;
}
