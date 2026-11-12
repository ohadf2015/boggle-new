import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ refreshProfile: vi.fn(async () => {}) }) }));
vi.mock('next/navigation', () => ({ useRouter: () => nav }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { AccessRequestForm, ACCESS_DRAFT_KEY } from '../AccessRequestForm';

const REASON = 'Friday vocab battles with my class';
const reasonBox = () => screen.getByRole('textbox');
const stored = () => JSON.parse(localStorage.getItem(ACCESS_DRAFT_KEY) ?? 'null');

describe('<AccessRequestForm> keeps what the teacher typed across a sign-in round-trip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('Given the teacher types a reason and picks a role, Then both are saved as a draft', () => {
    render(<AccessRequestForm />);
    fireEvent.change(reasonBox(), { target: { value: REASON } });
    fireEvent.click(screen.getByRole('radio', { name: /role_tutor/ }));
    expect(stored()).toEqual({ useCase: REASON, role: 'tutor' });
  });

  it('Given a saved draft, When the form opens again, Then it is prefilled and ready to send', () => {
    localStorage.setItem(ACCESS_DRAFT_KEY, JSON.stringify({ useCase: REASON, role: 'parent' }));
    render(<AccessRequestForm />);
    expect(reasonBox()).toHaveValue(REASON);
    expect(screen.getByRole('radio', { name: /role_parent/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /education\.trial\.cta/ })).toBeEnabled();
  });

  it('Given a draft, When the request is sent and accepted, Then the draft is cleared', async () => {
    localStorage.setItem(ACCESS_DRAFT_KEY, JSON.stringify({ useCase: REASON, role: null }));
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) })));
    render(<AccessRequestForm />);
    fireEvent.click(screen.getByRole('button', { name: /education\.trial\.cta/ }));
    await waitFor(() => expect(localStorage.getItem(ACCESS_DRAFT_KEY)).toBeNull());
  });

  it('Given the send fails, Then the draft stays for the next try', async () => {
    localStorage.setItem(ACCESS_DRAFT_KEY, JSON.stringify({ useCase: REASON, role: null }));
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    render(<AccessRequestForm />);
    fireEvent.click(screen.getByRole('button', { name: /education\.trial\.cta/ }));
    await screen.findByRole('alert');
    expect(stored()).toEqual({ useCase: REASON, role: null });
  });

  it('Given a corrupt draft or blocked storage, Then the form opens empty instead of crashing', () => {
    localStorage.setItem(ACCESS_DRAFT_KEY, '{not json');
    render(<AccessRequestForm />);
    expect(reasonBox()).toHaveValue('');
    const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    render(<AccessRequestForm />);
    fireEvent.change(screen.getAllByRole('textbox')[1], { target: { value: REASON } });
    expect(screen.getAllByRole('textbox')[1]).toHaveValue(REASON);
    getItem.mockRestore();
    setItem.mockRestore();
  });
});
