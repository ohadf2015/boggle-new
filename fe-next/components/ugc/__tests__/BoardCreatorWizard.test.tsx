/**
 * Tests for BoardCreatorWizard component
 * Updated for live-grid + tag input architecture
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardCreatorWizard } from '../BoardCreatorWizard';

vi.mock('@/hooks/useBoardCreator');
import { useBoardCreator, type UseBoardCreatorReturn, type GeneratedBoard } from '@/hooks/useBoardCreator';
const mockUseBoardCreator = useBoardCreator as vi.MockedFunction<typeof useBoardCreator>;

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => {
  const React = require('react');
  const motionCache: Record<string, React.FC> = {};
  function getMotionComponent(el: string) {
    if (!motionCache[el]) {
       
      const Comp = React.forwardRef((props: Record<string, unknown>, ref: React.Ref<HTMLElement>) => {
        const { initial, animate, exit, transition, whileInView, whileTap, whileHover, whileDrag, layout, ...rest } = props;
        return React.createElement(el, { ...rest, ref });
      });
      Comp.displayName = `m.${el}`;
      motionCache[el] = Comp;
    }
    return motionCache[el];
  }
  return {
    m: new Proxy({}, { get: (_t: unknown, prop: string) => getMotionComponent(prop) }),
    AnimatePresence: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
    useReducedMotion: () => false,
  };
});

const mockBoard: GeneratedBoard = {
  grid: [['A','B','C','D'],['E','F','G','H'],['I','J','K','L'],['M','N','O','P']],
  totalFindableWords: 20,
  difficulty: 'MEDIUM',
  seedWordsPlaced: ['cat'],
};

function makeHookReturn(overrides: Partial<UseBoardCreatorReturn> = {}): UseBoardCreatorReturn {
  return {
    step: 'configure',
    setStep: vi.fn(),
    gridSize: 6,
    setGridSize: vi.fn(),
    language: 'en',
    setLanguage: vi.fn(),
    seedWords: '',
    setSeedWords: vi.fn(),
    seedTags: [],
    addTag: vi.fn(),
    removeTag: vi.fn(),
    updateTag: vi.fn(),
    generatedBoard: null,
    isGenerating: false,
    generateError: null,
    generateBoard: vi.fn().mockResolvedValue(undefined),
    shuffleBoard: vi.fn().mockResolvedValue(undefined),
    gridRevision: 0,
    title: '',
    setTitle: vi.fn(),
    description: '',
    setDescription: vi.fn(),
    isPublishing: false,
    publishError: null,
    publishedBoard: null,
    publishBoard: vi.fn().mockResolvedValue(undefined),
    coverImage: null,
    coverImagePreview: null,
    setCoverImage: vi.fn(),
    isUploadingImage: false,
    imageUploadError: null,
    ...overrides,
  };
}

describe('BoardCreatorWizard — step 1 (configure)', () => {
  it('renders configure step by default', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn());
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('step-configure')).toBeInTheDocument();
  });

  it('does not render grid size picker (default 6x6)', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn());
    render(<BoardCreatorWizard />);
    expect(screen.queryByTestId('grid-size-4')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grid-size-5')).not.toBeInTheDocument();
    expect(screen.queryByTestId('grid-size-6')).not.toBeInTheDocument();
  });

  it('shows animated board grid placeholder when no board', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn());
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('animated-board-grid')).toBeInTheDocument();
  });

  it('shows animated board grid with letters when board generated', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ generatedBoard: mockBoard, seedTags: ['cat'] }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('animated-board-grid')).toBeInTheDocument();
  });

  it('proceed button is disabled when no board', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn());
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('proceed-btn')).toBeDisabled();
  });

  it('proceed button is enabled when board exists and has tags', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ generatedBoard: mockBoard, seedTags: ['cat'] }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('proceed-btn')).not.toBeDisabled();
  });

  it('clicking proceed calls setStep preview', async () => {
    const setStep = vi.fn();
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ generatedBoard: mockBoard, seedTags: ['cat'], setStep }));
    render(<BoardCreatorWizard />);
    await userEvent.click(screen.getByTestId('proceed-btn'));
    expect(setStep).toHaveBeenCalledWith('preview');
  });

  it('shows generateError when present', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ generateError: 'Something went wrong' }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('generate-error')).toBeInTheDocument();
  });
});

describe('BoardCreatorWizard — step 2 (preview)', () => {
  it('renders preview step when step is preview', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('step-preview')).toBeInTheDocument();
  });

  it('shows animated board grid in preview', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('animated-board-grid')).toBeInTheDocument();
  });

  it('shows word count stat', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('word-count-stat')).toBeInTheDocument();
  });

  it('shows difficulty badge', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('difficulty-badge')).toBeInTheDocument();
  });

  it('title input present in preview', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('title-input')).toBeInTheDocument();
  });

  it('description input present in preview', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('description-input')).toBeInTheDocument();
  });

  it('typing in title calls setTitle', async () => {
    const setTitle = vi.fn();
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard, setTitle }));
    render(<BoardCreatorWizard />);
    const input = screen.getByTestId('title-input');
    await userEvent.type(input, 'a');
    expect(setTitle).toHaveBeenCalled();
  });

  it('publish button calls publishBoard', async () => {
    const publishBoard = vi.fn().mockResolvedValue(undefined);
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard, publishBoard }));
    render(<BoardCreatorWizard />);
    await userEvent.click(screen.getByTestId('publish-btn'));
    expect(publishBoard).toHaveBeenCalledTimes(1);
  });

  it('back button calls setStep configure', async () => {
    const setStep = vi.fn();
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard, setStep }));
    render(<BoardCreatorWizard />);
    await userEvent.click(screen.getByTestId('back-btn'));
    expect(setStep).toHaveBeenCalledWith('configure');
  });

  it('shuffle button calls shuffleBoard', async () => {
    const shuffleBoard = vi.fn().mockResolvedValue(undefined);
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard, shuffleBoard }));
    render(<BoardCreatorWizard />);
    await userEvent.click(screen.getByTestId('shuffle-btn'));
    expect(shuffleBoard).toHaveBeenCalledTimes(1);
  });

  it('shows publishError when present', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({
      step: 'preview',
      generatedBoard: mockBoard,
      publishError: 'Publish failed',
    }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('publish-error')).toBeInTheDocument();
  });
});

describe('BoardCreatorWizard — step 3 (published)', () => {
  const publishedBoard = { boardCode: 'abc12345', title: 'My Puzzle' };

  it('renders published step', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'published', publishedBoard }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('step-published')).toBeInTheDocument();
  });

  it('shows board code', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'published', publishedBoard }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('board-code')).toHaveTextContent('abc12345');
  });

  it('shows share buttons', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'published', publishedBoard }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('share-buttons')).toBeInTheDocument();
  });

  it('make another button resets to configure step', async () => {
    const setStep = vi.fn();
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'published', publishedBoard, setStep }));
    render(<BoardCreatorWizard />);
    await userEvent.click(screen.getByTestId('make-another-btn'));
    expect(setStep).toHaveBeenCalledWith('configure');
  });
});
