import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import BridgeShareRow from '../BridgeShareRow';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

function setNav(share: unknown, writeText: unknown) {
  Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true });
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

describe('BridgeShareRow', () => {
  afterEach(() => setNav(undefined, undefined));

  it('Given the user dismisses the share sheet, When share is tapped, Then nothing is copied', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNav(vi.fn().mockRejectedValue(new DOMException('x', 'AbortError')), writeText);
    render(<BridgeShareRow shareText="Bridge 1" />);
    await act(async () => {
      fireEvent.click(screen.getByText('share.emojiCard.share'));
    });
    expect(writeText).not.toHaveBeenCalled();
    expect(screen.queryByText('common.copied')).toBeNull();
  });

  it('Given no native share, When share is tapped, Then text is copied and the copied state shows', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    setNav(undefined, writeText);
    const onShareClick = vi.fn();
    render(<BridgeShareRow shareText="Bridge 1" onShareClick={onShareClick} />);
    await act(async () => {
      fireEvent.click(screen.getByText('share.emojiCard.share'));
    });
    expect(writeText).toHaveBeenCalledWith('Bridge 1');
    expect(onShareClick).toHaveBeenCalledWith('copy');
    expect(screen.getByText('common.copied')).toBeInTheDocument();
  });
});
