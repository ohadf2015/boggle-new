#!/bin/bash
# Scrub secrets out of generated report markdown BEFORE it is committed.
#
# Why: the daily SEO run (scripts/run-seo-daily.sh -> `seo-daily` skill) and the
# nightly SEO lane wrote the Bing Webmaster API key into docs/seo-daily/*.md
# (curl examples with `apikey=...`, "key is set (`...`)" notes). This repo is
# PUBLIC, so anything committed is leaked. Reports must only ever reference
# secrets by env var name, e.g. `apikey=$BING_WMT_API_KEY`.
#
# Usage:
#   scripts/redact-secrets.sh            # redact in place (default report dirs)
#   scripts/redact-secrets.sh FILE...    # redact in place (given files)
#   scripts/redact-secrets.sh --check FILE...
#                                        # exit 1 if any secret found; prints
#                                        # file:line only, never the value
#
# What gets redacted:
#   - `apikey=` / `api_key=` / `access_token=` / `token=` / `key=` query values
#     (unless already a placeholder like $VAR, <...>, REDACTED)
#   - `Authorization: Bearer|Basic <value>` headers
#   - the literal values of BING_WMT_API_KEY / BING_API_KEY /
#     BING_WEBMASTER_API_KEY (env) and of ~/.config/bing-wmt/credentials
set -uo pipefail

MODE=fix
if [ "${1:-}" = "--check" ]; then MODE=check; shift; fi

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ "$#" -eq 0 ]; then
  shopt -s nullglob
  set -- "$ROOT"/docs/seo-daily/*.md "$ROOT"/fe-next/docs/seo-daily/*.md \
         "$ROOT"/docs/nightly/artifacts/*.md
  shopt -u nullglob
fi
[ "$#" -eq 0 ] && exit 0

# Literal secret values (passed to perl via env only — never echoed).
LITERALS=""
for v in "${BING_WMT_API_KEY:-}" "${BING_API_KEY:-}" "${BING_WEBMASTER_API_KEY:-}"; do
  [ "${#v}" -ge 12 ] && LITERALS="$LITERALS $v"
done
CREDS="$HOME/.config/bing-wmt/credentials"
if [ -r "$CREDS" ]; then
  # Any long token-looking word in the creds file (format-agnostic: raw key,
  # KEY=value, or JSON).
  for v in $(grep -oE '[A-Za-z0-9_-]{24,}' "$CREDS" 2>/dev/null); do
    LITERALS="$LITERALS $v"
  done
fi
export REDACT_LITERALS="$LITERALS" REDACT_MODE="$MODE"

perl -e '
  use strict; use warnings;
  my $mode = $ENV{REDACT_MODE};
  my @lit = grep { length($_) >= 12 } split /\s+/, ($ENV{REDACT_LITERALS} // "");
  my $ph = qr/(?:\$|<|\[REDACTED|REDACTED|\$\{|%24)/;
  my $found = 0;
  for my $f (@ARGV) {
    next unless -f $f;
    open(my $in, "<", $f) or next;
    my @lines = <$in>; close $in;
    my $changed = 0;
    for my $i (0..$#lines) {
      my $orig = $lines[$i];
      my $l = $orig;
      $l =~ s/([?&](?:apikey|api_key|access_token|token|key)=)(?!$ph)[^&\s"'"'"'`)<>\]]{8,}/${1}REDACTED/gi;
      $l =~ s/(Authorization:\s*(?:Bearer|Basic)\s+)(?!$ph)[^\s"'"'"'`]{8,}/${1}REDACTED/gi;
      for my $s (@lit) { $l =~ s/\Q$s\E/[REDACTED]/g; }
      if ($l ne $orig) {
        $found = 1; $changed = 1;
        print STDERR "redact-secrets: secret in $f:" . ($i+1) . "\n";
        $lines[$i] = $l;
      }
    }
    if ($changed && $mode eq "fix") {
      open(my $out, ">", $f) or die "cannot write $f\n";
      print $out @lines; close $out;
    }
  }
  exit(($mode eq "check" && $found) ? 1 : 0);
' "$@"
