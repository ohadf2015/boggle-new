---
name: contrast-fixer
description: This skill should be used when detecting and fixing color contrast issues in the codebase. It finds dark text on dark backgrounds and light text on light backgrounds, then provides fixes to ensure proper readability. Uses an automated Python script for detection and provides Tailwind-specific fix recommendations.
---

# Contrast Fixer

Detect and fix color contrast issues in React/Next.js Tailwind CSS projects.

## When to Use

Invoke this skill when:
- Reviewing UI for accessibility issues
- After adding new components with colored backgrounds
- Before accessibility audits
- When users report readability issues
- During code review of UI changes

## Workflow

### Step 1: Run the Detection Script

Execute the contrast detection script to find issues:

```bash
python3 .claude/skills/contrast-fixer/scripts/detect-contrast-issues.py --path fe-next --fix
```

Options:
- `--path <dir>`: Directory to scan (default: current directory)
- `--fix`: Show fix suggestions inline
- `--json`: Output as JSON for programmatic use
- `--severity error|warning|info`: Filter by minimum severity
- `--verbose`: Show all scanned files
- `--max-depth <n>`: Maximum ancestor depth to check for inherited backgrounds (default: 10)

### Step 2: Interpret Results

The script detects seven types of issues:

1. **ERROR: Dark-on-Dark** - Dark text on dark backgrounds (unreadable)
   - Example: `text-neo-black` on `bg-neo-navy`
   - Fix: Use light text like `text-neo-white` or `text-neo-cream`

2. **ERROR: Light-on-Light** - Light text on light backgrounds (unreadable)
   - Example: `text-white` on `bg-neo-cream`
   - Fix: Use dark text like `text-neo-black` or `text-gray-900`

3. **ERROR: Inherited-Dark-on-Dark** - Dark text where ancestor has dark background
   - Example: Child with `text-neo-black` inside parent with `bg-neo-navy`
   - The report shows which ancestor line defines the background
   - Fix: Use light text on the child element

4. **ERROR: Inherited-Light-on-Light** - Light text where ancestor has light background
   - Example: Child with `text-white` inside parent with `bg-neo-cream`
   - The report shows which ancestor line defines the background
   - Fix: Use dark text on the child element

5. **ERROR: Missing-Dark-Mode-Override** - Dark text without `dark:text-*` when dark mode background exists
   - Example: `text-neo-black` without `dark:text-neo-white` when element has `dark:bg-*`
   - The script detects when you have dark text but forgot to add a dark mode text color override
   - Fix: Either add `dark:text-neo-white` or remove the unnecessary `text-neo-black` if children have explicit colors

6. **ERROR: Low-Opacity-Dark-Mode-Text** - Dark mode text with low opacity (<=50%) that's hard to read
   - Example: `dark:text-neo-cream/50` - 50% opacity text is barely visible on dark backgrounds
   - The script detects when dark mode text has opacity of 50% or lower
   - Fix: Use full opacity text like `dark:text-slate-400` or `dark:text-neo-cream` instead

7. **WARNING: Missing Foreground** - Colored background without explicit text color
   - Example: `bg-neo-pink` without any `text-*` class
   - Fix: Add explicit text color that contrasts with background

### Step 3: Apply Fixes

For each issue reported, update the component's className:

**Dark backgrounds need light text:**
```tsx
// Before (dark on dark - bad)
<div className="bg-neo-navy text-neo-black">...</div>

// After (light on dark - good)
<div className="bg-neo-navy text-neo-white">...</div>
```

**Light backgrounds need dark text:**
```tsx
// Before (light on light - bad)
<div className="bg-neo-cream text-white">...</div>

// After (dark on light - good)
<div className="bg-neo-cream text-neo-black">...</div>
```

**Add missing foreground colors:**
```tsx
// Before (missing text color)
<div className="bg-neo-pink p-4">Important text</div>

// After (explicit text color)
<div className="bg-neo-pink text-neo-white p-4">Important text</div>
```

**Fix inherited contrast issues:**
```tsx
// Before (inherited-light-on-light - bad)
<div className="bg-neo-cream">           {/* line 10: light background */}
  <div className="p-4">
    <span className="text-neo-yellow">   {/* line 12: light text - ERROR! */}
      This text is hard to read
    </span>
  </div>
</div>

// After (proper contrast)
<div className="bg-neo-cream">
  <div className="p-4">
    <span className="text-neo-black">    {/* dark text on light bg */}
      This text is readable
    </span>
  </div>
</div>
```

