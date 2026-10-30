import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { ClassroomLobbyShell } from '../ClassroomLobbyShell';

describe('ClassroomLobbyShell — the launch stage', () => {
  it('paints a solid navy stage with no art layer behind the lobby text', () => {
    render(<ClassroomLobbyShell pinned={<div />} aside={<div />}>body</ClassroomLobbyShell>);
    const shell = screen.getByTestId('classroom-lobby-shell');
    expect(shell.className).toContain('bg-neo-navy');
    expect(shell.querySelector('img')).toBeNull();
    expect(screen.queryByTestId('lobby-arena-art')).toBeNull();
  });

  it('keeps the subtitle a plain line of text, not a pill', () => {
    render(<ClassroomLobbyShell pinned={<div />}>body</ClassroomLobbyShell>);
    const sub = screen.getByTestId('lobby-stage-subtitle');
    expect(sub.className).not.toMatch(/rounded-full|(^|\s)bg-/);
  });

  it('titles the screen in words, never a raw key', () => {
    render(<ClassroomLobbyShell pinned={<div />}>body</ClassroomLobbyShell>);
    const title = screen.getByTestId('lobby-stage-title');
    expect(title.textContent).not.toMatch(/academy\./);
    expect(title.textContent?.length).toBeGreaterThan(3);
  });

  it('sizes its columns from its own width, so a preview frame or the TV zoom lays out like the page', () => {
    render(<ClassroomLobbyShell pinned={<div />} aside={<div />}>body</ClassroomLobbyShell>);
    expect(screen.getByTestId('classroom-lobby-shell').className).toContain('@container/lobby');
    expect(screen.getByTestId('lobby-columns').className).toContain('@4xl/lobby:grid');
    expect(screen.getByTestId('lobby-columns').className).not.toMatch(/(^|\s)lg:/);
  });

  it('still locks the shell and scrolls exactly one region', () => {
    render(<ClassroomLobbyShell pinned={<div />}>body</ClassroomLobbyShell>);
    expect(screen.getByTestId('classroom-lobby-shell').className).toContain('overflow-hidden');
    expect(screen.getByTestId('lobby-scroll').className).toContain('overflow-y-auto');
  });

  it('puts the ready panel beside the one scroller, outside it, and never scrolls it', () => {
    render(<ClassroomLobbyShell pinned={<div />} aside={<div data-testid="ready" />}>body</ClassroomLobbyShell>);
    expect(screen.getByTestId('lobby-scroll')).not.toContainElement(screen.getByTestId('ready'));
    expect(screen.getByTestId('lobby-aside').className).not.toContain('hidden');
    expect(screen.getByTestId('lobby-aside').className).not.toContain('overflow-y-auto');
  });
});
