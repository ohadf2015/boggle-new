export type ComparisonRowDef = {
  featureKey: string;
  lexi: string;
  competitor: string;
};

export function buildComparisonRows(
  vs: Record<string, string>,
  defs: readonly ComparisonRowDef[],
): Array<[string, string, string]> {
  return defs.map(({ featureKey, lexi, competitor }) => [
    vs[featureKey] ?? featureKey,
    lexi,
    competitor,
  ]) as Array<[string, string, string]>;
}

// Wordle row defs (featureKey only identifiers; display values for en target)
export const WORDLE_ROW_DEFS: readonly ComparisonRowDef[] = [
  { featureKey: 'gamesPerDay', lexi: 'Unlimited', competitor: '1' },
  { featureKey: 'multiplayer', lexi: 'Real-time, 2-20+ players', competitor: 'None' },
  { featureKey: 'gameType', lexi: 'Word-finding on grid', competitor: 'Letter guessing' },
  { featureKey: 'freeToPlay', lexi: 'Yes, fully free', competitor: 'Yes (part of NYT)' },
  { featureKey: 'noDownload', lexi: 'Yes', competitor: 'Yes' },
  { featureKey: 'languages', lexi: '5 (EN, HE, SV, JA, ES)', competitor: '1 (English)' },
  { featureKey: 'adventureMode', lexi: '100+ levels, boss battles', competitor: 'None' },
  { featureKey: 'dailyChallenge', lexi: 'Yes + global leaderboard', competitor: 'Yes' },
  { featureKey: 'brainTraining', lexi: '5 drill modes', competitor: 'None' },
  { featureKey: 'streakSystem', lexi: 'Yes + streak freeze', competitor: 'Yes' },
  { featureKey: 'shareableResults', lexi: 'Emoji grid + challenge link', competitor: 'Emoji grid only' },
  { featureKey: 'accountRequired', lexi: 'No', competitor: 'No (optional NYT)' },
];

// Freerice row defs (featureKey camelCase identifiers only; no English feature strings here)
export const FREERICE_ROW_DEFS: readonly ComparisonRowDef[] = [
  { featureKey: 'free', lexi: '✓', competitor: '✓' },
  { featureKey: 'noStudentLogin', lexi: '✓ 6-character join code', competitor: '✓ Anonymous play' },
  { featureKey: 'coreFormat', lexi: 'Live word-formation games', competitor: 'Solo multiple-choice quiz' },
  { featureKey: 'liveWholeClassMultiplayer', lexi: '✓ Free, up to 30', competitor: '✗ Solo (group totals only)' },
  { featureKey: 'oneVOneDuels', lexi: '✓', competitor: '✗' },
  { featureKey: 'teacherDashboard', lexi: '✓ Per-student + class-wide', competitor: '✗ Anonymous' },
  { featureKey: 'customWordLists', lexi: '✓', competitor: '✗ Fixed question banks' },
  { featureKey: 'wordFormation', lexi: '✓ Boggle/Wheel/Anagram', competitor: '✗ Pick the right definition' },
  { featureKey: 'fiveLanguages', lexi: '✓ EN/HE/SV/JA/ES', competitor: 'Several quiz categories' },
  { featureKey: 'charitableDonation', lexi: '✗', competitor: '✓ Rice via World Food Programme' },
  { featureKey: 'bestFor', lexi: 'Whole-class review games', competitor: 'Solo do-good vocabulary practice' },
];
