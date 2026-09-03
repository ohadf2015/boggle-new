import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PartySetupScreen } from '../PartySetup';

function t(key: string, params?: Record<string, string | number>): string {
  const template = key === 'passAndPlay.playerNameDefault' ? 'Player {n}' : key;
  if (params) {
    return Object.entries(params).reduce((s, [k, v]) => s.replace(`{${k}}`, String(v)), template);
  }
  return template;
}

describe('PartySetupScreen', () => {
  it('starts a valid 2-player game', () => {
    const onStart = vi.fn();
    render(
      <PartySetupScreen
        t={t}
        language="en"
        saved={false}
        onStart={onStart}
        onResume={vi.fn()}
        onDiscard={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'passAndPlay.start' }));
    expect(onStart).toHaveBeenCalledTimes(1);
    const setup = onStart.mock.calls[0][0];
    expect(setup.players).toHaveLength(2);
    expect(setup.language).toBe('en');
  });

  it('offers resume when a saved game exists', () => {
    const onResume = vi.fn();
    render(
      <PartySetupScreen
        t={t}
        language="en"
        saved
        onStart={vi.fn()}
        onResume={onResume}
        onDiscard={vi.fn()}
      />,
    );
    expect(screen.getByText('passAndPlay.resumePrompt')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'passAndPlay.resume' }));
    expect(onResume).toHaveBeenCalled();
  });
});
