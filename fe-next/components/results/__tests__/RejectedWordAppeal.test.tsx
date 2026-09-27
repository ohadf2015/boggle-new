/**
 * RejectedWordAppeal — solo/daily parity for the multiplayer appeal affordance.
 *
 * Multiplayer players can already appeal a word the dictionary refused
 * (WordPointsGroup). Daily and solo players could not — an asymmetric path
 * (rules/60-recurring-pitfalls Class 3) sitting on the genre's loudest complaint.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RejectedWordAppeal } from '../RejectedWordAppeal';
import { clearRejectedWords, recordNotInDictionary, recordNotOnBoard } from '@/utils/invalidWordTracker';

const t = (key: string) => key;

describe('RejectedWordAppeal', () => {
  beforeEach(() => {
    clearRejectedWords();
    global.fetch = vi.fn(() =>
      Promise.resolve({ ok: true, json: () => Promise.resolve({ success: true }) })
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    clearRejectedWords();
    vi.clearAllMocks();
  });

  it('renders nothing when no word was rejected', () => {
    const { container } = render(<RejectedWordAppeal language="en" t={t} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for words rejected only for not being on the board', () => {
    recordNotOnBoard('zebra', 'en', 'daily_word_hunt');

    const { container } = render(<RejectedWordAppeal language="en" t={t} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('lists each dictionary-rejected word with an appeal button', () => {
    recordNotInDictionary('quixotry', 'en', 'daily_word_hunt');
    recordNotInDictionary('zyzzyva', 'en', 'daily_word_hunt');

    render(<RejectedWordAppeal language="en" t={t} />);

    expect(screen.getByText('QUIXOTRY')).toBeInTheDocument();
    expect(screen.getByText('ZYZZYVA')).toBeInTheDocument();
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('omits words too short for the API to accept', () => {
    // /api/appeal-word rejects anything under 3 characters — don't offer a button
    // that is guaranteed to 400.
    recordNotInDictionary('ab', 'en', 'daily_word_hunt');

    const { container } = render(<RejectedWordAppeal language="en" t={t} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('POSTs the word and language when appealed', async () => {
    recordNotInDictionary('quixotry', 'en', 'daily_word_hunt');
    render(<RejectedWordAppeal language="en" t={t} />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/appeal-word', expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ word: 'quixotry', language: 'en' }),
      }));
    });
  });

  it('confirms the appeal and disables the button so it cannot be double-sent', async () => {
    recordNotInDictionary('quixotry', 'en', 'daily_word_hunt');
    render(<RejectedWordAppeal language="en" t={t} />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByRole('button')).toBeDisabled());
    expect(screen.getByText('results.appealed')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button'));
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('survives an API failure without crashing the results screen', async () => {
    global.fetch = vi.fn(() => Promise.reject(new Error('offline'))) as unknown as typeof fetch;
    recordNotInDictionary('quixotry', 'en', 'daily_word_hunt');
    render(<RejectedWordAppeal language="en" t={t} />);

    await userEvent.click(screen.getByRole('button'));

    await waitFor(() => expect(screen.getByRole('button')).toBeEnabled());
    expect(screen.getByText('QUIXOTRY')).toBeInTheDocument();
  });
});
