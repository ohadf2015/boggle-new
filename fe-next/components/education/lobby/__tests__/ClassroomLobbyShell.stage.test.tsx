import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

import { ClassroomLobbyShell } from '../ClassroomLobbyShell';
import { LaunchStageBackdrop } from '../LaunchStageBackdrop';

describe('ClassroomLobbyShell — the launch stage', () => {
  it('stands the picker on the arena art, decorative and painted from frame one', () => {
    render(<LaunchStageBackdrop />);
    const art = screen.getByTestId('lobby-arena-art');
    expect(art.getAttribute('src')).toContain('/images/education/arena-lobby-bg.webp');
    expect(art).toHaveAttribute('alt', '');
    expect(art.className).not.toContain('opacity-0');
  });

  it('titles the screen in words, never a raw key', () => {
    render(<ClassroomLobbyShell pinned={<div />}>body</ClassroomLobbyShell>);
    const title = screen.getByTestId('lobby-stage-title');
    expect(title.textContent).not.toMatch(/academy\./);
    expect(title.textContent?.length).toBeGreaterThan(3);
  });

  it('still locks the shell and scrolls exactly one region', () => {
    render(<ClassroomLobbyShell pinned={<div />}>body</ClassroomLobbyShell>);
    expect(screen.getByTestId('classroom-lobby-shell').className).toContain('overflow-hidden');
    expect(screen.getByTestId('lobby-scroll').className).toContain('overflow-y-auto');
  });
});
