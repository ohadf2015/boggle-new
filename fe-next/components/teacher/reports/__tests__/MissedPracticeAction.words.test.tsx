import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));
vi.mock('@/utils/growthTracking', () => ({ trackGrowthEvent: vi.fn() }));
const fetchWithAuth = vi.fn(async () => ({ status: 200, ok: true, json: async () => ({ ok: true, words: ['a'], rounds: [] }) }));
vi.mock('@/utils/authFetch', () => ({ fetchWithAuth: (...a: unknown[]) => fetchWithAuth(...(a as [])) }));

import { MissedPracticeAction } from '../MissedPracticeAction';

const sentBody = () => JSON.parse((fetchWithAuth.mock.calls[0] as unknown as [string, { body: string }])[1].body);

beforeEach(() => fetchWithAuth.mockClear());

describe('MissedPracticeAction words', () => {
  it('given words from one round, then exactly those words are assigned', async () => {
    render(<MissedPracticeAction classroomId="c1" classroomName="7B" locked={false} words={['enormous', 'fragile']} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    expect(sentBody().words).toEqual(['enormous', 'fragile']);
  });

  it('given no words, then the server picks the class\'s missed words as before', async () => {
    render(<MissedPracticeAction classroomId="c1" classroomName="7B" locked={false} />);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(fetchWithAuth).toHaveBeenCalled());
    expect(sentBody()).not.toHaveProperty('words');
  });
});
