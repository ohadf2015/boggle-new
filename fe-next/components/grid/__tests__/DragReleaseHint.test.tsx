import { render, screen, waitFor } from '@testing-library/react';
import DragReleaseHint from '../DragReleaseHint';

vi.mock('@/contexts/LanguageContext', () => ({
  useLanguageSafe: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'desktopInput.releaseToSubmit': 'Release to submit',
      };
      return map[key] || key;
    },
  }),
}));

vi.mock('@/hooks/useMediaQuery', () => ({
  useIsDesktop: () => true,
}));

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
    clear: () => { store = {}; },
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('DragReleaseHint', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  it('shows hint when dragging with 2+ cells and not previously dismissed', () => {
    render(
      <DragReleaseHint isDragging={true} selectedCellCount={3} />
    );
    expect(screen.getByText('Release to submit')).toBeInTheDocument();
  });

  it('hides when not dragging', () => {
    render(
      <DragReleaseHint isDragging={false} selectedCellCount={3} />
    );
    expect(screen.queryByText('Release to submit')).not.toBeInTheDocument();
  });

  it('hides when fewer than 2 cells selected', () => {
    render(
      <DragReleaseHint isDragging={true} selectedCellCount={1} />
    );
    expect(screen.queryByText('Release to submit')).not.toBeInTheDocument();
  });

  it('dismisses permanently after word submitted', async () => {
    const { rerender } = render(
      <DragReleaseHint isDragging={true} selectedCellCount={3} wordSubmitted={false} />
    );
    expect(screen.getByText('Release to submit')).toBeInTheDocument();

    // Simulate word submission
    rerender(
      <DragReleaseHint isDragging={true} selectedCellCount={3} wordSubmitted={true} />
    );
    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith('lexiclash_drag_hint_dismissed', '1');
    });
  });

  it('stays hidden if previously dismissed in localStorage', () => {
    localStorageMock.getItem.mockReturnValue('1');
    render(
      <DragReleaseHint isDragging={true} selectedCellCount={3} />
    );
    expect(screen.queryByText('Release to submit')).not.toBeInTheDocument();
  });
});
