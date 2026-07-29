import { useMemo } from 'react';

export interface PersonalRecord {
  label: string;
  value: string | number;
  mode?: string;
  date?: string;
  icon: string;
}

interface PersonalRecordsData {
  longestWord: string;
  highestCombo: number;
  bestScorePerMode: Record<string, number>;
  fastestWord: number;
  totalUniqueWords: number;
  isLoading: boolean;
  records: PersonalRecord[];
}

// Mock data for now - actual DB integration later
const MOCK_DATA = {
  longestWord: 'EXTRAORDINARY',
  highestCombo: 12,
  bestScorePerMode: { ranked: 450, casual: 380 },
  fastestWord: 1.2,
  totalUniqueWords: 543,
};

export function usePersonalRecords(): PersonalRecordsData {
  const records = useMemo<PersonalRecord[]>(() => [
    { label: 'profile.records.longestWord', value: MOCK_DATA.longestWord, icon: 'text' },
    { label: 'profile.records.highestCombo', value: MOCK_DATA.highestCombo, icon: 'flame' },
    { label: 'profile.records.fastestWord', value: `${MOCK_DATA.fastestWord}s`, icon: 'zap' },
    { label: 'profile.records.uniqueWords', value: MOCK_DATA.totalUniqueWords, icon: 'book' },
    ...Object.entries(MOCK_DATA.bestScorePerMode).map(([mode, score]) => ({
      label: `profile.records.best${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
      value: score,
      mode,
      icon: mode === 'ranked' ? 'trophy' : 'gamepad',
    })),
  ], []);

  return {
    ...MOCK_DATA,
    isLoading: false,
    records,
  };
}
