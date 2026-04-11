import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AdventureToast from '../AdventureToast';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k, language: 'en' }),
}));

vi.mock('@/lib/adventure/upgradeEffects', () => ({
  getUpgradeVisualEffect: (id: string) => ({
    upgradeId: id,
    hudIcon: id === 'deepDrill' ? '⛏️' : '📦',
    triggerToastKey: `adventure.upgrades.toast.${id}`,
  }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => ({
  AdaptiveMotion: {
    div: ({ children, ...props }: any) => (
      <div
        role={props.role}
        aria-live={props['aria-live']}
        className={props.className}
        data-testid={props['data-testid']}
      >
        {children}
      </div>
    ),
  },
  AdaptiveAnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('AdventureToast', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders nothing when no props trigger a toast', () => {
    const { container } = render(
      <AdventureToast upgradeTriggered={null} lastWordWasThemed={false} />
    );
    expect(container.textContent).toBe('');
  });

  it('shows upgrade toast with icon and translation key when upgradeTriggered is set', () => {
    render(
      <AdventureToast
        upgradeTriggered={{ upgradeId: 'deepDrill', effectValue: 2 }}
        lastWordWasThemed={false}
      />
    );
    expect(screen.getByText(/⛏️/)).toBeInTheDocument();
    expect(screen.getByText('adventure.upgrades.toast.deepDrill')).toBeInTheDocument();
  });

  it('auto-dismisses upgrade toast after 2 seconds', () => {
    const { container } = render(
      <AdventureToast
        upgradeTriggered={{ upgradeId: 'deepDrill', effectValue: 2 }}
        lastWordWasThemed={false}
      />
    );
    expect(container.textContent).not.toBe('');
    act(() => { vi.advanceTimersByTime(2000); });
    expect(container.textContent).toBe('');
  });

  it('shows themed word toast when lastWordWasThemed is true', () => {
    render(
      <AdventureToast upgradeTriggered={null} lastWordWasThemed={true} themedBonusMultiplier={1.25} />
    );
    expect(screen.getByText(/adventure\.toast\.themedWord/)).toBeInTheDocument();
  });

  it('auto-dismisses themed toast after 1.5 seconds', () => {
    const { container } = render(
      <AdventureToast upgradeTriggered={null} lastWordWasThemed={true} />
    );
    expect(container.textContent).not.toBe('');
    act(() => { vi.advanceTimersByTime(1500); });
    expect(container.textContent).toBe('');
  });

  it('upgrade toast has role status and aria-live polite', () => {
    render(
      <AdventureToast
        upgradeTriggered={{ upgradeId: 'cargoBay', effectValue: 1 }}
        lastWordWasThemed={false}
      />
    );
    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });
});
