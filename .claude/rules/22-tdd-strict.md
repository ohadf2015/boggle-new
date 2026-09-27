# Strict TDD Rules

**MANDATORY — zero exceptions.**

## RED-GREEN-REFACTOR Cycle

1. **RED**: Write failing test FIRST. Run it. Must FAIL.
2. **GREEN**: Write MINIMAL code to pass. Run it. Must PASS.
3. **REFACTOR**: Improve code. Run tests. Must STILL PASS.
4. **REPEAT** for next behavior.

## Zero Tolerance

- NEVER write implementation before tests
- NEVER skip TDD for "simple" code
- NEVER say "I'll add tests later"
- NEVER commit code without tests
- If code written before test → DELETE it, start over

## Test Structure

Use Given-When-Then pattern. Tests must be independent and fast.

## Commit Discipline

Implementation phase commit includes ALL tests + code from TDD cycles.
Do NOT commit after each test cycle — commit after entire implementation phase.
