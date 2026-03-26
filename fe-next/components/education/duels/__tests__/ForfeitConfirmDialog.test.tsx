import { render, screen, fireEvent } from '@testing-library/react';
import { ForfeitConfirmDialog } from '../ForfeitConfirmDialog';

// Mock useLanguage
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
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

// Mock Radix AlertDialog
vi.mock('@radix-ui/react-alert-dialog', () => ({
  Root: ({ children, open }: any) => (open ? <div data-testid="dialog-root">{children}</div> : null),
  Portal: ({ children }: any) => <div data-testid="dialog-portal">{children}</div>,
  Overlay: ({ children, ...props }: any) => <div data-testid="dialog-overlay" {...props}>{children}</div>,
  Content: ({ children, ...props }: any) => <div data-testid="dialog-content" {...props}>{children}</div>,
  Title: ({ children, ...props }: any) => <h2 data-testid="dialog-title" {...props}>{children}</h2>,
  Description: ({ children, ...props }: any) => <p data-testid="dialog-description" {...props}>{children}</p>,
  Action: ({ children, onClick, ...props }: any) => (
    <button data-testid="dialog-action" onClick={onClick} {...props}>
      {children}
    </button>
  ),
  Cancel: ({ children, onClick, ...props }: any) => (
    <button data-testid="dialog-cancel" onClick={onClick} {...props}>
      {children}
    </button>
  ),
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
