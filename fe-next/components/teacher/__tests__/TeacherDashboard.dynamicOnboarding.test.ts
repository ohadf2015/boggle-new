/**
 * `TeacherOnboarding` is the biggest remaining first-load cost on the teacher
 * dashboard, and it renders only for a first-time teacher — every returning
 * teacher was paying for a modal they will never see.
 *
 * A source assertion rather than a render assertion: `next/dynamic` is a build
 * concern, and a rendering test would pass just as happily with a static import
 * (the mocked module resolves either way). The thing that must not regress is
 * the import site itself.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, '..', 'TeacherDashboard.tsx'), 'utf8');

describe('TeacherDashboard — TeacherOnboarding is code-split', () => {
  it('loads TeacherOnboarding through next/dynamic, not a static import', () => {
    expect(source).toContain("import dynamic from 'next/dynamic'");
    expect(source).toMatch(/dynamic\(\s*\(\)\s*=>\s*import\('@\/components\/education\/TeacherOnboarding'\)/);
  });

  it('does not also keep the static import alive', () => {
    expect(source).not.toMatch(/^import \{ TeacherOnboarding \} from/m);
  });
});
