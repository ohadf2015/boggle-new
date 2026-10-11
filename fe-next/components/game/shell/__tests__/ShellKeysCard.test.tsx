import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShellKeysCard } from '../ShellKeysCard';

const t = (k: string) => k;

describe('ShellKeysCard', () => {
  it('given spare rail height, when rendered, then a decorative mascot fills it above the keys', () => {
    render(<ShellKeysCard t={t} />);
    const mascot = screen.getByTestId('shell-mascot');
    expect(mascot.getAttribute('aria-hidden')).toBe('true');
    expect(mascot.compareDocumentPosition(screen.getByTestId('shell-keys')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
