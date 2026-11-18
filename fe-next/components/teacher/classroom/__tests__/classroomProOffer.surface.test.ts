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

describe('classroom Pro offer stays on the class page, not the live projector', () => {
  it('mounts under the class header and does not gate the page', () => {
    const page = readFileSync(resolve(ROOT, 'app/[locale]/teacher/classroom/[id]/PageClient.tsx'), 'utf8');
    expect(page).toContain('ClassroomProOffer');
    expect(page).toContain('proOffer={<ClassroomProOffer />}');
    expect(page).not.toContain('ProGate');
    const view = readFileSync(resolve(ROOT, 'components/teacher/classroom/page/ClassPageView.tsx'), 'utf8');
    const headerEnd = view.indexOf('</section>');
    const offer = view.indexOf('{props.proOffer}');
    const start = view.indexOf('class-page-start');
    expect(start).toBeGreaterThan(-1);
    expect(offer).toBeGreaterThan(headerEnd);
  });

  it('is not imported from any student surface or the live projector', () => {
    const banned = [
      ...filesUnder('app/[locale]/student'),
      ...filesUnder('components/student'),
      ...filesUnder('components/education/live'),
    ];
    const leaks = banned.filter((file) =>
      readFileSync(resolve(ROOT, file), 'utf8').includes('ClassroomProOffer'),
    );
    expect(leaks).toEqual([]);
  });
});
