import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// PageClient is an app shell no unit test can render (see educationHeaderBackHref.test.ts).
const source = readFileSync(join(__dirname, '..', 'PageClient.tsx'), 'utf8');

describe('classroom host live round owns the screen', () => {
  it('hides the site header while the host round is live (the host never sets the store gameActive)', () => {
    const call = source.match(/hideClassroomChrome\(\{[^}]*\}\)/);
    expect(call).not.toBeNull();
    expect(call![0]).toMatch(/teacherStrip\.visible/);
  });
});
