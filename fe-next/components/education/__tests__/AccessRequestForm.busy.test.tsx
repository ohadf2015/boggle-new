import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ refreshProfile: vi.fn(async () => {}), user: { id: 'u1' } }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { AccessRequestForm } from '../AccessRequestForm';

const submit = () => screen.getByRole('button', { name: /education\.(trial\.cta|access\.class_ready_creating)/ });

describe('<AccessRequestForm> busy and error states', () => {
  beforeEach(() => localStorage.clear());

  it('GIVEN a slow request THEN the button is busy and disabled, and a second submit sends nothing', async () => {
    let resolve!: (r: Response) => void;
    const f = vi.fn(() => new Promise<Response>((r) => (resolve = r)));
    global.fetch = f as unknown as typeof fetch;
    render(<AccessRequestForm onApproved={vi.fn()} />);
    await userEvent.setup().type(screen.getByRole('textbox'), 'Friday vocab battles with my class');
    fireEvent.submit(submit().closest('form')!);
    fireEvent.submit(submit().closest('form')!);
    expect(f).toHaveBeenCalledTimes(1);
    expect(submit()).toBeDisabled();
    expect(submit()).toHaveAttribute('aria-busy', 'true');
    resolve({ ok: true, status: 200, json: async () => ({}) } as unknown as Response);
  });

  it('GIVEN the request fails THEN the error is announced next to the box, the words are kept, and the button works again', async () => {
    global.fetch = vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) }) as unknown as Response) as unknown as typeof fetch;
    render(<AccessRequestForm onApproved={vi.fn()} />);
    await userEvent.setup().type(screen.getByRole('textbox'), 'Friday vocab battles with my class');
    await userEvent.setup().click(submit());
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('education.access.submit_error');
    expect(screen.getByRole('textbox')).toHaveValue('Friday vocab battles with my class');
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-describedby', expect.stringContaining(alert.id));
    await waitFor(() => expect(submit()).toBeEnabled());
    expect(submit()).not.toHaveAttribute('aria-busy');
  });
});
