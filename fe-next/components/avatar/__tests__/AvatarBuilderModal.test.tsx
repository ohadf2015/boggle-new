import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import AvatarBuilderModal from '../AvatarBuilderModal';
import { DEFAULT_AVATAR_CONFIG } from '@/shared/types/customAvatar';

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({ t: (key: string) => key, language: 'en', dir: 'ltr' }),
}));

jest.mock('@/components/motion/AdaptiveMotion', () => {
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

jest.mock('../AvatarRenderer', () => ({ __esModule: true, default: () => <div data-testid="avatar-renderer" /> }));
jest.mock('../PartPreview', () => ({ __esModule: true, default: () => <div data-testid="part-preview" /> }));

describe('AvatarBuilderModal', () => {
  const defaultProps = { isOpen: true, onClose: jest.fn(), onSave: jest.fn() };

  beforeEach(() => jest.clearAllMocks());

  it('renders when isOpen=true', () => {
    render(<AvatarBuilderModal {...defaultProps} />);
    expect(screen.getByText('avatar.builder.title')).toBeInTheDocument();
  });

  it('does not render when isOpen=false', () => {
    const { container } = render(<AvatarBuilderModal {...defaultProps} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('calls onClose when cancel clicked', () => {
    render(<AvatarBuilderModal {...defaultProps} />);
    fireEvent.click(screen.getByText('avatar.builder.cancel'));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onSave with config when save clicked', () => {
    render(<AvatarBuilderModal {...defaultProps} />);
    fireEvent.click(screen.getByText('avatar.builder.save'));
    expect(defaultProps.onSave).toHaveBeenCalledWith(DEFAULT_AVATAR_CONFIG);
    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
