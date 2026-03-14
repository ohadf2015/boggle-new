/**
 * @jest-environment jsdom
 */

import { render } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ProfileHeader } from '@/components/profile/ProfileHeader';
import type { ProfileData } from '@/contexts/auth/authTypes';

jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => <img {...props} alt={props.alt} />,
}));

jest.mock('framer-motion', () => ({
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

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

jest.mock('@/components/avatar/AvatarBuilderModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('@/components/Avatar', () => ({
  __esModule: true,
  default: () => <div data-testid="avatar" />,
}));

jest.mock('@/components/settings/CountrySelector', () => ({
  CountrySelector: () => null,
}));

jest.mock('@/shared/utils/countryUtils', () => ({
  getCountryFlag: () => '🏳',
}));

jest.mock('@/shared/types/customAvatar', () => ({
  getRandomAvatarConfig: () => ({}),
}));

const mockProfile: ProfileData = {
  id: 'test-id',
  username: 'TestUser',
  display_name: 'Test User',
  email: 'test@test.com',
  avatar_image: undefined,
  profile_picture_url: 'https://example.com/pic.jpg',
  avatar_config: null,
  country_code: null,
  created_at: '2024-01-01',
  coins: 0,
  games_played: 0,
  games_won: 0,
  high_score: 0,
  lifetime_score: 0,
  total_words_found: 0,
  longest_word: '',
  is_guest: false,
  xp: 0,
  level: 1,
  stats: null,
};

const noop = async () => {};

describe('ProfileHeader design tokens', () => {
  it('uses neo design tokens instead of hardcoded colors in light mode', () => {
    const { getByTestId } = render(
      <ProfileHeader
        profile={mockProfile}
        isDarkMode={false}
        isUploading={false}
        onProfilePictureUpload={noop as any}
        onRemoveProfilePicture={noop}
        updateProfile={async () => ({ data: null, error: null })}
        refreshProfile={noop}
      />
    );

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
