import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LobbySetupPanel } from '../LobbySetupPanel';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

function renderPanel(over: Partial<React.ComponentProps<typeof LobbySetupPanel>> = {}) {
  const props = {
    playStyle: 'ffa' as const,
    teamCount: 2,
    accessibility: { audioCues: true },
    onPlayStyleChange: vi.fn(),
    onTeamCountChange: vi.fn(),
    onAccessibilityChange: vi.fn(),
    rivalry: true,
    onRivalryChange: vi.fn(),
    ...over,
  };
  render(<LobbySetupPanel {...props} />);
  return props;
}

describe('LobbySetupPanel switches', () => {
  it('Given rival duels are on, Then they read as a checked switch and tapping turns them off', () => {
    const props = renderPanel();
    const rival = screen.getByTestId('battle-rivalry');
    expect(rival).toHaveAttribute('role', 'switch');
    expect(rival).toHaveAttribute('aria-checked', 'true');
    fireEvent.click(rival);
    expect(props.onRivalryChange).toHaveBeenCalledWith(false);
  });

  it('Given support options, Then each is a switch that flips only its own flag', () => {
    const props = renderPanel();
    expect(screen.getByTestId('support-audioCues')).toHaveAttribute('aria-checked', 'true');
    const large = screen.getByTestId('support-largeText');
    expect(large).toHaveAttribute('role', 'switch');
    expect(large).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(large);
    expect(props.onAccessibilityChange).toHaveBeenCalledWith({ audioCues: true, largeText: true });
  });

  it('Given teams, Then the team count shows; given everyone vs everyone, Then it hides', () => {
    renderPanel({ playStyle: 'teams' });
    expect(screen.getByTestId('teamcount-3')).toBeInTheDocument();
  });

  it('Given the sheet, Then presets are not repeated inside it', () => {
    renderPanel();
    expect(screen.queryByTestId('preset-standard')).toBeNull();
    expect(screen.queryByTestId('teamcount-3')).toBeNull();
  });
});
