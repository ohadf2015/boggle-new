# Contrast Fixer

Detect and fix color contrast issues in React/Next.js Tailwind CSS projects.

## When to Use

Invoke this skill when:
- Reviewing UI for accessibility issues
- After adding new components with colored backgrounds
- Before accessibility audits
- When users report readability issues
- During code review of UI changes

## Usage

```bash
python3 .claude/skills/contrast-fixer/scripts/detect-contrast-issues.py --path fe-next --fix
```

## Options

- `--path <dir>`: Directory to scan (default: current directory)
- `--fix`: Show fix suggestions inline
- `--json`: Output as JSON for programmatic use
- `--severity error|warning|info`: Filter by minimum severity
- `--verbose`: Show all scanned files
- `--max-depth <n>`: Maximum ancestor depth to check for inherited backgrounds (default: 10)

## Detected Issues

1. **Dark-on-Dark**: Dark text on dark backgrounds (unreadable)
2. **Light-on-Light**: Light text on light backgrounds (unreadable)
3. **Inherited-Dark-on-Dark**: Dark text where ancestor has dark background
4. **Inherited-Light-on-Light**: Light text where ancestor has light background
5. **Missing-Dark-Mode-Override**: Dark text without `dark:text-*` when dark mode background exists
6. **Low-Opacity-Dark-Mode-Text**: Dark mode text with low opacity (<=50%)
7. **Missing Foreground**: Colored background without explicit text color
8. **Low-Opacity-Light-Text-on-Dark**: Light text with low opacity (<=80%) on dark backgrounds (e.g., `text-neo-cream/80`)
9. **Low-Opacity-Dark-Text-on-Light**: Dark text with low opacity (<=75%) on light backgrounds (e.g., `text-neo-black/70`)

## Examples

**Fix dark-on-dark:**
```tsx
// Before
<div className="bg-neo-navy text-neo-black">Bad</div>

// After
<div className="bg-neo-navy text-neo-white">Good</div>
```

**Fix inherited issues:**
```tsx
// Before
<div className="bg-neo-cream">
  <span className="text-neo-yellow">Hard to read</span>
</div>

// After
<div className="bg-neo-cream">
  <span className="text-neo-black">Readable</span>
</div>
```

**Fix missing dark mode override:**
```tsx
// Before
<div className="text-neo-black dark:bg-neo-cyan/5">
  Will be invisible in dark mode
</div>

// After
<div className="text-neo-black dark:bg-neo-cyan/5 dark:text-white">
  Visible in both modes
</div>
```

**Fix low opacity light text on dark backgrounds:**
```tsx
// Before
<p className="dark:text-neo-cream/50">Barely visible</p>

// After
<p className="text-neo-white">Readable</p>
```

**Fix low opacity dark text on light backgrounds:**
```tsx
// Before - Hard to read on cream/lime/yellow backgrounds
<p className="text-neo-black/70">Almost invisible</p>
<span className="text-neo-black/75">Poor contrast</span>

// After - Use solid color for better readability
<p className="text-neo-gray">Readable</p>
<span className="text-neo-gray">Good contrast</span>
```
