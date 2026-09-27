/**
 * Tests for MPDragCoachmark — visual FTUE overlay.
 * Animation correctness is GSAP-internal; we cover render, a11y, dismiss.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MPDragCoachmark } from '../MPDragCoachmark';

const t = (key: string) => {
  const map: Record<string, string> = {
    'wheelRush.ftue.dragLabel': 'Drag to spell!',
    'wheelRush.ftue.dismiss': 'Got it',
  };
  return map[key] ?? key;
};

describe('MPDragCoachmark', () => {
  it('renders cursor image', () => {
    render(<MPDragCoachmark t={t} onDismiss={() => {}} />);
    const img = screen.getByAltText(/drag to spell/i) || screen.getByRole('img');
    expect(img).toBeTruthy();
  });

  it('renders translated label', () => {
    render(<MPDragCoachmark t={t} onDismiss={() => {}} />);
    expect(screen.getByText('Drag to spell!')).toBeTruthy();
  });

  it('calls onDismiss when dismiss button clicked', () => {
    const onDismiss = vi.fn();
    render(<MPDragCoachmark t={t} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /got it/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('has role=dialog and aria-label for screen readers', () => {
    render(<MPDragCoachmark t={t} onDismiss={() => {}} />);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-label')).toBeTruthy();
  });

  it('renders fallback label when reduced motion is true (no GSAP loop crash)', () => {
    render(<MPDragCoachmark t={t} onDismiss={() => {}} reducedMotion />);
    expect(screen.getByText('Drag to spell!')).toBeTruthy();
  });
});
