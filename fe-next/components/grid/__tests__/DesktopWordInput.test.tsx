import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DesktopWordInput from '../DesktopWordInput';

// Mock dependencies
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'desktopInput.placeholder': 'Type a word...',
        'desktopInput.ariaLabel': 'Type a word to submit',
        'desktopInput.submit': 'Submit word',
        'desktopInput.hint': 'Type letters · Enter to submit',
        'common.clear': 'Clear',
      };
      return map[key] || key;
    },
  }),
}));

vi.mock('@/hooks/useMediaQuery', () => ({
  useIsDesktop: () => true,
}));

vi.mock('@/utils/clientWordValidator', () => ({
  couldBeOnBoard: vi.fn().mockReturnValue(true),
}));

vi.mock('@/utils/wordPathFinder', () => ({
  findWordPath: vi.fn().mockReturnValue([{ row: 0, col: 0, letter: 'A' }]),
}));

const defaultGrid = [
  ['A', 'B', 'C', 'D'],
  ['E', 'F', 'G', 'H'],
  ['I', 'J', 'K', 'L'],
  ['M', 'N', 'O', 'P'],
];

const defaultProps = {
  grid: defaultGrid,
  language: 'en' as const,
  enabled: true,
  onWordSubmit: vi.fn(),
};

describe('DesktopWordInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the input on desktop', () => {
    render(<DesktopWordInput {...defaultProps} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('shows placeholder text', () => {
    render(<DesktopWordInput {...defaultProps} />);
    expect(screen.getByPlaceholderText('Type a word...')).toBeInTheDocument();
  });

  it('updates typed word as user types', async () => {
    const user = userEvent.setup();
    render(<DesktopWordInput {...defaultProps} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'abc');
    expect(input).toHaveValue('ABC');
  });

  it('submits word on Enter', async () => {
    const onWordSubmit = vi.fn();
    const user = userEvent.setup();
    render(<DesktopWordInput {...defaultProps} onWordSubmit={onWordSubmit} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'ab{Enter}');
    expect(onWordSubmit).toHaveBeenCalledWith('AB');
  });

  it('clears word on Escape', async () => {
    const user = userEvent.setup();
    render(<DesktopWordInput {...defaultProps} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'abc');
    expect(input).toHaveValue('ABC');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
  });

  it('does not submit word shorter than minWordLength', async () => {
    const onWordSubmit = vi.fn();
    const user = userEvent.setup();
    render(<DesktopWordInput {...defaultProps} onWordSubmit={onWordSubmit} minWordLength={3} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'ab{Enter}');
    expect(onWordSubmit).not.toHaveBeenCalled();
  });

  it('calls onHighlightChange as user types', async () => {
    const onHighlightChange = vi.fn();
    const user = userEvent.setup();
    render(<DesktopWordInput {...defaultProps} onHighlightChange={onHighlightChange} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'a');
    expect(onHighlightChange).toHaveBeenCalled();
  });

  it('calls onTypingModeChange when typing starts/stops', async () => {
    const onTypingModeChange = vi.fn();
    const user = userEvent.setup();
    render(<DesktopWordInput {...defaultProps} onTypingModeChange={onTypingModeChange} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'a');
    expect(onTypingModeChange).toHaveBeenCalledWith(true);
    await user.keyboard('{Escape}');
    expect(onTypingModeChange).toHaveBeenCalledWith(false);
  });

  it('disables input when not enabled', () => {
    render(<DesktopWordInput {...defaultProps} enabled={false} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('filters non-letter characters', async () => {
    const user = userEvent.setup();
    render(<DesktopWordInput {...defaultProps} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'a1b2c');
    expect(input).toHaveValue('ABC');
  });

  it('has proper aria-label', () => {
    render(<DesktopWordInput {...defaultProps} />);
    expect(screen.getByLabelText('Type a word to submit')).toBeInTheDocument();
  });

  it('does not submit on Enter when keyCode is 229 (IME Process key)', async () => {
    const onWordSubmit = vi.fn();
    const user = userEvent.setup();
    render(<DesktopWordInput {...defaultProps} onWordSubmit={onWordSubmit} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'ab');
    // Fire a keydown with keyCode 229 — the synthetic "Process" key sent during IME composition
    fireEvent.keyDown(input, { key: 'Enter', keyCode: 229, code: 'Enter' });
    expect(onWordSubmit).not.toHaveBeenCalled();
  });

  it('accepts kanji characters from JA dictionary boards', async () => {
    const user = userEvent.setup();
    const jaGrid = [
      ['日', '本', '語', '学'],
      ['漢', '字', '読', '書'],
      ['単', '語', '文', '字'],
      ['発', '音', '訓', '練'],
    ];
    render(<DesktopWordInput {...defaultProps} grid={jaGrid} language="ja" />);
    const input = screen.getByRole('textbox');
    await user.type(input, '日本');
    // Kanji should not be filtered out — input retains the characters
    expect(input).toHaveValue('日本');
  });
});
