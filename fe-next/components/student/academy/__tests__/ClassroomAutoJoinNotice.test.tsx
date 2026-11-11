import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

import { ClassroomAutoJoinNotice } from '../ClassroomAutoJoinNotice';

describe('ClassroomAutoJoinNotice', () => {
  it('Given a pending auto-join, When shown, Then it says the teacher started a game, announces it, and offers Stay here', () => {
    const onStay = vi.fn();
    render(<ClassroomAutoJoinNotice onStay={onStay} />);
    const notice = screen.getByTestId('classroom-auto-join-notice');
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveTextContent('academy.student.autoJoin.title');
    expect(notice.className).toMatch(/pointer-events-auto/);
    const stay = screen.getByRole('button', { name: 'academy.student.autoJoin.stay' });
    expect(stay.className).toMatch(/min-h-11/);
    fireEvent.click(stay);
    expect(onStay).toHaveBeenCalledTimes(1);
  });

  it('Given reduced motion or not, Then the notice carries no entrance animation', () => {
    render(<ClassroomAutoJoinNotice onStay={() => {}} />);
    expect(screen.getByTestId('classroom-auto-join-notice').className).not.toMatch(/animate-/);
  });
});
