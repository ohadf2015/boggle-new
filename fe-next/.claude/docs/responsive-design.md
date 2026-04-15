# Responsive Design (Modern CSS)

**Prefer Container Queries over Viewport Units:**
- Use `@container` queries for component-level responsiveness
- Container query units adapt to parent container, not viewport

**Container Query Units (prefer these):**
- `cqw` - 1% of container's width
- `cqh` - 1% of container's height
- `cqi` - 1% of container's inline size
- `cqb` - 1% of container's block size
- `cqmin` - smaller of `cqi` or `cqb`
- `cqmax` - larger of `cqi` or `cqb`

**When to Use:**
- `cqw`/`cqh` for font sizes, padding, margins that scale with container
- `cqi` for text/inline elements (respects writing direction)
- `cqmin` for square-ish scaling that works in any orientation

**Setup Container:**
```css
.container { container-type: inline-size; }
/* or */
.container { container: card / inline-size; }
```

**Tailwind Usage:**
- Use `@container` variant: `@container/card:text-lg`
- Arbitrary values: `text-[3cqw]`, `p-[2cqi]`

**Avoid:**
- `vw`/`vh` for component internals (use for full-page layouts only)
- Fixed pixel values for responsive elements
