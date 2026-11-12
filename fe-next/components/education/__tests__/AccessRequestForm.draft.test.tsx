import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const nav = vi.hoisted(() => ({ push: vi.fn(), replace: vi.fn() }));
const auth = vi.hoisted(() => ({ user: { id: 'teacher-a' } as { id: string } | null }));
vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k, language: 'en' }) }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ refreshProfile: vi.fn(async () => {}), user: auth.user }) }));
vi.mock('next/navigation', () => ({ useRouter: () => nav }));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));

import { AccessRequestForm, ACCESS_DRAFT_MAX_AGE_MS, accessDraftKey } from '../AccessRequestForm';

const REASON = 'Friday vocab battles with my class';
const KEY_A = accessDraftKey('teacher-a');
const reasonBox = () => screen.getByRole('textbox');
const stored = (key = KEY_A) => JSON.parse(localStorage.getItem(key) ?? 'null');
const save = (key: string, draft: Record<string, unknown>) => localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), ...draft }));

describe('<AccessRequestForm> keeps what the teacher typed across a sign-in round-trip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
    auth.user = { id: 'teacher-a' };
  });

  it('Given the teacher types a reason and picks a role, Then both are saved under her own account', () => {
    render(<AccessRequestForm />);
    fireEvent.change(reasonBox(), { target: { value: REASON } });
    fireEvent.click(screen.getByRole('radio', { name: /role_tutor/ }));
    expect(stored()).toMatchObject({ useCase: REASON, role: 'tutor', savedAt: expect.any(Number) });
  });

  it('Given her saved draft, When the form opens again, Then it is prefilled and ready to send', () => {
    save(KEY_A, { useCase: REASON, role: 'parent' });
    render(<AccessRequestForm />);
    expect(reasonBox()).toHaveValue(REASON);
    expect(screen.getByRole('radio', { name: /role_parent/ })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('button', { name: /education\.trial\.cta/ })).toBeEnabled();
  });

  it('Given another teacher left a draft on this computer, When a different teacher opens the form, Then she sees an empty form', () => {
    save(KEY_A, { useCase: REASON, role: 'parent' });
    auth.user = { id: 'teacher-b' };
    render(<AccessRequestForm />);
    expect(reasonBox()).toHaveValue('');
  });

  it('Given no signed-in user id, Then nothing is read or saved', () => {
    auth.user = null;
    save(KEY_A, { useCase: REASON, role: null });
    render(<AccessRequestForm />);
    expect(reasonBox()).toHaveValue('');
    fireEvent.change(reasonBox(), { target: { value: 'something else entirely' } });
    const keys = Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i));
    expect(keys).toEqual([KEY_A]);
    expect(stored()).toMatchObject({ useCase: REASON });
  });

  it('Given a draft older than seven days, Then the form opens empty and the old draft is dropped', () => {
    localStorage.setItem(KEY_A, JSON.stringify({ useCase: REASON, role: null, savedAt: Date.now() - ACCESS_DRAFT_MAX_AGE_MS - 1 }));
    render(<AccessRequestForm />);
    expect(reasonBox()).toHaveValue('');
    expect(localStorage.getItem(KEY_A)).toBeNull();
  });

  it('Given a draft, When the request is sent and accepted, Then the draft is cleared', async () => {
    save(KEY_A, { useCase: REASON, role: null });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) })));
    render(<AccessRequestForm />);
    fireEvent.click(screen.getByRole('button', { name: /education\.trial\.cta/ }));
    await waitFor(() => expect(localStorage.getItem(KEY_A)).toBeNull());
  });

  it('Given the send fails, Then the draft stays for the next try', async () => {
    save(KEY_A, { useCase: REASON, role: null });
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({}) })));
    render(<AccessRequestForm />);
    fireEvent.click(screen.getByRole('button', { name: /education\.trial\.cta/ }));
    await screen.findByRole('alert');
    expect(stored()).toMatchObject({ useCase: REASON, role: null });
  });

  it('Given a corrupt draft or blocked storage, Then the form opens empty instead of crashing', () => {
    localStorage.setItem(KEY_A, '{not json');
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
