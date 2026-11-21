/** A class with nobody in it leads with getting students in; a class with students leads with Start a game. */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('../GoogleClassroomRosterImport', () => ({ GoogleClassroomRosterImport: () => null }));
vi.mock('@/components/teacher/ClassroomStudentList', () => ({ default: () => null }));
vi.mock('@/components/teacher/StudentCapMeter', () => ({ StudentCapMeter: () => null }));
vi.mock('@/hooks/useTeacherPro', () => ({ useTeacherPro: () => ({ hasPro: false, loading: false }) }));

import { ClassCard } from '../ClassCard';

const props = {
  classroom: { id: 'c1', name: 'Period 3', language: 'en', join_code: 'ABC123', member_count: 0 },
  expanded: false,
  onToggleExpanded: vi.fn(),
  onCopy: vi.fn(),
  onShare: vi.fn(),
  googleHref: null,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  startGameHref: '/en/teacher?classroomId=c1',
};

describe('ClassCard primary action by class state', () => {
  it('Given no students, Then Share code is the lime primary and Start a game is the quiet second', async () => {
    const onInvite = vi.fn();
    render(<ClassCard {...props} onInvite={onInvite} />);
    const invite = screen.getByTestId('classroom-card-invite');
    expect(invite.className).toContain('bg-neo-lime');
    expect(invite).toHaveTextContent('eduShell.home.shareCode');
    const start = screen.getByTestId('classroom-card-start-game');
    expect(start.className).not.toContain('bg-neo-lime');
    expect(start).toHaveAttribute('href', '/en/teacher?classroomId=c1');
    await userEvent.click(invite);
    expect(onInvite).toHaveBeenCalledTimes(1);
  });

  it('Given students, Then there is no invite button and Start a game stays lime', () => {
    render(<ClassCard {...props} classroom={{ ...props.classroom, member_count: 5 }} onInvite={vi.fn()} />);
    expect(screen.queryByTestId('classroom-card-invite')).toBeNull();
    expect(screen.getByTestId('classroom-card-start-game').className).toContain('bg-neo-lime');
  });

  it('Given no students and no share sheet wired, Then Share code still shares the link', async () => {
    const onShare = vi.fn();
    render(<ClassCard {...props} onShare={onShare} />);
    await userEvent.click(screen.getByTestId('classroom-card-invite'));
    expect(onShare).toHaveBeenCalledTimes(1);
  });
});
