/**
 * EmailSignupForm — footer inline email capture
 *
 * Tests: form rendering, email validation, successful submission, error state,
 * and CrazyGames platform suppression.
 *
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import EmailSignupForm from '../EmailSignupForm';

const mockT = vi.fn((key: string, fallback?: string) =>
  typeof fallback === 'string' ? fallback : key,
);

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: mockT,
    language: 'en',
    dir: 'ltr',
  }),
}));

const mockIsCrazyGames = vi.fn(() => false);

vi.mock('@/components/CrazyGamesSDK', () => ({
  useCrazyGames: () => ({ isOnCrazyGamesPlatform: mockIsCrazyGames() }),
}));

vi.mock('../SocialMediaPixels', () => ({
  socialEvents: { completeRegistration: vi.fn() },
}));

describe('EmailSignupForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('renders email input and subscribe button', () => {
    render(<EmailSignupForm />);
    expect(screen.getByPlaceholderText('email.placeholder')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'email.submit' })).toBeInTheDocument();
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    render(<EmailSignupForm />);

    await user.type(screen.getByPlaceholderText('email.placeholder'), 'not-an-email');
    await user.click(screen.getByRole('button', { name: 'email.submit' }));

    expect(mockT).toHaveBeenCalledWith('validation.invalidEmail');
  });

  it('submits email and shows success state', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
    });
    const user = userEvent.setup();
    render(<EmailSignupForm />);

    await user.type(screen.getByPlaceholderText('email.placeholder'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'email.submit' }));

    await waitFor(() => {
      expect(screen.getByText('email.successTitle')).toBeInTheDocument();
    });
    expect(global.fetch).toHaveBeenCalledWith('/api/subscribe-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: expect.stringContaining('test@example.com'),
    });
  });

  it('shows error message on subscription failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));
    const user = userEvent.setup();
    render(<EmailSignupForm />);

    await user.type(screen.getByPlaceholderText('email.placeholder'), 'test@example.com');
    await user.click(screen.getByRole('button', { name: 'email.submit' }));

    await waitFor(() => {
      expect(mockT).toHaveBeenCalledWith('error.subscriptionFailed');
    });
  });

  it('returns null on CrazyGames platform', () => {
    mockIsCrazyGames.mockReturnValueOnce(true);
    const { container } = render(<EmailSignupForm />);
    expect(container.firstChild).toBeNull();
  });
});