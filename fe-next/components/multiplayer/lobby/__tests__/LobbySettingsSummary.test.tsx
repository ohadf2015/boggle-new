import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { LobbySettingsSummary } from '../LobbySettingsSummary';

const t = (key: string) => key;

describe('LobbySettingsSummary — the round at a glance', () => {
  it('reads out round length, board size and min word length', () => {
    render(<LobbySettingsSummary timerValue={1.5} difficulty="HARD" minWordLength={3} t={t} />);
    const row = screen.getByTestId('lobby-settings-summary');
    expect(row).toHaveTextContent('1:30');
    expect(row).toHaveTextContent('7×7');
    expect(row).toHaveTextContent('3+');
  });

  it('whole minutes read as "N min"', () => {
    render(<LobbySettingsSummary timerValue={2} difficulty="EASY" t={t} />);
    expect(screen.getByTestId('lobby-settings-summary')).toHaveTextContent('2hostView.min');
    expect(screen.getByTestId('lobby-settings-summary')).toHaveTextContent('5×5');
  });

  it('with onPress it is one button that opens the settings (host); without, plain text (TV)', () => {
    const onPress = vi.fn();
    const { rerender } = render(<LobbySettingsSummary timerValue={1} difficulty="MEDIUM" t={t} onPress={onPress} />);
    fireEvent.click(screen.getByRole('button', { name: /mpUi.lobby.editSettings/ }));
    expect(onPress).toHaveBeenCalledTimes(1);
    rerender(<LobbySettingsSummary timerValue={1} difficulty="MEDIUM" t={t} />);
    expect(screen.queryByRole('button')).toBeNull();
  });
});
