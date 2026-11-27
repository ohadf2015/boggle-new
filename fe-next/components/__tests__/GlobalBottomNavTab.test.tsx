import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { Home } from 'lucide-react';
import { GlobalBottomNavTab } from '../GlobalBottomNavTab';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

const tab = { id: 'home', labelKey: 'nav.home', icon: Home, color: 'text-neo-cyan', glowColor: 'bg-neo-cyan/15' };

describe('GlobalBottomNavTab', () => {
  it('sinks while pressed and springs back on release, with transform only', () => {
    const onSelect = vi.fn();
    render(<GlobalBottomNavTab tab={tab} isActive={false} indicatorClass="bg-neo-cyan" onSelect={onSelect} questsCompleted={0} questTotal={3} socialBadgeCount={0} navTier={null} />);
    const button = screen.getByRole('button', { name: 'nav.home' });
    fireEvent.pointerDown(button, { button: 0 });
    expect(button).toHaveAttribute('data-pressed', 'true');
    fireEvent.pointerUp(button);
    expect(button).not.toHaveAttribute('data-pressed');
    fireEvent.click(button);
    expect(onSelect).toHaveBeenCalledWith('home');
    expect(button.className).not.toContain('transition-all');
  });

  it('marks the active tab and keeps the badge test ids', () => {
    render(<GlobalBottomNavTab tab={{ ...tab, id: 'quests' }} isActive indicatorClass="bg-neo-lime" onSelect={vi.fn()} questsCompleted={2} questTotal={3} socialBadgeCount={0} navTier={null} />);
    expect(screen.getByRole('button', { name: 'nav.home' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByTestId('quest-progress-badge')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-nav-indicator')).toBeInTheDocument();
  });
});
