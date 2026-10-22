import type { GameSettings } from '@/hooks/useRecentGameSettings';
import { TIMER_MINUTES } from './LobbyRoundSettings';

const STORAGE_KEY = 'lexiclash_recent_game_settings';
const BOARD_SIZES: readonly GameSettings['boardSize'][] = ['small', 'medium', 'large'];

/**
 * The round settings of the teacher's last launch, read synchronously so the lobby's first
 * paint already shows them (a late async load would flip the picker under the teacher).
 * Each field is validated on its own: an entry saved by an older build keeps what still fits.
 */
export function readRememberedRoundDefaults(): Partial<GameSettings> | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const entries = JSON.parse(raw) as Array<{ savedAt?: number; settings?: Partial<GameSettings> }>;
    if (!Array.isArray(entries) || entries.length === 0) return null;
    const latest = [...entries].sort((a, b) => (b?.savedAt ?? 0) - (a?.savedAt ?? 0))[0];
    const s = latest?.settings ?? {};
    const out: Partial<GameSettings> = {};
    if ((TIMER_MINUTES as readonly number[]).includes(s.timerMinutes as number)) out.timerMinutes = s.timerMinutes;
    if (BOARD_SIZES.includes(s.boardSize as GameSettings['boardSize'])) out.boardSize = s.boardSize;
    if (typeof s.allowLateJoin === 'boolean') out.allowLateJoin = s.allowLateJoin;
    return out;
  } catch {
    return null;
  }
}
