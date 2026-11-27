import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..');
const KIT = join(ROOT, 'components/landing/kit/index.tsx');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
    return /\.tsx?$/.test(name) && !/\.test\./.test(name) ? [path] : [];
  });
}

function importsOf(file: string): string[] {
  const src = readFileSync(file, 'utf8');
  return [...src.matchAll(/from\s+'((?:@\/|\.)[^']*)'/g)].flatMap(([, spec]) => {
    const base = spec.startsWith('@/') ? join(ROOT, spec.slice(2)) : resolve(dirname(file), spec);
    const hit = ['.tsx', '.ts', '/index.tsx', '/index.ts', ''].map((e) => base + e).find((p) => existsSync(p) && statSync(p).isFile());
    return hit ? [hit] : [];
  });
}

function reachesKit(file: string, depth = 4, seen = new Set<string>()): boolean {
  if (file === KIT) return true;
  if (depth === 0 || seen.has(file)) return false;
  seen.add(file);
  return importsOf(file).some((next) => reachesKit(next, depth - 1, seen));
}

const LANDING_ROUTES = [
  'about', 'balda-onlayn', 'bell-ringer-word-games', 'best-online-word-games', 'blog',
  'brain-training-word-games', 'competitive-word-games', 'contact', 'daily-word-wheel', 'download-word-game-android',
  'education/boggle-for-kids', 'education/boggle-for-the-classroom', 'education/brain-breaks-word-games',
  'education/early-finishers-activities', 'education/end-of-year-classroom-activities', 'education/english-games-adults',
  'education/english-games-elementary', 'education/english-games-middle-school', 'education/english-vocabulary-topics',
  'education/esl-word-games', 'education/first-day-of-school-icebreakers', 'education/for-schools',
  'education/games-for-teachers', 'education/indoor-recess-games', 'education/irregular-verbs-games',
  'education/lists', 'education/lists/[lang]', 'education/lists/[lang]/[item]', 'education/lists/topic/[topic]',
  'education/middle-school-word-games', 'education/sight-words-practice', 'education/spelling-bee-practice',
  'education/vocabulary-games-classroom',
  'erudit-onlayn', 'faq', 'filvordy-onlayn', 'glossary', 'guides', 'hamila-hayomit', 'hebrew-classroom-vocabulary-games',
  'hebrew-multiplayer-word-game', 'how-to-play', 'igra-v-assotsiatsii-onlayn', 'igry-v-slova-onlayn', 'japanese-word-game',
  'juego-de-palabras-multijugador', 'juegos-vocabulario-aula', 'lexiclash-contra-wordle', 'lexiclash-neged-wordle',
  'lexiclash-vs-kahoot', 'lexiclash-vs-scrabble', 'lexiclash-vs-wordwall', 'mischaqey-safa-imun-kogniti',
  'online-word-games-with-friends', 'play-boggle-5x5-online', 'play-boggle-online-free', 'scrabble-alternative-online',
  'slovo-dnya', 'sostav-slova-iz-bukv', 'substitute-teacher-word-games', 'swedish-multiplayer-word-game',
  'tools/word-solver', 'word-blast-game', 'word-craft-game', 'word-craft-landing', 'word-finder',
  'word-games-for-the-classroom', 'word-games-online-free', 'word-of-the-day', 'words', 'words-with-friends-alternative',
  'wordle-solver',
];

describe('public landing pages', () => {
  it.each(LANDING_ROUTES)('/%s renders through the landing kit', (route) => {
    expect(reachesKit(join(ROOT, 'app/[locale]', route, 'page.tsx'))).toBe(true);
  });

  it('files built on the kit use theme tokens, never literal colours', () => {
    const adopters = [...sources(join(ROOT, 'app/[locale]')), ...sources(join(ROOT, 'components'))].filter((file) =>
      importsOf(file).includes(KIT) || /components\/landing\/kit['/]/.test(readFileSync(file, 'utf8')),
    );
    expect(adopters.length).toBeGreaterThan(50);

    const offenders = adopters.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, i) => ({ line, at: `${file.slice(ROOT.length + 1)}:${i + 1}` }))
        .filter(({ line }) => /(?:bg|text|border|shadow|from|via|to|ring|fill|stroke|decoration|outline)-\[[^\]]*(?:#[0-9a-fA-F]{3}|rgba?\(\d)|['"`]#[0-9a-fA-F]{6}['"`]/.test(line))
        .map(({ at }) => at),
    );
    expect(offenders).toEqual([]);
  });
});
