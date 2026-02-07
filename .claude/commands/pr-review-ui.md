---
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm *), Bash(playwriter *), Bash(npx playwriter*), Task, mcp__memory__*
description: UI review with Playwriter browser testing - pixel perfect, all screen sizes
---

# UI Review with Playwriter Testing

Use ui-ux-designer agent, ui-comprehensive-tester agent, and Playwriter CLI for thorough UI testing.

## Process

1. **Recall UI patterns** - Search memory for related UI decisions and past issues
2. **Visual review** - Use agents to analyze UI design and UX
3. **Automated testing** - Use Playwriter CLI for browser automation
4. **Multi-device testing** - Test responsive layouts and interactions
5. **Report findings** - Detailed issues and suggestions
6. **Store decisions** - Save UI patterns for future reference

## Playwriter Integration

### Prerequisites

1. User must have Playwriter Chrome extension installed
2. User must click extension icon on the tab they want to control
3. If `playwriter` not found, use `npx playwriter@latest`

### Start Session
```bash
playwriter session new
```

### Navigate and Screenshot
```bash
playwriter -s 1 -e "state.page = await context.newPage(); await state.page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' })"
playwriter -s 1 --timeout 20000 -e "await screenshotWithAccessibilityLabels({ page: state.page })"
```

### Test Responsive Layouts
```bash
# Mobile viewport
playwriter -s 1 -e "await state.page.setViewportSize({ width: 375, height: 667 })"
playwriter -s 1 -e "await state.page.screenshot({ path: 'mobile.png', scale: 'css' })"

# Tablet viewport
playwriter -s 1 -e "await state.page.setViewportSize({ width: 768, height: 1024 })"
playwriter -s 1 -e "await state.page.screenshot({ path: 'tablet.png', scale: 'css' })"

# Desktop viewport
playwriter -s 1 -e "await state.page.setViewportSize({ width: 1920, height: 1080 })"
playwriter -s 1 -e "await state.page.screenshot({ path: 'desktop.png', scale: 'css' })"
```

### Interact with UI Elements
```bash
playwriter -s 1 -e "await state.page.click('[data-testid=\"start-button\"]')"
playwriter -s 1 -e "await state.page.locator('input[name=\"username\"]').fill('TestUser')"
```

### Get Accessibility Snapshot
```bash
playwriter -s 1 -e "console.log(await accessibilitySnapshot({ page: state.page }))"
```

## Review Checklist

### Visual Quality
- [ ] Contrast ratios meet WCAG AA standards
- [ ] Font sizes are readable on all devices
- [ ] No partially hidden elements
- [ ] Consistent spacing and alignment
- [ ] Proper visual hierarchy

### Responsive Design
- [ ] Mobile (375px) - touch-friendly, no horizontal scroll
- [ ] Tablet (768px) - optimal layout, readable
- [ ] Desktop (1920px) - no stretched elements, good density
- [ ] Landscape mode - proper adaptation

### Interactions
- [ ] Buttons have visible hover/active states
- [ ] Focus indicators visible for keyboard navigation
- [ ] Loading states shown during async operations
- [ ] Error states clear and actionable

### Cognitive Load
- [ ] One primary action per screen/section
- [ ] Clear information hierarchy
- [ ] No overwhelming visual elements
- [ ] Intuitive navigation paths

## Agent Integration

### Use UI/UX Designer Agent
```
Task(ui-ux-designer): "Review [component/page] for UX issues. Focus on: visual hierarchy, cognitive load, accessibility."
```

### Use Comprehensive Tester Agent
```
Task(ui-comprehensive-tester): "Test [component/page] across all viewports and interaction states."
```

## Memory Integration

### Recall (Step 1)
```
mcp__memory__memory_recall(query="UI review [component] issues patterns")
```

### Store (Step 6)
```
mcp__memory__memory_store(
  content="UI review: [component]. Issues found: [issues]. Fixes applied: [fixes].",
  type="fact",
  tags=["ui", "review", "[component]"],
  importance=6
)
```

## Output Format

```markdown
## UI Review Report: [Component/Page]

### Screenshots
[Attached screenshots at different viewports]

### Issues Found
| Priority | Issue | Location | Recommendation |
|----------|-------|----------|----------------|
| High | [issue] | [selector] | [fix] |
| Medium | [issue] | [selector] | [fix] |

### Responsive Issues
- **Mobile**: [issues]
- **Tablet**: [issues]
- **Desktop**: [issues]

### Accessibility Concerns
- [concern 1]
- [concern 2]

### Recommendations
1. [recommendation with rationale]
2. [recommendation with rationale]
```
