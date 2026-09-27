import { render, screen } from '@testing-library/react';
import { useDirection } from '@radix-ui/react-direction';
import { RadixDirectionProvider } from '../RadixDirectionProvider';

const mockUseLanguage = vi.fn();
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => mockUseLanguage(),
}));

// Probe consumes the same direction context that every Radix primitive
// (Select, Dialog, Popover, Tabs…) reads to compute RTL positioning.
function DirectionProbe() {
  const dir = useDirection();
  return <span data-testid="dir">{dir}</span>;
}

describe('RadixDirectionProvider', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('propagates rtl direction to Radix components when language is Hebrew', () => {
    mockUseLanguage.mockReturnValue({ dir: 'rtl', language: 'he' });

    render(
      <RadixDirectionProvider>
        <DirectionProbe />
      </RadixDirectionProvider>
    );

    expect(screen.getByTestId('dir')).toHaveTextContent('rtl');
  });

  it('propagates ltr direction for LTR languages', () => {
    mockUseLanguage.mockReturnValue({ dir: 'ltr', language: 'en' });

    render(
      <RadixDirectionProvider>
        <DirectionProbe />
      </RadixDirectionProvider>
    );

    expect(screen.getByTestId('dir')).toHaveTextContent('ltr');
  });
});
