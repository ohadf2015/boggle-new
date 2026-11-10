import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

import { ClassroomBattleSettings } from '../ClassroomBattleSettings';

const base = {
  playStyle: 'ffa' as const,
  teamCount: 2,
  onPlayStyleChange: vi.fn(),
  onTeamCountChange: vi.fn(),
  onAccessibilityChange: vi.fn(),
};

describe('ClassroomBattleSettings rivalry toggle', () => {
  it('Given no saved rivalry value, When rendered, Then the toggle reads on', () => {
    render(<ClassroomBattleSettings {...base} onRivalryChange={vi.fn()} />);
    expect(screen.getByTestId('battle-rivalry')).toHaveAttribute('aria-pressed', 'true');
  });

  it('Given rivalry on, When the teacher taps it, Then it reports off', () => {
    const onRivalryChange = vi.fn();
    render(<ClassroomBattleSettings {...base} rivalry onRivalryChange={onRivalryChange} />);
    fireEvent.click(screen.getByTestId('battle-rivalry'));
    expect(onRivalryChange).toHaveBeenCalledWith(false);
  });

  it('Given rivalry off, When rendered, Then the toggle reads off', () => {
    render(<ClassroomBattleSettings {...base} rivalry={false} onRivalryChange={vi.fn()} />);
    expect(screen.getByTestId('battle-rivalry')).toHaveAttribute('aria-pressed', 'false');
  });

  it('Given a parent that does not wire rivalry, When rendered, Then no dead toggle shows', () => {
    render(<ClassroomBattleSettings {...base} />);
    expect(screen.queryByTestId('battle-rivalry')).toBeNull();
  });
});
