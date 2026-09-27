#!/usr/bin/env python3
"""Zip dist/ contents into a portal upload bundle.

Drop-in replacement for the `zip -qr -X ../<out> . -x '.*'` shell call used by
the package:* scripts, for environments without the zip binary (no root).
Stores files with relative paths, excludes dotfiles, deflate-compressed.
"""
import os
import sys
import zipfile

def main() -> int:
    dist = os.path.join(os.path.dirname(__file__), '..', 'dist')
    out = sys.argv[1]
    dist = os.path.abspath(dist)
    out = os.path.abspath(out)
    if not os.path.isdir(dist):
        print(f'[zip-dist] dist not found: {dist}', file=sys.stderr)
        return 1
    count = 0
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for root, dirs, files in os.walk(dist):
            dirs[:] = [d for d in dirs if not d.startswith('.')]
            for f in sorted(files):
                if f.startswith('.'):
                    continue
                full = os.path.join(root, f)
                arc = os.path.relpath(full, dist)
                z.write(full, arc)
                count += 1
    size = os.path.getsize(out)
    print(f'[zip-dist] wrote {out} ({count} files, {size / 1024:.0f}KB)')
    return 0

if __name__ == '__main__':
    sys.exit(main())
