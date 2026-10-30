import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const capture = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a), register: vi.fn() } }));

import { TeacherInviteNudge, showTeacherInvite } from '../TeacherInviteNudge';

const t = (key: string, params?: Record<string, string | number>) => (params ? `${key}:${JSON.stringify(params)}` : key);
const LANDING = `${window.location.origin}/he/education?utm_source=teacher_invite&utm_medium=referral`;

describe('showTeacherInvite', () => {
  it.each([
    [true, 5, true],
    [true, 3, true],
    [true, 2, false],
    [false, 20, false],
  ])('Given celebrate=%s and %i students, Then the invite shows: %s', (celebrate, students, shown) => {
    expect(showTeacherInvite(celebrate, students)).toBe(shown);
  });
});

describe('TeacherInviteNudge', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    delete (navigator as unknown as { share?: unknown }).share;
  });

  it('Given a share sheet, When the teacher invites a colleague, Then the landing link goes out with no teacher or class id and the invite is tracked', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    render(<TeacherInviteNudge students={12} language="he" t={t} />);
    fireEvent.click(screen.getByTestId('teacher-invite-share'));
    await waitFor(() => expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: LANDING, text: 'eduLiveRoom.hostResults.inviteText' })));
    expect(capture).toHaveBeenCalledWith('edu_teacher_invite_shared', { method: 'native', students: 12 });
  });

  it('Given the projector wall, Then no WhatsApp link is offered (it would open the teacher\'s chats on the wall)', () => {
    render(<TeacherInviteNudge students={7} language="he" t={t} />);
    expect(screen.queryByTestId('teacher-invite-whatsapp')).toBeNull();
  });

  it('Given the teacher\'s phone, When WhatsApp is tapped, Then a wa.me link carries the sentence and the landing link, and is tracked', () => {
    render(<TeacherInviteNudge students={7} language="he" whatsapp t={t} />);
    const wa = screen.getByTestId('teacher-invite-whatsapp');
    expect(wa).toHaveAttribute('href', `https://wa.me/?text=${encodeURIComponent(`eduLiveRoom.hostResults.inviteText ${LANDING}`)}`);
    fireEvent.click(wa);
    expect(capture).toHaveBeenCalledWith('edu_teacher_invite_shared', { method: 'whatsapp', students: 7 });
  });

  it('Given the projector view, Then the invite is a quiet secondary, never a lime primary', () => {
    render(<TeacherInviteNudge students={7} language="he" t={t} />);
    expect(screen.getByTestId('teacher-invite').innerHTML).not.toContain('bg-neo-lime');
  });

  it('Given a phone, Then the invite is one compact row of share + WhatsApp buttons, normal case, with the same test ids', () => {
    render(<TeacherInviteNudge students={5} language="he" whatsapp compact t={t} />);
    const row = screen.getByTestId('teacher-invite');
    expect(row).toHaveAttribute('data-density', 'compact');
    expect(screen.queryByText('eduLiveRoom.hostResults.invitePrompt')).toBeNull();
    expect(screen.getByTestId('teacher-invite-share')).toHaveTextContent('eduLiveRoom.hostResults.inviteCta');
    expect(screen.getByTestId('teacher-invite-whatsapp')).toBeInTheDocument();
    expect(row.innerHTML).not.toMatch(/\buppercase\b/);
  });
});
