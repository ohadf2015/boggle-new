import { describe, it, expect, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClassSetupInviteCode } from '../ClassSetupInviteCode';

const t = (k: string) => k;
const props = { code: 'KITE43', className: 'Room 12', joinUrl: 'https://www.lexiclash.live/en/join/KITE43', displayHost: 'lexiclash.live/en/join', t };

describe('<ClassSetupInviteCode> tap to copy', () => {
  it('GIVEN the code is tapped THEN the link is shared as a copy and the card says Copied', async () => {
    const onShare = vi.fn().mockResolvedValue(true);
    render(<ClassSetupInviteCode {...props} onShare={onShare} />);
    fireEvent.click(screen.getByTestId('setup-code-copy'));
    expect(onShare).toHaveBeenCalledWith('copy', expect.objectContaining({ url: props.joinUrl }));
    await waitFor(() => expect(screen.getByTestId('setup-copy-link')).toHaveTextContent('eduShell.setup.copied'));
    expect(screen.getByTestId('setup-code-copy')).toHaveTextContent('KITE43');
  });

  it('GIVEN the copy failed THEN nothing claims it was copied', async () => {
    const onShare = vi.fn().mockResolvedValue(false);
    render(<ClassSetupInviteCode {...props} onShare={onShare} />);
    fireEvent.click(screen.getByTestId('setup-copy-link'));
    await waitFor(() => expect(onShare).toHaveBeenCalled());
    expect(screen.getByTestId('setup-copy-link')).toHaveTextContent('eduShell.setup.copyLink');
  });

  it('GIVEN no join link yet THEN the code is plain text, not a copy button', () => {
    render(<ClassSetupInviteCode {...props} joinUrl="" onShare={vi.fn()} />);
    expect(screen.queryByTestId('setup-code-copy')).not.toBeInTheDocument();
    expect(screen.getByTestId('setup-join-code')).toHaveTextContent('KITE43');
  });
});
