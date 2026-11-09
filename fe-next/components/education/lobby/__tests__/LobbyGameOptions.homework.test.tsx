/**
 * "Send list as homework" is rare (6 of 44 class-making teachers ever assigned
 * homework), so it moved off the main row and into the one Game options dialog.
 */
import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { LobbyGameOptions } from '../LobbyGameOptions';
import type { LobbyRoundOptions } from '../useLobbyRoundOptions';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));
vi.mock('../LobbySetupPanel', () => ({ LobbySetupPanel: () => null }));
vi.mock('../LobbyPressureDials', () => ({ LobbyPressureDials: () => <div data-testid="pressure-dials" /> }));
vi.mock('../LobbyRoundSettings', () => ({ LobbyRoundSettings: () => null }));
vi.mock('../LobbyLateJoinToggle', () => ({ LobbyLateJoinToggle: () => null }));
vi.mock('../LobbyEconomyToggles', () => ({ LobbyEconomyToggles: () => null }));

const opts = { playStyle: 'ffa', allowLateJoin: true } as unknown as LobbyRoundOptions;

function renderOptions(homework?: React.ReactNode) {
  render(
    <LobbyGameOptions
      opts={opts}
      roundMinutes={3}
      gameMode="classic"
      allPlayableWords={[]}
      lessonWords={[]}
      homework={homework}
    />,
  );
}

describe('LobbyGameOptions homework section', () => {
  it('Given a homework action, Then it sits inside the Game options dialog under its own heading, not on the page', () => {
    renderOptions(<button type="button" data-testid="lobby-warmup-send">send</button>);
    expect(screen.queryByTestId('lobby-warmup-send')).toBeNull();

    fireEvent.click(screen.getByTestId('lobby-setup-summary'));
    const section = within(screen.getByTestId('lobby-setup-body')).getByTestId('lobby-options-homework');
    expect(within(section).getByRole('heading', { name: 'eduShell.host.homeworkTitle' })).toBeInTheDocument();
    expect(section).toHaveTextContent('eduShell.host.homeworkHint');
    expect(within(section).getByTestId('lobby-warmup-send')).toBeInTheDocument();
  });

  it('Given no homework action (a ready-made lesson run), Then the dialog has no homework section', () => {
    renderOptions();
    fireEvent.click(screen.getByTestId('lobby-setup-summary'));
    expect(screen.queryByTestId('lobby-options-homework')).toBeNull();
  });

  it('Given the options sheet, Then the Pro dials sit together under one Pro options heading', () => {
    renderOptions();
    fireEvent.click(screen.getByTestId('lobby-setup-summary'));
    const group = within(screen.getByTestId('lobby-setup-body')).getByTestId('lobby-options-pro');
    expect(within(group).getByRole('heading', { name: 'eduShell.host.proOptions' })).toBeInTheDocument();
    expect(within(group).getByTestId('pressure-dials')).toBeInTheDocument();
  });
});
