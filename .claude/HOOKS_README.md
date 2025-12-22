# Claude Code Hooks Configuration

This project uses Claude Code hooks to automatically run multiplayer e2e tests when critical files are modified.

## Configured Hooks

### PostToolUse Hooks (Automatic Testing)

When you use `/refactor`, `/feature`, or manually edit multiplayer-related files, the hooks will automatically run e2e tests.

**Triggers:** Edit or Write operations on files containing:
- `multiplayer`
- `socket`
- `PlayerView`
- `HostView`
- `gameState`

**What Runs:**
```bash
cd fe-next && npx playwright test e2e/multiplayer-game-start.spec.ts --project=chromium --timeout=120000 --workers=1
```

**Expected Results:**
- ✅ 5/6 tests should pass
- ❌ Late join test may fail (known limitation, not related to main bug fix)

### Stop Hook (Reminder)

When a session ends, Claude will check if multiplayer changes were made and remind you to run tests if they weren't triggered automatically.

## How It Works

1. **Automatic Detection:** When you edit files with keywords like `multiplayer`, `socket`, etc., the hook detects it
2. **Smart Filtering:** Only runs tests if changes affect multiplayer functionality
3. **Fast Feedback:** Tests run automatically after significant changes
4. **CI/CD Ready:** Same tests that run locally can run in CI

## Test Coverage

The multiplayer e2e tests verify:

1. ✅ **First Game Start** - Players don't get stuck on waiting screen
2. ✅ **Multiple Players** - All players transition simultaneously
3. ✅ **Subsequent Games** - Games after results work correctly
4. ✅ **Socket Events** - Event delivery and acknowledgments work
5. ✅ **Stress Testing** - Rapid game starts handle correctly
6. ❌ **Late Join** - Known issue, separate from main bug fix

## Manual Testing

To run tests manually:

```bash
# Run all multiplayer tests
cd fe-next && npx playwright test e2e/multiplayer-game-start.spec.ts --project=chromium

# Run with headed browser (see what's happening)
cd fe-next && npx playwright test e2e/multiplayer-game-start.spec.ts --project=chromium --headed

# Run specific test
cd fe-next && npx playwright test e2e/multiplayer-game-start.spec.ts --project=chromium --grep="First Game Start"
```

## Disabling Hooks

If you need to temporarily disable hooks:

1. **Temporarily:** Set `disableAllHooks: true` in `.claude/settings.local.json`
2. **For one session:** Tell Claude "disable hooks for this session"
3. **Permanently:** Remove the `hooks` section from settings

## Updating Hooks

To modify hook behavior, edit `.claude/settings.local.json`:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit",
        "hooks": [
          {
            "type": "command",
            "command": "your custom command here",
            "statusMessage": "Custom status message...",
            "timeout": 180
          }
        ]
      }
    ]
  }
}
```

## Integration with Skills

The hooks are also referenced in the following skills:

- `/refactor` - Step 14 mentions running e2e tests
- `/feature` - Step 4 in Phase 6 runs e2e tests for multiplayer changes
- `/agents-code-improvement` - Automatically verified by hooks

## CI/CD Integration

To integrate in CI/CD pipeline:

```yaml
# GitHub Actions example
- name: Run Multiplayer E2E Tests
  run: |
    cd fe-next
    npx playwright test e2e/multiplayer-game-start.spec.ts --project=chromium --timeout=120000
```

Expected: 5/6 tests pass. If <5 tests pass, multiplayer synchronization is broken.

## Troubleshooting

**Hook doesn't run:**
- Check that file path contains one of the trigger keywords
- Verify `disableAllHooks` is not set to `true`
- Check Claude Code console for hook execution logs

**Tests fail:**
- First, check if it's the late join test (expected failure)
- If 4 or fewer tests pass, there's a regression
- Review recent changes to multiplayer/socket code
- See `MANUAL_TESTING_GUIDE.md` for debugging steps

**Hook timeout:**
- Default timeout is 180 seconds (3 minutes)
- Increase `timeout` value in hook configuration if needed
- Check if dev server is running (`npm run dev`)

## Related Documentation

- [MANUAL_TESTING_GUIDE.md](../MANUAL_TESTING_GUIDE.md) - Manual testing procedures
- [Investigation Report](plans/adaptive-foraging-ripple.md) - Original bug investigation
- [E2E Test Spec](../fe-next/e2e/multiplayer-game-start.spec.ts) - Test implementation
