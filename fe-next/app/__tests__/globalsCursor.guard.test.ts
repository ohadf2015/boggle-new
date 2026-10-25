import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, it, expect } from 'vitest';

// Tailwind v4 preflight resets <button> to cursor:default, so interactive
// controls in every modal lose their pointer unless globals.css restores it.
describe('globals.css interactive cursor', () => {
  const css = readFileSync(join(__dirname, '..', 'globals.css'), 'utf8');

  it('restores a pointer cursor on enabled buttons and role=button/tab elements', () => {
    expect(css).toMatch(/button:not\(:disabled\)[\s\S]*?\{[^}]*cursor:\s*pointer/);
    expect(css).toMatch(/\[role=['"]?button['"]?\]:not\(\[aria-disabled=['"]?true['"]?\]\)/);
    expect(css).toMatch(/\[role=['"]?tab['"]?\]/);
  });

  it('shows not-allowed on disabled controls', () => {
    expect(css).toMatch(/button:disabled[\s\S]*?\{[^}]*cursor:\s*not-allowed/);
  });
});
