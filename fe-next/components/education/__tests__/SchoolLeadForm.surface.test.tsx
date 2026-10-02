import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'ru' }),
}));

const track = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => track(...args),
}));

import { SchoolLeadForm } from '../SchoolLeadForm';

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/education\.forSchools\.form\.full_name/i), 'Анна Петрова');
  await user.type(screen.getByLabelText(/education\.forSchools\.form\.email/i), 'anna@school.test');
  await user.type(screen.getByLabelText(/education\.forSchools\.form\.school_or_district/i), 'Школа 57');
  await user.click(screen.getByRole('button', { name: /education\.forSchools\.form\.submit/i }));
}

describe('<SchoolLeadForm> on a locale the leads table does not accept', () => {
  beforeEach(() => vi.clearAllMocks());

  it('sends a locale the API accepts instead of failing with 400 on /ru', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }) as Response);
    global.fetch = fetchMock as unknown as typeof fetch;
    render(<SchoolLeadForm />);
    await fillAndSubmit();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(['en', 'he', 'sv', 'ja', 'es']).toContain(body.locale);
  });

  it('tags view and submit events with the surface that hosted the form', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) }) as Response) as unknown as typeof fetch;
    render(<SchoolLeadForm surface="education_landing" />);
    expect(track).toHaveBeenCalledWith('school_lead_form_viewed', expect.objectContaining({ surface: 'education_landing' }));
    await fillAndSubmit();
    await waitFor(() =>
      expect(track).toHaveBeenCalledWith('school_lead_submitted', expect.objectContaining({ surface: 'education_landing' })),
    );
  });
});
