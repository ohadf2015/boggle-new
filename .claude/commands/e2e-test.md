---
allowed-tools: Read, Bash(npm *), mcp__playwright__*, mcp__memory__*, TodoWrite
argument-hint: [page/flow] | --mobile | --headed | --debug
description: Run E2E tests with Playwright MCP - interactive browser testing
---

# E2E Testing with Playwright MCP

Run interactive end-to-end tests using the Playwright MCP for browser automation.

## Process

1. **Recall test patterns** - Search memory for similar test scenarios
2. **Start browser** - Navigate to target URL
3. **Execute test flow** - Interact with UI elements
4. **Capture evidence** - Screenshots, accessibility snapshots
5. **Validate results** - Check expected outcomes
6. **Report findings** - Document pass/fail with evidence
7. **Store results** - Save test patterns for future reference

## Playwright MCP Commands

### Browser Navigation
```
mcp__playwright__browser_navigate(url="http://localhost:3000")
```

### Take Screenshot
```
mcp__playwright__browser_screenshot()
```

### Get Accessibility Snapshot
```
mcp__playwright__browser_snapshot()
```

### Click Element
```
mcp__playwright__browser_click(selector="[data-testid='button']")
mcp__playwright__browser_click(selector="text=Start Game")
mcp__playwright__browser_click(selector="#submit-btn")
```

### Type Text
```
mcp__playwright__browser_type(selector="input[name='username']", text="TestUser")
```

### Resize Viewport
```
mcp__playwright__browser_resize(width=375, height=667)   # Mobile
mcp__playwright__browser_resize(width=768, height=1024)  # Tablet
mcp__playwright__browser_resize(width=1920, height=1080) # Desktop
```

### Wait for Element
```
mcp__playwright__browser_wait(selector="[data-testid='loaded']", timeout=5000)
```

### Get Element Text
```
mcp__playwright__browser_evaluate(script="document.querySelector('[data-testid=\"score\"]').textContent")
```

## Common Test Flows

### Landing Page Test
```
1. mcp__playwright__browser_navigate(url="http://localhost:3000")
2. mcp__playwright__browser_screenshot()
3. mcp__playwright__browser_snapshot()  # Check accessibility
4. mcp__playwright__browser_click(selector="[data-testid='start-btn']")
5. mcp__playwright__browser_wait(selector="[data-testid='game-board']")
6. mcp__playwright__browser_screenshot()
```

### Form Submission Test
```
1. mcp__playwright__browser_navigate(url="http://localhost:3000/join")
2. mcp__playwright__browser_type(selector="input[name='code']", text="ABC123")
3. mcp__playwright__browser_type(selector="input[name='name']", text="Player1")
4. mcp__playwright__browser_click(selector="button[type='submit']")
5. mcp__playwright__browser_wait(selector="[data-testid='lobby']", timeout=5000)
6. mcp__playwright__browser_screenshot()
```

### Responsive Layout Test
```
# Mobile
1. mcp__playwright__browser_resize(width=375, height=667)
2. mcp__playwright__browser_navigate(url="http://localhost:3000")
3. mcp__playwright__browser_screenshot()

# Tablet
4. mcp__playwright__browser_resize(width=768, height=1024)
5. mcp__playwright__browser_screenshot()

# Desktop
6. mcp__playwright__browser_resize(width=1920, height=1080)
7. mcp__playwright__browser_screenshot()
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
1. `[data-testid='name']` - Test IDs (best)
2. `[role='button']` - ARIA roles
3. `text=Button Text` - Visible text
4. `#id` - IDs
5. `.class` - CSS classes (least reliable)

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

### Store (Step 7)
```
mcp__memory__memory_store(
  content="E2E test: [flow]. Result: [pass/fail]. Issues: [issues]. Screenshots: [count].",
  type="fact",
  tags=["e2e", "test", "[page]"],
  importance=5
)
```

## Integration with Existing Tests

Run full Playwright test suite:
```bash
npm run test:e2e
```

Run specific test:
```bash
npm run test:e2e -- --grep "[test name]"
```

Run in headed mode:
```bash
npm run test:e2e:headed
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
[Summary from browser_snapshot]

### Recommendation
[Pass/Fail with notes]
```

## Rules

1. Always start with `browser_navigate` to ensure clean state
2. Take screenshots at key steps for evidence
3. Use `browser_snapshot` for accessibility verification
4. Test on multiple viewport sizes
5. Use data-testid selectors when available
6. Wait for elements before interacting
7. Document all findings with evidence
