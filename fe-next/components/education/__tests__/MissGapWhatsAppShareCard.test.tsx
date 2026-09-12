/**
 * @vitest-environment jsdom
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MissGapWhatsAppShareCard } from '../MissGapWhatsAppShareCard';
import type { MissGapAssignmentPayload } from '@/lib/education/missGapAsyncAssignment';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: 'en',
    t: (key: string, params?: Record<string, string | number>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  }),
}));

const openSpy = vi.fn();

const payload: MissGapAssignmentPayload = {
  locale: 'en',
  lesson: 'Physics 101',
  teacher: 'Ms. Cohen',
  found: 2,
  total: 3,
  missedWords: ['neutron', 'quark'],
  dueDate: '2026-09-15',
};

describe('MissGapWhatsAppShareCard', () => {
  beforeEach(() => {
    openSpy.mockReset();
    vi.stubGlobal('open', openSpy);
  });

  it('shows due + words and opens wa.me with parent card URL, no positioning copy', () => {
    render(<MissGapWhatsAppShareCard payload={payload} />);
    expect(screen.getByTestId('miss-gap-whatsapp-share-card')).toBeInTheDocument();
    // Competitor-positioning copy was written for the PR, not for the parent
    // reading this on a phone. One element fewer.
    expect(screen.queryByTestId('miss-gap-whatsapp-foil')).not.toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-whatsapp-due')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-whatsapp-words')).toHaveTextContent('neutron');
    expect(screen.getByTestId('miss-gap-whatsapp-privacy')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('miss-gap-whatsapp-share'));
    expect(openSpy).toHaveBeenCalled();
    const href = String(openSpy.mock.calls[0][0]);
    expect(href.startsWith('https://wa.me/?text=')).toBe(true);
    const decoded = decodeURIComponent(href.slice('https://wa.me/?text='.length));
    expect(decoded).toContain('/education/miss-gap-whatsapp');
    expect(decoded).toContain('due=2026-09-15');
    expect(decoded).toContain('utm_source=whatsapp');
    expect(decoded).not.toContain('Maya');
  });

  it('parentView hides WhatsApp composer and keeps practice CTA', () => {
    render(<MissGapWhatsAppShareCard payload={payload} parentView />);
    expect(screen.queryByTestId('miss-gap-whatsapp-share')).not.toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-whatsapp-open-practice')).toBeInTheDocument();
    expect(screen.getByTestId('miss-gap-whatsapp-open-homework')).toBeInTheDocument();
  });
});
