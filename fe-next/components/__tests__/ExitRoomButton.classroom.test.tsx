import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ExitRoomButton from '../ExitRoomButton';
import { ClassroomBoardProvider } from '@/components/education/live/classroomBoard';

describe('ExitRoomButton in a classroom round', () => {
  it('keeps the caller\'s test id and attributes, and a 44px hit area around the 40px button', () => {
    render(<ClassroomBoardProvider value><ExitRoomButton onClick={vi.fn()} label="Quit" data-testid="blast-quit-btn" /></ClassroomBoardProvider>);
    const button = screen.getByTestId('blast-quit-btn');
    expect(button).toHaveAccessibleName('Quit');
    expect(button.className).toContain('bg-edu-surface');
    expect(button.className).toContain('before:-inset-1');
  });
});
