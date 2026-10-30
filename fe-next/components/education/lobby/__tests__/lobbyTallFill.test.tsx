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

  it('Given leftover height, Then each cover grows by the space left (never taller than square, the covers are 4:5 portraits), and a short screen keeps its 16:9 / 2:1 cover', () => {
    render(<LobbyModeGrid selected="vocab-quiz" onPick={() => {}} t={(k) => k} />);
    const cover = screen.getAllByTestId('mode-card-cover')[0].closest('[data-accent-decor]')!;
    expect(cover.className).toMatch(/@2xl:min-h-\[min\(calc\(50cqh-[\d.]+rem\),calc\(25cqw-[\d.]+rem\)\)\]/);
    expect(cover.className).toContain('@2xl:aspect-[16/9]');
    expect(cover.className).toContain('@2xl:[@media(max-height:800px)]:aspect-[2/1]');
  });
});
