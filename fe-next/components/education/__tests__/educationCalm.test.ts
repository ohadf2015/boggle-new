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
    expect(hero).not.toMatch(/from 'gsap'/);
    expect(hero).not.toMatch(/animate-pulse/);
  });

  it('shows landing sections immediately, without a scroll-in hide', () => {
    for (const rel of [
      'components/education/TeacherAccessCTA.tsx',
    ]) {
      const src = read(rel);
      expect(src, rel).not.toMatch(/from 'gsap'|useGsapReveal/);
    }
  });

  it('keeps the lobby title level and no arena art behind lobby text', () => {
    expect(read('components/education/lobby/ClassroomLobbyShell.tsx')).not.toMatch(/-rotate-/);
    expect(read('app/[locale]/education/classroom-game/PageClient.tsx')).not.toMatch(/LaunchStageBackdrop|arena-lobby-bg/);
    expect(read('components/education/lobby/QuickLaunchProvisioner.tsx')).not.toMatch(/animate-bounce/);
  });
});
