---
allowed-tools: Read, Bash(npm *), Bash(playwriter *), Bash(npx playwriter*), mcp__memory__*, TodoWrite
argument-hint: [page/flow] | --mobile | --headed | --debug
description: Run E2E tests with Playwriter - interactive browser testing via Chrome extension
---

# E2E Testing with Playwriter

Run interactive end-to-end tests using Playwriter to control user's Chrome browser via extension.

## Prerequisites

1. User must have Playwriter Chrome extension installed
2. User must click extension icon on the tab they want to control
3. If `playwriter` not found, use `npx playwriter@latest`

## Process

1. **Recall test patterns** - Search memory for similar test scenarios
2. **Create session** - `playwriter session new` to get isolated session
3. **Start browser** - Navigate to target URL
4. **Execute test flow** - Interact with UI elements using Playwriter commands
5. **Capture evidence** - Screenshots, accessibility snapshots
6. **Validate results** - Check expected outcomes
7. **Report findings** - Document pass/fail with evidence
8. **Store results** - Save test patterns for future reference

## Session Management

**Always create a session first** to get isolated state:

```bash
playwriter session new
# outputs: 1 (your session ID)
```

Use `-s <sessionId>` in all subsequent commands.

## Playwriter Commands

### Browser Navigation
```bash
playwriter -s 1 -e "state.page = await context.newPage(); await state.page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' })"
```

### Take Screenshot
```bash
playwriter -s 1 -e "await page.screenshot({ path: 'screenshot.png', scale: 'css' })"
```

### Get Accessibility Snapshot (Text-based)
```bash
playwriter -s 1 -e "console.log(await accessibilitySnapshot({ page }))"
```

### Get Visual Accessibility Snapshot (with labels)
```bash
playwriter -s 1 --timeout 20000 -e "await screenshotWithAccessibilityLabels({ page })"
```

### Click Element
```bash
# Using aria-ref from accessibility snapshot
playwriter -s 1 -e "await page.locator('aria-ref=e5').click()"

# Using data-testid
playwriter -s 1 -e "await page.click('[data-testid=\"button\"]')"

# Using text
playwriter -s 1 -e "await page.click('text=Start Game')"
```

### Type Text
```bash
playwriter -s 1 -e "await page.locator('input[name=\"username\"]').fill('TestUser')"
```

### Resize Viewport
```bash
playwriter -s 1 -e "await page.setViewportSize({ width: 375, height: 667 })"   # Mobile
playwriter -s 1 -e "await page.setViewportSize({ width: 768, height: 1024 })"  # Tablet
playwriter -s 1 -e "await page.setViewportSize({ width: 1920, height: 1080 })" # Desktop
```

### Wait for Element
```bash
playwriter -s 1 -e "await page.waitForSelector('[data-testid=\"loaded\"]', { timeout: 5000 })"
```

### Wait for Page Load
```bash
playwriter -s 1 -e "await waitForPageLoad({ page, timeout: 5000 })"
```

### Get Element Text
```bash
playwriter -s 1 -e "console.log(await page.locator('[data-testid=\"score\"]').textContent())"
```

### Check Page State After Actions
```bash
playwriter -s 1 -e "console.log('url:', page.url()); console.log(await accessibilitySnapshot({ page }).then(x => x.split('\\n').slice(0, 30).join('\\n')))"
```

## Common Test Flows

### Landing Page Test
```bash
# 1. Create session
playwriter session new  # Get session ID (e.g., 1)

# 2. Navigate and create page
playwriter -s 1 -e "state.page = await context.newPage(); await state.page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' })"

# 3. Get accessibility snapshot to understand page
playwriter -s 1 --timeout 20000 -e "await screenshotWithAccessibilityLabels({ page: state.page })"

# 4. Click start button (use aria-ref from snapshot)
playwriter -s 1 -e "await state.page.locator('aria-ref=e5').click()"

# 5. Wait for game board
playwriter -s 1 -e "await state.page.waitForSelector('[data-testid=\"game-board\"]'); await waitForPageLoad({ page: state.page })"

# 6. Take final screenshot
playwriter -s 1 --timeout 20000 -e "await screenshotWithAccessibilityLabels({ page: state.page })"
```

