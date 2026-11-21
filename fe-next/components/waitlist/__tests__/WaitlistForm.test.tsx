import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const capture = vi.fn();
vi.mock('@/lib/analytics/lazyPosthog', () => ({ default: { capture: (...a: unknown[]) => capture(...a) } }));

import { WaitlistForm } from '../WaitlistForm';

const copy = {
  emailLabel: 'Email',
  submit: 'Notify me',
  success: 'You are on the list',
  error: 'Something went wrong',
  consent: 'One email when it launches.',
};

function fill(email: string) {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));
}

describe('WaitlistForm', () => {
  beforeEach(() => {
    capture.mockClear();
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ success: true }) }) as typeof fetch;
  });

  it('posts the email with its waitlist source and requested language', async () => {
    render(<WaitlistForm source="ar_waitlist_ar" language="ar" copy={copy} />);
    fill('a@b.co');

    await screen.findByText('You are on the list');
    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe('/api/subscribe-email');
    const body = JSON.parse(init.body);
    expect(body).toMatchObject({ email: 'a@b.co', source: 'ar_waitlist_ar', language: 'ar' });
    expect(capture).toHaveBeenCalledWith('waitlist_submitted', expect.objectContaining({ source: 'ar_waitlist_ar' }));
  });

  it('shows the error state and keeps the form when the server fails', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }) as typeof fetch;
    render(<WaitlistForm source="ar_waitlist_en" language="en" copy={copy} />);
    fill('a@b.co');

    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong');
    expect(screen.getByRole('button', { name: 'Notify me' })).toBeEnabled();
    expect(capture).not.toHaveBeenCalledWith('waitlist_submitted', expect.anything());
  });

  it('shows the consent line next to the field', () => {
    render(<WaitlistForm source="ar_waitlist_ar" language="ar" copy={copy} />);
    expect(screen.getByText('One email when it launches.')).toBeInTheDocument();
  });

  it('does not submit twice while a request is in flight', async () => {
    let resolve!: (v: unknown) => void;
    global.fetch = vi.fn(() => new Promise((r) => { resolve = r; })) as unknown as typeof fetch;
    render(<WaitlistForm source="ar_waitlist_ar" language="ar" copy={copy} />);
    fill('a@b.co');
    fireEvent.click(screen.getByRole('button', { name: 'Notify me' }));
    expect(global.fetch).toHaveBeenCalledTimes(1);
    resolve({ ok: true, json: async () => ({}) });
    await waitFor(() => expect(screen.getByText('You are on the list')).toBeInTheDocument());
  });
});
