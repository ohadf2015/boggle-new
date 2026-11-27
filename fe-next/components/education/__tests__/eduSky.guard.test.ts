import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  EDU_SKY_LAYOUTS,
  classLiterals,
  listCodemodFiles,
  transformSource,
} from '../../../scripts/edu-sky-codemod.mjs';

const REPO = path.resolve(__dirname, '../../..');
const read = (rel: string) => fs.readFileSync(path.join(REPO, rel), 'utf8');

describe('classroom sky skin', () => {
  const files: string[] = listCodemodFiles(REPO);

  it('scans the whole classroom file set (guard against a vacuous pass)', () => {
    expect(files.length).toBeGreaterThan(800);
  });

  it('leaves no dark-only colour class the sky codemod would still rewrite', () => {
    const offenders: string[] = [];
    for (const rel of files) {
      const src = read(rel);
      const out = transformSource(src, rel);
      if (out === src) continue;
      const before = src.split('\n');
      out.split('\n').forEach((line, i) => {
        if (line !== before[i]) offenders.push(`${rel}:${i + 1}: ${before[i].trim()}`);
      });
    }
    expect(
      offenders,
      `Run \`node scripts/edu-sky-codemod.mjs\` or use edu-* tokens:\n${offenders.slice(0, 40).join('\n')}`,
    ).toEqual([]);
  });

  it('never puts white ink on a lime, cyan, yellow or pink fill', () => {
    const fill = /(^|\s)bg-neo-(lime|cyan|yellow|pink)(\s|$)/;
    const whiteInk = /(^|\s)text-(white|neo-white|neo-cream)(\/\d+)?(\s|$)/;
    const offenders: string[] = [];
    for (const rel of files) {
      for (const lit of classLiterals(read(rel), rel)) {
        if (fill.test(lit) && whiteInk.test(lit)) offenders.push(`${rel}: ${lit}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('marks every in-scope route root and gives it a light viewport', () => {
    expect(EDU_SKY_LAYOUTS.length).toBeGreaterThan(8);
    for (const rel of EDU_SKY_LAYOUTS) {
      const src = read(rel);
      expect(src, `${rel} must render <EduSkyScope>`).toMatch(/<EduSkyScope>/);
      expect(src, `${rel} must export the sky viewport`).toMatch(
        /export const viewport = EDU_SKY_VIEWPORT/,
      );
    }
  });

  it('never marks a wrapper shared with dark pages', () => {
    for (const rel of [
      'app/layout.tsx',
      'app/[locale]/layout.tsx',
      'app/[locale]/education/layout.tsx',
      'components/teacher/TeacherEducationShell.tsx',
    ]) {
      expect(read(rel), rel).not.toMatch(/EduSkyScope|data-edu-theme/);
    }
  });

  it('defaults every edu token to the dark app and flips them only under the sky scope', () => {
    const css = read('app/edu-sky.css');
    const rootBlock = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(rootBlock).toMatch(/--edu-page:\s*var\(--neo-navy\)/);
    expect(rootBlock).toMatch(/--edu-ink:\s*rgb\(var\(--neo-white\)\)/);
    expect(css).toMatch(/html:has\(\[data-edu-theme='sky'\]\)\s*\{[^}]*--edu-page:\s*#9ed8ff/i);
    expect(css).not.toMatch(/--neo-[a-z-]+\s*:/);
    expect(css).not.toMatch(/!important/);

    const layout = read('app/layout.tsx');
    const globals = layout.indexOf("import './globals.css'");
    const sky = layout.indexOf("import './edu-sky.css'");
    expect(globals).toBeGreaterThanOrEqual(0);
    expect(sky, 'edu-sky.css must load after globals.css').toBeGreaterThan(globals);
  });
});
