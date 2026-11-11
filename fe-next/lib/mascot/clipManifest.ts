import type { BeatPhase, GagBeat, LegendaryGag } from './legendary';

export const CLIP_DIR = '/mascot/anim';
export const CLIP_MANIFEST_URL = `${CLIP_DIR}/manifest.json`;

export interface ClipEntry {
  id: string;
  file: string;
  poster: string;
  durationMs: number;
  loop: boolean;
  beats: { windupMs: number; actionMs: number; holdMs: number };
  tags: string[];
}

const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0;

function isEntry(v: unknown): v is ClipEntry {
  if (!v || typeof v !== 'object') return false;
  const e = v as Partial<ClipEntry>;
  return (
    typeof e.id === 'string' &&
    typeof e.file === 'string' &&
    isNum(e.durationMs) &&
    !!e.beats &&
    isNum(e.beats.windupMs) &&
    isNum(e.beats.actionMs) &&
    isNum(e.beats.holdMs)
  );
}

export function parseClipManifest(json: unknown): Map<string, ClipEntry> {
  const list = Array.isArray(json) ? json : (json as { clips?: unknown })?.clips;
  const map = new Map<string, ClipEntry>();
  if (!Array.isArray(list)) return map;
  for (const item of list) if (isEntry(item)) map.set(item.id, item);
  return map;
}

function spread(beats: GagBeat[], phase: BeatPhase, totalMs: number): number[] {
  const count = beats.filter((b) => b.phase === phase).length;
  const each = Math.floor(totalMs / Math.max(count, 1));
  return Array.from({ length: count }, (_, i) => (i === count - 1 ? totalMs - each * (count - 1) : each));
}

/** Swaps a gag's poses for its clip and times every beat to the clip's own beats. */
export function withClip(gag: LegendaryGag, clips: Map<string, ClipEntry>): LegendaryGag {
  const entry = gag.clip ? clips.get(gag.clip) : undefined;
  if (!entry) return gag;
  const { windupMs, actionMs, holdMs } = entry.beats;
  const reactionMs = Math.max(entry.durationMs - windupMs - actionMs - holdMs, 0);
  const budget: Record<BeatPhase, number[]> = {
    windup: spread(gag.beats, 'windup', windupMs),
    action: spread(gag.beats, 'action', actionMs),
    freeze: spread(gag.beats, 'freeze', holdMs),
    reaction: spread(gag.beats, 'reaction', reactionMs),
  };
  const clipSrc = `${CLIP_DIR}/${entry.file}`;
  return {
    ...gag,
    clipSrc,
    beats: gag.beats.map((b) => ({
      ...b,
      pose: clipSrc,
      ms: budget[b.phase].shift() ?? 0,
      rotate: 0,
      scaleX: 1,
      scaleY: 1,
    })),
  };
}

export async function loadClipManifest(fetcher: typeof fetch = fetch): Promise<Map<string, ClipEntry>> {
  try {
    const res = await fetcher(CLIP_MANIFEST_URL);
    if (!res.ok) return new Map();
    return parseClipManifest(await res.json());
  } catch {
    return new Map();
  }
}
