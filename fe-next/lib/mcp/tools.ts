/**
 * LexiClash MCP tools. Pure functions over existing app logic so the route stays thin.
 * Challenge links carry ?src=mcp so agent-attributed sessions can be counted.
 */
import { generateDailyPuzzle, getDailyChallengeDate } from '@/utils/dailyChallenge';
import { scoreWord } from '@/utils/dailyChallenge/wordWheelScoring';
import type { Language } from '@/types';

export const MCP_LANGUAGES = ['en', 'he', 'sv', 'ja', 'es', 'ru'] as const;
export const SITE_ORIGIN = 'https://www.lexiclash.live';
export const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

const languageProp = { type: 'string', enum: [...MCP_LANGUAGES], description: 'Language code (default en)' };

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'get_daily_puzzle',
    description: "Today's LexiClash daily word-hunt grid (the answer is not included) and a link to play it.",
    inputSchema: { type: 'object', properties: { language: languageProp } },
  },
  {
    name: 'create_challenge',
    description: 'Create a shareable custom puzzle challenge link from a target word and letter grid.',
    inputSchema: {
      type: 'object',
      properties: {
        language: languageProp,
        targetWord: { type: 'string', description: '3-10 letters' },
        grid: { type: 'array', items: { type: 'array', items: { type: 'string' } }, description: 'Letter grid rows' },
        displayName: { type: 'string', description: 'Creator name shown to the challenged player' },
      },
      required: ['targetWord', 'grid', 'displayName'],
    },
  },
  {
    name: 'score_words',
    description: 'Score a list of words with the LexiClash length-based scoring (no dictionary check).',
    inputSchema: {
      type: 'object',
      properties: { words: { type: 'array', items: { type: 'string' }, maxItems: 200 } },
      required: ['words'],
    },
  },
  {
    name: 'daily_leaderboard',
    description: 'Top players on the combined daily challenge board.',
    inputSchema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'YYYY-MM-DD (default today)' },
        language: languageProp,
        limit: { type: 'number', description: '1-25 (default 10)' },
      },
    },
  },
];

function lang(v: unknown): Language {
  return (MCP_LANGUAGES as readonly string[]).includes(v as string) ? (v as Language) : 'en';
}

export function dailyPlayUrl(language: string): string {
  return `${SITE_ORIGIN}/${language}/daily?src=mcp`;
}

export function challengeUrl(code: string, language: string): string {
  return `${SITE_ORIGIN}/${language}/custom/${code}?src=mcp`;
}

export function getDailyPuzzle(args: Record<string, unknown>) {
  const language = lang(args.language);
  const date = getDailyChallengeDate();
  const puzzle = generateDailyPuzzle(date, language);
  return { date, language, grid: puzzle.grid, playUrl: dailyPlayUrl(language) };
}

export function scoreWords(args: Record<string, unknown>) {
  const words = Array.isArray(args.words) ? args.words.filter((w): w is string => typeof w === 'string') : [];
  if (words.length === 0 || words.length > 200) throw new Error('words must be 1-200 strings');
  const seen = new Set<string>();
  const scored = words.map((raw) => {
    const word = raw.trim().toLowerCase();
    const duplicate = seen.has(word);
    seen.add(word);
    return { word, points: duplicate ? 0 : scoreWord(word), duplicate };
  });
  return { total: scored.reduce((s, w) => s + w.points, 0), words: scored };
}
