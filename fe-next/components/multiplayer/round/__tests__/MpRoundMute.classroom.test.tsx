import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MpRoundMute } from '../MpRoundMute';
import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';

vi.mock('@/contexts/NavigationContext', () => ({ useRegisterHeaderAudioControl: vi.fn() }));
vi.mock('@/hooks/useMasterMute', () => ({ useMasterMute: () => ({ allMuted: false, toggle: vi.fn(), label: 'mute', title: 'mute' }) }));

describe('MpRoundMute classroom skin', () => {
  it('given the arcade round, then mute stays navy', () => {
    render(<MpRoundMute />);
    expect(screen.getByTestId('mp-round-mute').className).toContain('bg-neo-navy-light text-neo-white');
  });

  it('given a classroom round, then mute is a cream outlined button with page ink', () => {
    render(<ClassroomBoardProvider value><MpRoundMute /></ClassroomBoardProvider>);
    const btn = screen.getByTestId('mp-round-mute');
    expect(btn).toHaveClass('bg-edu-surface', 'text-edu-ink', 'border-neo-black');
    expect(btn.className).not.toContain('bg-neo-navy');
  });
});
