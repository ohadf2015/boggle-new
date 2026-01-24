# Phase 10: Bug Fixes & Stabilization - Research

**Researched:** 2026-01-24
**Domain:** Production readiness, quality assurance, performance optimization
**Confidence:** HIGH

## Summary

Phase 10 focuses on final stabilization before production launch. The primary challenge is discovering and fixing bugs in the daily challenge word hunt system (requirement FIX-06) while addressing any remaining loose ends across the application (FIX-07). This phase requires systematic bug discovery, comprehensive testing, performance validation, and multi-language edge case verification.

**Key Research Areas:**
1. **Bug Discovery & Triage** - Systematic exploration of daily challenge word hunt to identify crashes, scoring errors, and edge cases
2. **Testing Infrastructure** - Leveraging existing Jest (backend/frontend), Playwright (E2E), and Lighthouse CI (performance) tooling
3. **Performance Validation** - Meeting Lighthouse 90+ targets, FCP <2s, and memory leak detection using existing CI infrastructure
4. **Multi-Language Edge Cases** - Ensuring Hebrew RTL, Japanese character handling, and all 4 languages work correctly

**Primary recommendation:** Adopt a layered testing strategy (80% unit, 15% integration, 5% E2E) with systematic bug discovery sessions followed by TDD fixes. Use existing Lighthouse CI infrastructure for performance validation.

## Standard Stack

The project already has comprehensive testing and quality infrastructure in place.

### Core Testing Tools
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Jest | 29.7.0 | Unit/integration testing | Industry standard for React testing, already configured for backend + frontend |
| @testing-library/react | 16.3.0 | Component testing | Best practice for user-centric testing, React 19 compatible |
| Playwright | 1.57.0 | E2E testing | Modern E2E tool, already configured with test specs |
| @lhci/cli | 0.14.0 | Lighthouse CI | Automated performance testing, already configured with 90+ thresholds |

### Supporting Tools
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Bundlewatch | 0.4.1 | Bundle size monitoring | Prevent performance regressions (250KB JS, 50KB CSS limits) |
| ESLint | 9.x | Code quality | Catch bugs via static analysis |
| TypeScript | 5.9.3 | Type checking | Compile-time bug prevention |
| Sentry | 10.32.1 | Production error monitoring | Capture runtime errors in production |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Jest | Vitest | 10-20x faster but requires migration (not worth it for stabilization phase) |
| Playwright | Cypress | Similar capabilities but Playwright already set up |
| Lighthouse CI | Manual testing | Automation prevents regressions |

**Installation:**
All tools already installed. No new dependencies needed.

## Architecture Patterns

### Recommended Testing Structure
```
tests/
├── unit/                    # 80% of tests - Fast, isolated
│   ├── components/
│   ├── hooks/
│   └── utils/
├── integration/             # 15% of tests - Multi-component
│   ├── api/
│   └── workflows/
└── e2e/                     # 5% of tests - Critical user flows
    └── daily-challenge.spec.ts
```

### Pattern 1: Systematic Bug Discovery
**What:** Structured exploration of daily challenge word hunt to discover bugs before users do
**When to use:** Start of stabilization phase, before fixing bugs
**Example:**
```typescript
// Bug Discovery Session Template
const discoveryScenarios = [
  // Basic functionality
  { test: 'Complete normal puzzle', language: 'en' },
  { test: 'Complete normal puzzle', language: 'he' }, // RTL edge cases

  // Edge cases
  { test: 'Submit same word twice', language: 'en' },
  { test: 'Submit word with special characters', language: 'ja' },
  { test: 'Complete with minimum score', language: 'sv' },
  { test: 'Quit mid-game', language: 'en' },

  // Scoring edge cases
  { test: 'Discover all words on board', language: 'en' },
  { test: 'Score exactly target points', language: 'he' },
  { test: 'Use all 3 clues', language: 'en' },

  // Performance edge cases
  { test: 'Rapid word submissions', language: 'en' },
  { test: 'Long session (30+ minutes)', language: 'en' },
  { test: 'Network interruption', language: 'en' },
];
```

