#!/bin/bash
# Pre-seed cookie-consent-v2 in localStorage so CookieConsent.tsx's
# hasConsentDecision() check is true on first paint and the bottom-sheet
# never mounts. Fixes the longest-running nightly blocker: agent-browser
# cannot dismiss the sheet because it renders outside the a11y snapshot tree
# (role="dialog" aria-modal="false" bottom sheet, not a native <dialog>).
#
# Usage: agent-browser-preseed-consent.sh <url>
# Requires: agent-browser CLI on PATH, an active agent-browser session.
set -euo pipefail

URL="${1:?usage: agent-browser-preseed-consent.sh <url>}"

agent-browser open "$URL"
agent-browser eval "localStorage.setItem('cookie-consent-v2', JSON.stringify({essential:true,analytics:false,advertising:false,timestamp:Date.now()}))"
agent-browser reload
