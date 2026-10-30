import { create } from 'zustand';
import type { GameModeOption } from '@/components/GameModeSelector';
import type { DifficultyLevel } from '@/shared/types/game';

export interface LobbySettings {
  gameCode: string;
  mode: GameModeOption;
  timerSeconds: number;
  difficulty: DifficultyLevel;
  minWordLength: number;
}

const MODES: readonly GameModeOption[] = ['random', 'classic', 'blast', 'word-hunt', 'wheel-rush', 'word-tower', 'crossword', 'wordcraft'];
const DIFFICULTIES: readonly DifficultyLevel[] = ['EASY', 'MEDIUM', 'HARD'];

export function parseLobbySettings(data: unknown): LobbySettings | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;
  const int = (v: unknown) => typeof v === 'number' && Number.isInteger(v);
  if (typeof d.gameCode !== 'string' || !d.gameCode) return null;
  if (!MODES.includes(d.mode as GameModeOption)) return null;
  if (!DIFFICULTIES.includes(d.difficulty as DifficultyLevel)) return null;
  if (!int(d.timerSeconds) || (d.timerSeconds as number) <= 0) return null;
  if (!int(d.minWordLength)) return null;
  return {
    gameCode: d.gameCode,
    mode: d.mode as GameModeOption,
    timerSeconds: d.timerSeconds as number,
    difficulty: d.difficulty as DifficultyLevel,
    minWordLength: d.minWordLength as number,
  };
}

export const useLobbySettingsStore = create<{ settings: LobbySettings | null }>()(() => ({ settings: null }));

export function setLobbySettings(settings: LobbySettings): void {
  useLobbySettingsStore.setState({ settings });
}

/** The host's pick for THIS room only; another room's leftover never shows. */
export function useLobbySettingsFor(gameCode: string | null | undefined): LobbySettings | null {
  return useLobbySettingsStore((s) => (s.settings && s.settings.gameCode === gameCode ? s.settings : null));
}