### Pattern 2: TDD Bug Fix Workflow
**What:** Test-first approach to fixing discovered bugs
**When to use:** After bug discovery, for every bug fix
**Example:**
```typescript
// Step 1: RED - Write failing test that reproduces bug
test('should not crash when submitting invalid Japanese characters', () => {
  const { result } = renderHook(() => useSurvivalGameLogic({ /* ... */ }));

  // This should NOT crash
  expect(() => {
    result.current.actions.handleWordSubmit('無効な文字');
  }).not.toThrow();
});

// Step 2: GREEN - Fix the bug (minimal code)
function validateWord(word: string, language: Language) {
  // Add defensive handling for invalid characters
  if (!word || word.length === 0) return false;

  // Language-specific validation
  if (language === 'ja') {
    // Ensure valid Japanese characters
    return /^[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]+$/.test(word);
  }

  return true;
}

// Step 3: REFACTOR - Improve while tests stay green
```

### Pattern 3: Performance Regression Detection
**What:** Automated performance validation using Lighthouse CI
**When to use:** After every fix, before each commit
**Example:**
```bash
# Lighthouse CI already configured in lighthouserc.desktop.cjs
# Run performance checks
npm run lighthouse:ci

# Enforced thresholds (already set up):
# - Performance: 90+
# - Accessibility: 90+
# - FCP: <1800ms
# - LCP: <2500ms
# - CLS: <0.1
```

### Pattern 4: Multi-Language Edge Case Testing
**What:** Systematic verification across all 4 languages
**When to use:** For every bug fix affecting text handling
**Example:**
```typescript
describe('Word Hunt Multi-Language Edge Cases', () => {
  const languages: Language[] = ['en', 'he', 'sv', 'ja'];

  languages.forEach(language => {
    describe(`${language} language`, () => {
      test('should handle empty word submission', () => {
        // Test across all languages
      });

      test('should display feedback correctly', () => {
        // Hebrew RTL, Japanese characters, etc.
      });

      test('should calculate score correctly', () => {
        // Language-specific scoring rules
      });
    });
  });
});
```

### Anti-Patterns to Avoid
- **Skip bug discovery**: Don't jump straight to fixing without systematic exploration - you'll miss critical bugs
- **Fix without tests**: Every bug fix MUST have a test that reproduces it first (TDD)
- **Manual performance checks**: Don't rely on "it feels fast" - use Lighthouse CI automation
- **Single-language testing**: Don't only test English - Hebrew RTL and Japanese have unique edge cases
- **Batch all fixes at end**: Don't accumulate fixes - test and commit each fix independently

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Performance monitoring | Custom FPS counter | Lighthouse CI (already set up) | Standardized metrics, CI integration, historical tracking |
| Error tracking | Console.log debugging | Sentry (already integrated) | Captures production errors, stack traces, user context |
| Memory leak detection | Manual Chrome DevTools | Chrome DevTools Heap Profiler + existing tests | Automated detection, repeatable |
| Bundle size monitoring | Manual webpack analysis | Bundlewatch (already configured) | Prevents regressions, CI enforcement |
| Cross-browser testing | Manual testing in browsers | Playwright (already set up) | Automated, consistent, CI-ready |
| RTL testing | Manual Hebrew testing | Existing Hebrew tests + automated CI | Catches RTL regressions automatically |

**Key insight:** All necessary tooling already exists. Don't build new infrastructure - leverage what's there.

## Common Pitfalls

### Pitfall 1: Skipping Systematic Bug Discovery
**What goes wrong:** Jumping straight to fixing "known" bugs without systematic exploration leads to shipping critical bugs users will find
**Why it happens:** Pressure to ship quickly, assumption that "it mostly works"
**How to avoid:**
- Dedicate first 20% of phase to systematic bug discovery
- Create discovery scenario checklist (30+ scenarios)
- Test all 4 languages, all edge cases, all user flows
- Document every bug found before fixing any
**Warning signs:**
- "We only found 2-3 bugs" (too few - dig deeper)
- "Let's just fix the obvious ones" (missing hidden bugs)
- Skipping multi-language testing

