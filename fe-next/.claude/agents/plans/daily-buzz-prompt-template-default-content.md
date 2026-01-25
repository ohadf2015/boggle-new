# Feature: Daily Buzz Prompt Template Editor - Pre-populate with Current Template

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

When creating a new prompt template in the Daily Buzz admin panel, the template content textarea starts empty. Instead, it should be pre-populated with the current default template content for that template type, so admins can see and modify the existing template rather than starting from scratch.

## User Story

As an admin
I want the template editor to start with the current template text
So that I can see and modify the existing prompt without needing to copy it manually

## Problem Statement

Currently, when an admin clicks "New Template" in the Prompt Template Editor (`PromptTemplateEditor.tsx`), the `startCreate` function initializes `template_content` as an empty string (`''`). This forces admins to either:
1. Manually copy the existing template from somewhere else
2. Write the entire template from scratch

This is poor UX and error-prone.

## Solution Statement

Create a new API endpoint that returns the current/default template content for a given template type. The frontend will call this endpoint when creating a new template, and pre-populate the textarea with the returned content.

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** Low
**Primary Systems Affected:**
- `components/admin/buzz/PromptTemplateEditor.tsx`
- `app/api/admin/buzz/prompt-templates/` (new endpoint)
- `backend/services/buzz/promptSections.ts` (export helper)
**Dependencies:** None (uses existing `PROMPT_SECTIONS` and database templates)

---

## CONTEXT REFERENCES

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

- `components/admin/buzz/PromptTemplateEditor.tsx` (lines 139-151)
  - **WHY:** Contains `startCreate` function that initializes empty `template_content`
  - **PATTERN:** React state management with `formData`

- `backend/services/buzz/promptSections.ts` (lines 292-324)
  - **WHY:** Contains `PROMPT_SECTIONS` with all default templates and helper functions
  - **PATTERN:** Export constants and utility functions

- `backend/services/buzz/promptTemplateLoader.ts` (lines 20-42)
  - **WHY:** Contains `SECTION_TO_TEMPLATE_TYPE` mapping
  - **PATTERN:** Maps section names to database template types

- `components/admin/buzz/types.ts` (lines 98-107)
  - **WHY:** Defines `TemplateType` and `TEMPLATE_TYPES` for the UI
  - **PATTERN:** Type definitions and constants

- `app/api/admin/buzz/prompt-templates/route.ts` (lines 13-31)
  - **WHY:** Shows existing template types (section-based + legacy)
  - **PATTERN:** API route with admin auth

- `components/admin/buzz/prompt-templates/constants.ts`
  - **WHY:** Contains `DEFAULT_PLACEHOLDERS` per template type
  - **PATTERN:** Constants export pattern

### New Files to Create

- `app/api/admin/buzz/prompt-templates/default/route.ts` - New API endpoint to get default template content

### Patterns to Follow

**API Route Pattern:**

```typescript
// ✅ GOOD: API route with admin auth
export async function GET(request: NextRequest): Promise<NextResponse> {
  const authResult = await verifyAdminAuth(request);
  if (!authResult.success) {
    return authResult.response!;
  }

  // ... implementation

  return NextResponse.json({
    success: true,
    data: { ... },
  });
}
```

**Frontend State Update Pattern:**

```typescript
// ✅ GOOD: Update form data with fetched content
async function startCreate(type: TemplateType): Promise<void> {
  const defaultContent = await fetchDefaultTemplate(type);
  setFormData({
    template_type: type,
    template_content: defaultContent,
    // ... other fields
  });
}
```

---

## IMPLEMENTATION PLAN

### Phase 1: Backend - Create Default Template API

Add a new API endpoint that returns the default template content for a given type.

**Tasks:**
1. Create API endpoint at `/api/admin/buzz/prompt-templates/default`
2. Map template types to their default content sources
3. Return content from database (if exists) or fallback to hardcoded defaults

### Phase 2: Frontend - Integrate with Template Editor

Update the `PromptTemplateEditor` component to fetch default content when creating a new template.

**Tasks:**
1. Create a helper function to fetch default template content
2. Update `startCreate` function to be async and fetch content
3. Show loading state while fetching

---

## STEP-BY-STEP TASKS

### Task 1: CREATE `/app/api/admin/buzz/prompt-templates/default/route.ts`

- **IMPLEMENT:** New API endpoint that returns default template content for a given template type
- **PATTERN:** Mirror `app/api/admin/buzz/prompt-templates/route.ts` for auth pattern
- **IMPORTS:**
  - `verifyAdminAuth` from `@/lib/auth/adminAuth`
  - `PROMPT_SECTIONS` from `@/backend/services/buzz/promptSections`
  - `getPromptTemplateLoader` from `@/backend/services/buzz/promptTemplateLoader`
