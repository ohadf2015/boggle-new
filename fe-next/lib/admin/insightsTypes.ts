// Shape of the jsonb returned by the admin_dashboard_insights() SQL function.
// Mirrored by the InsightsPanel component and the /api/admin/insights route.

export interface DowBucket {
  dow: number; // 0=Sun .. 6=Sat (UTC)
  games: number;
}
export interface HourBucket {
  hour: number; // 0..23 (UTC)
  games: number;
}
export interface AffinityPair {
  fromMode: string;
  toMode: string;
  both: number;
  fromPlayers: number;
  pct: number; // % of fromMode players who also played toMode
}
export interface InsightRecords {
  today: number;
  yesterday: number;
  bestDay: string | null; // ISO date
  bestDayGames: number;
  fastestMode: string | null;
  fastestPct: number | null;
}
export interface NoShowRow {
  mode: string;
  total: number;
  noShows: number;
  pct: number; // % of games that recorded 0 score & 0 words
}
export interface WordQualityRow {
  language: string;
  valid: number;
  invalid: number;
  rejectRate: number | null; // % of submissions rejected/queued for review
}

export interface InsightsBundle {
  dayOfWeek: DowBucket[];
  hourOfDay: HourBucket[];
  modeAffinity: AffinityPair[];
  records: InsightRecords;
  noShowByMode: NoShowRow[];
  wordQualityByLang: WordQualityRow[];
}
