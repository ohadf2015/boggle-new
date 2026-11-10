import type { LessonWordClaimedEvent } from './lessonClaims';
import type { RivalFlipPayload, RivalUpdatePayload } from './rivalry';

/** Mid-round broadcasts on a live board, split out of ServerToClientEvents to keep socket.ts readable. */
export interface RoundBroadcastEvents {
  // Round events (monotonic breakers)
  roundEventWarning: (data: { eventType: string; gameSessionId?: number; timestamp: number }) => void;
  roundEventStart: (data: { eventType: string; gameSessionId?: number; duration: number; data?: Record<string, unknown> }) => void;
  roundEventEnd: (data: { eventType: string; gameSessionId?: number }) => void;

  // Rush tiles (recurring transient bonus tiles, ~10s each, all players)
  rushTilesSpawn: (data: { tiles: Array<{ row: number; col: number }>; durationMs: number; gameSessionId?: number }) => void;
  rushTilesClear: (data: { gameSessionId?: number }) => void;

  // Special word found
  specialWordFound: (data: { word: string; foundBy: string; bonus: number; gameSessionId?: number }) => void;

  // Lesson Word Race: first student to find a placed lesson word claims it
  lessonWordClaimed: (data: LessonWordClaimedEvent) => void;

  // Earthquake / Fire Round events
  fireRoundStart: (data: { gameSessionId?: string; grid: unknown[][]; duration: number }) => void;
  fireRoundEnd: (data: { gameSessionId?: string }) => void;
  earthquakeShake: (data: { gameSessionId?: string }) => void;
  earthquakeWarning: (data: { gameSessionId?: string; timestamp: number }) => void;

  // Rival Pairs: each student hears only their own duel; the projector hears who took the lead
  rivalUpdate: (data: RivalUpdatePayload) => void;
  rivalFlip: (data: RivalFlipPayload) => void;
}
