import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// New emails are built on lib/email/kit/neoEmail; this folder holds the retired react-email format.
const RETIRED = ['androidBetaLaunch.tsx', 'androidReleaseLaunch.strings.ts', 'androidReleaseLaunch.tsx', 'gameModeAnnouncement.tsx', 'magic-link.html', 'static'];

describe('fe-next/emails is closed to new templates', () => {
  it('holds only the retired files', () => {
    const files = readdirSync(join(__dirname, '..', '..', '..', 'emails'));
    expect(files.filter((f) => !RETIRED.includes(f))).toEqual([]);
  });
});
