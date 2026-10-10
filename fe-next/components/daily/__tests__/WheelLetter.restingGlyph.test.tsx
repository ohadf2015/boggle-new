import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ language: 'en', t: (k: string) => k }),
}));

vi.mock('framer-motion', () => ({
  m: {
    button: ({ children, onClick, ...rest }: React.ComponentProps<'button'>) => (
      <button onClick={onClick} {...rest}>{children}</button>
    ),
  },
}));

import { WheelLetter } from '../WordWheelParts';

describe('WheelLetter resting glyph', () => {
  it('renders an unselected outer letter as a bare glyph on the disc, not a white tile', () => {
    render(
      <WheelLetter letter="K" isCenter={false} angle={0} radius={100} onPress={vi.fn()} isUsed={false} index={0} />,
    );
    const cls = screen.getByRole('button', { name: 'K' }).className;
    expect(cls).toContain('bg-transparent');
    expect(cls).not.toContain('bg-neo-white');
  });
});
