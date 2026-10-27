status: shipped
attempted: ran PostHog coverage audit (DEAD/CRATERED/per-mode holes), verified IMPACT CHECK for edu_classroom_game_started, fixed highest-leverage telemetry gap
files_touched: fe-next/components/education/shell/TeacherAccountMenu.tsx, fe-next/components/education/shell/__tests__/TeacherAccountMenu.test.tsx
next_steps: per-mode completion holes (random/adventure game_completed) not reached tonight -- next lane-12 run should pick those up. Re-measure edu_teacher_onboarding_step 7d count in 3 days per impact-ledger entry. NEVER-WIRED checklist flow (trackTeacherOnboardingStep, 'create_first_assignment'/'share_join_link'/'start_live_class') still has zero call sites outside tests -- separate backlog item, not touched.
