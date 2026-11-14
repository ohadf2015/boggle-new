#!/usr/bin/env bash
# Usage: radar-block.sh <head ref> [require] < PR body   prints the ```radar block as one JSON line, or nothing
set -euo pipefail
ref=${1:?head ref}
require=${2:-false}
body=$(tr -d '\r')
fail() { echo "::error::$*" >&2; exit 1; }

blocks=$(printf '%s\n' "$body" | grep -c '^```radar' || true)
if [ "$blocks" = 0 ]; then
  [ "$require" != true ] || fail "PR body has no \`\`\`radar block"
  exit 0
fi
[ "$blocks" = 1 ] || fail "PR body has $blocks \`\`\`radar blocks; keep one"
printf '%s\n' "$body" | sed -n '/^```radar/,$p' | sed 1d | grep -q '^```[[:space:]]*$' \
  || fail "radar block in the PR body has no closing \`\`\` fence"
meta=$(printf '%s\n' "$body" | sed -n '/^```radar/,/^```[[:space:]]*$/p' | sed '1d;$d')
printf '%s' "$meta" | jq -se 'length == 1 and (.[0] | type == "object")' > /dev/null 2>&1 \
  || fail "radar block is not one JSON object: $(printf '%s' "$meta" | tr '\n' ' ' | cut -c1-300)"
missing=$(printf '%s' "$meta" | jq -r '[("app","surface","kind","metric","summary") as $k | select((.[$k] // "") | tostring | length == 0) | $k] | join(", ")')
[ -z "$missing" ] || fail "radar block is missing: $missing"

id=$(printf '%s' "$meta" | jq -r '.recommendationId // .rec_id // empty')
[ -z "$id" ] || [[ "$id" =~ ^[0-9]+$ ]] || fail "radar block recommendationId is not a number: $id"
branch_id=${ref#radar/}
if [[ "$ref" == radar/* && "$branch_id" =~ ^[0-9]+$ ]]; then
  [ -n "$id" ] || id=$branch_id
  [ "$id" = "$branch_id" ] || fail "radar block recommendationId $id does not match branch $ref"
fi
printf '%s' "$meta" | jq -c --arg id "$id" 'del(.rec_id) | if $id == "" then del(.recommendationId) else .recommendationId = ($id | tonumber) end'
