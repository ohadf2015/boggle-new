/**
 * WordCraftTutor — pill is ALWAYS visible; the full card renders as a modal
 * overlay on first visit and after the pill is clicked. Dismiss closes only
 * the overlay, persists in localStorage, and the pill stays.
 */

import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { WordCraftTutor } from '../WordCraftTutor';

const labels = {
  title: 'How to play',
  step1: 'Tap a letter',
  step2: 'Tap a square',
  step3: 'Submit',
  tipFirst: 'Cover the star',
  tipScore: 'Bonus squares',
  dismiss: 'Got it!',
  show: 'How to play',
};

describe('WordCraftTutor', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders the modal overlay on first visit (no dismissed flag)', () => {
    const { findByRole, getByText } = render(<WordCraftTutor labels={labels} />);
    return findByRole('dialog').then((dialog) => {
      expect(dialog).toBeInTheDocument();
      expect(getByText('Tap a letter')).toBeInTheDocument();
      expect(getByText('Tap a square')).toBeInTheDocument();
    });
  });

  it('dismiss closes overlay; pill remains and persists across mounts', async () => {
    const { findByRole, getByLabelText, queryByRole, unmount } = render(<WordCraftTutor labels={labels} />);
    await findByRole('dialog');
    fireEvent.click(getByLabelText('Got it!'));
    expect(queryByRole('dialog')).toBeNull();
    // Pill button still present
    expect(getByLabelText('How to play')).toBeInTheDocument();

    unmount();
    const remount = render(<WordCraftTutor labels={labels} />);
    // After remount, no dialog (still dismissed) but pill renders
    expect(remount.queryByRole('dialog')).toBeNull();
    expect(remount.getByLabelText('How to play')).toBeInTheDocument();
  });

  it('clicking the pill reopens the dialog after dismiss', () => {
    localStorage.setItem('wc_tutor_dismissed_v2', '1');
    const { getByLabelText, queryByRole, getByText } = render(<WordCraftTutor labels={labels} />);
    expect(queryByRole('dialog')).toBeNull();
    fireEvent.click(getByLabelText('How to play'));
    expect(queryByRole('dialog')).not.toBeNull();
    expect(getByText('Tap a letter')).toBeInTheDocument();
  });
});
