# Feature Implementation Workflow

## Description
Implement new features thoroughly - understand context first, ask questions, write tests, then implement following LexiClash standards.

## Tools Needed
- `file_read`, `file_write`, `file_edit`
- `bash` (npm, npx, git)
- `glob`, `grep_content`, `grep_file`
- `spawn_subagent` (file-navigator for research)
- `todo_update`
- `clarification_tool`

## Project Context
Before starting, read:
- `AGENTS.md` - Commands, architecture, patterns
- `fe-next/claude.md` - Coding standards, design system
- `fe-next/package.json` - Dependencies and scripts

## Process

### 1. Context Gathering

**Read project documentation:**
```
file_read(AGENTS.md)
file_read(fe-next/claude.md) 
file_read(fe-next/package.json)
```

**Search for related features:**
Use `spawn_subagent` with `file-navigator` to find similar implementations:
- Search for related components
- Find similar hooks or utilities
- Identify patterns to follow

**Example:**
```
spawn_subagent(
  subagent_type="file-navigator",
  description="Find similar features",
  instructions="Search for [feature-type] components and patterns in codebase. 
  Look in components/, hooks/, backend/modules/. 
  Return file paths and brief descriptions of similar implementations."
)
```

### 2. Ask Clarifying Questions

Use `clarification_tool` for:
- Scope confirmation (what's included, what's not)
- Location decisions (which directory/file)
- Integration points (how does it connect)
- Edge cases (error scenarios, special cases)
- Design choices (UI/UX decisions)

**Example:**
```
clarification_tool({
  questions: [
    {
      question_type: "single",
      question: "Should this feature be available in all game modes or specific ones?",
      options: ["All game modes", "Solo only", "Multiplayer only", "Practice mode only"]
    },
    {
      question_type: "form",
      question: "Are there any specific performance requirements or constraints?"
    }
  ]
})
```

### 3. Find Similar Patterns

**Search existing codebase:**
```
grep_content(regex="similar-pattern", glob="**/*.tsx")
grep_file(regex="related-component")
```

**Read existing tests:**
```
glob(pattern="__tests__/**/[related]*.test.*")
file_read([test-file])
```

### 4. Create Implementation Plan

Present a detailed plan:
- **Files to create/modify** (with paths)
- **Components/functions to add** (with signatures)
- **Test cases to write** (specific scenarios)
- **Translation keys needed** (all 4 languages)
- **Dependencies** (any new npm packages)
- **Integration points** (how it connects to existing code)

**Wait for approval before proceeding.**

### 5. Setup Task Tracking

```
todo_update({
  todos: [
    { content: "Create component structure", status: "pending", note: "" },
    { content: "Add translation keys (4 languages)", status: "pending", note: "" },
    { content: "Write unit tests", status: "pending", note: "" },
    { content: "Implement core logic", status: "pending", note: "" },
    { content: "Add E2E tests if UI component", status: "pending", note: "" },
    { content: "Verify build and tests pass", status: "pending", note: "" }
  ]
})
```

### 6. Test-First Implementation

**Write tests FIRST:**
```typescript
// Example: __tests__/MyFeature.test.tsx
describe('MyFeature', () => {
  it('should handle user interaction correctly', () => {
    // Test implementation
  });
  
  it('should display translations correctly', () => {
    // Test all 4 languages
  });
  
  it('should handle error states gracefully', () => {
    // Test error scenarios
  });
});
```

**Run tests to see them fail:**
```bash
npm run test -- __tests__/MyFeature.test.tsx
```

### 7. Add Translation Keys

**Update all 4 language files:**
```javascript
// translations/en.js
export default {
  myFeature: {
    title: 'Feature Title',
    description: 'Feature description',
    button: 'Action Button'
  }
}

// translations/he.js (Hebrew - RTL)
// translations/sv.js (Swedish)
// translations/ja.js (Japanese)
```

**Verify completeness:**
```bash
npm run check:translations
```

### 8. Implement Feature

**Follow CLAUDE.md standards:**
- Use TypeScript (NO `any` types)
- Functional components with hooks only
- Use `t('key')` for ALL UI text
- Follow Neo-Brutalist design system
- Keep files under 500 lines (split if needed)
- Use existing utilities and patterns

**Example component structure:**
```typescript
import { useLanguage } from '@/contexts/LanguageContext';

export function MyFeature() {
  const { t } = useLanguage();
  
  return (
    <div className="border-neo rounded-neo shadow-hard bg-neo-navy">
      <h2 className="font-neo-display text-neo-yellow">
        {t('myFeature.title')}
      </h2>
      {/* Implementation */}
    </div>
  );
}
```

### 9. Run Tests

