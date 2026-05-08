import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ConnectionsFAQ from '../ConnectionsFAQ';
import { getConnectionsLandingCopy } from '@/app/[locale]/connections/content';

const faqOpen = vi.fn();

vi.mock('@/lib/connections/landingTelemetry', () => ({
  trackLandingFaqOpen: (...args: unknown[]) => faqOpen(...args),
}));

beforeEach(() => faqOpen.mockClear());

describe('ConnectionsFAQ', () => {
  it('renders 6 questions', () => {
    const copy = getConnectionsLandingCopy('en').faq;
    render(<ConnectionsFAQ locale="en" copy={copy} />);
    expect(copy.items).toHaveLength(6);
    for (const entry of copy.items) {
      expect(screen.getByText(entry.q)).toBeInTheDocument();
    }
  });

  it('answers are present in DOM', () => {
    // Native <details> renders content even when collapsed; we just assert presence.
    const copy = getConnectionsLandingCopy('en').faq;
    render(<ConnectionsFAQ locale="en" copy={copy} />);
    for (const entry of copy.items) {
      expect(screen.getByText(entry.a)).toBeInTheDocument();
    }
  });

  it('fires landing_faq_open when a details element opens', () => {
    const copy = getConnectionsLandingCopy('en').faq;
    render(<ConnectionsFAQ locale="en" copy={copy} />);
    const summary = screen.getByText(copy.items[0]!.q);
    const details = summary.closest('details');
    expect(details).not.toBeNull();
    if (!details) return;
    details.open = true;
    fireEvent(details, new Event('toggle', { bubbles: true }));
    expect(faqOpen).toHaveBeenCalledWith({ locale: 'en', questionIndex: 0 });
  });
});
