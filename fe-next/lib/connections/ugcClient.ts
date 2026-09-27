/**
 * Community (UGC) riddle client — thin API wrappers + a local "already voted"
 * guard so the UI can disable a riddle's upvote after the player taps it.
 */
import { getGuestFingerprint } from './dailyClient';

export interface UgcRiddle {
  id: string;
  word1: string;
  word2: string;
  bridge: string;
  language: string;
  upvotes: number;
  creator_display_name: string;
  created_at: string;
}

export async function fetchUgcList(language: string, limit = 50): Promise<UgcRiddle[]> {
  try {
    const res = await fetch(`/api/connections/ugc?language=${encodeURIComponent(language)}&limit=${limit}`);
    if (!res.ok) return [];
    const json = await res.json();
    return (json.riddles ?? []) as UgcRiddle[];
  } catch {
    return [];
  }
}

export interface SubmitUgcInput {
  word1: string;
  word2: string;
  bridge: string;
  language: string;
  displayName: string;
}

export async function submitUgc(input: SubmitUgcInput): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch('/api/connections/ugc/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...input, guestFingerprint: getGuestFingerprint() }),
    });
    if (res.ok) return { ok: true };
    const json = await res.json().catch(() => ({}));
    return { ok: false, error: json.error };
  } catch {
    return { ok: false, error: 'network' };
  }
}

export async function voteUgc(id: string): Promise<number | null> {
  try {
    const res = await fetch(`/api/connections/ugc/${id}/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ guestFingerprint: getGuestFingerprint() }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json.upvotes === 'number' ? json.upvotes : null;
  } catch {
    return null;
  }
}

const VOTED_KEY = 'connections-ugc-voted';

export function readVotedIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(VOTED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function markVoted(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const ids = readVotedIds();
    ids.add(id);
    window.localStorage.setItem(VOTED_KEY, JSON.stringify([...ids]));
  } catch {
    /* ignore */
  }
}
