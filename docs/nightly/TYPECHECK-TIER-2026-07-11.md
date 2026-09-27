# Nightly TYPECHECK-TIER ship — 2026-07-11

Both the full integration gate AND the build-only re-gate wedged in
next-build's silent "Running TypeScript" phase (idle 900s /
backstop 5400s). A standalone conclusive tier —
`build:schemas && tsc --noEmit && test:changed` (~1 min) — PASSED, so the
authored set type-checks (standalone tsc, committed tsconfig) and its
affected tests are green. It shipped at REDUCED gate strength.

NOT verified this night: next build's own TS phase additionally checks
GENERATED route/page types (.next/types/**) that standalone tsc does not —
that extra surface, the full next build (SSG prerender), and the FULL test
suite were all unverified. This tier is strictly stronger than the OLD
behaviour (which DROPPED all code on this wedge) but weaker than a clean
full gate.

Shipped commit is verified post-push by railway-deploy-check.sh + health-monitor.sh.
ACTION: none required (autonomous reduced-strength ship).
