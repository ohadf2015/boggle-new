// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { StylePicker } from '../StylePicker';
import { STYLES, STYLE_KEYS } from '@/lib/playerStyle/styles';

const setStyle = vi.fn(async () => {});
const previewStyle = vi.fn();
const playSnippet = vi.fn();
const stopSnippet = vi.fn();
const updateProfile = vi.fn(async () => ({ data: null, error: null }));
let committedKey = 'default';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (k: string) => k }),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ updateProfile }),
}));
vi.mock('@/components/Avatar', () => ({
  default: () => <div data-testid="avatar-preview" />,
}));
vi.mock('@/contexts/PlayerStyleContext', () => ({
  usePlayerStyle: () => ({ styleKey: committedKey, setStyle, previewStyle }),
}));
vi.mock('@/hooks/useStyleSnippetPreview', () => ({
  useStyleSnippetPreview: () => ({ playSnippet, stopSnippet }),
}));

describe('StylePicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    committedKey = 'default';
  });

  it('renders a button per style (13)', () => {
    render(<StylePicker />);
    expect(screen.getAllByRole('radio')).toHaveLength(STYLE_KEYS.length);
  });

  it('selecting a tile previews the accent + plays that style snippet', () => {
    render(<StylePicker />);
    const jazz = screen.getByRole('radio', { name: /playerStyle\.styles\.jazz/ });
    fireEvent.click(jazz);
    expect(previewStyle).toHaveBeenCalledWith('jazz');
    expect(playSnippet).toHaveBeenCalledWith(STYLES.jazz.musicFile);
    expect(jazz.getAttribute('aria-checked')).toBe('true');
  });

  it('previewing the default style plays no file (musicFile null)', () => {
    render(<StylePicker />);
    fireEvent.click(screen.getByRole('radio', { name: /playerStyle\.styles\.default/ }));
    expect(playSnippet).toHaveBeenCalledWith(null);
  });

  it('confirm commits the selected style and fires onConfirm', async () => {
    const onConfirm = vi.fn();
    render(<StylePicker onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('radio', { name: /playerStyle\.styles\.rock/ }));
    await act(async () => {
      fireEvent.click(screen.getByText('playerStyle.picker.confirm'));
    });
    expect(setStyle).toHaveBeenCalledWith('rock');
    expect(stopSnippet).toHaveBeenCalled();
    expect(onConfirm).toHaveBeenCalledWith('rock');
  });

  it('restores the ducked preview volume BEFORE committing (so the swapped bed is audible, not faded-in at 0)', async () => {
    render(<StylePicker />);
    fireEvent.click(screen.getByRole('radio', { name: /playerStyle\.styles\.rock/ }));
    await act(async () => {
      fireEvent.click(screen.getByText('playerStyle.picker.confirm'));
    });
    // stopSnippet (un-duck) must run before setStyle (which crossfades the live
    // music bed). Otherwise the new style bed fades in while volume is still 0.
    expect(stopSnippet.mock.invocationCallOrder[0]).toBeLessThan(setStyle.mock.invocationCallOrder[0]);
  });

  it('opt-in avatar: toggling on shows a themed avatar preview', () => {
    render(<StylePicker />);
    fireEvent.click(screen.getByRole('radio', { name: /playerStyle\.styles\.rock/ }));
    expect(screen.queryByTestId('avatar-preview')).toBeNull();
    fireEvent.click(screen.getByLabelText('playerStyle.picker.matchAvatar'));
    expect(screen.getByTestId('avatar-preview')).toBeTruthy();
  });

  it('opt-in avatar: confirm persists a themed avatar_config to the profile', async () => {
    render(<StylePicker />);
    fireEvent.click(screen.getByRole('radio', { name: /playerStyle\.styles\.rock/ }));
    fireEvent.click(screen.getByLabelText('playerStyle.picker.matchAvatar'));
    await act(async () => {
      fireEvent.click(screen.getByText('playerStyle.picker.confirm'));
    });
    expect(updateProfile).toHaveBeenCalledTimes(1);
    const arg = updateProfile.mock.calls[0][0] as any;
    expect(arg.avatar_customized).toBe(true);
    expect(arg.avatar_config.shirtColor).toBe(STYLES.rock.accentHex);
  });

  it('does NOT touch the avatar when the opt-in is off', async () => {
    render(<StylePicker />);
    fireEvent.click(screen.getByRole('radio', { name: /playerStyle\.styles\.rock/ }));
    await act(async () => {
      fireEvent.click(screen.getByText('playerStyle.picker.confirm'));
    });
    expect(updateProfile).not.toHaveBeenCalled();
  });

  it('reverts the live preview on unmount', () => {
    const { unmount } = render(<StylePicker />);
    unmount();
    expect(previewStyle).toHaveBeenCalledWith(null);
    expect(stopSnippet).toHaveBeenCalled();
  });

  it('marks the committed style as current', () => {
    committedKey = 'viking';
    render(<StylePicker />);
    expect(screen.getAllByText('playerStyle.picker.current')).toHaveLength(1);
  });

  it('the selected tile plays its dancing loop (webp); unselected tiles stay static PNG', () => {
    render(<StylePicker />);
    const jazz = screen.getByRole('radio', { name: /playerStyle\.styles\.jazz/ });
    fireEvent.click(jazz);
    expect(jazz.querySelector('img')?.getAttribute('src')).toBe('/mascots/styles/jazz.webp');
    const rock = screen.getByRole('radio', { name: /playerStyle\.styles\.rock/ });
    expect(rock.querySelector('img')?.getAttribute('src')).toBe('/mascots/styles/rock.png');
  });

  it('the active (committed) style tile dances on mount without a click', () => {
    committedKey = 'viking';
    render(<StylePicker />);
    const viking = screen.getByRole('radio', { name: /playerStyle\.styles\.viking/ });
    expect(viking.querySelector('img')?.getAttribute('src')).toBe('/mascots/styles/viking.webp');
  });

  it('hides the confirm button when showConfirm is false', () => {
    render(<StylePicker showConfirm={false} />);
    expect(screen.queryByText('playerStyle.picker.confirm')).toBeNull();
  });
});
