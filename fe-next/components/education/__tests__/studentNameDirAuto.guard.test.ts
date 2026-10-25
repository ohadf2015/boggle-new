import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const FILES = [
  'components/education/projector/ProjectorRoster.tsx',
  'components/education/results/ClassNeedsHelp.tsx',
  'components/education/results/PodiumStage.tsx',
  'components/education/TeamBattleStandings.tsx',
  'components/education/results/ClassroomSessionStandings.tsx',
  'components/education/live/EduLobbyRoster.tsx',
];

/** `.username` rendered as JSX text, never as an attribute value (`key={x.username}`). */
const RENDERED_NAME = /(?:>|^)[ \t]*\{[^{}=]*\.username[^{}]*\}/gm;

function enclosingOpenTag(src: string, at: number): string {
  let i = at;
  while (i >= 0) {
    i = src.lastIndexOf('<', i - 1);
    if (i < 0) return '';
    if (src[i + 1] !== '/') break;
  }
  return src.slice(i, src.indexOf('>', i) + 1);
}

describe('student names on shared screens isolate their direction', () => {
  it.each(FILES)('Given %s, When it renders a username, Then the element carries dir="auto" or is a <bdi>', (file) => {
    const src = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const bare = [...src.matchAll(RENDERED_NAME)]
      .map((m) => ({ expr: m[0], tag: enclosingOpenTag(src, (m.index ?? 0) + m[0].indexOf('{')) }))
      .filter(({ tag }) => !/dir="auto"/.test(tag) && !/^<bdi\b/.test(tag));
    expect(bare).toEqual([]);
  });
});
