/**
 * Tests for AutoPromoteButton Component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

// Mock alert-dialog — interactive mock that responds to onOpenChange
vi.mock('@/components/ui/alert-dialog', () => {
  const DialogContext = React.createContext<{ open: boolean; setOpen: (v: boolean) => void }>({ open: false, setOpen: () => {} });

  return {
    AlertDialog: ({ children, open, onOpenChange }: React.PropsWithChildren<{ open?: boolean; onOpenChange?: (open: boolean) => void }>) => {
      return (
        <DialogContext.Provider value={{ open: !!open, setOpen: onOpenChange || (() => {}) }}>
          {children}
        </DialogContext.Provider>
      );
    },
    AlertDialogTrigger: Object.assign(
      ({ children, asChild }: React.PropsWithChildren<{ asChild?: boolean }>) => {
        const { setOpen } = React.useContext(DialogContext);
        if (asChild && React.isValidElement(children)) {
          return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
            onClick: () => setOpen(true),
          });
        }
        return <button onClick={() => setOpen(true)}>{children}</button>;
      },
      { displayName: 'AlertDialogTrigger' }
    ),
    AlertDialogContent: Object.assign(
      ({ children, className }: React.PropsWithChildren<{ className?: string }>) => {
        const { open } = React.useContext(DialogContext);
        if (!open) return null;
        return <div role="alertdialog" data-testid="alert-dialog-content" className={className}>{children}</div>;
      },
      { displayName: 'AlertDialogContent' }
    ),
    AlertDialogHeader: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    AlertDialogFooter: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    AlertDialogTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
    AlertDialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
    AlertDialogAction: ({ children, onClick }: React.PropsWithChildren<{ onClick?: () => void; className?: string }>) => (
      <button onClick={onClick} data-testid="confirm-action">{children}</button>
    ),
    AlertDialogCancel: ({ children }: React.PropsWithChildren) => <button>{children}</button>,
  };
});

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Zap: ({ className }: { className?: string }) => <span data-testid="icon-zap" className={className} />,
  Loader2: ({ className }: { className?: string }) => <span data-testid="icon-loader" className={className} />,
  AlertTriangle: ({ className }: { className?: string }) => <span data-testid="icon-alert" className={className} />,
}));

import { AutoPromoteButton } from '../AutoPromoteButton';

const mockFetch = vi.fn();
const originalFetch = global.fetch;

beforeEach(() => {
  vi.clearAllMocks();
  global.fetch = mockFetch;
});

afterAll(() => {
  global.fetch = originalFetch;
});

const defaultProps = {
  candidateCount: 15,
  authToken: 'test-token',
  onComplete: vi.fn(),
};

describe('AutoPromoteButton', () => {
  it('renders button with candidate count', () => {
    render(<AutoPromoteButton {...defaultProps} />);

    expect(screen.getByText(/Auto-Promote/)).toBeInTheDocument();
    expect(screen.getByText(/15/)).toBeInTheDocument();
  });

  it('click opens confirmation dialog', async () => {
    render(<AutoPromoteButton {...defaultProps} />);

    const button = screen.getByText(/Auto-Promote/);
    await act(async () => {
      fireEvent.click(button);
    });

    // After click, the dialog content should be visible
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(screen.getByText(/will be automatically promoted/i)).toBeInTheDocument();
  });

  it('confirming calls API and shows results', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        promoted: 12,
        failed: 3,
        words: { submissionBased: ['hello', 'world'], milogBased: ['שלום'] },
      }),
    });

    render(<AutoPromoteButton {...defaultProps} />);

    // Open dialog
    const button = screen.getByText(/Auto-Promote/);
    await act(async () => {
      fireEvent.click(button);
    });

    // Click confirm
    const confirmBtn = screen.getByTestId('confirm-action');
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/admin/invalid-words/auto-promote',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
    });

    // Should show results
    await waitFor(() => {
      expect(screen.getByText(/12 promoted/)).toBeInTheDocument();
    });

    // Should call onComplete
    expect(defaultProps.onComplete).toHaveBeenCalled();
  });

  it('disables button when candidateCount is 0', () => {
    render(<AutoPromoteButton {...defaultProps} candidateCount={0} />);

    const button = screen.getByText(/Auto-Promote/);
    expect(button).toBeDisabled();
  });

  it('handles API error gracefully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    });

    render(<AutoPromoteButton {...defaultProps} />);

    const button = screen.getByText(/Auto-Promote/);
    await act(async () => {
      fireEvent.click(button);
    });

    const confirmBtn = screen.getByTestId('confirm-action');
    await act(async () => {
      fireEvent.click(confirmBtn);
    });

    // Should show failure
    await waitFor(() => {
      expect(screen.getByText(/failed/i)).toBeInTheDocument();
    });
  });
});
