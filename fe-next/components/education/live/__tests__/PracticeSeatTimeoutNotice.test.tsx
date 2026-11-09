import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { PracticeSeatTimeoutNotice } from '../PracticeSeatTimeoutNotice';

const t = (key: string) => key;

describe('PracticeSeatTimeoutNotice', () => {
  it('given the seat never joined, then the teacher can start with bots only or try again', () => {
    const onBotsOnly = vi.fn();
    const onRetry = vi.fn();
    render(<PracticeSeatTimeoutNotice onBotsOnly={onBotsOnly} onRetry={onRetry} t={t} />);
    expect(screen.getByRole('alert')).toHaveTextContent('eduLiveRoom.practice.seatTimeout');
    fireEvent.click(screen.getByTestId('practice-seat-bots-only'));
    fireEvent.click(screen.getByTestId('practice-seat-retry'));
    expect(onBotsOnly).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('practice-seat-bots-only')).toHaveTextContent('eduLiveRoom.practice.botsOnly');
    expect(screen.getByTestId('practice-seat-retry')).toHaveTextContent('eduLiveRoom.practice.retry');
  });
});
