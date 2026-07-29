#!/bin/bash
# Script to split client component pages into server wrapper + client component
# Fixes "useLanguage must be used within a LanguageProvider" build errors

set -e

PAGES=(
  "app/[locale]/education/page.tsx"
  "app/[locale]/admin/page.tsx"
  "app/[locale]/admin/words/page.tsx"
  "app/[locale]/admin/players/page.tsx"
  "app/[locale]/admin/dictionary/page.tsx"
  "app/[locale]/admin/invalid-words/page.tsx"
  "app/[locale]/admin/wikipedia-words/page.tsx"
  "app/[locale]/admin/daily-buzz/page.tsx"
  "app/[locale]/admin/web-vitals/page.tsx"
  "app/[locale]/brain/drills/memory-hunt/page.tsx"
  "app/[locale]/brain/drills/pattern-switcher/page.tsx"
  "app/[locale]/brain/drills/rare-gems/page.tsx"
  "app/[locale]/brain/drills/combo-master/page.tsx"
  "app/[locale]/brain/drills/lightning-round/page.tsx"
)

for page in "${PAGES[@]}"; do
  if [ ! -f "$page" ]; then
    echo "Skipping $page (not found)"
    continue
  fi

  # Check if it's already a server component (doesn't have 'use client')
  if ! grep -q "'use client'" "$page" && ! grep -q '"use client"' "$page"; then
    echo "Skipping $page (already a server component)"
    continue
  fi

  dir=$(dirname "$page")
  base=$(basename "$page" .tsx)

  # Create client component by copying original
  cp "$page" "$dir/PageClient.tsx"

  # Extract the default export function name from the original
  func_name=$(grep "^export default function" "$page" | sed 's/export default function \([^(]*\).*/\1/')

  if [ -z "$func_name" ]; then
    echo "Error: Couldn't find function name in $page"
    continue
  fi

  # Update client component export name
  sed -i '' "s/export default function $func_name/export default function ${func_name}Client/" "$dir/PageClient.tsx"

  # Create new server wrapper
  cat > "$page" <<EOF
// This page uses client-side contexts, so it must be rendered dynamically
export const dynamic = 'force-dynamic';

import ${func_name}Client from './PageClient';

export default function $func_name() {
  return <${func_name}Client />;
}
EOF

  echo "✓ Split $page"
done

echo ""
echo "Done! All pages have been split into server wrapper + client component."
