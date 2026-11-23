import { describe, it, expect } from 'vitest';
import { renderHook, act, screen } from '@testing-library/react';
import React from 'react';
import { GameAnnouncerProvider, useAnnouncer } from '../GameAnnouncer';

describe('GameAnnouncer rejected word', () => {
  it('given a localized reason, it reads the word and that reason with no English prefix', () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => <GameAnnouncerProvider>{children}</GameAnnouncerProvider>;
    const { result } = renderHook(() => useAnnouncer(), { wrapper });
    act(() => { result.current.announceWordResult('ANUAL', false, undefined, 'לא במילון שלנו'); });
    const text = screen.getByRole('alert', { hidden: true }).textContent;
    expect(text).toBe('ANUAL: לא במילון שלנו');
  });
});
