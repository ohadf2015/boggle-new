#!/usr/bin/env python3
"""
Script to fix error logging issues in API routes and backend services.
Converts console.error('message', error) to extract error message first.
"""

import re
import sys
from pathlib import Path

def fix_error_logging(content: str) -> tuple[str, int]:
    """Fix all error logging patterns in the content."""
    fixes = 0

    # Pattern 1: console.error(..., error) where error is the Error object
    # Match: console.error('text', error) or console.error('[tag] text', error)
    pattern1 = re.compile(
        r"console\.error\(([^,]+),\s*(error|err|e)\s*\);",
        re.MULTILINE
    )

    def replace1(match):
        nonlocal fixes
        message_part = match.group(1)
        error_var = match.group(2)
        fixes += 1
        return f"const errorMessage = {error_var} instanceof Error ? {error_var}.message : 'Unknown error';\n    console.error({message_part}, errorMessage);"

    content = pattern1.sub(replace1, content)

    # Pattern 2: Supabase error objects (error.message)
    pattern2 = re.compile(
        r"console\.error\(([^,]+),\s*(error)\);[\s\S]{0,200}?error\.message",
        re.MULTILINE
    )

    def replace2(match):
        nonlocal fixes
        # Check if this pattern wasn't already fixed by pattern1
        if "const errorMessage" not in match.group(0):
            message_part = match.group(1)
            error_var = match.group(2)
            fixes += 1
            return match.group(0).replace(
                f"console.error({message_part}, {error_var});",
                f"const errorMessage = {error_var}.message || 'Unknown error';\n    console.error({message_part}, errorMessage);"
            )
        return match.group(0)

    # Apply pattern2 carefully
    content = pattern2.sub(replace2, content)

    return content, fixes

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 fix-error-logging.py <file1> [file2] ...")
        sys.exit(1)

    total_fixes = 0

    for file_path in sys.argv[1:]:
        path = Path(file_path)

        if not path.exists():
            print(f"⚠️  File not found: {file_path}")
            continue

        try:
            content = path.read_text(encoding='utf-8')
            new_content, fixes = fix_error_logging(content)

            if fixes > 0:
                path.write_text(new_content, encoding='utf-8')
                print(f"✅ Fixed {fixes} issue(s) in {file_path}")
                total_fixes += fixes
            else:
                print(f"✓  No issues found in {file_path}")

        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")

    print(f"\n🎉 Total fixes applied: {total_fixes}")

if __name__ == "__main__":
    main()
