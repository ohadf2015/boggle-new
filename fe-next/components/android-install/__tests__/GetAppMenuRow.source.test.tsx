import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import GetAppMenuRow from '../GetAppMenuRow';
import { useAndroidInstallStore } from '@/lib/androidInstall/androidInstallStore';

/**
 * The install ask needed a surface at the moment value has just been delivered.
 * 30d field data on the auto-popup: control showed 192 promos for 13 install
 * clicks (6.8%), while the engagement-gated variant showed 28 for the same 13
 * clicks (46%). Intent, not reach, is the lever — and the end of a finished game
 * is the highest-intent moment in the product.
 *
 * GetAppMenuRow is reused verbatim for it: it already self-gates to platforms
 * that can install, is inline rather than an overlay (so it cannot repeat #842,
 * the promo painting over a live board), and needs no new copy. The only thing
 * it lacked was a way to tell the two placements apart in the funnel.
 */

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

describe('GetAppMenuRow placement source', () => {
  it('defaults to the header menu, so existing dashboards keep their meaning', () => {
    render(<GetAppMenuRow />);
    fireEvent.click(screen.getByText('androidAppPromo.menuLabel'));

    expect(captureMock).toHaveBeenCalledWith('android_install_menu_click', { source: 'menu' });
    expect(useAndroidInstallStore.getState().source).toBe('menu');
  });

  it('reports the results placement separately', () => {
    render(<GetAppMenuRow source="results" />);
    fireEvent.click(screen.getByText('androidAppPromo.menuLabel'));

    expect(captureMock).toHaveBeenCalledWith('android_install_menu_click', { source: 'results' });
    // The promo modal must carry it too, or its own shown/click/dismissed events
    // land under the wrong placement.
    expect(useAndroidInstallStore.getState().source).toBe('results');
  });

  it('still renders nothing where installing is impossible', () => {
    eligible = false;
    render(<GetAppMenuRow source="results" />);

    expect(screen.queryByText('androidAppPromo.menuLabel')).not.toBeInTheDocument();
  });
});
