import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ConnectionsKeyboard from '../ConnectionsKeyboard';
import { getKeyboardRows } from '@/lib/connections/keyboard';

function renderKeyboard(props: Partial<React.ComponentProps<typeof ConnectionsKeyboard>> = {}) {
  return render(
    <ConnectionsKeyboard
      rows={getKeyboardRows('en')}
      onLetter={vi.fn()}
      onBackspace={vi.fn()}
      onSubmit={vi.fn()}
      backspaceLabel="Delete letter"
      submitLabel="Check"
      canSubmit
      {...props}
    />,
  );
}

describe('ConnectionsKeyboard on desktop', () => {
  it('presses the on-screen key a physical key just typed', () => {
    renderKeyboard({ pressedKey: 'G' });
    expect(screen.getByRole('button', { name: 'G' })).toHaveAttribute('data-pressed', 'true');
    expect(screen.getByRole('button', { name: 'H' })).not.toHaveAttribute('data-pressed');
  });

  it('presses the submit key on a physical Enter', () => {
    renderKeyboard({ pressedKey: 'Enter' });
    expect(screen.getByRole('button', { name: 'Check' })).toHaveAttribute('data-pressed', 'true');
  });

  it('lights the submit key once every slot is filled', () => {
    renderKeyboard({ ready: true });
    expect(screen.getByRole('button', { name: 'Check' })).toHaveAttribute('data-ready', 'true');
  });

  it('tells desktop players they can type, with Enter to check', () => {
    renderKeyboard({ typeHint: 'Type with your keyboard' });
    const hint = screen.getByTestId('connections-type-hint');
    expect(hint).toHaveTextContent('Type with your keyboard');
    expect(hint).toHaveTextContent('Enter');
    expect(hint).toHaveTextContent('Check');
  });
});
