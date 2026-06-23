import { render, screen } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import TvInstallQr from '../TvInstallQr';
import { playStoreUrlWithReferrer } from '@/utils/androidApp';

const captureMock = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({
  default: { capture: (...a: unknown[]) => captureMock(...a) },
}));

// Capture the QR payload without rendering a real <svg>.
vi.mock('qrcode.react', () => ({
  QRCodeSVG: ({ value }: { value: string }) => <div data-testid="qr" data-value={value} />,
}));

const t = (k: string) => k;

beforeEach(() => captureMock.mockClear());

describe('TvInstallQr', () => {
  it('encodes the Play Store install URL with TV-attributed referrer for the locale', () => {
    render(<TvInstallQr language="es" t={t} />);
    expect(screen.getByTestId('qr').getAttribute('data-value')).toBe(
      playStoreUrlWithReferrer('tv_results_qr', 'es')
    );
  });

  it('shows the localized heading and CTA copy', () => {
    render(<TvInstallQr language="en" t={t} />);
    expect(screen.getByText('tvResults.installHeading')).toBeInTheDocument();
    expect(screen.getByText('tvResults.installCta')).toBeInTheDocument();
  });

  it('tracks the impression exactly once on mount', () => {
    render(<TvInstallQr language="en" t={t} />);
    expect(captureMock).toHaveBeenCalledWith('android_tv_install_qr_shown');
    expect(captureMock).toHaveBeenCalledTimes(1);
  });
});
