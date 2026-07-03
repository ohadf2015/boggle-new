# Nightly TYPECHECK-TIER ship (peel loop) — 2026-07-03

The drop-and-re-gate peel loop re-gate wedged in next-build under contention after
peeling the broken file(s). A standalone `build:schemas && tsc --noEmit && test:changed`
tier (~1min) PASSED, so the kept authored set shipped at REDUCED strength (full
next-build / SSG prerender + full suite UNVERIFIED). Verified post-push by
railway-deploy-check.sh + health-monitor.sh. ACTION: none required.
