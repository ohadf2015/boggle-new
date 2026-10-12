/**
 * One primary action on the launch screen. The stage title used to be a yellow
 * bordered slab that read as a second "start" button beside GO LIVE; the top of
 * the screen is now purely informational and GO LIVE is the only call to action.
 */
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'he', dir: 'rtl' }),
}));

import { ClassroomLobbyShell } from '../ClassroomLobbyShell';

describe('ClassroomLobbyShell — a single primary action', () => {
  it('Given the launch screen, When it renders, Then the title is for screen readers only, not a button-like slab', () => {
    render(<ClassroomLobbyShell pinned={<div />}>body</ClassroomLobbyShell>);
    const title = screen.getByTestId('lobby-stage-title');
    expect(title.tagName).toBe('H1');
    expect(title.className).toMatch(/(^|\s)sr-only(\s|$)/);
    expect(title.className).not.toContain('bg-neo-yellow');
  });

  it('Given the launch screen, When it renders, Then the visible top line is the informational subtitle', () => {
    render(<ClassroomLobbyShell pinned={<div />}>body</ClassroomLobbyShell>);
    const sub = screen.getByTestId('lobby-stage-subtitle');
    expect(sub.textContent?.length).toBeGreaterThan(3);
    expect(sub.textContent).not.toMatch(/academy\./);
    expect(sub.closest('button')).toBeNull();
  });

  it('Given a Hebrew teacher, When the shell renders, Then it carries dir="rtl"', () => {
    render(<ClassroomLobbyShell pinned={<div />}>body</ClassroomLobbyShell>);
    expect(screen.getByTestId('classroom-lobby-shell')).toHaveAttribute('dir', 'rtl');
  });
});
