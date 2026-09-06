export interface ClassicDailyShareData {
  mode: 'classic';
  puzzleNumber: number;
  score: number;
  words: string[];
}

export interface BlastShareData {
  mode: 'blast';
  score: number;
  stars: 1 | 2 | 3;
  clearPercentage: number;
  wordsFound: string[];
  maxCombo: number;
  wavesCompleted: number;
  waveResults: Array<{ waveNumber: number; clearPercentage: number }>;
}

export interface SingleplayerShareData {
  mode: 'singleplayer';
  score: number;
  words: string[];
  maxCombo?: number;
  rank?: number;
  totalPlayers?: number;
  isNewHighScore?: boolean;
}

export interface AdventureShareData {
  mode: 'adventure';
  score: number;
  stars: number;
  worldNumber: number;
  levelNumber: number;
  objectivesCompleted: number;
  objectivesTotal: number;
  isBoss?: boolean;
}

export interface DrillShareData {
  mode: 'drill';
  drillType: string;
  score: number;
  wordsFound: number;
  totalWords?: number;
  timeSpent?: number;
}

export type GameShareData =
  | ClassicDailyShareData
  | BlastShareData
  | SingleplayerShareData
  | AdventureShareData
  | DrillShareData;

export interface ShareStat {
  value: string;
  label: string;
}

export interface ShareParts {
  header: string;
  score: string;
  scoreLabel: string;
  stats: ShareStat[];
  details: string[];
}

function longestOf(words: string[]): string | null {
  if (words.length === 0) return null;
  return words.reduce((a, b) => (b.length > a.length ? b : a));
}

function lengthLines(words: string[], t: (key: string) => string): string[] {
  const grouped = new Map<number, number>();
  for (const w of words) grouped.set(w.length, (grouped.get(w.length) || 0) + 1);
  return [...grouped.entries()]
    .sort((a, b) => b[0] - a[0])
    .slice(0, 5)
    .map(([len, count]) =>
      t('share.emojiCard.lettersCount')
        .replace('{len}', String(len))
        .replace('{count}', String(count)),
    );
}

export function getShareParts(data: GameShareData, t: (key: string) => string): ShareParts {
  switch (data.mode) {
    case 'classic': {
      const longest = longestOf(data.words);
      const stats: ShareStat[] = [
        { value: String(data.words.length), label: t('share.words') },
      ];
      if (longest) {
        stats.push({ value: String(longest.length), label: t('share.longest') });
      }
      return {
        header: t('share.emojiCard.classicHeader').replace('{number}', String(data.puzzleNumber)),
        score: data.score.toLocaleString(),
        scoreLabel: t('common.pts'),
        stats,
        details: [
          ...(longest ? [`${t('share.longest')} ${longest.toUpperCase()}`] : []),
          ...lengthLines(data.words, t),
        ],
      };
    }
    case 'blast': {
      const stats: ShareStat[] = [
        { value: `${data.clearPercentage}%`, label: t('blast.cleared') },
        { value: String(data.stars), label: t('share.emojiCard.stars') },
      ];
      if (data.maxCombo >= 3) {
        stats.push({ value: `${data.maxCombo}x`, label: t('share.combo') });
      }
      const details = data.waveResults.map((wave) =>
        t('share.emojiCard.waveLine')
          .replace('{n}', String(wave.waveNumber))
          .replace('{pct}', String(wave.clearPercentage)),
      );
      return {
        header: t('share.emojiCard.blastHeader'),
        score: data.score.toLocaleString(),
        scoreLabel: t('common.pts'),
        stats,
        details,
      };
    }
    case 'singleplayer': {
      const longest = longestOf(data.words);
      const stats: ShareStat[] = [
        { value: String(data.words.length), label: t('share.words') },
      ];
      if (longest) stats.push({ value: String(longest.length), label: t('share.longest') });
      if (data.maxCombo && data.maxCombo >= 3) {
        stats.push({ value: `${data.maxCombo}x`, label: t('share.combo') });
      }
      if (data.rank && data.totalPlayers) {
        stats.push({
          value: `#${data.rank}/${data.totalPlayers}`,
          label: t('share.emojiCard.rank'),
        });
      }
      const details: string[] = [];
      if (longest) details.push(`${t('share.longest')} ${longest.toUpperCase()}`);
      if (data.isNewHighScore) details.push(t('share.emojiCard.highScore'));
      details.push(...lengthLines(data.words, t));
      return {
        header: t('share.emojiCard.singleplayerHeader'),
        score: data.score.toLocaleString(),
        scoreLabel: t('common.pts'),
        stats,
        details,
      };
    }
    case 'adventure': {
      const stats: ShareStat[] = [
        {
          value: `${data.stars}/3`,
          label: t('share.emojiCard.stars'),
        },
        {
          value: `${data.objectivesCompleted}/${data.objectivesTotal}`,
          label: t('share.emojiCard.objectives'),
        },
      ];
      const details: string[] = [];
      if (data.isBoss) details.push(t('share.emojiCard.bossDefeated'));
      return {
        header: t('share.emojiCard.adventureHeader')
          .replace('{world}', String(data.worldNumber))
          .replace('{level}', String(data.levelNumber)),
        score: data.score.toLocaleString(),
        scoreLabel: t('common.pts'),
        stats,
        details,
      };
    }
    case 'drill': {
      const stats: ShareStat[] = [
        {
          value: data.totalWords
            ? `${data.wordsFound}/${data.totalWords}`
            : String(data.wordsFound),
          label: t('share.words'),
        },
      ];
      if (data.totalWords) {
        const pct = Math.round((data.wordsFound / data.totalWords) * 100);
        stats.push({ value: `${pct}%`, label: t('share.emojiCard.accuracy') });
      }
      if (data.timeSpent) {
        stats.push({
          value: `${data.timeSpent}${t('share.emojiCard.secondsSuffix')}`,
          label: t('share.emojiCard.time'),
        });
      }
      return {
        header: t('share.emojiCard.drillHeader').replace('{type}', data.drillType),
        score: data.score.toLocaleString(),
        scoreLabel: t('common.pts'),
        stats,
        details: [],
      };
    }
  }
}

export function buildShareText(data: GameShareData, t: (key: string) => string): string {
  const parts = getShareParts(data, t);
  return [
    parts.header,
    `${parts.score} ${parts.scoreLabel}`,
    parts.stats.map((s) => `${s.value} ${s.label}`).join(' · '),
    ...parts.details,
    'lexiclash.live',
  ].filter(Boolean).join('\n');
}
