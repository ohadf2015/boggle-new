#!/bin/bash
# Test wrapper for tools/dead_pages.py — runs its stdlib-unittest suite (no deps,
# no network: exercises the pure select_dead_pages selector only).
# Proves: 0-click/<=2-impr selection, click/impr floors, allowlist gating,
#   game-page ban (incl. /anagram) wins even when dead, locale-aware canonical
#   paths, cap, and impressions-then-url sort.
#
# Run: bash scripts/nightly/test/dead-pages.test.sh
set -uo pipefail

DIR="$(cd "$(dirname "$0")/../tools" && pwd)"
python3 "$DIR/dead_pages.test.py"
