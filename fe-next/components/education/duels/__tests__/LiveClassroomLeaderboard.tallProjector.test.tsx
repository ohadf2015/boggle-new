import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LiveClassroomLeaderboard from '../LiveClassroomLeaderboard';

vi.mock('@/hooks/useModeSting', () => ({ useModeSting: () => ({ playModeSound: vi.fn() }) }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, dir: 'ltr' }) }));

describe('LiveClassroomLeaderboard — projector rows on a tall wall', () => {
  it('Given a tall projector, Then names, ranks and scores step up a size for the back row', () => {
    render(<LiveClassroomLeaderboard variant="projector" leaderboard={[{ username: 'Ada', score: 3 }]} />);
    expect(screen.getByText('Ada').className).toContain('lg:[@media(min-height:851px)]:text-4xl');
    expect(screen.getByText('3').className).toContain('lg:[@media(min-height:851px)]:text-5xl');
    expect(screen.getAllByTestId('live-board-rank')[0].className).toContain('lg:[@media(min-height:851px)]:h-14');
  });
});
