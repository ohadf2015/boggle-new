use agents ui-ux designer, tailwind-master, ui-comprehensive-tester, and task-decomposition-expert to improve the app user flow, ux and ui design of the application. it should be done in phases, with checkpoints after each phase to ensure quality and stability. in the end verify that build is passing and no regressions were introduced. follow these execution rules:
---
## Execution Rules
### Phased Improvement with Checkpoints
1. **Phase 0 - Task Decomposition**: Run `task-decomposition-expert` to break down UX/UI improvements into small, achievable tasks. Present decomposed roadmap for approval.
2. **Phase 1 - UX Analysis**: Run `ui-ux designer` in read-only mode to analyze current UX and suggest improvements. Present findings for approval before proceeding. it should think about ways to make the user flow smoother and the interface more intuitive and easy to use.
3. **Phase 2 - UI Redesign**: Upon approval, execute `tailwind-master` to implement the approved UX improvements and enhance UI design. Commit changes after completion. make sure the contrast is good, the typography is readable, and the layout is visually appealing.
4. **Phase 3 - Comprehensive Testing**: Run `ui-comprehensive-tester` to validate all UI/UX changes. Report any issues found.
5. **Final Approval**: Present the final state of the application for approval before merging changes into the main branch.
### Conflict Prevention
- **One agent writes at a time** - Never run multiple write-phase agents in parallel
- **Commit between phases** - Each phase's changes are committed before next phase
- **Test between changes** - Run tests after each modification
- **Review checkpoints** - Get user approval at each checkpoint
### Rollback Strategy
- Each phase creates a git tag: `ux-improvement-phase-N-complete`
- If issues arise, rollback to previous phase tag
- Re-run problematic phase with adjusted parameters