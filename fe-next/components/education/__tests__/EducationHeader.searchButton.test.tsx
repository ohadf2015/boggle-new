import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { vi } from 'vitest';

let authState: { isAuthenticated: boolean; profile: Record<string, unknown> | null };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authState }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }), usePathname: () => '/en/education' }));
vi.mock('@/lib/supabase', () => ({ signOut: vi.fn() }));
vi.mock('@/components/MusicControls', () => ({ default: () => null }));
vi.mock('@/components/QuickLanguageSwitcher', () => ({ QuickLanguageSwitcher: () => null }));
vi.mock('@/hooks/useSafeArea', () => ({ useSafeArea: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
vi.mock('../EducationBreadcrumbs', () => ({ EducationBreadcrumbs: () => null }));

import { EducationHeader } from '../EducationHeader';

/**
 * Test that the EducationHeader search button opens the CommandPalette
 * for teachers so they can quickly navigate to key education routes.
 */
describe('EducationHeader - Teacher Search Button', () => {
  it('renders search button for teachers', () => {
    authState = {
      isAuthenticated: true,
      profile: { user_role: 'teacher', is_admin: false, display_name: 'Tori' },
    };
    render(<EducationHeader />);

    // Search button should have aria-label of common.search
    const searchButton = screen.getByLabelText('common.search');
    expect(searchButton).toBeInTheDocument();
  });

  it('does not render search button for non-teachers', () => {
    authState = {
      isAuthenticated: true,
      profile: { user_role: 'student', is_admin: false, display_name: 'Sam' },
    };
    render(<EducationHeader />);

    // Search button should NOT exist
    expect(screen.queryByLabelText('common.search')).not.toBeInTheDocument();
  });

  it('dispatches openCommandPalette event when clicked', async () => {
    authState = {
      isAuthenticated: true,
      profile: { user_role: 'teacher', is_admin: false, display_name: 'Tori' },
    };

    // Mock window.dispatchEvent to capture the event
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');

    render(<EducationHeader />);

    const searchButton = screen.getByLabelText('common.search');
    await userEvent.click(searchButton);

    // Verify CustomEvent was dispatched
    await waitFor(() => {
      const call = dispatchSpy.mock.calls.find(
        (c) => c[0] instanceof CustomEvent && c[0].type === 'openCommandPalette'
      );
      expect(call).toBeDefined();
    });

    dispatchSpy.mockRestore();
  });
});
