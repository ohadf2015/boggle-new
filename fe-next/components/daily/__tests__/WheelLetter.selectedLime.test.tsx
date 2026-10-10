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

describe('WheelLetter selected state', () => {
  it('lights a selected outer letter lime with black ink instead of dimming it', () => {
    render(
      <WheelLetter letter="A" isCenter={false} angle={0} radius={100} onPress={vi.fn()} isUsed index={0} />,
    );
    const cls = screen.getByRole('button', { name: /tapToRemove/ }).className;
    expect(cls).toContain('bg-neo-lime');
    expect(cls).toContain('text-neo-black');
    expect(cls).not.toContain('bg-neo-navy-light');
  });
});
