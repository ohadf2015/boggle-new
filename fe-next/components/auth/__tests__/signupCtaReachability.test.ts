/**
 * t_375bffc3 — signup CTA reachability contracts.
 * GSI iframe clicks die when ancestors transform / overflow-hidden / lose z-order.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const authDir = path.resolve(__dirname, '..');

function read(rel: string) {
  return fs.readFileSync(path.join(authDir, rel), 'utf8');
}

describe('signup CTA reachability (t_375bffc3)', () => {
  it('GoogleSignInButton chrome uses overflow-visible (not overflow-hidden)', () => {
    const src = read('GoogleSignInButton.tsx');
    expect(src).toMatch(/data-testid="gsi-frame"/);
    expect(src).toMatch(/overflow-visible/);
    expect(src).not.toMatch(/data-testid="gsi-frame"[^>]*overflow-hidden/);
  });

  it('MultiplayerSignupSheet sits above Dialog z-90 and clears transform after settle', () => {
    const src = read('MultiplayerSignupSheet.tsx');
    expect(src).toMatch(/z-\[120\]/);
    expect(src).toMatch(/overflow-visible/);
    expect(src).toMatch(/transform:\s*['"]none['"]/);
    expect(src).toMatch(/GsiClientPreloader/);
    expect(src).not.toMatch(/fixed inset-x-0 z-50/);
  });

  it('FirstWin soft-sheet clears transform and keeps overflow-visible', () => {
    const src = read('FirstWinSignupModal.tsx');
    expect(src).toMatch(/z-\[120\]/);
    expect(src).toMatch(/overflow-visible/);
    expect(src).toMatch(/transform:\s*['"]none['"]/);
    expect(src).toMatch(/GsiClientPreloader/);
  });

  it('SignupPromptHost preloads GSI for guests before the sheet opens', () => {
    const src = read('SignupPromptHost.tsx');
    expect(src).toMatch(/GsiClientPreloader/);
    expect(src).toMatch(/!isAuthenticated/);
  });
});
