import { render, screen, fireEvent } from '@testing-library/react';
import CalmModeChoice from '../CalmModeChoice';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key }),
}));

describe('CalmModeChoice', () => {
  it('offers both vibes as equal first-class choices', () => {
    render(<CalmModeChoice onChoose={() => {}} />);
    expect(screen.getByText('onboarding.calmMode.energetic')).toBeInTheDocument();
    expect(screen.getByText('onboarding.calmMode.calm')).toBeInTheDocument();
  });

  it('picking Energetic chooses loud (cosy=false)', () => {
    const onChoose = vi.fn();
    render(<CalmModeChoice onChoose={onChoose} />);
    fireEvent.click(screen.getByText('onboarding.calmMode.energetic'));
    expect(onChoose).toHaveBeenCalledWith(false);
  });

  it('picking Calm turns Calm Mode on (cosy=true)', () => {
    const onChoose = vi.fn();
    render(<CalmModeChoice onChoose={onChoose} />);
    fireEvent.click(screen.getByText('onboarding.calmMode.calm'));
    expect(onChoose).toHaveBeenCalledWith(true);
  });

  it('the Calm card previews its WARM palette (peach), telegraphing the cozy feel', () => {
    // This screen renders in the loud dark theme (cosy is not active yet), so
    // the Calm choice must hint at the warm experience it unlocks — not wear the
    // cool cyan of the loud single-player chrome.
    render(<CalmModeChoice onChoose={() => {}} />);
    const calmBtn = screen.getByText('onboarding.calmMode.calm').closest('button');
    expect(calmBtn?.className).toContain('bg-neo-cozy');
    expect(calmBtn?.className).not.toContain('bg-neo-cyan');
  });

  it('the Energetic card stays electric lime (the loud vibe)', () => {
    render(<CalmModeChoice onChoose={() => {}} />);
    const energeticBtn = screen
      .getByText('onboarding.calmMode.energetic')
      .closest('button');
    expect(energeticBtn?.className).toContain('bg-neo-lime');
  });
});
