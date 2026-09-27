# Nightly TESTS-INCONCLUSIVE alert — 2026-06-21

The integration gate's test suite went silent past the 900s idle
watchdog (or hit the 5400s absolute backstop), so the authored
set's TESTS are UNVERIFIED tonight. A build-only re-gate (lint + type-check +
next build) PASSED, so the code compiles and type-checks; it shipped at
reduced gate strength.

ACTION: a silent-for-900s gate means a hung/OOMing test, not just
a slow one — investigate (e.g. useBlastEngine.mpGrid OOM) or, if genuinely
slow-but-progressing, raise NIGHTLY_GATE_IDLE_SECS / NIGHTLY_GATE_TIMEOUT.
