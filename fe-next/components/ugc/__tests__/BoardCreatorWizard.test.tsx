/**
 * Tests for BoardCreatorWizard component
 * TDD: RED phase
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BoardCreatorWizard } from '../BoardCreatorWizard';
// Mock the hook
jest.mock('@/hooks/useBoardCreator');
import { useBoardCreator, type UseBoardCreatorReturn, type GeneratedBoard } from '@/hooks/useBoardCreator';
const mockUseBoardCreator = useBoardCreator as jest.MockedFunction<typeof useBoardCreator>;

jest.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    t: (key: string) => key,
    language: 'en',
    dir: 'ltr',
  }),
}));


const mockBoard: GeneratedBoard = {
  grid: [['A','B','C','D'],['E','F','G','H'],['I','J','K','L'],['M','N','O','P']],
  totalFindableWords: 20,
  difficulty: 'MEDIUM',
  seedWordsPlaced: ['cat'],
};

function makeHookReturn(overrides: Partial<UseBoardCreatorReturn> = {}): UseBoardCreatorReturn {
  return {
    step: 'configure',
    setStep: jest.fn(),
    gridSize: 4,
    setGridSize: jest.fn(),
    language: 'en',
    setLanguage: jest.fn(),
    seedWords: '',
    setSeedWords: jest.fn(),
    generatedBoard: null,
    isGenerating: false,
    generateError: null,
    generateBoard: jest.fn().mockResolvedValue(undefined),
    shuffleBoard: jest.fn().mockResolvedValue(undefined),
    title: '',
    setTitle: jest.fn(),
    description: '',
    setDescription: jest.fn(),
    isPublishing: false,
    publishError: null,
    publishedBoard: null,
    publishBoard: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('BoardCreatorWizard — step 1 (configure)', () => {
  it('renders configure step by default', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn());
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('step-configure')).toBeInTheDocument();
  });

  it('renders 3 grid size toggle buttons', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn());
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('grid-size-4')).toBeInTheDocument();
    expect(screen.getByTestId('grid-size-5')).toBeInTheDocument();
    expect(screen.getByTestId('grid-size-6')).toBeInTheDocument();
  });

  it('clicking grid size 5 calls setGridSize(5)', async () => {
    const setGridSize = jest.fn();
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ setGridSize }));
    render(<BoardCreatorWizard />);
    await userEvent.click(screen.getByTestId('grid-size-5'));
    expect(setGridSize).toHaveBeenCalledWith(5);
  });

  it('clicking grid size 6 calls setGridSize(6)', async () => {
    const setGridSize = jest.fn();
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ setGridSize }));
    render(<BoardCreatorWizard />);
    await userEvent.click(screen.getByTestId('grid-size-6'));
    expect(setGridSize).toHaveBeenCalledWith(6);
  });

  it('seed words textarea is present', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn());
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('seed-words-input')).toBeInTheDocument();
  });

  it('typing in seed words calls setSeedWords', async () => {
    const setSeedWords = jest.fn();
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ setSeedWords }));
    render(<BoardCreatorWizard />);
    const input = screen.getByTestId('seed-words-input');
    await userEvent.type(input, 'a');
    expect(setSeedWords).toHaveBeenCalled();
  });

  it('clicking generate button calls generateBoard', async () => {
    const generateBoard = jest.fn().mockResolvedValue(undefined);
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ generateBoard }));
    render(<BoardCreatorWizard />);
    await userEvent.click(screen.getByTestId('generate-btn'));
    expect(generateBoard).toHaveBeenCalledTimes(1);
  });

  it('shuffle button is not visible when no board generated', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ generatedBoard: null }));
    render(<BoardCreatorWizard />);
    expect(screen.queryByTestId('shuffle-btn')).not.toBeInTheDocument();
  });

  it('shuffle button is visible when board is generated', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ generatedBoard: mockBoard }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('shuffle-btn')).toBeInTheDocument();
  });

  it('clicking shuffle calls shuffleBoard', async () => {
    const shuffleBoard = jest.fn().mockResolvedValue(undefined);
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ generatedBoard: mockBoard, shuffleBoard }));
    render(<BoardCreatorWizard />);
    await userEvent.click(screen.getByTestId('shuffle-btn'));
    expect(shuffleBoard).toHaveBeenCalledTimes(1);
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

  it('shows grid preview', () => {
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard }));
    render(<BoardCreatorWizard />);
    expect(screen.getByTestId('board-preview-grid')).toBeInTheDocument();
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
    const setTitle = jest.fn();
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard, setTitle }));
    render(<BoardCreatorWizard />);
    const input = screen.getByTestId('title-input');
    await userEvent.type(input, 'a');
    expect(setTitle).toHaveBeenCalled();
  });

  it('publish button calls publishBoard', async () => {
    const publishBoard = jest.fn().mockResolvedValue(undefined);
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard, publishBoard }));
    render(<BoardCreatorWizard />);
    await userEvent.click(screen.getByTestId('publish-btn'));
    expect(publishBoard).toHaveBeenCalledTimes(1);
  });

  it('back button calls setStep configure', async () => {
    const setStep = jest.fn();
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'preview', generatedBoard: mockBoard, setStep }));
    render(<BoardCreatorWizard />);
    await userEvent.click(screen.getByTestId('back-btn'));
    expect(setStep).toHaveBeenCalledWith('configure');
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
    const setStep = jest.fn();
    mockUseBoardCreator.mockReturnValue(makeHookReturn({ step: 'published', publishedBoard, setStep }));
    render(<BoardCreatorWizard />);
    await userEvent.click(screen.getByTestId('make-another-btn'));
    expect(setStep).toHaveBeenCalledWith('configure');
  });
});
