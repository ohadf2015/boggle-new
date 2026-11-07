import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NbAdvanced } from '../NbAdvanced';

describe('NbAdvanced', () => {
  it('Given first view, Then the rare settings are collapsed behind the dashed row', () => {
    render(<NbAdvanced label="More options" closeLabel="Hide options" testId="adv"><input aria-label="Note" /></NbAdvanced>);
    const toggle = screen.getByTestId('adv');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(toggle.className).toContain('border-dashed');
    expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull();
  });

  it('When the row is tapped, Then the settings show and the row offers to hide them', () => {
    render(<NbAdvanced label="More options" closeLabel="Hide options" testId="adv"><input aria-label="Note" /></NbAdvanced>);
    fireEvent.click(screen.getByTestId('adv'));
    expect(screen.getByRole('textbox', { name: 'Note' })).toBeVisible();
    expect(screen.getByTestId('adv')).toHaveTextContent('Hide options');
  });

  it('Given a hidden setting already in use, Then forceOpen shows it', () => {
    render(<NbAdvanced label="More options" closeLabel="Hide options" forceOpen><input aria-label="Note" /></NbAdvanced>);
    expect(screen.getByRole('textbox', { name: 'Note' })).toBeInTheDocument();
  });

  it('Given forceOpen, When the teacher taps Hide, Then it really hides', () => {
    render(<NbAdvanced label="More options" closeLabel="Hide options" forceOpen testId="adv"><input aria-label="Note" /></NbAdvanced>);
    fireEvent.click(screen.getByTestId('adv'));
    expect(screen.queryByRole('textbox', { name: 'Note' })).toBeNull();
    expect(screen.getByTestId('adv')).toHaveAttribute('aria-expanded', 'false');
  });
});
