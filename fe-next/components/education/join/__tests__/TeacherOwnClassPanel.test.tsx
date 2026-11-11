import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { captureMock, lang } = vi.hoisted(() => ({ captureMock: vi.fn(), lang: { language: 'en', dir: 'ltr' } }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: lang.language, dir: lang.dir }) }));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: captureMock }));
vi.mock('next/link', () => ({
  default: ({ href, children, onClick, ...rest }: { href: string; children: React.ReactNode; onClick?: () => void }) => (
    <a href={href} onClick={(e) => { e.preventDefault(); onClick?.(); }} {...rest}>{children}</a>
  ),
}));

import { TeacherOwnClassPanel } from '../TeacherOwnClassPanel';

describe('TeacherOwnClassPanel', () => {
  beforeEach(() => {
    captureMock.mockReset();
    lang.language = 'en';
    lang.dir = 'ltr';
  });

  it('Given no room is open, When shown, Then the primary action starts a game for this class in the host lobby', () => {
    render(<TeacherOwnClassPanel classroomId="c1" liveGameCode={null} />);
    expect(screen.getByRole('heading')).toHaveTextContent('education.student.join.ownClass.title');
    const primary = screen.getByTestId('own-class-primary');
    expect(primary).toHaveTextContent('education.student.join.ownClass.startGame');
    expect(primary).toHaveAttribute('href', '/en/education/classroom-game?classroomId=c1');
    expect(screen.queryByText('education.student.join.ownClass.liveHint')).not.toBeInTheDocument();
  });

  it('Given a live room is open, When shown, Then the primary action opens the host board for that room and says students can join now', () => {
    render(<TeacherOwnClassPanel classroomId="c1" liveGameCode="LIVE01" />);
    const primary = screen.getByTestId('own-class-primary');
    expect(primary).toHaveTextContent('education.student.join.ownClass.openBoard');
    expect(primary).toHaveAttribute('href', '/en/education/live/host?room=LIVE01');
    expect(screen.getByText('education.student.join.ownClass.liveHint')).toBeInTheDocument();
  });

  it('Given either state, When shown, Then the secondary action opens the teacher class page', () => {
    lang.language = 'he';
    render(<TeacherOwnClassPanel classroomId="c1" liveGameCode={null} />);
    expect(screen.getByTestId('own-class-secondary')).toHaveAttribute('href', '/he/teacher/classroom/c1');
  });

  it('Given the teacher taps the primary action, Then one event records what they did next', () => {
    render(<TeacherOwnClassPanel classroomId="c1" liveGameCode="LIVE01" />);
    fireEvent.click(screen.getByTestId('own-class-primary'));
    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('edu_teacher_own_class_action', { classroom_id: 'c1', action: 'open_board', has_live_room: true });
  });

  it('Given a phone, When shown, Then both actions are at least 44px tall and wrap long text', () => {
    render(<TeacherOwnClassPanel classroomId="c1" liveGameCode={null} />);
    for (const id of ['own-class-primary', 'own-class-secondary']) {
      expect(screen.getByTestId(id).className).toMatch(/min-h-1[2-4]/);
      expect(screen.getByTestId(id).className).toMatch(/w-full/);
    }
  });
});
