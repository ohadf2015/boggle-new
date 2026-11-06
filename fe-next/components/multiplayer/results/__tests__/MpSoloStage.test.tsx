import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MpSoloStage } from '../MpSoloStage';

vi.mock('@/components/Avatar', () => ({ default: ({ mood }: { mood?: string }) => <div data-testid="avatar" data-mood={mood} /> }));
vi.mock('@/hooks/useReducedMotion', () => ({ default: () => true }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'u1' }, profile: null }) }));

describe('MpSoloStage', () => {
  it('puts the lone player on the stage, cheering when they scored', () => {
    render(<MpSoloStage scored />);
    expect(screen.getByTestId('mp-solo-stage')).toBeTruthy();
    expect(screen.getByTestId('avatar').dataset.mood).toBe('win');
  });

  it('stays calm on a scoreless round', () => {
    render(<MpSoloStage scored={false} />);
    expect(screen.getByTestId('avatar').dataset.mood).toBe('idle');
  });
});
