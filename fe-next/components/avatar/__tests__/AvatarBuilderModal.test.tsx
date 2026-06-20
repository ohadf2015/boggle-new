import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvatarBuilderModal, { shouldSuppressPointerFocus } from '../AvatarBuilderModal';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

vi.mock('@/components/motion/AdaptiveMotion', () => {
  const motionComponent = React.forwardRef(({ children, ...props }: any, ref: any) => {
    const safe = { ...props };
    for (const k of ['initial','animate','exit','transition','variants','whileHover','whileTap','whileInView','viewport']) delete safe[k];
    return React.createElement('div', { ...safe, ref }, children);
  });
  motionComponent.displayName = 'AdaptiveMotionMock';
  const proxy = new Proxy({}, { get: () => motionComponent });
  const AnimatePresence = ({ children }: any) => children;
  AnimatePresence.displayName = 'AnimatePresenceMock';
  return { AdaptiveMotion: proxy, AdaptiveAnimatePresence: AnimatePresence };
});

vi.mock('../AvatarRenderer', () => ({ __esModule: true, default: () => <div data-testid="avatar-renderer" /> }));
vi.mock('../PartPreview', () => ({ __esModule: true, default: () => <div data-testid="part-preview" /> }));

describe('AvatarBuilderModal', () => {
  const defaultProps = { isOpen: true, onClose: vi.fn(), onSave: vi.fn(), premium: null as null };

  beforeEach(() => vi.clearAllMocks());

  it('renders when isOpen=true', () => {
    render(<AvatarBuilderModal {...defaultProps} />);
    expect(screen.getByText('avatarBuilder.title')).toBeInTheDocument();
  });

  it('does not render when isOpen=false', () => {
    const { container } = render(<AvatarBuilderModal {...defaultProps} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('calls onClose when cancel clicked', () => {
    render(<AvatarBuilderModal {...defaultProps} />);
    fireEvent.click(screen.getByText('avatarBuilder.cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onSave with config when save clicked', () => {
    render(<AvatarBuilderModal {...defaultProps} />);
    fireEvent.click(screen.getByText('avatarBuilder.save'));
    expect(defaultProps.onSave).toHaveBeenCalledWith(DEFAULT_AVATAR_CONFIG);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});

/**
 * Clicking a part/colour button near the scroll-viewport edge used to focus it,
 * and the browser scrolled the options list to reveal the focused element — so
 * the list "jumped" on every selection (worst on short mobile viewports where
 * almost every row sits at an edge). Suppressing the pointer-down default focus
 * for button targets keeps the list still on click; keyboard Tab focus (which
 * SHOULD scroll a focused item into view) goes through a different path and is
 * unaffected, and the click itself still fires.
 */
describe('shouldSuppressPointerFocus — kills pointer focus-scroll jump', () => {
  it('suppresses when the pointer target is a button', () => {
    const btn = document.createElement('button');
    expect(shouldSuppressPointerFocus(btn)).toBe(true);
  });

  it('suppresses when the target is inside a button (e.g. the SVG/label)', () => {
    const btn = document.createElement('button');
    const span = document.createElement('span');
    btn.appendChild(span);
    expect(shouldSuppressPointerFocus(span)).toBe(true);
  });

  it('does NOT suppress for non-button targets (e.g. empty list gap)', () => {
    const div = document.createElement('div');
    expect(shouldSuppressPointerFocus(div)).toBe(false);
  });

  it('is null-safe', () => {
    expect(shouldSuppressPointerFocus(null)).toBe(false);
  });
});