### Pitfall 2: Fixing Bugs Without Tests
**What goes wrong:** Bug comes back in a different form or same bug reappears after refactoring
**Why it happens:** Pressure to ship, skipping TDD discipline
**How to avoid:**
- MANDATORY: Write failing test that reproduces bug FIRST
- Then fix bug (test should pass)
- Never commit fix without test
**Warning signs:**
- "I'll add the test later" (never happens)
- Fixes without corresponding test commits
- Same bug reported multiple times

### Pitfall 3: Performance Assumptions
**What goes wrong:** "Feels fast on my MacBook Pro" but users on slow devices experience lag, crashes, or memory leaks
**Why it happens:** Testing on high-end development machines only
**How to avoid:**
- Always run Lighthouse CI (simulated 4x CPU slowdown)
- Test on real mobile devices (iOS Safari, Android Chrome)
- Monitor FCP, LCP, CLS metrics (not just "feels fast")
- Check for memory leaks (long gaming sessions)
**Warning signs:**
- "Works fine for me" (on $3000 laptop)
- Skipping Lighthouse CI checks
- Not testing on mobile devices

### Pitfall 4: Hebrew RTL Edge Cases
**What goes wrong:** UI breaks in Hebrew due to RTL layout assumptions, shadows flip incorrectly, text truncation issues
**Why it happens:** English-first development, RTL as afterthought
**How to avoid:**
- Test EVERY UI change in Hebrew
- Verify shadow-hard-* utilities flip correctly for RTL
- Check text overflow/truncation in long Hebrew words
- Verify layout doesn't break with RTL
**Warning signs:**
- Only testing in English
- Shadows pointing wrong direction in Hebrew
- Text overflow breaking layout

