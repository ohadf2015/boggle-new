/**
 * Phase 2 C analytics tests — modal dismiss / CTA tracking.
 *
 * When `analyticsId` prop set, ConfirmationDialog emits a single
 * `modal_interaction` growth event with an `action` discriminator:
 *   - 'shown'     → open transitions false→true
 *   - 'dismissed' → open transitions true→false WITHOUT confirm click
 *   - 'confirmed' → confirm button clicked (close-transition suppressed)
 *
 * Opt-in: no analyticsId → zero events (preserves existing callers).
 */

import React, { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ConfirmationDialog } from '../ConfirmationDialog';
import { trackModalInteraction } from '@/utils/growthTracking';

vi.mock('@/utils/growthTracking', () => ({
  trackGrowthEvent: vi.fn(),
  trackModalInteraction: vi.fn(),
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    dir: 'ltr',
    t: (key: string) => key,
  }),
}));

vi.mock('../../../lib/utils', () => ({
  cn: (...classes: unknown[]) => classes.filter(Boolean).join(' '),
}));

const CloseCtx = React.createContext<() => void>(() => {});

vi.mock('@radix-ui/react-alert-dialog', () => ({
  Root: ({ children, open, onOpenChange }: { children: React.ReactNode; open?: boolean; onOpenChange?: (o: boolean) => void }) =>
    open ? (
      <CloseCtx.Provider value={() => onOpenChange?.(false)}>
        <div data-testid="dialog-root">{children}</div>
      </CloseCtx.Provider>
    ) : null,
  Trigger: ({ children }: { children: React.ReactNode }) => <button>{children}</button>,
  Portal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Overlay: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Content: ({ children, ...props }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content" {...props}>{children}</div>
  ),
  Title: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  Description: ({ children }: { children: React.ReactNode }) => <p>{children}</p>,
  Header: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Footer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Action: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => {
    const close = React.useContext(CloseCtx);
    return (
      <button data-testid="dialog-action" onClick={() => { onClick?.(); close(); }}>
        {children}
      </button>
    );
  },
  Cancel: ({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) => {
    const close = React.useContext(CloseCtx);
    return (
      <button data-testid="dialog-cancel" onClick={() => { onClick?.(); close(); }}>
        {children}
      </button>
    );
  },
}));

const mockedTrack = trackModalInteraction as unknown as ReturnType<typeof vi.fn>;

function Harness({ analyticsId, onConfirm }: { analyticsId?: string; onConfirm?: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button data-testid="open-btn" onClick={() => setOpen(true)}>open</button>
      <ConfirmationDialog
        open={open}
        onOpenChange={setOpen}
        title="Quit?"
        description="Sure?"
        onConfirm={() => { onConfirm?.(); setOpen(false); }}
        analyticsId={analyticsId}
      />
    </>
  );
}

describe('ConfirmationDialog analytics', () => {
  beforeEach(() => {
    mockedTrack.mockClear();
  });

  it('emits no events when analyticsId absent (opt-in)', () => {
    render(<Harness />);
    act(() => { fireEvent.click(screen.getByTestId('open-btn')); });
    fireEvent.click(screen.getByTestId('dialog-cancel'));
    expect(mockedTrack).not.toHaveBeenCalled();
  });

  it('fires shown on open transition', () => {
    render(<Harness analyticsId="quit_confirm" />);
    act(() => { fireEvent.click(screen.getByTestId('open-btn')); });
    expect(mockedTrack).toHaveBeenCalledWith('quit_confirm', 'shown', undefined);
  });

  it('fires dismissed on cancel click', () => {
    render(<Harness analyticsId="quit_confirm" />);
    act(() => { fireEvent.click(screen.getByTestId('open-btn')); });
    mockedTrack.mockClear();
    act(() => { fireEvent.click(screen.getByTestId('dialog-cancel')); });
    expect(mockedTrack).toHaveBeenCalledWith('quit_confirm', 'dismissed', undefined);
  });

  it('fires confirmed on confirm click and does NOT fire dismissed', () => {
    const onConfirm = vi.fn();
    render(<Harness analyticsId="quit_confirm" onConfirm={onConfirm} />);
    act(() => { fireEvent.click(screen.getByTestId('open-btn')); });
    mockedTrack.mockClear();
    act(() => { fireEvent.click(screen.getByTestId('dialog-action')); });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    const actions = mockedTrack.mock.calls.map((c: unknown[]) => c[1]);
    expect(actions).toContain('confirmed');
    expect(actions).not.toContain('dismissed');
  });
});
