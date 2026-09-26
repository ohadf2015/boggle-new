/**
 * Rule (MP rebuild FOUNDATION): no multiplayer screen renders a raw `Link`,
 * `router.push/replace` or `href` to a NON-multiplayer route. Every way out
 * goes through `useMpExit()(reason)` → `mpExit` (lib/multiplayer/exitDestination),
 * so nothing unexpectedly bounces a player to the LexiClash homepage.
 *
 * The exit implementation itself is allowlisted. Legacy call sites are listed
 * with the piece that converts them; a piece that converts its site deletes its
 * entry. Anything NEW fails here.
 */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');

/** Directories / files that are multiplayer screens. */
const MP_SCOPES = [
  'components/multiplayer',
  'components/wordhunt',
  'host',
  'player',
  'app/[locale]/multiplayer',
];

/** The exit implementation — allowed to navigate by design. */
const EXIT_IMPLEMENTATION = new Set([
  'app/[locale]/multiplayer/useMpPageState.ts', // exitMp + classroom hub exits
  'app/[locale]/multiplayer/PageClient.tsx', // onLeaveGame classroom destination, EducationHeader backHref
  'app/[locale]/multiplayer/error.tsx', // mpExit('error') targets
]);

/** Legacy sites each piece converts to useMpExit (delete the entry when done). */
const LEGACY_ALLOWLIST: Record<string, string> = {
  // RESULTS converted its exits to useMpExit('leave-room'); only this deep link remains (needs an mpExit reason from FOUNDATION).
  'components/multiplayer/results/useOpenLessonPractice.ts': 'RESULTS — classroom lesson-practice deep link (/student/lessons/…)',
};

const NAV = /router\.(?:push|replace)\(|href=\{|href="\/|<Link\b|window\.location\.(?:href\s*=|assign\()/;

function walk(path: string, out: string[]): void {
  const abs = join(ROOT, path);
  const st = statSync(abs);
  if (st.isFile()) {
    out.push(path);
    return;
  }
  for (const name of readdirSync(abs)) {
    if (name === '__tests__' || name === 'node_modules') continue;
    walk(join(path, name), out);
  }
}

function mpSourceFiles(): string[] {
  const files: string[] = [];
  for (const scope of MP_SCOPES) walk(scope, files);
  return files
    .map((f) => relative(ROOT, join(ROOT, f)))
    .filter((f) => /\.(tsx?|jsx?)$/.test(f) && !/\.(test|spec)\.[tj]sx?$/.test(f));
}

/** Lines that navigate somewhere that is not a multiplayer route. */
function offendingLines(file: string): string[] {
  return readFileSync(join(ROOT, file), 'utf8')
    .split('\n')
    .map((line, i) => ({ line: line.trim(), n: i + 1 }))
    .filter(({ line }) => !line.startsWith('//') && !line.startsWith('*') && NAV.test(line))
    .filter(({ line }) => !/\/multiplayer\b/.test(line))
    .map(({ line, n }) => `${file}:${n}  ${line}`);
}

describe('multiplayer screens never navigate out except through useMpExit', () => {
  const files = mpSourceFiles();

  it('scans a real set of files (guards against a silent empty scan)', () => {
    expect(files.length).toBeGreaterThan(100);
    expect(files).toContain('app/[locale]/multiplayer/PageClient.tsx');
  });

  it('has no raw non-MP navigation outside the exit implementation and the legacy allowlist', () => {
    const offenders = files
      .filter((f) => !EXIT_IMPLEMENTATION.has(f) && !(f in LEGACY_ALLOWLIST))
      .flatMap(offendingLines);
    expect(
      offenders.join('\n') || null,
      'Use useMpExit()(reason) from hooks/useMpExit — never a raw Link/router.push/href out of multiplayer.',
    ).toBeNull();
  });

  it('every allowlisted file still exists (stale entries must be deleted)', () => {
    for (const f of [...EXIT_IMPLEMENTATION, ...Object.keys(LEGACY_ALLOWLIST)]) {
      expect(files, f).toContain(f);
    }
  });
});
