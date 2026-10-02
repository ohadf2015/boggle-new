import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (k: string, p?: Record<string, unknown>) => (p ? `${k}|${Object.values(p).join('|')}` : k),
    language: 'sv',
  }),
}));
const share = vi.fn();
vi.mock('@/utils/shareWithFallback', () => ({ shareWithFallback: (...a: unknown[]) => share(...a) }));
const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: (...a: unknown[]) => track(...a) }));
vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

import { AskSchoolPanel } from '../AskSchoolPanel';

describe('AskSchoolPanel — ask the school to pay, without a new billing tier', () => {
  beforeEach(() => {
    share.mockReset();
    track.mockReset();
  });

  it('builds an email whose link opens the school quote tab with the teacher named', () => {
    render(<AskSchoolPanel requesterName="Ms Rivera" origin="https://www.lexiclash.live" />);
    const mail = screen.getByRole('link', { name: /eg2Pro\.ask\.email/ });
    const href = decodeURIComponent(mail.getAttribute('href')!);
    expect(href.startsWith('mailto:?subject=')).toBe(true);
    expect(href).toContain('https://www.lexiclash.live/sv/teacher/upgrade?plan=school&for=Ms+Rivera');
  });

  it('leaves the name out when the teacher has none', () => {
    render(<AskSchoolPanel requesterName="" origin="https://www.lexiclash.live" />);
    const href = decodeURIComponent(screen.getByRole('link', { name: /eg2Pro\.ask\.email/ }).getAttribute('href')!);
    expect(href).toContain('/sv/teacher/upgrade?plan=school');
    expect(href).not.toContain('for=');
  });

  it('shares the same message through the emoji-safe share helper', async () => {
    share.mockResolvedValue('copied');
    render(<AskSchoolPanel requesterName="Ms Rivera" origin="https://www.lexiclash.live" />);
    fireEvent.click(screen.getByRole('button', { name: /eg2Pro\.ask\.share/ }));
    await waitFor(() => expect(share).toHaveBeenCalled());
    const opts = share.mock.calls[0][0];
    expect(opts.text).toContain('plan=school');
    expect(opts.url).toBeUndefined();
    expect(track).toHaveBeenCalledWith('landing_cta_clicked', expect.objectContaining({ cta: 'ask_school_share' }));
  });
});
