import { CLASSROOM_GAME_MODES, type ClassroomGameMode } from '@/shared/types/vocabQuiz';

export const HQ_LAST_LAUNCH_KEY = 'lexiclash_hq_last_launch';

export interface HqLastLaunch {
  mode?: ClassroomGameMode;
  source?: 'lesson' | 'pack';
  lessonId?: string;
  packKey?: string;
}

export function readHqLastLaunch(): HqLastLaunch | null {
  try {
    const raw = localStorage.getItem(HQ_LAST_LAUNCH_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Record<string, unknown>;
    if (!v || typeof v !== 'object') return null;
    const out: HqLastLaunch = {};
    if (typeof v.mode === 'string' && (CLASSROOM_GAME_MODES as readonly string[]).includes(v.mode)) {
      out.mode = v.mode as ClassroomGameMode;
    }
    if (v.source === 'lesson' && typeof v.lessonId === 'string') {
      out.source = 'lesson';
      out.lessonId = v.lessonId;
    } else if (v.source === 'pack' && typeof v.packKey === 'string') {
      out.source = 'pack';
      out.packKey = v.packKey;
    }
    return out;
  } catch {
    return null;
  }
}

export function writeHqLastLaunch(value: HqLastLaunch): void {
  try {
    localStorage.setItem(HQ_LAST_LAUNCH_KEY, JSON.stringify(value));
  } catch {
    // Storage blocked: the launcher just falls back to its default next time.
  }
}