**Execute test suite:**
```bash
cd fe-next
npm run test -- __tests__/MyFeature.test.tsx
```

**Tests should now pass.** If not, fix implementation (NOT tests).

### 10. Verify All Quality Checks

Run complete verification suite:

```bash
cd fe-next

# Linting
npm run lint

# Type checking
npx tsc --noEmit

# All tests
npm run test

# Translation completeness
npm run check:translations

# Production build
npm run build
```

**Fix any issues before proceeding.**

### 11. E2E Testing (if UI component)

If feature has UI:
```bash
npm run test:e2e -- --grep="MyFeature"
```

Or create new E2E test in `e2e/my-feature.spec.ts`

### 12. Update Documentation

**If feature is significant:**
- Add usage examples to component
- Update relevant README sections
- Document any new patterns

### 13. Final Verification

Use `spawn_subagent` with `verifier`:
```
spawn_subagent(
  subagent_type="verifier",
  description="Verify feature implementation",
  instructions="Run lint, type-check, and tests on changed files:
  - [list of changed files]
  Budget: 30s
  Scope: codediff
  Commands: npm run lint, npx tsc --noEmit, npm run test"
)
```

## Key Rules

### Translation Requirements
- ALL UI text uses `t('translation.key')`
- NO hardcoded strings allowed
- Update all 4 languages: English, Hebrew, Swedish, Japanese
- Hebrew requires RTL testing

### Type Safety
- No `any` types permitted
- Full TypeScript type definitions
- Props interfaces defined
- Return types explicit

### Testing Requirements
- Unit tests for logic
- Component tests for UI
- E2E tests for user flows
- All tests must pass before commit

### Design System Compliance
- Use Neo-Brutalist classes: `shadow-hard`, `border-neo`, `rounded-neo`
- Colors: `neo-yellow`, `neo-orange`, `neo-pink`, `neo-cyan`, `neo-navy`
- Typography: `font-neo-display`, `font-neo-body`
- Container queries preferred: `text-[3cqw]` over `text-[3vw]`

### File Organization
- Max 500 lines per file
- Split large components into smaller ones
- Extract hooks for complex logic
- Create utilities for reusable functions

### Code Quality
- DRY: No code duplication
- SOLID: Single responsibility
- Clear function names
- Extract magic numbers to constants

## Output Format

Throughout the process, provide updates:

```
✅ [Step completed] - Brief description
🔍 [Research finding] - What was discovered
📝 [Plan element] - What will be done
🧪 [Test result] - Test status
⚠️  [Issue found] - Problem description
```

## Common Pitfalls to Avoid

1. **Hardcoded strings** - Always use `t()` function
2. **Skipping tests** - Tests are mandatory, not optional
3. **Using `any` types** - Define proper TypeScript types
4. **Ignoring design system** - Use Neo-Brutalist classes
5. **Large files** - Split files over 500 lines
6. **Missing translations** - Must support all 4 languages
7. **No RTL testing** - Test Hebrew layout
8. **Implementing before planning** - Get approval first

## Integration with Existing Code

### Finding Patterns
Use file-navigator subagent to search:
- Similar components in `components/`
- Related hooks in `hooks/`
- Backend modules in `backend/modules/`
- Existing tests in `__tests__/` and `backend/__tests__/`

### Following Conventions
- Import structure: React → External → Internal → Types
- Naming: camelCase variables, PascalCase components
- File names: kebab-case or PascalCase for components
- Test files: `ComponentName.test.tsx` or `module.test.js`

## Example Complete Workflow

```bash
# 1. Research phase
grep_content(regex="similar-feature")
spawn_subagent(file-navigator, "find related patterns")

# 2. Clarify requirements
clarification_tool([questions])

# 3. Present plan and wait for approval

# 4. Write tests (fail first)
npm run test -- NewFeature.test.tsx  # Should fail

# 5. Add translations
# Update en.js, he.js, sv.js, ja.js
npm run check:translations

# 6. Implement feature
# Create/edit files following CLAUDE.md standards

# 7. Run tests (should pass now)
npm run test -- NewFeature.test.tsx

# 8. Verify all checks
npm run lint
npx tsc --noEmit
npm run test
npm run build

# 9. Done!
```

## Success Criteria

- [ ] All tests pass (unit, component, E2E)
- [ ] Linting passes with zero errors
- [ ] Type checking passes with zero errors
- [ ] Translations complete for all 4 languages
- [ ] Production build succeeds
- [ ] Design system compliance verified
- [ ] Files under 500 lines
- [ ] No `any` types used
- [ ] Documentation updated if needed

---

**Remember**: This is a workflow guide, not a script. Adapt based on feature complexity and context. Always prioritize code quality and project standards over speed.
