import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BlastBoardTray } from '../BlastBoardTray';

describe('BlastBoardTray: board centred in its column, word chip right under it', () => {
  it('centres the tray vertically on every screen (no top anchor leaving an empty band below)', () => {
    const { container } = render(<BlastBoardTray chainLevel={0} comboFlashTier={0} animateGlow={false}><i /></BlastBoardTray>);
    const slot = container.firstElementChild as HTMLElement;
    expect(slot.className).toContain('justify-center');
    expect(slot.className).toContain('flex-col');
    expect(slot.className).not.toContain('items-start');
  });

  it('renders the footer (word chip) as the next thing under the tray', () => {
    render(<BlastBoardTray chainLevel={0} comboFlashTier={0} animateGlow={false} footer={<p data-testid="foot" />}><i /></BlastBoardTray>);
    expect(screen.getByTestId('blast-board-tray').nextElementSibling).toBe(screen.getByTestId('foot'));
  });
});
