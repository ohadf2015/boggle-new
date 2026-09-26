/**
 * The MP entry hides the global site chrome (header, bottom nav) — DESIGN §b
 * "Chrome". NavigationContext is client state, so flipping `isInGame` alone
 * would SSR the entry WITH chrome and drop it after hydration (a layout shift on
 * the landing). The entry therefore renders a marker in its SSR HTML and ships a
 * stylesheet keyed to it, so the chrome is hidden from first paint.
 */
import React from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../MultiplayerFlow', () => ({
  __esModule: true,
  default: (p: { header?: React.ReactNode }) => (
    <div data-testid="flow">{p.header}</div>
  ),
}));
vi.mock('../EntryHeader', () => ({ EntryHeader: () => <div data-testid="entry-header" /> }));

import EntryScreen from '../EntryScreen';
import { ENTRY_HIDES_GLOBAL_CHROME, ENTRY_CHROME_ATTR } from '../entryChrome';

const props = {
  handleJoin: vi.fn(), refreshRooms: vi.fn(), activeRooms: [], roomsLoading: false, isJoining: false,
  isAuthenticated: false, displayName: '', defaultLanguage: 'en' as const,
  setGameCode: vi.fn(), setUsername: vi.fn(), setRoomName: vi.fn(), setHostUsername: vi.fn(),
};

describe('EntryScreen chrome', () => {
  it('hides the global chrome on the entry (PageClient reads this flag)', () => {
    expect(ENTRY_HIDES_GLOBAL_CHROME).toBe(true);
  });

  it('renders the first-paint chrome marker and its own header on the public entry', () => {
    const { container } = render(<EntryScreen {...props} />);
    expect(container.querySelector(`[${ENTRY_CHROME_ATTR}="off"]`)).not.toBeNull();
    expect(screen.getByTestId('entry-header')).toBeInTheDocument();
  });

  it('classroom entry keeps the education chrome: no marker, no arcade header', () => {
    const { container } = render(<EntryScreen {...props} isClassroomMode />);
    expect(container.querySelector(`[${ENTRY_CHROME_ATTR}]`)).toBeNull();
    expect(screen.queryByTestId('entry-header')).toBeNull();
  });

  it('the stylesheet hides header, header spacer and bottom nav, keyed to the marker', () => {
    const css = readFileSync(join(__dirname, '..', 'entryChrome.css'), 'utf8');
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(rules).toContain(`[${ENTRY_CHROME_ATTR}='off']`);
    expect(rules).toMatch(/header\.fixed/);
    expect(rules).toMatch(/\[data-global-bottom-nav\]/);
    expect(rules).toMatch(/\.h-header/);
    expect(rules).toMatch(/display:\s*none\s*!important/);
  });
});
