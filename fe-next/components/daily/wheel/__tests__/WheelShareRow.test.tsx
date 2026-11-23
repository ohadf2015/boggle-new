import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';

import WheelShareRow from '../WheelShareRow';

const t = (key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key;

const base = { t, score: 42, wordsFound: ['ANT', 'GAIN'], puzzleNumber: 285 };

describe('WheelShareRow', () => {
  it('Given no words, When rendered, Then there is nothing to share', () => {
    const { container } = render(<WheelShareRow {...base} wordsFound={[]} score={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('Given a run, When copy is tapped, Then the share text has no emoji and links home', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const onShareClick = vi.fn();
    render(<WheelShareRow {...base} onShareClick={onShareClick} />);
    expect(screen.getByTestId('word-wheel-share')).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'share.emojiCard.copy' }));
    });
    expect(onShareClick).toHaveBeenCalledWith('copy');
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('lexiclash.live');
    expect(text).not.toMatch(/\p{Extended_Pictographic}/u);
  });

  it('Given the golden word was found, When copied, Then the text says so without revealing the word', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    render(<WheelShareRow {...base} wordsFound={['ANT', 'RETAINS']} goldenWord="RETAINS" />);
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'share.emojiCard.copy' }));
    });
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain('wordWheel.golden.share');
    expect(text).not.toContain('RETAINS');
  });

  describe('share button', () => {
    afterEach(() => {
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true, writable: true });
    });

    it('Given the user dismisses the share sheet, When share is tapped, Then nothing is copied', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      Object.defineProperty(navigator, 'share', {
        value: vi.fn().mockRejectedValue(new DOMException('x', 'AbortError')),
        configurable: true,
        writable: true,
      });
      render(<WheelShareRow {...base} />);
      await act(async () => {
        fireEvent.click(screen.getByText('share.emojiCard.share'));
      });
      expect(writeText).not.toHaveBeenCalled();
      expect(screen.queryByText('common.copied')).toBeNull();
    });

    it('Given no native share, When share is tapped, Then the text is copied and the copied state shows', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      Object.defineProperty(navigator, 'share', { value: undefined, configurable: true, writable: true });
      const onShareClick = vi.fn();
      render(<WheelShareRow {...base} onShareClick={onShareClick} />);
      await act(async () => {
        fireEvent.click(screen.getByText('share.emojiCard.share'));
      });
      expect(onShareClick).toHaveBeenCalledWith('copy');
      expect(writeText).toHaveBeenCalledOnce();
      expect(screen.getAllByText('common.copied').length).toBeGreaterThan(0);
    });
  });
});
