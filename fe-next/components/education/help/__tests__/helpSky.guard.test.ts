import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

describe('help centre on the sky skin', () => {
  it('Given the help home, Then its hero band is the sky page, not a cream halftone slab', () => {
    const src = fs.readFileSync(path.resolve(__dirname, '../HelpHome.tsx'), 'utf8');
    const hero = src.match(/<section className="([^"]*border-b-4[^"]*)"/)?.[1] ?? '';
    expect(hero).toContain('bg-edu-page');
    expect(hero).not.toContain('texture-halftone');
  });
});
