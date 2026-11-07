import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { classroomLivePath } from '@/lib/education/classroomLivePath';

const ROOT = join(__dirname, '../../../../..');
const OWNED_DIRS = ['app/[locale]/education/classroom-game', 'components/education/lobby'];
const OWNED_FILES = [
  'components/education/ClassroomGameLobby.tsx',
  'components/education/ClassroomModeCatalogue.tsx',
  'components/education/ClassroomModeCatalogueCard.tsx',
  'components/education/ClassroomModeCatalogueData.ts',
  'components/education/ClassroomModeSpotlight.tsx',
];

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return name === '__tests__' ? [] : sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

// A hop from the picker to the consumer `/multiplayer` page took teachers out of the class flow.
const CONSUMER_MP_HREF = /\/multiplayer(?=[?'"`#]|\/?\$\{)/;

describe('Pick-a-game never sends a teacher to the consumer /multiplayer page', () => {
  it('Given every non-test source the picker owns, Then none builds a /multiplayer href', () => {
    const files = [...OWNED_DIRS.flatMap((d) => sources(join(ROOT, d))), ...OWNED_FILES.map((f) => join(ROOT, f))];
    expect(files.length).toBeGreaterThan(20);
    const offenders = files.flatMap((file) =>
      readFileSync(file, 'utf8')
        .split('\n')
        .map((line, i) => ({ line: line.trim(), n: i + 1 }))
        .filter(({ line }) => !/^(import|\/\/|\*|\/\*)/.test(line) && CONSUMER_MP_HREF.test(line))
        .map(({ n, line }) => `${relative(ROOT, file)}:${n} ${line}`)
    );
    expect(offenders).toEqual([]);
  });

  it('Given a room was created, Then the host lands on the edu live route', () => {
    expect(classroomLivePath('en', 'ABC123', { host: true })).toMatch(/^\/en\/education\/live\?/);
  });
});
