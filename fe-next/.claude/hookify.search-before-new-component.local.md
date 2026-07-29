---
name: search-before-new-component
enabled: true
event: file
action: warn
conditions:
  - field: file_path
    operator: regex_match
    pattern: components/.*\.(tsx|jsx)$
  - field: new_text
    operator: regex_match
    pattern: ^(import|'use client'|export\s+(default\s+)?function|const\s+\w+\s*[=:])
---

🔍 **New Component Detected - Search for Similar Components First!**

Before creating a new component, **search the codebase for similar existing components** that could be reused or extended.

## Why Search First?

1. **Consistency**: Reusing components ensures consistent UI/UX across the app
2. **DRY Principle**: Avoid duplicating logic and styling
3. **Maintainability**: Fewer components = less code to maintain
4. **Design System**: This project has established patterns in `components/ui/`

## Before Creating, Ask Yourself:

- [ ] Did I search for similar components? (use `Glob` with pattern `components/**/*.tsx`)
- [ ] Does this component need unique behavior not in existing ones?
- [ ] Does this component need a unique look that can't be achieved with props?
- [ ] Could I extend an existing component with new props instead?

## How to Search

```bash
# Search for similar component names
Glob: components/**/*Button*.tsx
Glob: components/**/*Modal*.tsx
Glob: components/**/*Card*.tsx

# Search for similar functionality
Grep: "onClick" in components/
Grep: "useState" in components/ui/
```

## Common Reusable Components in This Project

Check these directories first:
- `components/ui/` - Base UI components (Button, Dialog, Select, etc.)
- `components/game/` - Game-related components
- `components/auth/` - Authentication components
- `components/settings/` - Settings components

## When It's OK to Create New

✅ Create new component when:
- Searched and found nothing similar
- Existing component can't be extended reasonably
- New component has genuinely unique behavior/appearance
- Creating a sub-component for better organization

❌ Don't create new component when:
- A similar component exists that could be reused
- Small styling changes could be achieved with props/variants
- The "new" component is 80%+ similar to existing one
