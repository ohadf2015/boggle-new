import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

let authState: { isAuthenticated: boolean; profile: Record<string, unknown> | null };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string) => k,
    language: 'en',
  }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/en',
}));

import { CommandPalette } from '../CommandPalette';

describe('CommandPalette - Teacher Entries', () => {
  beforeEach(() => {
    pushMock.mockClear();
  });

  it('shows teacher group and entries for a teacher', async () => {
    authState = {
      isAuthenticated: true,
      profile: { user_role: 'teacher', is_admin: false },
    };
    render(<CommandPalette />);

    // Open palette via Cmd+K (keyboard shortcut)
    await userEvent.keyboard('{Control>}k{/Control}');

    // Wait for teacher group heading to appear
    await waitFor(() => {
      expect(screen.getByText('teacher.nav.sidebarLabel')).toBeInTheDocument();
    });

    // Verify teacher entries are rendered
    expect(screen.getByText('teacher.nav.play')).toBeInTheDocument();
    expect(screen.getByText('teacher.nav.classes')).toBeInTheDocument();
    expect(screen.getByText('teacher.nav.lessons')).toBeInTheDocument();
    expect(screen.getByText('teacher.nav.reports')).toBeInTheDocument();
    expect(screen.getByText('education.onboarding.showTutorial')).toBeInTheDocument();
  });

  it('hides teacher group for a student', async () => {
    authState = {
      isAuthenticated: true,
      profile: { user_role: 'student', is_admin: false },
    };
    render(<CommandPalette />);

    // Open palette via Cmd+K
    await userEvent.keyboard('{Control>}k{/Control}');

    // Wait for the dialog to open (wait for any group heading)
    await waitFor(() => {
      expect(screen.getByText('common.navigation')).toBeInTheDocument();
    });

    // Teacher group should NOT exist
    expect(screen.queryByText('teacher.nav.sidebarLabel')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.nav.classes')).not.toBeInTheDocument();
  });

  it('hides teacher group for an unauthenticated user', async () => {
    authState = {
      isAuthenticated: false,
      profile: null,
    };
    render(<CommandPalette />);

    // Open palette via Cmd+K
    await userEvent.keyboard('{Control>}k{/Control}');

    // Wait for the dialog to open
    await waitFor(() => {
      expect(screen.getByText('common.navigation')).toBeInTheDocument();
    });

    // Teacher group should NOT exist
    expect(screen.queryByText('teacher.nav.sidebarLabel')).not.toBeInTheDocument();
  });

  it('shows teacher entries for an admin', async () => {
    authState = {
      isAuthenticated: true,
      profile: { user_role: 'admin', is_admin: true },
    };
    render(<CommandPalette />);

    // Open palette via Cmd+K
    await userEvent.keyboard('{Control>}k{/Control}');

    // Wait for teacher group
    await waitFor(() => {
      expect(screen.getByText('teacher.nav.sidebarLabel')).toBeInTheDocument();
    });

    // Verify teacher entries are rendered
    expect(screen.getByText('teacher.nav.classes')).toBeInTheDocument();
  });

  it('opens when a CustomEvent is dispatched', async () => {
    authState = {
      isAuthenticated: true,
      profile: { user_role: 'teacher', is_admin: false },
    };
    render(<CommandPalette />);

    // Dispatch custom event to open palette
    window.dispatchEvent(new CustomEvent('openCommandPalette'));

    // Wait for palette to open
    await waitFor(() => {
      expect(screen.getByText('teacher.nav.sidebarLabel')).toBeInTheDocument();
    });
  });

  it.each<[string, string]>([
    ['teacher.nav.play', '/en/teacher'],
    ['teacher.nav.classes', '/en/teacher/classroom'],
    ['teacher.nav.lessons', '/en/teacher/curriculum'],
    ['teacher.nav.reports', '/en/teacher/reports'],
    ['education.onboarding.showTutorial', '/en/education#how-it-works'],
  ])(
    'clicking teacher palette item %s navigates to %s',
    async (labelKey: string, expectedHref: string) => {
      authState = {
        isAuthenticated: true,
        profile: { user_role: 'teacher', is_admin: false },
      };
      render(<CommandPalette />);

      // Open palette via Cmd+K
      await userEvent.keyboard('{Control>}k{/Control}');

      // Wait for teacher group to appear
      await waitFor(() => {
        expect(screen.getByText('teacher.nav.sidebarLabel')).toBeInTheDocument();
      });

      // Find and click the item
      const item = screen.getByText(labelKey);
      await userEvent.click(item);

      // Verify router.push was called with the correct href
      await waitFor(() => {
        expect(pushMock).toHaveBeenCalledWith(expectedHref);
      });
    },
  );

  it('student does not see teacher palette items', async () => {
    authState = {
      isAuthenticated: true,
      profile: { user_role: 'student', is_admin: false },
    };
    render(<CommandPalette />);

    // Open palette via Cmd+K
    await userEvent.keyboard('{Control>}k{/Control}');

    // Wait for the dialog to open
    await waitFor(() => {
      expect(screen.getByText('common.navigation')).toBeInTheDocument();
    });

    // Verify NO teacher items are visible
    expect(screen.queryByText('teacher.nav.play')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.nav.classes')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.nav.lessons')).not.toBeInTheDocument();
    expect(screen.queryByText('teacher.nav.reports')).not.toBeInTheDocument();
    expect(screen.queryByText('education.onboarding.showTutorial')).not.toBeInTheDocument();
  });
});
