#!/bin/bash
# Import Hspell Hebrew dictionary word forms
# Source: http://hspell.ivrix.org.il/
# License: GPL (word list extraction is fine for validation use)
#
# Downloads Hspell, builds it, and dumps all valid word forms.

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORK_DIR="$SCRIPT_DIR/hspell_work"
OUTPUT_FILE="$SCRIPT_DIR/../../fe-next/backend/hebrew_words_hspell.txt"
EXISTING_FILE="$SCRIPT_DIR/../../fe-next/backend/hebrew_words.txt"

mkdir -p "$WORK_DIR"
cd "$WORK_DIR"

echo "Downloading Hspell 1.4..."
curl -sL "http://hspell.ivrix.org.il/hspell-1.4.tar.gz" -o hspell-1.4.tar.gz
tar xzf hspell-1.4.tar.gz
cd hspell-1.4

echo "Building Hspell..."
# Generate the word list using the Perl-based tools
if command -v perl &>/dev/null; then
  # Use the wunzip tool to extract words from the compressed dict
  if [ -f "hebrew.wgz" ]; then
    perl -e '
      use strict;
      use warnings;
      # Read the prefix spec and word list
      open my $f, "<:encoding(UTF-8)", "hebrew.wgz.words" or die "Cannot open hebrew.wgz.words: $!";
      while (<$f>) {
        chomp;
        next unless length($_) >= 2 && length($_) <= 8;
        print "$_\n";
      }
      close $f;
    ' > "$OUTPUT_FILE.raw" 2>/dev/null || true
  fi

  # Alternative: try the PrefixBits approach
  if [ ! -s "$OUTPUT_FILE.raw" ] && [ -f "wunzip" ]; then
    chmod +x wunzip
    ./wunzip hebrew.wgz > "$OUTPUT_FILE.raw" 2>/dev/null || true
  fi

  # Alternative: use the pre-generated word lists if available
  if [ ! -s "$OUTPUT_FILE.raw" ]; then
    echo "Trying alternative extraction..."
    # Look for any plain word files
    for f in *.words *.txt; do
      if [ -f "$f" ]; then
        echo "Found $f"
        cat "$f" >> "$OUTPUT_FILE.raw" 2>/dev/null || true
      fi
    done
  fi
fi

if [ -s "$OUTPUT_FILE.raw" ]; then
  # Filter: Hebrew chars only, 2-8 chars, unique, sorted
  perl -CSD -ne '
    chomp;
    s/^\s+|\s+$//g;
    next unless /^[\x{0590}-\x{05FF}]+$/;
    next unless length($_) >= 2 && length($_) <= 8;
    print "$_\n";
  ' "$OUTPUT_FILE.raw" | sort -u > "$OUTPUT_FILE"

  NEW_COUNT=$(wc -l < "$OUTPUT_FILE")
  EXISTING_COUNT=$(wc -l < "$EXISTING_FILE" 2>/dev/null || echo 0)
  echo ""
  echo "Results:"
  echo "  Existing hebrew_words.txt: $EXISTING_COUNT words"
  echo "  Hspell extracted: $NEW_COUNT words"
  echo "  Written to: $OUTPUT_FILE"
else
  echo "Could not extract words from Hspell. Trying alternative approach..."
  echo "You may need to install build tools: brew install automake"
fi

# Cleanup
cd "$SCRIPT_DIR"
rm -rf "$WORK_DIR"
