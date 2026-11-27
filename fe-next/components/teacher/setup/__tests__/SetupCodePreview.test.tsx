import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SetupCodePreview } from '../SetupCodePreview';

const t = (k: string) => k;

describe('SetupCodePreview', () => {
  it('given no name yet, shows the whole pending sentence and its sub line, with the tiles free to wrap below', () => {
    render(<SetupCodePreview name="" t={t} />);
    const pending = screen.getByText('eduShell.setup.codePending');
    expect(pending.className).not.toMatch(/line-clamp/);
    const sub = screen.getByText('eduShell.setup.side.step2');
    expect(sub.className).not.toMatch(/(^|\s)hidden(\s|$)|:hidden/);
    expect(screen.getByTestId('setup-code-preview').className).toMatch(/flex-wrap/);
  });

  it('given a typed name, still clamps it so a long name cannot push the form down', () => {
    render(<SetupCodePreview name="A very long class name" t={t} />);
    expect(screen.getByText('A very long class name').className).toMatch(/line-clamp-2/);
  });
});
