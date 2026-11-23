import { createRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { V2Dock } from '../V2Dock';

describe('V2Dock backspace hold hint', () => {
  it('Given a word being spelled, When backspace is tapped three times fast, Then "hold to clear" appears', () => {
    const onBackspace = vi.fn();
    render(
      <V2Dock
        t={(k) => k}
        dockRef={createRef<HTMLDivElement>()}
        wide={false}
        dir="ltr"
        swinging={false}
        composing
        rejected={null}
        dictError={false}
        scrambles={3}
        wheel={['A', 'B', 'C', 'D', 'E', 'F']}
        selected={[0, 1, 2, 3]}
        word="ABCD"
        valid={false}
        reducedMotion
        canPutBack={false}
        onScramble={vi.fn()}
        onSelectTile={vi.fn()}
        onDeselectTile={vi.fn()}
        onSubmit={vi.fn()}
        onDrop={vi.fn()}
        onPutBack={vi.fn()}
        onBackspace={onBackspace}
        onClearWord={vi.fn()}
      />,
    );
    const key = screen.getByRole('button', { name: 'wordTower.hud.backspace' });

    expect(screen.queryByText('common.holdToClear')).toBeNull();
    fireEvent.click(key);
    fireEvent.click(key);
    fireEvent.click(key);

    expect(onBackspace).toHaveBeenCalledTimes(3);
    expect(screen.getByText('common.holdToClear')).toBeTruthy();
  });
});
