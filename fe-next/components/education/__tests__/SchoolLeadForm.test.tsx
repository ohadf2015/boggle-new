import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

const mockTrackGrowthEvent = vi.fn();
vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: (...args: unknown[]) => mockTrackGrowthEvent(...args),
}));

import { SchoolLeadForm } from '../SchoolLeadForm';

describe('<SchoolLeadForm>', () => {
  beforeEach(() => vi.clearAllMocks());

  it('disables submit until name, email and school/district are filled', () => {
    render(<SchoolLeadForm />);
    expect(screen.getByRole('button', { name: /education\.forSchools\.form\.submit/i })).toBeDisabled();
  });

  it('enables submit once the qualifying fields are filled', async () => {
    render(<SchoolLeadForm />);
    const user = userEvent.setup();
    const submit = screen.getByRole('button', { name: /education\.forSchools\.form\.submit/i });
    await user.type(screen.getByLabelText(/education\.forSchools\.form\.full_name/i), 'Dana Levi');
    await user.type(screen.getByLabelText(/education\.forSchools\.form\.email/i), 'dana@lincoln.edu');
    await user.type(screen.getByLabelText(/education\.forSchools\.form\.school_or_district/i), 'Lincoln High');
    await waitFor(() => expect(submit).not.toBeDisabled());
  });

  it('POSTs the qualified lead (incl student_count + interests) to /api/education/school-lead', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as any));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();
    render(<SchoolLeadForm />);

    await user.type(screen.getByLabelText(/education\.forSchools\.form\.full_name/i), 'Dana Levi');
    await user.type(screen.getByLabelText(/education\.forSchools\.form\.email/i), 'dana@lincoln.edu');
    await user.type(screen.getByLabelText(/education\.forSchools\.form\.school_or_district/i), 'Lincoln High');
    // pick a paying-intent interest
    await user.click(screen.getByLabelText(/education\.forSchools\.form\.interest_pricing_info/i));
    await user.click(screen.getByRole('button', { name: /education\.forSchools\.form\.submit/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe('/api/education/school-lead');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.school_or_district).toBe('Lincoln High');
    expect(body.student_count).toBeTruthy();
    expect(body.interests).toContain('pricing_info');
    expect(body.locale).toBe('en');
  });

  it('fires school_lead_submitted growth event on successful submit', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as any)) as any;
    const user = userEvent.setup();
    render(<SchoolLeadForm />);
    await user.type(screen.getByLabelText(/education\.forSchools\.form\.full_name/i), 'Dana Levi');
    await user.type(screen.getByLabelText(/education\.forSchools\.form\.email/i), 'dana@lincoln.edu');
    await user.type(screen.getByLabelText(/education\.forSchools\.form\.school_or_district/i), 'Lincoln High');
    await user.click(screen.getByRole('button', { name: /education\.forSchools\.form\.submit/i }));
    await waitFor(() => expect(mockTrackGrowthEvent).toHaveBeenCalledWith('school_lead_submitted', expect.objectContaining({ role: 'school_admin', locale: 'en' })));
  });

  it('shows a success state after a successful submit', async () => {
    global.fetch = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as any)) as any;
    const user = userEvent.setup();
    render(<SchoolLeadForm />);
    await user.type(screen.getByLabelText(/education\.forSchools\.form\.full_name/i), 'Dana Levi');
    await user.type(screen.getByLabelText(/education\.forSchools\.form\.email/i), 'dana@lincoln.edu');
    await user.type(screen.getByLabelText(/education\.forSchools\.form\.school_or_district/i), 'Lincoln High');
    await user.click(screen.getByRole('button', { name: /education\.forSchools\.form\.submit/i }));
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
  });
});
