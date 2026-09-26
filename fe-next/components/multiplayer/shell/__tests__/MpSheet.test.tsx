import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MpSheet } from '../MpSheet';

vi.mock('@/contexts/LanguageContext', () => ({ useLanguage: () => ({ t: (k: string) => k }) }));

describe('MpSheet', () => {
  it('renders nothing when closed', () => {
    render(<MpSheet open={false} onClose={() => {}} title="T">body</MpSheet>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('is a labelled modal dialog with a solid panel over a static scrim', () => {
    render(<MpSheet open onClose={() => {}} title="Invite">body</MpSheet>);
    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(screen.getByText('Invite')).toBeTruthy();
    expect(screen.getByTestId('mp-sheet-panel').className).toContain('bg-neo-navy-light');
    const scrim = screen.getByTestId('mp-sheet-scrim');
    expect(scrim.className).not.toMatch(/backdrop-blur|animate-|transition-opacity/);
  });

  it('closes on Esc, scrim tap and the close button', () => {
    const onClose = vi.fn();
    render(<MpSheet open onClose={onClose} title="T">body</MpSheet>);
    fireEvent.keyDown(document, { key: 'Escape' });
    fireEvent.click(screen.getByTestId('mp-sheet-scrim'));
    fireEvent.click(screen.getByRole('button', { name: 'mpUi.shell.close' }));
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it('moves focus into the panel and traps Tab inside it', () => {
    render(
      <MpSheet open onClose={() => {}} title="T">
        <button type="button">one</button>
        <button type="button">two</button>
      </MpSheet>,
    );
    const panel = screen.getByTestId('mp-sheet-panel');
    expect(panel.contains(document.activeElement)).toBe(true);
    const two = screen.getByText('two');
    two.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it('side="end" docks to the inline end (desktop side panel)', () => {
    render(<MpSheet open onClose={() => {}} title="T" side="end">b</MpSheet>);
    expect(screen.getByTestId('mp-sheet-panel').getAttribute('data-side')).toBe('end');
  });
});
