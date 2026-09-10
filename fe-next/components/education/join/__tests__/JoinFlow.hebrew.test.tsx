/**
 * The Hebrew student.
 *
 * A join code is Latin alphanumerics in all six locales, but the page around
 * it is right-to-left. Two things therefore have to be true at once, and the
 * old form only ever managed one of them: the SCREEN must flow RTL (headline,
 * hints, the back control), while the CODE must not — a flex row inside an RTL
 * page lays its children out right-to-left, which would paint P45KRT as
 * TRKS4P on the projector-to-phone comparison a student actually makes.
 *
 * The deleted `JoinClassroomForm.heroLine` suite carried the only RTL
 * assertion this flow had. This is that coverage, aimed at the part that can
 * actually break.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

const { mockJoin, mockResolve, mockUseAuth, mockPush, lang } = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockResolve: vi.fn(),
  mockUseAuth: vi.fn(),
  mockPush: vi.fn(),
  lang: { dir: 'rtl', language: 'he' },
}));

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, dir: lang.dir, language: lang.language }),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: mockUseAuth }));
vi.mock('@/hooks/useClassroom', () => ({ useJoinClassroom: () => ({ joinClassroom: mockJoin }) }));
vi.mock('@/lib/education/telemetry', () => ({ trackEduClassroomJoin: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('../joinTarget', () => ({ resolveJoinTarget: mockResolve }));

import JoinFlow from '../JoinFlow';

const codeInput = () => screen.getByTestId('join-code-input');

describe('<JoinFlow> in Hebrew', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lang.dir = 'rtl';
    lang.language = 'he';
    mockUseAuth.mockReturnValue({ user: null, loading: false });
    mockResolve.mockResolvedValue({ verdict: 'game', label: 'מיכל' });
  });

  it('flows right-to-left', () => {
    const { container } = render(<JoinFlow />);
    expect(container.firstElementChild).toHaveAttribute('dir', 'rtl');
  });

  it('keeps the six code cells left-to-right inside that RTL page', () => {
    render(<JoinFlow />);
    // The nearest direction ancestor of the real input is the cell strip, and
    // it must pin ltr — otherwise the first character a Hebrew student types
    // appears in the RIGHTMOST cell and the code reads backwards.
    const strip = codeInput().closest('[dir]');
    expect(strip).toHaveAttribute('dir', 'ltr');
  });

  it('shows the confirmed code in typing order on the nickname step', () => {
    render(<JoinFlow initialCode="P45KRT" />);
    const shown = screen.getByText('P45KRT');
    expect(shown).toHaveAttribute('dir', 'ltr');
  });

  it('still flows left-to-right for everyone else', () => {
    lang.dir = 'ltr';
    lang.language = 'en';
    const { container } = render(<JoinFlow />);
    expect(container.firstElementChild).toHaveAttribute('dir', 'ltr');
    expect(codeInput().closest('[dir]')).toHaveAttribute('dir', 'ltr');
  });

  it('sends a Hebrew student into the Hebrew room, not the English one', async () => {
    mockJoin.mockResolvedValue({ success: true, gameCode: 'P45KRT' });
    render(<JoinFlow initialCode="P45KRT" />);
    fireEvent.change(screen.getByLabelText('education.student.join.nameLabel'), {
      target: { value: 'נועה' },
    });
    fireEvent.click(screen.getByRole('button', { name: /education\.student\.join\.flow\.go/ }));
    await vi.waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith('/he/multiplayer?room=P45KRT&classroom=true')
    );
  });
});
