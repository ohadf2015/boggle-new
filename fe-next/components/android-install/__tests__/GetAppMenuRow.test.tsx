import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import GetAppMenuRow from '../GetAppMenuRow';
import { useAndroidInstallStore } from '@/lib/androidInstall/androidInstallStore';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...a: unknown[]) => captureMock(...a) },
}));
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

let eligible = true;
vi.mock('@/lib/androidInstall/installEligibility', () => ({
  isAndroidInstallEntryEligible: () => eligible,
}));

beforeEach(() => {
  captureMock.mockClear();
  eligible = true;
  useAndroidInstallStore.setState({ open: false, source: 'auto_popup', pillVisible: false });
});

describe('GetAppMenuRow', () => {
  it('renders nothing on an ineligible platform (desktop / iOS / native)', () => {
    eligible = false;
    render(<GetAppMenuRow />);
    expect(screen.queryByText('androidAppPromo.menuLabel')).not.toBeInTheDocument();
  });

  it('shows the durable menu row on an Android browser', () => {
    render(<GetAppMenuRow />);
    expect(screen.getByText('androidAppPromo.menuLabel')).toBeInTheDocument();
  });

  it('opens the promo tagged as a menu re-entry, closes the drawer, and tracks the click', () => {
    const onNavigate = vi.fn();
    render(<GetAppMenuRow onNavigate={onNavigate} />);
    fireEvent.click(screen.getByText('androidAppPromo.menuLabel'));
    const s = useAndroidInstallStore.getState();
    expect(s.open).toBe(true);
    expect(s.source).toBe('menu');
    expect(onNavigate).toHaveBeenCalledTimes(1);
    // `source` distinguishes the header drawer from the post-game row
    // (GetAppMenuRow.source.test.tsx); the header keeps the historical default.
    expect(captureMock).toHaveBeenCalledWith('android_install_menu_click', { source: 'menu' });
  });
});
