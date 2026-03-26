import React from 'react';
import { vi } from 'vitest';
/**
 * @jest-environment jsdom
 */


const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import type { ProfileData } from '@/contexts/auth/authTypes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('next/image', () => ({
  __esModule: true,
  // eslint-disable-next-line @next/next/no-img-element
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} data-testid="profile-header-root" {...props}>{children}</div>
    ),
  },
  m: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} data-testid="profile-header-root" {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

vi.mock('@/components/avatar/AvatarBuilderModal', () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar" />,
}));

vi.mock('@/components/settings/CountrySelector', () => ({
  CountrySelector: () => null,
}));

vi.mock('@/shared/utils/countryUtils', () => ({
  getCountryFlag: () => '🏳',
}));

vi.mock('@/shared/types/customAvatar', () => ({
  getRandomAvatarConfig: () => ({}),
}));

const mockProfile: ProfileData = {
  id: 'test-id',
  username: 'TestUser',
  display_name: 'Test User',
  avatar_image: undefined,
  avatar_config: null,
  country_code: null,
  created_at: '2024-01-01',
  total_games: 0,
  total_score: 0,
  total_words: 0,
  longest_word: '',
  total_xp: 0,
  current_level: 1,
};

const noop = async () => {};

describe('ProfileHeader design tokens', () => {
  it('uses neo design tokens instead of hardcoded colors in light mode', () => {
    const { getByTestId } = render(
      <ProfileHeader
        profile={mockProfile}
        isDarkMode={false}
        updateProfile={async () => ({ data: null, error: null })}
        refreshProfile={noop}
      />
    , { wrapper: createWrapper() });

    const root = getByTestId('profile-header-root');
    const rootClass = root.className;

    // Should NOT have hardcoded gray/white colors
    expect(rootClass).not.toContain('bg-white');
    expect(rootClass).not.toContain('border-gray-200');
    expect(rootClass).not.toContain('shadow-lg');
    expect(rootClass).not.toContain('rounded-2xl');

    // Should have neo tokens
    expect(rootClass).toContain('rounded-neo-lg');
    expect(rootClass).toContain('shadow-hard');
    expect(rootClass).toContain('border-3');
    expect(rootClass).toContain('bg-neo-navy');
  });
});
