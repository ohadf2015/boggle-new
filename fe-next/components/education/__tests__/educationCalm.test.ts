import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * The education surfaces a teacher actually stares at should sit still.
 * A pulsing CTA, a floating mock, and scroll reveals that start at opacity 0
 * all compete with the one action on the screen.
 */
const ROOT = path.resolve(__dirname, '../../..');

function read(rel: string): string {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('education surfaces stay calm', () => {
  it('does not fade or pulse the landing hero', () => {
    const hero = read('components/education/EducationHero.tsx');
    const mock = read('components/education/EducationModeMock.tsx');
    expect(hero).not.toMatch(/from 'gsap'/);
    expect(hero).not.toMatch(/animate-pulse/);
    expect(mock).not.toMatch(/animate-float/);
    expect(mock).not.toMatch(/animate-pulse/);
  });

  it('shows landing sections immediately, without a scroll-in hide', () => {
    for (const rel of [
      'components/education/ComparisonStrip.tsx',
      'components/education/SixModeTour.tsx',
      'components/education/MoatTrifectaSection.tsx',
      'components/education/TeacherAccessCTA.tsx',
    ]) {
      const src = read(rel);
      expect(src, rel).not.toMatch(/from 'gsap'|useGsapReveal/);
    }
  });

  it('keeps the lobby title level and the arena behind a heavy scrim', () => {
    expect(read('components/education/lobby/ClassroomLobbyShell.tsx')).not.toMatch(/-rotate-/);
    expect(read('components/education/lobby/LaunchStageBackdrop.tsx')).toContain('bg-neo-navy/80');
    expect(read('components/education/ClassroomGameLobbyExpress.tsx')).not.toMatch(/animate-bounce/);
  });

  it('gives the role cards one shared edge, and only the teacher path a fill', () => {
    const client = read('app/[locale]/education/PageClient.tsx');
    const roles = client.slice(
      client.indexOf('Role cards'),
      client.indexOf('TeacherProCheckoutCta locale'),
    );
    expect(roles).not.toMatch(/border-neo-lime|border-neo-cyan/);
    expect(roles).toContain('border-neo-cream');
    expect(roles).not.toMatch(/bg-neo-cyan/);
  });
});
