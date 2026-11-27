import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ClassroomBoardProvider, CLASSROOM_BOARD_FRAME } from '@/components/education/live/classroomBoard';
import { BlastBoardTray } from '../BlastBoardTray';

describe('BlastBoardTray classroom skin', () => {
  it('arcade: the navy tray keeps its exact classes', () => {
    render(<BlastBoardTray chainLevel={0} comboFlashTier={0} animateGlow={false}><i /></BlastBoardTray>);
    expect(screen.getByTestId('blast-board-tray').className).toMatchSnapshot();
  });

  it('classroom: the tray turns cream like the letter board frame', () => {
    render(<ClassroomBoardProvider value><BlastBoardTray chainLevel={0} comboFlashTier={0} animateGlow={false}><i /></BlastBoardTray></ClassroomBoardProvider>);
    expect(screen.getByTestId('blast-board-tray').className).toContain(CLASSROOM_BOARD_FRAME);
  });
});
