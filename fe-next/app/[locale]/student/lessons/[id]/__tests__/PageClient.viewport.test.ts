import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(__dirname, '../PageClient.tsx'), 'utf8');

describe('student lesson PageClient — active-drill viewport', () => {
  it('wraps an active drill in a fixed-viewport flex column', () => {
    expect(source).toMatch(/h-dvh flex flex-col overflow-hidden/);
    expect(source).toMatch(/flex-1 min-h-0 overflow-hidden/);
    expect(source).toMatch(/shrink-0/);
  });

  it('does not pin the XP header with a fixed overlay plus pt-16 spacer', () => {
    expect(source).not.toMatch(/fixed top-0 left-0 right-0 z-50/);
    expect(source).not.toMatch(/className=\{cn\('pt-16'/);
  });
});
