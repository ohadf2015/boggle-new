---
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm *), Task, mcp__playwright__*, mcp__memory__*
description: UI review with automated browser testing - pixel perfect, all screen sizes
---

# UI Review with Playwright Testing

Use ui-ux-designer agent, ui-comprehensive-tester agent, and Playwright MCP for thorough UI testing.

## Process

1. **Recall UI patterns** - Search memory for related UI decisions and past issues
2. **Visual review** - Use agents to analyze UI design and UX
3. **Automated testing** - Use Playwright MCP for browser automation
4. **Multi-device testing** - Test responsive layouts and interactions
5. **Report findings** - Detailed issues and suggestions
6. **Store decisions** - Save UI patterns for future reference

## Playwright MCP Integration

### Start Browser Session
```
mcp__playwright__browser_navigate(url="http://localhost:3000")
```

### Take Screenshots for Analysis
```
mcp__playwright__browser_screenshot()
```

### Test Responsive Layouts
```
# Mobile viewport
mcp__playwright__browser_resize(width=375, height=667)
mcp__playwright__browser_screenshot()

# Tablet viewport
mcp__playwright__browser_resize(width=768, height=1024)
mcp__playwright__browser_screenshot()

# Desktop viewport
mcp__playwright__browser_resize(width=1920, height=1080)
mcp__playwright__browser_screenshot()
```

### Interact with UI Elements
```
mcp__playwright__browser_click(selector="[data-testid='start-button']")
mcp__playwright__browser_type(selector="input[name='username']", text="TestUser")
```

### Get Page Accessibility Tree
```
mcp__playwright__browser_snapshot()
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