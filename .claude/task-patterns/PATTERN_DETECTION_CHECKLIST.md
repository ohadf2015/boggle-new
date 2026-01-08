# Pattern Detection Checklist

Use this checklist to identify repetitive tasks in your workflow that could become commands.

## Signs of a Pattern

### ✓ Repetition
- [ ] You ask for this 3+ times per week
- [ ] You use the same request wording multiple times
- [ ] You find yourself re-explaining the same workflow
- [ ] You ask Claude "remember how we did X last time?"

### ✓ Consistency
- [ ] The steps are always the same or very similar
- [ ] The tools used are always the same
- [ ] The constraints/rules are always the same
- [ ] The desired outcome is always the same

### ✓ Workflow Structure
- [ ] It involves 3+ distinct steps
- [ ] Steps are done in the same order each time
- [ ] Some steps depend on previous steps
- [ ] You measure success the same way each time

### ✓ Context Value
- [ ] You'd save time with a shorthand
- [ ] Other people might use this command too
- [ ] The workflow involves specific domain knowledge
- [ ] You'd like a consistent approach to this task

## Pattern Inventory

### Check Current Workflow

Review your recent Claude sessions and mark which apply:

#### Code Quality & Maintenance
- [ ] Run tests, fix failures, commit
- [ ] Refactor code for readability
- [ ] Remove unused code/imports
- [ ] Run linting and type checks
- [ ] Update documentation

#### Feature Development
- [ ] Implement new feature
- [ ] Improve UI of component
- [ ] Add accessibility features
- [ ] Write tests for feature
- [ ] Performance optimization

#### Debugging & Analysis
- [ ] Fix production bug
- [ ] Investigate error
- [ ] Analyze Sentry errors
- [ ] Debug failing test
- [ ] Profile performance issue

#### Code Review & Quality
- [ ] Review pull request
- [ ] Check code quality
- [ ] Verify test coverage
- [ ] Audit security issues

#### Project Workflow
- [ ] Process backlog items
- [ ] Work through feature list
- [ ] Handle tech debt
- [ ] Improve documentation

#### Git & Deployment
- [ ] Create and test commit
- [ ] Merge changes
- [ ] Release new version
- [ ] Revert bad commit

#### Translation & Localization
- [ ] Add missing translations
- [ ] Update all language files
- [ ] Fix translation issues

#### Data & Database
- [ ] Create database migration
- [ ] Audit RLS policies
- [ ] Optimize database query
- [ ] Fix data consistency issue

## Candidate Patterns

For each checked item above, answer:

### Pattern: [Name]

**Frequency Check**
- How often do you ask for this? ___ times per week/month
- Is it 3+ times? [ ] Yes  [ ] No
- Would a shorthand save time? [ ] Yes  [ ] No

**Consistency Check**
- Are the steps always the same? [ ] Yes  [ ] No  [ ] Mostly
- Are the tools always the same? [ ] Yes  [ ] No  [ ] Mostly
- Are the constraints always the same? [ ] Yes  [ ] No  [ ] Mostly

**Example Requests**
1. "[Your example request]"
2. "[Your example request]"
3. "[Your example request]"

**Workflow Steps** (write down what happens each time)
1. _____________________
2. _____________________
3. _____________________
4. _____________________
5. _____________________

**Tools Used**
- [ ] Read
- [ ] Edit
- [ ] Write
- [ ] Bash (specify: _________)
- [ ] Grep
- [ ] Glob
- [ ] Other: _______

**Decision: Create Command?**
- [ ] Yes - Create immediately
- [ ] Maybe - Gather more data
- [ ] No - Not repetitive enough

---

## Template for Top 3 Patterns

Based on your workflow, fill in your top 3 patterns:

### Pattern 1: _______________________

- **Frequency**: ___ times per week
- **Consistency**: High / Medium / Low
- **Example requests**:
  -
  -
  -
- **Steps**:
  1.
  2.
  3.
- **Create command**: [ ] Yes  [ ] Not yet

### Pattern 2: _______________________

- **Frequency**: ___ times per week
- **Consistency**: High / Medium / Low
- **Example requests**:
  -
  -
  -
- **Steps**:
  1.
  2.
  3.
- **Create command**: [ ] Yes  [ ] Not yet

### Pattern 3: _______________________

- **Frequency**: ___ times per week
- **Consistency**: High / Medium / Low
- **Example requests**:
  -
  -
  -
- **Steps**:
  1.
  2.
  3.
- **Create command**: [ ] Yes  [ ] Not yet

---

## Action Items

When you identify a pattern that should become a command:

1. [ ] Copy this section and fill it in
2. [ ] Check "Frequency" is 3+ per week
3. [ ] Check "Consistency" is High
4. [ ] Write down all steps clearly
5. [ ] List all tools needed
6. [ ] Create PURPOSE file
7. [ ] Create command file
8. [ ] Add to TASK_PATTERNS.md
9. [ ] Test on real task
10. [ ] Refine based on testing

---

## Patterns Already Established in Your Project

Reference these existing patterns to understand the style:

- `/refactor` - Code quality improvement
- `/feature` - New feature implementation
- `/fix` - Bug fixing with linting
- `/ui` - UI improvement
- `/test-and-fix` (hypothetical) - Test failures and commit
- `/investigate` - Deep investigation of issues
- `/performance-audit` - Performance optimization

Study these to understand:
- How to write clear descriptions
- How to structure process steps
- What tool constraints look like
- How to document key rules

---

## Quick Decision Tree

```
Do you ask for this?
├─ Yes → Is it 3+ times per week?
│  ├─ Yes → Are the steps consistent?
│  │  ├─ Yes → CREATE COMMAND ✓
│  │  └─ No → Wait for more data
│  └─ No → Not a pattern yet
└─ No → Don't need it
```

Use this to quickly evaluate if something should become a command.
