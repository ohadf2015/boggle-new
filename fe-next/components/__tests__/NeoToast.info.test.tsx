/**
 * NeoToast — info toast description + action button.
 * Extending neoInfoToast to cover the two remaining EnhancedToast call sites
 * (title+message, and title+message+click-to-open action) before retiring
 * the duplicate EnhancedToast/ToastContainer system.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Toaster, toast as hotToast } from 'react-hot-toast';
import { neoInfoToast } from '../NeoToast';

describe('neoInfoToast', () => {
  // react-hot-toast keeps toasts in a module-level store independent of
  // React's render tree — clear it between tests so a prior test's toast
  // doesn't linger and satisfy/break the next test's queries.
  afterEach(() => {
    hotToast.remove();
  });

  it('renders the message alone when no description or action given', async () => {
    render(<Toaster />);
    neoInfoToast('Just info');
    await waitFor(() => expect(screen.getByText('Just info')).toBeInTheDocument());
  });

  it('renders an optional description line below the message', async () => {
    render(<Toaster />);
    neoInfoToast('New message from Alex', { description: 'Hey, are you around?' });
    await waitFor(() => expect(screen.getByText('New message from Alex')).toBeInTheDocument());
    expect(screen.getByText('Hey, are you around?')).toBeInTheDocument();
  });

  it('renders an action button that fires its callback and dismisses the toast', async () => {
    const onClick = vi.fn();
    render(<Toaster />);
    neoInfoToast('New message from Alex', {
      description: 'Hey, are you around?',
      action: { label: 'Open', onClick },
    });
    await waitFor(() => expect(screen.getByText('Open')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Open'));
    expect(onClick).toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText('New message from Alex')).not.toBeInTheDocument());
  });
});
