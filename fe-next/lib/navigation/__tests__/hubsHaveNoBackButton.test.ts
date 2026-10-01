import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

/**
 * On a hub root (/teacher, /student) educationBackHref resolves to the hub
 * itself, so a back button there would be a no-op. Hubs must not render one.
 */
const ROOT = resolve(__dirname, '../../..');
const HUBS = ['components/teacher/TeacherDashboard.tsx', 'app/[locale]/student/PageClient.tsx'];

describe('education hubs render no header back button', () => {
  it.each(HUBS)('%s', (file) => {
    const src = readFileSync(resolve(ROOT, file), 'utf8');
    const headers = src.match(/<EducationHeader\b[^>]*\/>/g) ?? [];
    expect(headers.length).toBeGreaterThan(0);
    for (const h of headers) expect(h).not.toMatch(/showBackButton/);
  });
});
