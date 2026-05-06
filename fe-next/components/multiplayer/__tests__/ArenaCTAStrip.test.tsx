import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

const tMock = vi.fn((key: string) => key);
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: tMock, dir: 'ltr', language: 'en' }),
}));

vi.mock('@/components/ui/Loader', () => ({
  Loader: () => <span data-testid="loader" />,
}));

import ArenaCTAStrip from '../ArenaCTAStrip';

describe('ArenaCTAStrip', () => {
  beforeEach(() => {
    tMock.mockClear();
  });
  afterEach(() => {
    cleanup();
  });

  it('renders both Quick Start and Create Private Battle buttons', () => {
    render(<ArenaCTAStrip onQuickPlay={vi.fn()} onCreateRoom={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'multiplayerFlow.roomList.quickStart' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'multiplayerFlow.roomList.createPrivateBattle' })).toBeInTheDocument();
  });

  it('invokes onQuickPlay when Quick Start clicked', () => {
    const onQuickPlay = vi.fn();
    render(<ArenaCTAStrip onQuickPlay={onQuickPlay} onCreateRoom={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'multiplayerFlow.roomList.quickStart' }));
    expect(onQuickPlay).toHaveBeenCalledTimes(1);
  });

  it('invokes onCreateRoom when Create Private Battle clicked', () => {
    const onCreateRoom = vi.fn();
    render(<ArenaCTAStrip onQuickPlay={vi.fn()} onCreateRoom={onCreateRoom} />);
    fireEvent.click(screen.getByRole('button', { name: 'multiplayerFlow.roomList.createPrivateBattle' }));
    expect(onCreateRoom).toHaveBeenCalledTimes(1);
  });

  it('disables Quick Start and shows Loader while loading', () => {
    render(<ArenaCTAStrip onQuickPlay={vi.fn()} onCreateRoom={vi.fn()} isQuickPlayLoading />);
    const cta = screen.getByRole('button', { name: 'multiplayerFlow.roomList.quickStart' });
    expect(cta).toBeDisabled();
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('Create Private Battle is never disabled by Quick Start loading', () => {
    render(<ArenaCTAStrip onQuickPlay={vi.fn()} onCreateRoom={vi.fn()} isQuickPlayLoading />);
    expect(screen.getByRole('button', { name: 'multiplayerFlow.roomList.createPrivateBattle' })).not.toBeDisabled();
  });

  it('does not invoke onQuickPlay when disabled', () => {
    const onQuickPlay = vi.fn();
    render(<ArenaCTAStrip onQuickPlay={onQuickPlay} onCreateRoom={vi.fn()} isQuickPlayLoading />);
    fireEvent.click(screen.getByRole('button', { name: 'multiplayerFlow.roomList.quickStart' }));
    expect(onQuickPlay).not.toHaveBeenCalled();
  });
});
