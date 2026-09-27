#!/bin/bash
set -e

# Find all pages with 'use client' and split them
find app/\[locale\] -name "page.tsx" -type f -exec grep -l "'use client'" {} \; | while read page; do
  # Check if already split (no 'use client' in file)
  if ! grep -q "'use client'" "$page"; then
    echo "Skipping $page (already split)"
    continue
  fi

  dir=$(dirname "$page")

  # Skip if PageClient.tsx already exists
  if [ -f "$dir/PageClient.tsx" ]; then
    echo "Skipping $page (PageClient.tsx already exists)"
    continue
  fi

  # Create client component
  cp "$page" "$dir/PageClient.tsx"

  # Extract function name
  func_name=$(grep "^export default function" "$page" | head -1 | sed 's/export default function \([^(]*\).*/\1/')

  if [ -z "$func_name" ]; then
    echo "Warning: Couldn't find function name in $page, skipping"
    continue
  fi

  # Update client component
  sed -i '' "s/export default function $func_name/export default function ${func_name}Client/" "$dir/PageClient.tsx"

  # Create server wrapper
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

echo "Done!"
