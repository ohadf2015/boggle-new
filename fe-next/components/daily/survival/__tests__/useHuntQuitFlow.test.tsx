import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const guardCalls: Array<{ enabled: boolean; leaving?: boolean }> = [];
vi.mock('@/hooks/useNavigationGuard', () => ({
  useNavigationGuard: (opts: { enabled: boolean; leaving?: boolean }) => {
    guardCalls.push(opts);
  },
}));

vi.mock('@/components/ui/ConfirmationDialog', () => ({
  ConfirmationDialog: ({ open, onConfirm, title }: { open: boolean; onConfirm: () => void; title: string }) =>
    open ? <button type="button" data-testid="confirm-quit" onClick={onConfirm}>{title}</button> : null,
}));

vi.mock('@/utils/logger', () => ({ default: { error: vi.fn() } }));

import { useHuntQuitFlow, type UseHuntQuitFlowArgs } from '../useHuntQuitFlow';

const t = (key: string) => key;

function Harness(props: Omit<UseHuntQuitFlowArgs, 't' | 'setShowQuitConfirm'> & { setShowQuitConfirm?: (open: boolean) => void }) {
  const { quitDialog, handleQuitClick } = useHuntQuitFlow({ t, setShowQuitConfirm: vi.fn(), ...props });
  return (
    <>
      <button type="button" data-testid="quit" onClick={handleQuitClick} />
      {quitDialog}
    </>
  );
}

const base = { practice: false, language: 'en' as const, isGameOver: false, showQuitConfirm: true, quitStaysOnPage: false };

describe('useHuntQuitFlow', () => {
  beforeEach(() => {
    guardCalls.length = 0;
  });

  it('Given the dialog is open, When the player confirms, Then it closes, disarms the guard and calls onQuit', () => {
    const onQuit = vi.fn();
    const setShowQuitConfirm = vi.fn();
    render(<Harness {...base} onQuit={onQuit} setShowQuitConfirm={setShowQuitConfirm} />);
    expect(guardCalls.at(-1)).toMatchObject({ enabled: true, leaving: false });

    fireEvent.click(screen.getByTestId('confirm-quit'));

    expect(setShowQuitConfirm).toHaveBeenCalledWith(false);
    expect(onQuit).toHaveBeenCalledTimes(1);
    expect(guardCalls.at(-1)).toMatchObject({ enabled: false, leaving: true });
  });

  it('Given Quick Play stays on the page, When the player quits, Then the guard pops its phantom entry', () => {
    render(<Harness {...base} quitStaysOnPage onQuit={vi.fn()} />);
    fireEvent.click(screen.getByTestId('confirm-quit'));
    expect(guardCalls.at(-1)).toMatchObject({ enabled: false, leaving: false });
  });

  it('Given onQuit throws, When the player confirms, Then it hard-navigates to the daily hub', () => {
    const assign = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', { configurable: true, value: { ...original, assign } });
    render(<Harness {...base} language="he" onQuit={() => { throw new Error('boom'); }} />);
    fireEvent.click(screen.getByTestId('confirm-quit'));
    expect(assign).toHaveBeenCalledWith('/he/daily');
    Object.defineProperty(window, 'location', { configurable: true, value: original });
  });

  it('Given the game is over, Then the guard is off', () => {
    render(<Harness {...base} isGameOver onQuit={vi.fn()} />);
    expect(guardCalls.at(-1)).toMatchObject({ enabled: false });
  });

  it('opens the dialog from the quit button', () => {
    const setShowQuitConfirm = vi.fn();
    render(<Harness {...base} showQuitConfirm={false} onQuit={vi.fn()} setShowQuitConfirm={setShowQuitConfirm} />);
    fireEvent.click(screen.getByTestId('quit'));
    expect(setShowQuitConfirm).toHaveBeenCalledWith(true);
  });
});
