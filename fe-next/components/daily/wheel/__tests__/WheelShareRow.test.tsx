import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

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
});
