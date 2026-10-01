import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it, expect } from 'vitest';

const ROOT = resolve(__dirname, '../../../..');
const CLEARANCE = 'bottom-[var(--cookie-consent-height,0px)]';

describe('full-viewport student surfaces stop above the cookie bar', () => {
  it.each(['components/student/academy/AcademyHub.tsx', 'components/education/join/JoinFlow.tsx'])('%s', (file) => {
    const source = readFileSync(resolve(ROOT, file), 'utf8');
    expect(source).toContain(CLEARANCE);
  });
});
