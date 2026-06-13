// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerStyleModal } from '../PlayerStyleModal';

const setStyle = vi.fn(async () => {});
const previewStyle = vi.fn();
const playSnippet = vi.fn();
const stopSnippet = vi.fn();
const updateProfile = vi.fn(async () => ({ data: null, error: null }));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ updateProfile }),
}));
vi.mock('@/components/Avatar', () => ({
  default: () => <div data-testid="avatar-preview" />,
}));
vi.mock('@/contexts/PlayerStyleContext', () => ({
  usePlayerStyle: () => ({ styleKey: 'default', setStyle, previewStyle }),
}));
vi.mock('@/hooks/useStyleSnippetPreview', () => ({
  useStyleSnippetPreview: () => ({ playSnippet, stopSnippet }),
}));

describe('PlayerStyleModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    const onDismiss = vi.fn();
    render(<PlayerStyleModal isOpen={false} onDismiss={onDismiss} />);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  // Regression: opened from the profile card, the overlay is nested inside a
  // framer-motion m.div whose `transform` makes `position: fixed` resolve
  // against that ancestor (not the viewport). Scrolling the page then drags
  // the "fixed" overlay → flicker. Portaling to <body> escapes the transformed
  // containing block so the overlay is truly viewport-fixed.
  it('portals the overlay to document.body (escapes transformed ancestors)', () => {
    const onDismiss = vi.fn();
    const { container } = render(
      <div style={{ transform: 'translateY(0px)' }}>
        <PlayerStyleModal isOpen onDismiss={onDismiss} />
      </div>,
    );
    const dialog = screen.getByRole('dialog');
    // The dialog must live directly under <body>, NOT inside the transformed
    // render container.
    expect(dialog.parentElement).toBe(document.body);
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  // The page scrolling behind a translucent backdrop is the touch-repaint
  // flicker source the StylePicker compositor hints fight at grid level. Lock
  // body scroll while open so the page can't move at all, then restore it.
  it('locks body scroll while open and restores on unmount', () => {
    document.body.style.overflow = 'scroll';
    const onDismiss = vi.fn();
    const { unmount } = render(<PlayerStyleModal isOpen onDismiss={onDismiss} />);
    expect(document.body.style.overflow).toBe('hidden');
    unmount();
    expect(document.body.style.overflow).toBe('scroll');
  });

  it('does not lock body scroll when closed', () => {
    document.body.style.overflow = 'scroll';
    const onDismiss = vi.fn();
    render(<PlayerStyleModal isOpen={false} onDismiss={onDismiss} />);
    expect(document.body.style.overflow).toBe('scroll');
  });
});
