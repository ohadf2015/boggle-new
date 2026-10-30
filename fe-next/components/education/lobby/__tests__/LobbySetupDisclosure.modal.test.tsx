import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { LobbySetupDisclosure } from '../LobbySetupDisclosure';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <LobbySetupDisclosure label="Game options" summary="3 min · ffa" open={open} onToggle={() => setOpen((v) => !v)}>
      <p>round settings</p>
    </LobbySetupDisclosure>
  );
}

describe('LobbySetupDisclosure as a modal', () => {
  it('opens the options in a named dialog, not inline under the mode grid', () => {
    render(<Harness />);
    const trigger = screen.getByTestId('lobby-setup-summary');
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(screen.queryByRole('dialog')).toBeNull();

    fireEvent.click(trigger);
    const dialog = screen.getByRole('dialog', { name: 'Game options' });
    expect(within(dialog).getByTestId('lobby-setup-body')).toHaveTextContent('round settings');
    expect(trigger.parentElement).not.toContainElement(dialog);
  });

  it('closes from the Done button and leaves the summary line visible', () => {
    render(<Harness />);
    fireEvent.click(screen.getByTestId('lobby-setup-summary'));
    fireEvent.click(screen.getByTestId('lobby-setup-done'));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.getByTestId('lobby-setup-line')).toHaveTextContent('3 min · ffa');
  });
});
