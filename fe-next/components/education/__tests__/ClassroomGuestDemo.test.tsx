import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassroomGuestDemo } from '@/components/education/ClassroomGuestDemo';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/en/education/classroom-game',
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: false,
    loading: false,
    user: null,
    profile: null,
  }),
}));

vi.mock('@/components/education/EducationHeader', () => ({
  EducationHeader: () => <div data-testid="education-header" />,
}));

describe('ClassroomGuestDemo', () => {
  beforeEach(() => {
    mockPush.mockReset();
  });

  it('lets a guest join with a class code and never asks for email', async () => {
    const user = userEvent.setup();
    render(<ClassroomGuestDemo />);

    expect(screen.getByTestId('education-header')).toBeTruthy();
    expect(screen.queryByLabelText(/email/i)).toBeNull();
    expect(screen.queryByLabelText(/password/i)).toBeNull();

    const input = screen.getByRole('textbox');
    await user.type(input, 'abc123');
    await user.click(screen.getByRole('button'));

    expect(mockPush).toHaveBeenCalledWith('/en/join/ABC123');
  });

  it('does not link to consumer multiplayer or the access signup wall', () => {
    const { container } = render(<ClassroomGuestDemo />);
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') || '');
    expect(hrefs.some((h) => h.includes('quickPlay=true'))).toBe(false);
    expect(hrefs.some((h) => h.includes('/education/access'))).toBe(false);
  });
});
