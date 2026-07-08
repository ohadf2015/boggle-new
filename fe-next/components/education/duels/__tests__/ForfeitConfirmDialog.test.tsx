import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ForfeitConfirmDialog } from '../ForfeitConfirmDialog';

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    dir: 'ltr',
    t: (key: string) => {
      const translations: Record<string, string> = {
        'duels.forfeitTitle': 'Forfeit Duel?',
        'duels.forfeitDescription': "You'll lose and opponent wins. Can't be undone.",
        'duels.forfeitConfirm': 'Forfeit',
        'duels.forfeitCancel': 'Cancel',
      };
      return translations[key] || key;
    },
  }),
}));

vi.mock('@/utils/growthTracking', () => ({
  trackModalInteraction: vi.fn(),
}));

// Mock Radix AlertDialog — ForfeitConfirmDialog now delegates to the shared
// ConfirmationDialog, which routes through components/ui/alert-dialog.tsx.
// Cancel/Action dismiss via Radix's internal Root<->Cancel wiring (no onClick
// prop is ever passed to AlertDialogCancel), so the mock replicates that via
// a close-context provider — same pattern as ConfirmationDialog.analytics.test.tsx.
const CloseCtx = React.createContext<() => void>(() => {});

vi.mock('@radix-ui/react-alert-dialog', () => ({
  Root: ({ children, open, onOpenChange }: any) =>
    open ? (
      <CloseCtx.Provider value={() => onOpenChange?.(false)}>
        <div data-testid="dialog-root">{children}</div>
      </CloseCtx.Provider>
    ) : null,
  Trigger: ({ children }: any) => <button>{children}</button>,
  Portal: ({ children }: any) => <div data-testid="dialog-portal">{children}</div>,
  Overlay: ({ children, ...props }: any) => <div data-testid="dialog-overlay" {...props}>{children}</div>,
  Content: ({ children, ...props }: any) => <div data-testid="forfeit-dialog" {...props}>{children}</div>,
  Title: ({ children, ...props }: any) => <h2 data-testid="dialog-title" {...props}>{children}</h2>,
  Description: ({ children, ...props }: any) => <p data-testid="dialog-description" {...props}>{children}</p>,
  Action: ({ children, onClick, ...props }: any) => {
    const close = React.useContext(CloseCtx);
    return (
      <button data-testid="dialog-action" onClick={() => { onClick?.(); close(); }} {...props}>
        {children}
      </button>
    );
  },
  Cancel: ({ children, onClick, ...props }: any) => {
    const close = React.useContext(CloseCtx);
    return (
      <button data-testid="dialog-cancel" onClick={() => { onClick?.(); close(); }} {...props}>
        {children}
      </button>
    );
  },
}));

describe('ForfeitConfirmDialog', () => {
  it('should not render when open is false', () => {
    render(
      <ForfeitConfirmDialog
        open={false}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.queryByTestId('forfeit-dialog')).not.toBeInTheDocument();
  });

  it('should render when open is true', () => {
    render(
      <ForfeitConfirmDialog
        open={true}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByTestId('forfeit-dialog')).toBeInTheDocument();
    expect(screen.getByText('Forfeit Duel?')).toBeInTheDocument();
    expect(screen.getByText("You'll lose and opponent wins. Can't be undone.")).toBeInTheDocument();
  });

  it('should call onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ForfeitConfirmDialog
        open={true}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    const confirmButton = screen.getByText('Forfeit');
    fireEvent.click(confirmButton);

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when cancel button clicked', () => {
    const onCancel = vi.fn();
    render(
      <ForfeitConfirmDialog
        open={true}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);

    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
