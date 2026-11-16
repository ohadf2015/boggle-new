import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { captureMock, lang, signOutMock } = vi.hoisted(() => ({
  captureMock: vi.fn(),
  lang: { language: 'en', dir: 'ltr' },
  signOutMock: vi.fn(),
}));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: lang.language, dir: lang.dir }) }));
vi.mock('@/lib/education/telemetryCore', () => ({ safeCapture: captureMock }));
vi.mock('@/lib/supabase', () => ({ signOut: signOutMock }));
vi.mock('@/utils/profileStorage', () => ({ clearStoredProfile: vi.fn() }));
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

  it('Given a student is on the teacher device, When they choose join as a student, Then the teacher is signed out and the join page reloads as a fresh device', async () => {
    signOutMock.mockResolvedValue({ error: null });
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, assign } });
    render(<TeacherOwnClassPanel classroomId="c1" liveGameCode={null} joinCode="6FGVN5" />);
    fireEvent.click(screen.getByTestId('own-class-join-as-student'));
    await vi.waitFor(() => expect(assign).toHaveBeenCalledWith('/en/join/6FGVN5'));
    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith('edu_teacher_own_class_action', {
      classroom_id: 'c1',
      action: 'join_as_student',
      has_live_room: false,
    });
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });

  it('Given sign-out fails, When they try to join as a student, Then the page stays and says so', async () => {
    signOutMock.mockResolvedValue({ error: { message: 'nope' } });
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, assign } });
    render(<TeacherOwnClassPanel classroomId="c1" liveGameCode={null} joinCode="6FGVN5" />);
    fireEvent.click(screen.getByTestId('own-class-join-as-student'));
    expect(await screen.findByRole('alert')).toHaveTextContent('education.student.join.ownClass.joinAsStudentFailed');
    expect(assign).not.toHaveBeenCalled();
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });

  it('Given a phone, When shown, Then both actions are at least 44px tall and wrap long text', () => {
    render(<TeacherOwnClassPanel classroomId="c1" liveGameCode={null} />);
    for (const id of ['own-class-primary', 'own-class-secondary']) {
      expect(screen.getByTestId(id).className).toMatch(/min-h-1[2-4]/);
      expect(screen.getByTestId(id).className).toMatch(/w-full/);
    }
  });
});
