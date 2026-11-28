import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClassroomLobbyShell } from '../ClassroomLobbyShell';
import { LobbyModeGrid } from '../LobbyModeGrid';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }) }));

describe('Pick-a-game on a tall screen: the tiles grow into the leftover height', () => {
  it('Given the scroll region, Then it is a named size container the tiles can measure', () => {
    render(<ClassroomLobbyShell pinned={null}>x</ClassroomLobbyShell>);
    const scroll = screen.getByTestId('lobby-scroll');
    expect(scroll.className).toContain('[container:lobby-fill/size]');
    expect(scroll.className).toContain('overflow-y-auto');
  });

  it('Given any lobby height, Then the colour header keeps a fixed height, with no viewport-height rule a TV zoom would misread', () => {
    render(<LobbyModeGrid selected="vocab-quiz" onPick={() => {}} t={(k) => k} />);
    const cover = screen.getAllByTestId('mode-card-cover')[0].closest('[data-accent-decor]')!;
    expect(cover.className).not.toMatch(/@media|cqh|aspect-\[/);
  });
});
