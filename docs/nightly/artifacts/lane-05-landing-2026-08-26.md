status: shipped
attempted: improve one admin-beta mode (STEP 0) — sealed-bid reveal feel, rotated away from Word Craft/Connections (last 3 nights)
files_touched: fe-next/components/sealedBid/Showdown.tsx, fe-next/components/sealedBid/__tests__/Showdown.reveal.test.tsx
next_steps: eslint check on the 2 changed files was still running at the finalize cutoff (background job); verify it's clean, and confirm no other lane touched Showdown.tsx concurrently before the gate runs. TDD'd (3 new tests, all 7 in Showdown.reveal.test.tsx green). No further work planned for this slice — next rotation target after this: Brain Drill or Word Craft (last touched 08-13/08-17/08-25).
