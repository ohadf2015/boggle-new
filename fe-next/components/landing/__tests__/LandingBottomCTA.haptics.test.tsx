import { render, screen, fireEvent } from '@testing-library/react';
import { LandingBottomCTA } from '../LandingBottomCTA';
import { LanguageProvider } from '@/contexts/LanguageContext';

const success = vi.fn();
vi.mock('@/utils/haptics', () => ({
  haptics: { success: () => success() },
}));

vi.mock('framer-motion', () => ({
  m: {
    div: ({ children, ...p }: any) => <div {...p}>{children}</div>,
    button: ({ children, ...p }: any) => <button {...p}>{children}</button>,
  },
}));

describe('LandingBottomCTA haptics', () => {
  beforeEach(() => success.mockClear());

  it('fires haptics.success on Play CTA click', () => {
    const onPlay = vi.fn();
    render(
      <LanguageProvider>
        <LandingBottomCTA onPlayClick={onPlay} />
      </LanguageProvider>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(success).toHaveBeenCalledTimes(1);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });
});
