/**
 * AvatarTierBadge must use t() keys for labels — never hardcoded English.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvatarTierBadge from '../AvatarTierBadge';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

describe('AvatarTierBadge', () => {
  it('renders nothing for common/free parts', () => {
    const { container } = render(<AvatarTierBadge category="eyes" partId="round" />);
    expect(container.firstChild).toBeNull();
  });

  it('shows the rare tier via t() key', () => {
    render(<AvatarTierBadge category="eyes" partId="catEye" />);
    expect(screen.getByText('avatarBuilder.tiers.rare')).toBeInTheDocument();
  });

  it('shows the epic tier via t() key', () => {
    render(<AvatarTierBadge category="eyes" partId="starEye" />);
    expect(screen.getByText('avatarBuilder.tiers.epic')).toBeInTheDocument();
  });

  it('shows the legendary tier via t() key', () => {
    render(<AvatarTierBadge category="accessory" partId="crystalCrown" />);
    expect(screen.getByText('avatarBuilder.tiers.legendary')).toBeInTheDocument();
  });

  it('exposes data-tier for styling hooks', () => {
    const { container } = render(<AvatarTierBadge category="accessory" partId="wings" />);
    expect(container.querySelector('[data-tier="epic"]')).toBeTruthy();
  });
});