**Fix missing dark mode overrides:**
```tsx
// Before (missing-dark-mode-override - bad)
<div className="bg-neo-cyan/10 text-neo-black dark:bg-neo-cyan/5">
  {/* text-neo-black will be invisible on dark backgrounds! */}
  <span className="font-bold text-neo-black dark:text-white">Username</span>
</div>

// After - Option 1: Add dark mode text override
<div className="bg-neo-cyan/10 text-neo-black dark:bg-neo-cyan/5 dark:text-white">
  <span className="font-bold text-neo-black dark:text-white">Username</span>
</div>

// After - Option 2: Remove unnecessary container text color (if children have explicit colors)
<div className="bg-neo-cyan/10 dark:bg-neo-cyan/5">
  <span className="font-bold text-neo-black dark:text-white">Username</span>
</div>
```

**Fix low-opacity dark mode text:**
```tsx
// Before (low-opacity-dark-mode-text - bad)
<p className="text-neo-black/50 dark:text-neo-cream/50">
  {/* 50% opacity cream on dark bg is barely visible! */}
  This hint text is hard to read in dark mode
</p>

// After - Use solid color or higher opacity
<p className="text-neo-black/60 dark:text-slate-400">
  {/* slate-400 provides good contrast on dark backgrounds */}
  This hint text is now readable in both modes
</p>

// Alternative fix - Use full opacity light color
<p className="text-neo-black/50 dark:text-neo-cream/80">
  {/* 80% opacity is more readable */}
  This text has better visibility
</p>
```

## Color Reference

### Project Theme Colors (from tailwind.config.js)

**Dark Colors (need light text):**
- `neo-navy` (#1a1a2e) - Primary dark background
- `neo-navy-light` (#16213e) - Secondary dark background
- `neo-gray` (#2d2d44) - Card/panel dark background
- `neo-black` (rgb 0,0,0) - Text and borders

**Light Colors (need dark text):**
- `neo-cream` (#FFFEF0) - Primary light background
- `neo-yellow` (#FFE135) - Primary action color
- `neo-lime` (#BFFF00) - Success/positive color
- `neo-cyan` (#00FFFF) - Accent/focus color
- `neo-white` (rgb 255,255,255) - Pure white

**Vibrant Colors (check case-by-case):**
- `neo-pink` (#FF1493) - Use `text-neo-white`
- `neo-purple` (#8b5cf6) - Use `text-neo-white`
- `neo-orange` (#FF6B35) - Use `text-neo-black`
- `neo-red` (#FF3366) - Use `text-neo-white`

### Quick Reference Table

| Background | Recommended Text |
|------------|------------------|
| `bg-neo-navy` | `text-neo-white`, `text-neo-cream` |
| `bg-neo-gray` | `text-neo-white`, `text-neo-cream` |
| `bg-neo-cream` | `text-neo-black` |
| `bg-neo-yellow` | `text-neo-black` |
| `bg-neo-pink` | `text-neo-white` |
| `bg-neo-purple` | `text-neo-white` |
| `bg-neo-orange` | `text-neo-black` |
| `bg-neo-cyan` | `text-neo-black` |
| `bg-neo-lime` | `text-neo-black` |

## WCAG Contrast Requirements

- **Normal text**: Minimum 4.5:1 contrast ratio (AA standard)
- **Large text (18px+ or 14px+ bold)**: Minimum 3:1 contrast ratio
- **AAA standard**: 7:1 for normal text, 4.5:1 for large text

The theme colors in this project are designed to meet WCAG AA standards when paired correctly.

## Common Patterns

### Cards on Dark Backgrounds

```tsx
// Neo-brutalist card pattern
<div className="bg-neo-cream text-neo-black border-4 border-neo-black">
  Card content with proper contrast
</div>
```

### Badges and Labels

```tsx
// Yellow badge
<span className="bg-neo-yellow text-neo-black px-2 py-1">New</span>

// Pink badge
<span className="bg-neo-pink text-neo-white px-2 py-1">Hot</span>
```

### Buttons

```tsx
// Primary button (yellow)
<button className="bg-neo-yellow text-neo-black font-bold">Click Me</button>

// Secondary button (transparent on dark)
<button className="bg-transparent text-neo-white border-3 border-neo-black">Cancel</button>
```

## Integration with CI

To integrate contrast checking into CI/CD:

```bash
# Run check and fail on errors
python3 .claude/skills/contrast-fixer/scripts/detect-contrast-issues.py \
  --path fe-next \
  --severity error \
  && echo "Contrast check passed" \
  || exit 1
```