- **LOGIC:**
  1. Accept `type` query parameter (template type)
  2. For section-based types (`section_*`): Use `getPromptTemplateLoader().getSection()`
  3. For legacy types (`riddle`, `image`, etc.): Return appropriate combined sections or placeholder
  4. Return the content with `fromDatabase` flag
- **VALIDATE:** `curl -H "Authorization: Bearer $TOKEN" "http://localhost:3000/api/admin/buzz/prompt-templates/default?type=section_intro"`

### Task 2: UPDATE `components/admin/buzz/PromptTemplateEditor.tsx`

- **IMPLEMENT:** Update `startCreate` to fetch default template content
- **CHANGES:**
  1. Add `fetchingDefault` loading state
  2. Convert `startCreate` to async function
  3. Call the new API endpoint to get default content
  4. Pre-populate `template_content` with fetched content
  5. Handle loading and error states
- **PATTERN:** Mirror existing async patterns in the file (e.g., `fetchTemplates`, `handleSave`)
- **GOTCHA:** The create button should show loading state while fetching
- **VALIDATE:** Open admin panel, click "New Template", verify textarea shows default content

### Task 3: CREATE unit test for default template API

- **IMPLEMENT:** Test the new API endpoint
- **PATTERN:** Mirror `backend/__tests__/middleware.timeout.test.ts` or similar API tests
- **TEST CASES:**
  1. Returns 401 without auth
  2. Returns 400 for missing type parameter
  3. Returns 400 for invalid type
  4. Returns content for valid section type
  5. Returns content for legacy type
- **VALIDATE:** `npm run test:backend -- --testPathPattern=prompt-templates-default`

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**

- Test the API endpoint returns correct content for different template types
- Test auth verification works
- Test error handling for invalid inputs

**Pattern:**

```typescript
describe('GET /api/admin/buzz/prompt-templates/default', () => {
  it('should return default content for section_intro', async () => {
    // Mock admin auth
    // Call endpoint with type=section_intro
    // Verify response contains intro template content
  });

  it('should return 400 for missing type parameter', async () => {
    // Call endpoint without type
    // Verify 400 response
  });
});
```

### Manual Testing

1. Open admin panel at `/admin/daily-buzz`
2. Go to Prompt Templates section
3. Click "New Template" button for any type
4. Verify the textarea is pre-populated with content (not empty)
5. Verify the content matches the expected default template

---

## VALIDATION COMMANDS

### Level 1: TypeScript Compilation

```bash
npm run build
```

**Expected:** Build succeeds with no type errors

### Level 2: Lint Check

```bash
npm run lint
```

**Expected:** No linting errors

### Level 3: Unit Tests

```bash
npm run test:backend
```

**Expected:** All tests pass

### Level 4: Manual Validation

```bash
# Start dev server
npm run dev

# Test the API endpoint directly
curl -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  "http://localhost:3000/api/admin/buzz/prompt-templates/default?type=section_intro"
```

**Expected:** Returns JSON with template content

---

## ACCEPTANCE CRITERIA

- [ ] New API endpoint `/api/admin/buzz/prompt-templates/default` exists and works
- [ ] API returns appropriate content for section-based template types
- [ ] API returns appropriate content for legacy template types
- [ ] Template editor pre-populates textarea when creating new template
- [ ] Loading state is shown while fetching default content
- [ ] Error handling gracefully falls back to empty string if fetch fails
- [ ] All existing tests still pass
- [ ] Build completes without errors

---

## COMPLETION CHECKLIST

- [ ] All tasks completed in order
- [ ] Each task validation passed
- [ ] All validation commands executed successfully
- [ ] Full test suite passes
- [ ] No linting or type checking errors
- [ ] Manual testing confirms feature works
- [ ] Acceptance criteria all met

---

## NOTES

### Design Rationale

**Why a new API endpoint instead of client-side constants?**
- The default templates can come from the database (if an admin created a "default" template)
- Server-side fallback to hardcoded `PROMPT_SECTIONS` ensures consistency
- Keeps frontend lightweight - doesn't need to bundle all template content

**Why not just import `PROMPT_SECTIONS` in the frontend?**
- `PROMPT_SECTIONS` is in the `backend/` directory
- It's server-side code that shouldn't be bundled in the client
- The loader can check database first for admin-overridden defaults

### Template Type Mapping

| UI Type | Database Type | Source |
|---------|---------------|--------|
| section_intro | section_intro | PROMPT_SECTIONS.INTRO |
| section_tone_guide | section_tone_guide | PROMPT_SECTIONS.TONE_GUIDE |
| riddle | riddle | Custom riddle template (to be defined) |
| image | image | Image generation template (to be defined) |
| challenge_general | challenge_general | General challenge template |
| social_content | social_content | Social content template |

### Future Considerations

- Could add a "Reset to Default" button in the editor
- Could show diff between current and default templates
- Could version templates for rollback capability
