import { render, screen, fireEvent } from '@testing-library/react';
import { TauntStickerPicker } from '../TauntStickerPicker';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en' }),
}));

describe('TauntStickerPicker', () => {
  it('offers exactly four mascot stickers', () => {
    render(<TauntStickerPicker onSelect={vi.fn()} />);
    expect(screen.getAllByTestId('duel-taunt-option')).toHaveLength(4);
  });

  it('every sticker is a real mascot image, not an emoji', () => {
    render(<TauntStickerPicker onSelect={vi.fn()} />);

    for (const img of screen.getAllByTestId('duel-taunt-image')) {
      expect(img.getAttribute('src')).toMatch(/^\/mascot\/teacher\/sticker-/);
    }
  });

  it('sends the sticker id that was tapped', () => {
    const onSelect = vi.fn();
    render(<TauntStickerPicker onSelect={onSelect} />);

    fireEvent.click(screen.getAllByTestId('duel-taunt-option')[0]);
    expect(onSelect).toHaveBeenCalledWith('fire');
  });

  it('marks the sticker already sent and stops a second send', () => {
    const onSelect = vi.fn();
    render(<TauntStickerPicker onSelect={onSelect} selected="trophy" />);

    const options = screen.getAllByTestId('duel-taunt-option');
    const trophy = options.find((o) => o.getAttribute('data-taunt') === 'trophy')!;
    expect(trophy).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(options[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('can be disabled outright', () => {
    const onSelect = vi.fn();
    render(<TauntStickerPicker onSelect={onSelect} disabled />);

    fireEvent.click(screen.getAllByTestId('duel-taunt-option')[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