### Form Submission Test
```bash
# 1. Create session and navigate
playwriter session new
playwriter -s 1 -e "state.page = await context.newPage(); await state.page.goto('http://localhost:3001/join', { waitUntil: 'domcontentloaded' })"

# 2. Fill form
playwriter -s 1 -e "await state.page.locator('input[name=\"code\"]').fill('ABC123')"
playwriter -s 1 -e "await state.page.locator('input[name=\"name\"]').fill('Player1')"

# 3. Submit
playwriter -s 1 -e "await state.page.click('button[type=\"submit\"]')"

# 4. Wait and verify
playwriter -s 1 -e "await state.page.waitForSelector('[data-testid=\"lobby\"]', { timeout: 5000 })"
playwriter -s 1 --timeout 20000 -e "await screenshotWithAccessibilityLabels({ page: state.page })"
```

### Responsive Layout Test
```bash
playwriter session new

# Mobile
playwriter -s 1 -e "state.page = await context.newPage(); await state.page.setViewportSize({ width: 375, height: 667 }); await state.page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' })"
playwriter -s 1 -e "await state.page.screenshot({ path: 'mobile.png', scale: 'css' })"

# Tablet
playwriter -s 1 -e "await state.page.setViewportSize({ width: 768, height: 1024 })"
playwriter -s 1 -e "await state.page.screenshot({ path: 'tablet.png', scale: 'css' })"

# Desktop
playwriter -s 1 -e "await state.page.setViewportSize({ width: 1920, height: 1080 })"
playwriter -s 1 -e "await state.page.screenshot({ path: 'desktop.png', scale: 'css' })"
```

## Device Presets

| Device | Width | Height |
|--------|-------|--------|
| iPhone SE | 375 | 667 |
| iPhone 12 | 390 | 844 |
| iPad | 768 | 1024 |
| iPad Pro | 1024 | 1366 |
| Desktop | 1920 | 1080 |
| Desktop Large | 2560 | 1440 |

## Selector Strategies

Priority order (most reliable first):
1. `aria-ref=eN` - From accessibility snapshot (best for unknown pages)
2. `[data-testid='name']` - Test IDs (best for development)
3. `getByRole('button', { name: 'Save' })` - Accessible, semantic
4. `getByText('Sign in')` - Readable, user-facing
5. `input[name="email"]` - Semantic HTML
6. **Avoid**: `.class`, `#id` - Change frequently

### Handling Multiple Matches

```bash
playwriter -s 1 -e "await page.locator('button').first().click()"   # first match
playwriter -s 1 -e "await page.locator('.item').last().click()"     # last match
playwriter -s 1 -e "await page.locator('li').nth(3).click()"        # 4th item (0-indexed)
```

## Test Checklist

### Functionality
- [ ] Core user flows complete without errors
- [ ] Form submissions work correctly
- [ ] Navigation between pages works
- [ ] Error states display appropriately
- [ ] Loading states show during async operations

### Responsiveness
- [ ] Mobile layout renders correctly
- [ ] Tablet layout renders correctly
- [ ] Desktop layout renders correctly
- [ ] No horizontal scroll on mobile
- [ ] Touch targets are adequate size (44x44px min)

### Accessibility
- [ ] All interactive elements are focusable
- [ ] Proper heading hierarchy
- [ ] Images have alt text
- [ ] Color contrast meets WCAG AA
- [ ] Screen reader compatible

## Memory Integration

### Recall (Step 1)
```
mcp__memory__memory_recall(query="e2e test [page/flow] patterns issues")
```

### Store (Step 8)
```
mcp__memory__memory_store(
  content="E2E test: [flow]. Result: [pass/fail]. Issues: [issues]. Screenshots: [count].",
  type="fact",
  tags=["e2e", "test", "[page]"],
  importance=5
)
```

## Output Format

```markdown
## E2E Test Report: [Flow Name]

### Test Steps
| Step | Action | Result |
|------|--------|--------|
| 1 | Navigate to /page | Pass |
| 2 | Click start button | Pass |
| 3 | Verify game loads | Pass |

### Screenshots
- [Screenshot 1: Initial state]
- [Screenshot 2: After action]

### Issues Found
- [ ] [Issue 1 description]
- [ ] [Issue 2 description]

### Accessibility Findings
[Summary from accessibilitySnapshot]

### Recommendation
[Pass/Fail with notes]
```

## Rules

1. Always create a new session with `playwriter session new` first
2. Store your page in `state.page` to avoid interference from other sessions
3. Use `screenshotWithAccessibilityLabels` for visual understanding (--timeout 20000)
4. Use `accessibilitySnapshot` for text-based element discovery
5. Check page state after actions with URL and snapshot
6. Test on multiple viewport sizes
7. Use aria-ref selectors from snapshots when available
8. Clean up listeners at end: `page.removeAllListeners()`
9. Document all findings with evidence
