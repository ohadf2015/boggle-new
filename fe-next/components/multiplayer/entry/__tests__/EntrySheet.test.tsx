/**
 * Every entry sheet (create, join, all arenas, language, help) paints its panel
 * at the FINAL position on the first frame. A sliding panel is caught mid-flight
 * by anything that looks right after it opens — r4's captures showed the TV
 * create sheet cut to "START BAT", the typed-code join sheet with half a close
 * button, and the phone CTA below the fold — while the same sheet opened by the
 * other path looked fine (pitfall class 3). The juice moves onto the content:
 * transform-only, small offsets that can never push a CTA off screen.
 */
import React from 'react';
import fs from 'node:fs';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

import { MpSheet } from '../../shell/MpSheet';
import { EntrySheet, EntrySheetCta, ENTRY_SHEET_BODY_CLASS } from '../EntrySheet';

function mockDesktop(matches: boolean) {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
}

const SLIDE = /animate-mp-sheet-(up|in)/;

describe('MpSheet entrance', () => {
  it('keeps its slide by default (other pieces render it unchanged)', () => {
    const { unmount } = render(<MpSheet open onClose={() => {}} title="T">b</MpSheet>);
    expect(screen.getByTestId('mp-sheet-panel').className).toContain('animate-mp-sheet-up');
    unmount();
    render(<MpSheet open onClose={() => {}} title="T" side="end">b</MpSheet>);
    expect(screen.getByTestId('mp-sheet-panel').className).toContain('animate-mp-sheet-in');
  });

  it('entrance="static" paints the panel where it rests — no slide on either side', () => {
    const { unmount } = render(<MpSheet open onClose={() => {}} title="T" entrance="static">b</MpSheet>);
    expect(screen.getByTestId('mp-sheet-panel').className).not.toMatch(SLIDE);
    unmount();
    render(<MpSheet open onClose={() => {}} title="T" side="end" entrance="static">b</MpSheet>);
    const panel = screen.getByTestId('mp-sheet-panel');
    expect(panel.className).not.toMatch(SLIDE);
    expect(panel.getAttribute('data-side')).toBe('end');
  });
});

describe('EntrySheet', () => {
  const realMatchMedia = window.matchMedia;
  afterEach(() => {
    window.matchMedia = realMatchMedia;
  });

  it('is a static MpSheet docked to the end from lg up', () => {
    mockDesktop(true);
    render(<EntrySheet open onClose={() => {}} title="New room" testId="create-sheet"><p>row</p></EntrySheet>);
    const panel = screen.getByTestId('mp-sheet-panel');
    expect(panel.getAttribute('data-side')).toBe('end');
    expect(panel.className).not.toMatch(SLIDE);
    expect(screen.getByTestId('create-sheet')).toBeInTheDocument();
  });

  it('is a static bottom sheet on phone', () => {
    mockDesktop(false);
    render(<EntrySheet open onClose={() => {}} title="Join" testId="join-sheet"><p>row</p></EntrySheet>);
    const panel = screen.getByTestId('mp-sheet-panel');
    expect(panel.getAttribute('data-side')).toBe('bottom');
    expect(panel.className).not.toMatch(SLIDE);
  });

  it('wraps the rows in the settle body (the content animates, never the panel)', () => {
    mockDesktop(false);
    render(
      <EntrySheet open onClose={() => {}} title="T">
        <p>one</p>
        <p>two</p>
      </EntrySheet>,
    );
    const body = screen.getByText('one').parentElement!;
    expect(body.className).toContain(ENTRY_SHEET_BODY_CLASS);
    expect(body).toContainElement(screen.getByText('two'));
  });

  it('carries the TV unit into the sheet (a sheet renders outside MpScreen, so --mp-u is its own)', () => {
    mockDesktop(true);
    render(<EntrySheet open onClose={() => {}} title="T"><p>row</p></EntrySheet>);
    const body = screen.getByText('row').parentElement!;
    expect(body.className).toContain('[--mp-u:1]');
    expect(body.className).toContain('tv:[--mp-u:1.5]');
  });

  it('titles carry the sheet\'s icon tile', () => {
    mockDesktop(false);
    const Icon = (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="the-icon" {...props} />;
    render(<EntrySheet open onClose={() => {}} title="New room" icon={Icon} tone="lime"><p>row</p></EntrySheet>);
    const heading = screen.getByRole('heading', { name: 'New room' });
    expect(heading).toContainElement(screen.getByTestId('the-icon'));
    expect(screen.getByTestId('entry-sheet-icon').className).toContain('bg-neo-lime');
  });

  it('a sheet CTA lands last and carries the one glint', () => {
    mockDesktop(false);
    render(
      <EntrySheet open onClose={() => {}} title="T">
        <p>row</p>
        <EntrySheetCta tone="lime" label="Go" onPress={() => {}} testId="go" />
      </EntrySheet>,
    );
    const cta = screen.getByTestId('go').parentElement!;
    expect(cta.hasAttribute('data-entry-cta')).toBe(true);
    expect(within(cta).getByTestId('cta-glint').getAttribute('aria-hidden')).toBe('true');
  });

  it('renders nothing while closed', () => {
    mockDesktop(false);
    render(<EntrySheet open={false} onClose={() => {}} title="T"><p>row</p></EntrySheet>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});

describe('entry sheet motion (entrySheet.css)', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../entrySheet.css'), 'utf8');

  it('animates transform only — no opacity (a mid-fade CTA reads as disabled)', () => {
    const keyframes = css.match(/@keyframes[^{]+\{[\s\S]*?\}\s*\}/g) ?? [];
    expect(keyframes.length).toBeGreaterThan(0);
    for (const kf of keyframes) {
      expect(kf).toContain('transform');
      expect(kf).not.toMatch(/opacity|width|height|top|left|box-shadow/);
    }
  });

  it('staggered rows hold their start frame through the delay (fill-mode backwards — no jump then drop)', () => {
    expect(css).toMatch(/animation:[^;]*\bbackwards\b/);
    expect(css).toMatch(/animation-delay/);
  });

  it('respects prefers-reduced-motion', () => {
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*animation: none/);
  });

  it('the CTA holds the same start frame as the rows (a still before it lands still reads as final)', () => {
    const start = (name: string) => css.match(new RegExp(`@keyframes ${name} \\{\\s*0% \\{([^}]*)\\}`))?.[1].trim();
    expect(start('mp-entry-settle')).toBeTruthy();
    expect(start('mp-entry-slam')).toBe(start('mp-entry-settle'));
  });

  it('the CTA glint sweeps by transform only and is gone under reduced motion', () => {
    const glint = fs.readFileSync(path.resolve(__dirname, '../ctaGlint.css'), 'utf8');
    for (const kf of glint.match(/@keyframes[^{]+\{[\s\S]*?\}\s*\}/g) ?? []) {
      expect(kf).toContain('transform');
      expect(kf).not.toMatch(/opacity|width|height|top|left|box-shadow/);
    }
    expect(glint).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*\.mp-cta-glint \{ display: none; \}/);
  });
});

describe('one entrance for every entry sheet (no asymmetric path)', () => {
  const root = path.resolve(__dirname, '../..');
  const owned = [
    'entry/CreateSheet.tsx',
    'entry/JoinSheet.tsx',
    'entry/ArenaList.tsx',
    'entry/EntryHeader.tsx',
    'RoomListView.tsx',
    'MultiplayerFlow.tsx',
  ];

  it.each(owned)('%s opens sheets only through EntrySheet', (file) => {
    const src = fs.readFileSync(path.join(root, file), 'utf8');
    expect(src).not.toMatch(/<MpSheet\b/);
  });
});
