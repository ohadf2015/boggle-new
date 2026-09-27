import { render } from '@testing-library/react';
import '@testing-library/jest-dom';

/**
 * Regression guard for the "tap language switcher on /he → whole screen
 * blanks, dropdown never appears" bug.
 *
 * Root cause: Radix Select is unconditionally modal in this version — while
 * open it locks <body> (react-remove-scroll) and aria-hides every sibling. If
 * the popper computes its placement with LTR collision math on an RTL page it
 * renders off-screen, so the page is hidden + frozen behind an invisible
 * dropdown — a blank, dead screen.
 *
 * Fix: bind the active locale's text direction directly to the Select (Radix
 * resolves direction as dirProp ?? contextDir ?? 'ltr'). On Hebrew this forces
 * RTL collision math so the dropdown is placed on-screen, independent of
 * whether the global RadixDirectionProvider context reaches this instance.
 *
 * Radix Select Root does not forward `dir` to the DOM, so we capture the prop
 * at the component boundary.
 */

const mockSetLanguage = vi.fn();
let mockDir: 'rtl' | 'ltr' = 'rtl';
let mockLanguage = 'he';
let mockFlag = '🇮🇱';
vi.mock('@/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    language: mockLanguage,
    setLanguage: mockSetLanguage,
    dir: mockDir,
    t: (key: string) => key,
    currentFlag: mockFlag,
  }),
}));

// Capture the props handed to the underlying Radix Select Root while still
// rendering the real component so the rest of the tree mounts normally.
let capturedSelectProps: Record<string, unknown> = {};
vi.mock('@/components/ui/select', async (importActual) => {
  const actual = await importActual<typeof import('@/components/ui/select')>();
  return {
    ...actual,
    Select: (props: Record<string, unknown>) => {
      capturedSelectProps = props;
      const Real = actual.Select as unknown as (p: Record<string, unknown>) => JSX.Element;
      return Real(props);
    },
  };
});

Element.prototype.scrollIntoView = vi.fn();

import { QuickLanguageSwitcher } from '../QuickLanguageSwitcher';

describe('QuickLanguageSwitcher — RTL direction binding (blank-screen regression guard)', () => {
  beforeEach(() => {
    capturedSelectProps = {};
    mockDir = 'rtl';
    mockLanguage = 'he';
    mockFlag = '🇮🇱';
    vi.clearAllMocks();
  });

  it('forwards rtl direction to the Select on Hebrew so the popper is placed on-screen', () => {
    render(<QuickLanguageSwitcher />);
    expect(capturedSelectProps.dir).toBe('rtl');
  });

  it('forwards the direction in every placement (compact header + showLabel drawer)', () => {
    render(<QuickLanguageSwitcher compact />);
    expect(capturedSelectProps.dir).toBe('rtl');

    capturedSelectProps = {};
    render(<QuickLanguageSwitcher showLabel />);
    expect(capturedSelectProps.dir).toBe('rtl');
  });

  it('forwards ltr direction for left-to-right locales (English unaffected)', () => {
    mockDir = 'ltr';
    mockLanguage = 'en';
    mockFlag = '🇺🇸';
    render(<QuickLanguageSwitcher />);
    expect(capturedSelectProps.dir).toBe('ltr');
  });
});
