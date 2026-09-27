#!/bin/bash

# Phase 11 Translation Verification Script
# Verifies that teacher and student sections exist in all 5 languages

set -e

TRANSLATIONS_DIR="translations"
LANGUAGES=("en" "he" "sv" "ja" "es")

echo "========================================"
echo "Phase 11 Translation Verification"
echo "========================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
total_sections=0
found_sections=0
missing_sections=0

# Results table header
echo "Language | Teacher Section | Student Section | Status"
echo "---------|-----------------|-----------------|--------"

# Check each language
for lang in "${LANGUAGES[@]}"; do
    file="$TRANSLATIONS_DIR/${lang}.js"

    # Count teacher section lines
    teacher_lines=$(awk '/^[[:space:]]*"teacher"[[:space:]]*:[[:space:]]*{/,/^[[:space:]]*}[[:space:]]*$/ {count++} END {print count+0}' "$file")

    # Count student section lines
    student_lines=$(awk '/^[[:space:]]*"student"[[:space:]]*:[[:space:]]*{/,/^[[:space:]]*}[[:space:]]*$/ {count++} END {print count+0}' "$file")

    # Determine status
    teacher_status="✗"
    student_status="✗"
    row_status="${RED}MISSING${NC}"

    total_sections=$((total_sections + 2))

    if [ "$teacher_lines" -gt 0 ]; then
        teacher_status="✓ ($teacher_lines lines)"
        found_sections=$((found_sections + 1))
    else
        missing_sections=$((missing_sections + 1))
    fi

    if [ "$student_lines" -gt 0 ]; then
        student_status="✓ ($student_lines lines)"
        found_sections=$((found_sections + 1))
    else
        missing_sections=$((missing_sections + 1))
    fi

    if [ "$teacher_lines" -gt 0 ] && [ "$student_lines" -gt 0 ]; then
        row_status="${GREEN}COMPLETE${NC}"
    fi

    echo -e "$lang      | $teacher_status | $student_status | $row_status"
done

echo ""
echo "========================================"
echo "Summary"
echo "========================================"
echo "Total sections checked: $total_sections (2 per language × 5 languages)"
echo -e "Sections found: ${GREEN}$found_sections${NC}"
echo -e "Sections missing: ${RED}$missing_sections${NC}"
echo ""

# Line count consistency check
echo "========================================"
echo "Line Count Consistency Check"
echo "========================================"
echo ""

# Get teacher line counts
echo "Teacher section line counts:"
for lang in "${LANGUAGES[@]}"; do
    file="$TRANSLATIONS_DIR/${lang}.js"
    teacher_lines=$(awk '/^[[:space:]]*"teacher"[[:space:]]*:[[:space:]]*{/,/^[[:space:]]*}[[:space:]]*$/ {count++} END {print count+0}' "$file")
    echo "  $lang: $teacher_lines lines"
done

echo ""
echo "Student section line counts:"
for lang in "${LANGUAGES[@]}"; do
    file="$TRANSLATIONS_DIR/${lang}.js"
    student_lines=$(awk '/^[[:space:]]*"student"[[:space:]]*:[[:space:]]*{/,/^[[:space:]]*}[[:space:]]*$/ {count++} END {print count+0}' "$file")
    echo "  $lang: $student_lines lines"
done

echo ""
echo "========================================"
echo "Conclusion"
echo "========================================"

if [ "$missing_sections" -eq 0 ]; then
    echo -e "${GREEN}✓ All teacher/student sections present in all 5 languages${NC}"
    echo -e "${GREEN}✓ Translation completeness verified${NC}"
    exit 0
else
    echo -e "${RED}✗ Missing $missing_sections section(s)${NC}"
    echo -e "${YELLOW}⚠ Translation verification failed${NC}"
    exit 1
fi