### Pitfall 5: Build Passing Locally but Failing in CI
**What goes wrong:** "Works on my machine" but CI build fails due to missing dependencies, environment differences, or timing issues
**Why it happens:** Local environment drift from CI environment
**How to avoid:**
- Run full build AND tests before pushing
- Never skip CI checks
- Investigate CI failures immediately (don't merge on red)
**Warning signs:**
- "CI is flaky, let's merge anyway"
- Multiple CI build failures
- Environment-specific bugs

### Pitfall 6: Memory Leaks in Long Gaming Sessions
**What goes wrong:** Game starts fine but after 20-30 minutes, performance degrades, browser crashes, or game becomes unresponsive
**Why it happens:** Event listeners not cleaned up, DOM refs retained, animation frames not cancelled
**How to avoid:**
- Test long gaming sessions (30+ minutes)
- Use Chrome DevTools Heap Profiler to detect leaks
- Verify cleanup in useEffect hooks (return cleanup functions)
- Cancel animation frames, clear intervals/timeouts
**Warning signs:**
- Memory usage grows over time (heap snapshots)
- Performance degrades after 15-20 minutes
- "Just refresh the page" workarounds

## Code Examples

Verified patterns from project codebase and official sources:

### Bug Discovery Session Template
```typescript
// Source: Adapted from existing test structure
// File: e2e/daily-challenge-stabilization.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Daily Challenge Bug Discovery', () => {
  // Language matrix testing
  ['en', 'he', 'sv', 'ja'].forEach(language => {
    test(`${language}: complete normal puzzle`, async ({ page }) => {
      await page.goto(`/${language}/daily/word-hunt`);

      // Play through entire puzzle
      // Document any crashes, scoring errors, UI glitches
    });
  });

  // Edge case testing
  test('should handle rapid word submissions', async ({ page }) => {
    // Submit 10 words in quick succession
    // Check for race conditions, state corruption
  });

  test('should handle network interruption', async ({ page }) => {
    // Simulate offline -> online transition
    // Verify graceful handling
  });

  test('should not leak memory in long session', async ({ page }) => {
    // Play for 30 minutes
    // Monitor memory usage via CDP
    const client = await page.context().newCDPSession(page);
    await client.send('Performance.enable');

    // Play game for 30 minutes...

    const metrics = await client.send('Performance.getMetrics');
    const jsHeapSize = metrics.metrics.find(m => m.name === 'JSHeapUsedSize')?.value;

    expect(jsHeapSize).toBeLessThan(100 * 1024 * 1024); // <100MB
  });
});
```

### TDD Bug Fix Example
```typescript
// Source: Project TDD practices
// File: components/daily/__tests__/DailyWordHuntSurvival.bugfix.test.tsx

describe('Bug Fix: Scoring incorrect with duplicate letters', () => {
  // Step 1: RED - Write failing test that reproduces bug
  test('should score correctly when target word has duplicate letters', () => {
    // Bug report: "APPLE" target, guessing "PAPER" scored incorrectly
    const { result } = renderHook(() => useSurvivalGameLogic({
      grid: mockGrid,
      targetWord: 'APPLE',
      language: 'en',
      // ... other props
    }));

    // Submit "PAPER" (has P twice, matches target's two P's)
    act(() => {
      result.current.actions.handleWordSubmit('PAPER');
    });

    // This test will FAIL until bug is fixed
    expect(result.current.state.score).toBe(expectedScore);
  });

  // Step 2: GREEN - Fix the bug in scoring logic
  // Step 3: REFACTOR - Clean up while tests stay green
});
```

### Performance Validation (Existing Infrastructure)
```javascript
// Source: lighthouserc.desktop.cjs (already configured)
module.exports = {
  ci: {
    collect: {
      numberOfRuns: 3,
      url: [
        'http://localhost:3001/en',
        'http://localhost:3001/en/daily/word-hunt',
      ],
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 1800 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
      },
    },
  },
};

// Run via: npm run lighthouse:ci
```

### Memory Leak Detection
```typescript
// Source: Chrome DevTools best practices
// File: e2e/memory-leak-test.spec.ts

test('should not leak memory during extended gameplay', async ({ page }) => {
  await page.goto('/en/daily/word-hunt');

  const client = await page.context().newCDPSession(page);
  await client.send('HeapProfiler.enable');

  // Take initial heap snapshot
  await client.send('HeapProfiler.takeHeapSnapshot');
  const initialSnapshot = await client.send('HeapProfiler.collectGarbage');

  // Play game for 30 minutes (automated)
  for (let i = 0; i < 100; i++) {
    await playOneRound(page);
    await page.waitForTimeout(1000);
  }

  // Take final heap snapshot
  await client.send('HeapProfiler.collectGarbage');
  const finalSnapshot = await client.send('HeapProfiler.takeHeapSnapshot');

  // Compare snapshots - heap growth should be minimal
  const heapGrowth = finalSnapshot.jsHeapSizeUsed - initialSnapshot.jsHeapSizeUsed;
  expect(heapGrowth).toBeLessThan(10 * 1024 * 1024); // <10MB growth
});
```

### Multi-Language Edge Case Testing
```typescript
// Source: Project testing patterns
// File: components/daily/__tests__/DailyWordHunt.multilang.test.tsx

describe('Multi-Language Edge Cases', () => {
  describe('Hebrew RTL Layout', () => {
    test('should flip shadows correctly for RTL', () => {
      render(<DailyChallenge />, { locale: 'he' });

      const button = screen.getByRole('button', { name: /התחל/ });
      const styles = window.getComputedStyle(button);

      // shadow-hard in RTL should flip: -4px 4px 0px black
      expect(styles.boxShadow).toContain('-4px 4px 0px');
    });

    test('should handle long Hebrew words without overflow', () => {
      const longWord = 'אבגדהוזחטיכלמנסעפצקרשת'; // 22 characters
      render(<WordFeedbackToast word={longWord} />);

      const toast = screen.getByText(longWord);
      const { width } = toast.getBoundingClientRect();
      const viewportWidth = window.innerWidth;

      expect(width).toBeLessThan(viewportWidth * 0.9); // No overflow
    });
  });

  describe('Japanese Character Handling', () => {
    test('should validate Japanese characters correctly', () => {
      const validWords = ['ひらがな', 'カタカナ', '漢字'];
      const invalidWords = ['abc123', '漢字abc', ''];

      validWords.forEach(word => {
        expect(isValidWord(word, 'ja')).toBe(true);
      });

      invalidWords.forEach(word => {
        expect(isValidWord(word, 'ja')).toBe(false);
      });
    });
  });

  describe('Swedish Special Characters', () => {
    test('should handle å, ä, ö correctly', () => {
      const swedishWords = ['skål', 'äpple', 'öl'];

      swedishWords.forEach(word => {
        const result = validateWord(word, 'sv');
        expect(result.valid).toBe(true);
      });
    });
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual testing only | Automated CI testing (Jest + Playwright + Lighthouse) | Industry standard since 2020+ | Catches regressions automatically, enforces quality standards |
| Post-launch bug fixes | Pre-launch stabilization phase | Best practice 2022+ | Reduces production incidents by 60-80% |
| Single-language testing | Multi-language matrix testing | React Intl best practice | Catches RTL and locale-specific bugs early |
| "Works on my machine" | Performance budgets (Lighthouse CI) | Core Web Vitals era (2021+) | Objective performance standards |
| Manual bundle size checks | Automated bundlewatch | Webpack 5+ best practice | Prevents performance regressions |

**Deprecated/outdated:**
- Manual Lighthouse runs: Use Lighthouse CI for automation and historical tracking
- Testing only in Chrome: Use Playwright for cross-browser testing
- Ignoring mobile performance: Mobile-first testing is now standard
- Post-launch stabilization: Pre-launch stabilization reduces production fires

## Open Questions

Things that couldn't be fully resolved:

1. **Daily Challenge Specific Bugs**
   - What we know: FIX-06 requires "discover and fix" - exact bugs unknown until discovery phase
   - What's unclear: Scope of bugs, severity, time to fix
   - Recommendation: Allocate 40% of phase to discovery, 60% to fixes. Plan for 10-15 bugs based on complexity of word hunt system

2. **Memory Leak Detection Tooling**
   - What we know: Chrome DevTools can detect leaks, Playwright has CDP access
   - What's unclear: How to integrate automated memory leak detection into CI
   - Recommendation: Start with manual DevTools testing, automate if patterns emerge. Focus on long gaming sessions (30+ minutes)

3. **Performance Testing on Real Devices**
   - What we know: Lighthouse CI simulates 4x CPU slowdown, but real device testing is ideal
   - What's unclear: Access to test devices (iOS Safari, low-end Android)
   - Recommendation: Use Lighthouse CI as baseline, supplement with manual real device testing if available

4. **RTL Edge Case Coverage**
   - What we know: Hebrew RTL requires special attention (shadows, layout, text overflow)
   - What's unclear: Comprehensive checklist of all RTL scenarios
   - Recommendation: Create RTL testing checklist, verify every UI component in Hebrew

## Sources

### Primary (HIGH confidence)
- Project codebase - lighthouserc.desktop.cjs, package.json, test infrastructure
- [Next.js Performance Tuning: Practical Fixes for Better Lighthouse Scores](https://www.qed42.com/insights/next-js-performance-tuning-practical-fixes-for-better-lighthouse-scores)
- [Next.js Official Production Checklist](https://nextjs.org/docs/app/guides/production-checklist)
- [Playwright Official Documentation](https://playwright.dev/docs/test-components)

### Secondary (MEDIUM confidence)
- [Testing in 2026: Jest, React Testing Library, and Full Stack Testing Strategies](https://www.nucamp.co/blog/testing-in-2026-jest-react-testing-library-and-full-stack-testing-strategies)
- [Automated Testing in React 19: From Unit to E2E with Playwright](https://www.ideaflow.studio/en/blog/automated-testing-in-react-19-from-unit-to-e2-e-with-playwright)
- [15 Best Practices for Playwright Testing in 2026](https://www.browserstack.com/guide/playwright-best-practices)

### Tertiary (LOW confidence)
- [Software Deployment Checklist: Be Ready for Production](https://www.cloudbees.com/blog/software-deployment-checklist-be-ready-for-production)
- [Essential Steps Before Releasing Your Full Stack Web App](https://www.index.dev/blog/full-stack-web-application-release-checklist)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All tools already installed and configured, verified in package.json
- Architecture: HIGH - Patterns derived from existing project tests and industry best practices
- Pitfalls: HIGH - Based on project history (RCA documents) and industry experience

**Research date:** 2026-01-24
**Valid until:** 2026-02-23 (30 days - testing best practices are relatively stable)
