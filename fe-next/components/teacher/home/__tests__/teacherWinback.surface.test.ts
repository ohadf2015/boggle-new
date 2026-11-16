import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '../../../..');

function filesUnder(dir: string): string[] {
  const abs = resolve(ROOT, dir);
  const out: string[] = [];
  for (const name of readdirSync(abs)) {
    const path = join(abs, name);
    if (statSync(path).isDirectory()) out.push(...filesUnder(join(dir, name)));
    else if (/\.(tsx|ts|jsx|js)$/.test(name)) out.push(join(dir, name));
  }
  return out;
}

describe('teacher win-back stays on the teacher dashboard', () => {
  it('mounts only from the teacher home banner slot, for an approved request, until dismissed', () => {
    const page = readFileSync(resolve(ROOT, 'app/[locale]/teacher/PageClient.tsx'), 'utf8');
    const hook = readFileSync(resolve(ROOT, 'components/teacher/home/useTeacherBanner.ts'), 'utf8');
    expect(page).toContain('TeacherWinbackBanner');
    expect(page).toContain("case 'winback'");
    // Empty Home hides the below-fold account slot. The recall has to sit on the
    // greeting alert line, which renders with or without a class.
    const alertLine = page.split('\n').find((line) => line.includes('alert='));
    expect(alertLine).toContain('TeacherWinbackBanner');
    expect(hook).toContain("latestRequest?.status === 'approved'");
    expect(hook).toContain('winbackDismissed');
    expect(hook).toContain('dismissWinback');
  });

  it('is not imported from any student surface', () => {
    const studentFiles = [
      ...filesUnder('app/[locale]/student'),
      ...filesUnder('components/student'),
    ];
    const leaks = studentFiles.filter((file) =>
      readFileSync(resolve(ROOT, file), 'utf8').includes('TeacherWinbackBanner'),
    );
    expect(leaks).toEqual([]);
  });
});
