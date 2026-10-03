import { describe, it, expect } from 'vitest';
import { he } from '@/translations/he.js';

const leaves = (node: unknown, prefix = ''): [string, string][] =>
  node && typeof node === 'object'
    ? Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => leaves(v, prefix ? `${prefix}.${k}` : k))
    : typeof node === 'string'
      ? [[prefix, node]]
      : [];

describe('he: the Teacher Pro plan is named in Hebrew', () => {
  it('no Hebrew string shows the Latin "Teacher Pro" label', () => {
    const offenders = leaves(he).filter(([, v]) => /teacher\s*pro/i.test(v)).map(([k]) => k);
    expect(offenders).toEqual([]);
  });

  it('the plan card and the upgrade eyebrow use the Hebrew name', () => {
    expect(he.teacher.subscription.proPlanName).toBe('פרו למורים');
    expect(he.eg2Pro.tools.eyebrow).toContain('פרו למורים');
  });
});

describe('he help center uses the same Hebrew plan name', () => {
  it('no he help article shows the Latin "Teacher Pro"', async () => {
    const { readFileSync, readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const dir = join(process.cwd(), 'components/education/help/content');
    const offenders = readdirSync(dir)
      .filter((f) => /^he\..*\.ts$/.test(f))
      .filter((f) => /Teacher Pro/.test(readFileSync(join(dir, f), 'utf8')));
    expect(offenders).toEqual([]);
  });
});
