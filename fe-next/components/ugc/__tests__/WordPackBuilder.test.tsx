/**
 * Tests for WordPackBuilder component
 * TDD: RED phase
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WordPackBuilder from '../WordPackBuilder';

// Mock hook
const mockAddWord = vi.fn();
const mockBulkAddWords = vi.fn();
const mockPublishPack = vi.fn();
const mockSetName = vi.fn();

const defaultHookState = {
  name: '',
  setName: mockSetName,
  description: '',
  setDescription: vi.fn(),
  language: 'en',
  setLanguage: vi.fn(),
  themeEmoji: '',
  setThemeEmoji: vi.fn(),
  tags: [],
  setTags: vi.fn(),
  words: [] as string[],
  addWord: mockAddWord,
  removeWord: vi.fn(),
  bulkAddWords: mockBulkAddWords,
  canPublish: false,
  isPublishing: false,
  publishError: null,
  publishedPackId: null,
  publishPack: mockPublishPack,
};

vi.mock('@/hooks/useWordPackBuilder', () => ({
  useWordPackBuilder: () => defaultHookState,
}));

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    dir: 'ltr',
    language: 'en',
  }),
}));

describe('WordPackBuilder', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset hook state
    defaultHookState.name = '';
    defaultHookState.words = [];
    defaultHookState.canPublish = false;
    defaultHookState.isPublishing = false;
    defaultHookState.publishError = null;
    defaultHookState.publishedPackId = null;
  });

  it('renders the modal title', () => {
    render(<WordPackBuilder {...defaultProps} />);
    expect(screen.getByText('ugc.pack.builder.title')).toBeInTheDocument();
  });

  it('renders pack name input', () => {
    render(<WordPackBuilder {...defaultProps} />);
    expect(screen.getByPlaceholderText('ugc.pack.builder.namePlaceholder')).toBeInTheDocument();
  });

  it('calls setName when name input changes', async () => {
    const user = userEvent.setup();
    render(<WordPackBuilder {...defaultProps} />);
    const nameInput = screen.getByPlaceholderText('ugc.pack.builder.namePlaceholder');
    await user.type(nameInput, 'My Pack');
    expect(mockSetName).toHaveBeenCalled();
  });

  it('renders word input field', () => {
    render(<WordPackBuilder {...defaultProps} />);
    expect(screen.getByPlaceholderText('ugc.pack.builder.wordPlaceholder')).toBeInTheDocument();
  });

  it('calls addWord when Add button clicked', async () => {
    mockAddWord.mockResolvedValue({ word: 'APPLE', valid: true, duplicate: false });
    const user = userEvent.setup();
    render(<WordPackBuilder {...defaultProps} />);
    const wordInput = screen.getByPlaceholderText('ugc.pack.builder.wordPlaceholder');
    await user.type(wordInput, 'APPLE');
    const addButton = screen.getByText('ugc.pack.builder.addWord');
    await user.click(addButton);
    expect(mockAddWord).toHaveBeenCalledWith('APPLE');
  });

  it('calls addWord when Enter key pressed in word input', async () => {
    mockAddWord.mockResolvedValue({ word: 'APPLE', valid: true, duplicate: false });
    const user = userEvent.setup();
    render(<WordPackBuilder {...defaultProps} />);
    const wordInput = screen.getByPlaceholderText('ugc.pack.builder.wordPlaceholder');
    await user.type(wordInput, 'APPLE{Enter}');
    expect(mockAddWord).toHaveBeenCalledWith('APPLE');
  });

  it('shows word count progress', () => {
    defaultHookState.words = ['CAT', 'DOG'];
    render(<WordPackBuilder {...defaultProps} />);
    expect(screen.getByText(/2/)).toBeInTheDocument();
    expect(screen.getByText(/10/)).toBeInTheDocument();
  });

  it('Publish button is disabled when canPublish is false', () => {
    defaultHookState.canPublish = false;
    render(<WordPackBuilder {...defaultProps} />);
    const publishBtn = screen.getByText('ugc.pack.builder.publish');
    expect(publishBtn.closest('button')).toBeDisabled();
  });

  it('Publish button is enabled when canPublish is true', () => {
    defaultHookState.canPublish = true;
    render(<WordPackBuilder {...defaultProps} />);
    const publishBtn = screen.getByText('ugc.pack.builder.publish');
    expect(publishBtn.closest('button')).not.toBeDisabled();
  });

  it('calls publishPack when Publish button clicked', async () => {
    mockPublishPack.mockResolvedValue(undefined);
    defaultHookState.canPublish = true;
    const user = userEvent.setup();
    render(<WordPackBuilder {...defaultProps} />);
    const publishBtn = screen.getByText('ugc.pack.builder.publish');
    await user.click(publishBtn);
    expect(mockPublishPack).toHaveBeenCalled();
  });

  it('calls onClose when Cancel button clicked', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<WordPackBuilder isOpen={true} onClose={onClose} />);
    const cancelBtn = screen.getByText('ugc.pack.builder.cancel');
    await user.click(cancelBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it('shows added words as chips', () => {
    defaultHookState.words = ['CAT', 'DOG'];
    render(<WordPackBuilder {...defaultProps} />);
    expect(screen.getByText('CAT')).toBeInTheDocument();
    expect(screen.getByText('DOG')).toBeInTheDocument();
  });

  it('shows bulk paste textarea when toggled', async () => {
    const user = userEvent.setup();
    render(<WordPackBuilder {...defaultProps} />);
    const bulkToggle = screen.getByText('ugc.pack.builder.bulkPaste');
    await user.click(bulkToggle);
    expect(screen.getByPlaceholderText('ugc.pack.builder.bulkPlaceholder')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<WordPackBuilder isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByText('ugc.pack.builder.title')).not.toBeInTheDocument();
  });
});
