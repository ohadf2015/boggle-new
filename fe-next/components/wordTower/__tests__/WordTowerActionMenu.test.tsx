import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { WordTowerActionMenu } from '../WordTowerActionMenu';

afterEach(cleanup);

const t = (k: string) => k;

describe('WordTowerActionMenu — unseen-content dot', () => {
  it('shows NO dot when there is nothing new behind the button', () => {
    render(<WordTowerActionMenu t={t} noticeCount={0}><span /></WordTowerActionMenu>);
    expect(screen.queryByTestId('wt-menu-notice')).toBeNull();
  });

  it('badges the collapsed button when something new is inside (e.g. a fresh skin)', () => {
    render(<WordTowerActionMenu t={t} noticeCount={2}><span /></WordTowerActionMenu>);
    expect(screen.getByTestId('wt-menu-notice').textContent).toBe('2');
  });

  it('announces the count to screen readers on the button label', () => {
    render(<WordTowerActionMenu t={t} noticeCount={1}><span /></WordTowerActionMenu>);
    expect(screen.getByRole('button', { name: /wordTower\.hud\.menuNew/ })).toBeTruthy();
  });

  it('reports "seen" the moment the menu OPENS, not when it closes', () => {
    const onOpen = vi.fn();
    render(<WordTowerActionMenu t={t} noticeCount={1} onOpened={onOpen}><span /></WordTowerActionMenu>);
    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not re-fire the seen callback while closing', () => {
    const onOpen = vi.fn();
    render(<WordTowerActionMenu t={t} noticeCount={1} onOpened={onOpen}><span /></WordTowerActionMenu>);
    const btn = screen.getByRole('button');
    fireEvent.click(btn); // open
    fireEvent.click(btn); // close
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
