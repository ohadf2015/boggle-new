import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

import { AccessRequestForm } from '../AccessRequestForm';

describe('<AccessRequestForm>', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('disables submit until required fields filled', () => {
    render(<AccessRequestForm />);
    const submit = screen.getByRole('button', { name: /education\.access\.submit/i });
    expect(submit).toBeDisabled();
  });

  it('enables submit when required fields filled', async () => {
    render(<AccessRequestForm />);
    const user = userEvent.setup();
    const submit = screen.getByRole('button', { name: /education\.access\.submit/i });
    expect(submit).toBeDisabled();

    // Form now collects role + use_case only (name/email come from the authenticated account)
    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
    await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');

    await waitFor(() => expect(submit).not.toBeDisabled());
  });

  it('posts to /api/education/access-request on submit', async () => {
    const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true }) } as any));
    global.fetch = fetchMock as any;
    const user = userEvent.setup();
    render(<AccessRequestForm />);

    await user.click(screen.getByRole('radio', { name: /education\.access\.role_teacher/i }));
    await user.type(screen.getByLabelText(/education\.access\.use_case_q/i), 'Teaching 9th grade ESL students.');
    await user.click(screen.getByRole('button', { name: /education\.access\.submit/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toBe('/api/education/access-request');
  });
});
