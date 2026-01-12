#!/usr/bin/env python3
"""
Contrast Issue Detector for React/Next.js Tailwind CSS Projects

Detects color contrast issues in JSX/TSX files:
- Dark text on dark backgrounds
- Light text on light backgrounds
- Inherited contrast issues from ancestor elements
- Missing foreground colors
- Missing dark mode text overrides
- Low opacity dark mode text
"""

import re
import os
import sys
import argparse
import json
from pathlib import Path
from typing import List, Dict, Set, Optional, Tuple
from dataclasses import dataclass, asdict

# Color classifications based on LexiClash theme
DARK_COLORS = {
    'neo-navy', 'neo-navy-light', 'neo-gray', 'neo-black',
    'black', 'gray-900', 'gray-800', 'gray-700', 'gray-600', 'gray-500',
    'slate-900', 'slate-800', 'slate-700', 'slate-600', 'slate-500'
}

LIGHT_COLORS = {
    'neo-cream', 'neo-yellow', 'neo-lime', 'neo-cyan', 'neo-white',
    'white', 'gray-100', 'gray-200', 'gray-300', 'gray-400',
    'slate-100', 'slate-200', 'slate-300', 'slate-400'
}

# Problematic low opacity patterns for light text on dark backgrounds (60% and below)
LOW_OPACITY_LIGHT_TEXT_PATTERNS = {
    'text-white/60', 'text-white/50', 'text-white/40', 'text-white/30', 'text-white/20', 'text-white/10',
    'text-neo-white/60', 'text-neo-white/50', 'text-neo-white/40', 'text-neo-white/30',
    'text-neo-cream/60', 'text-neo-cream/50', 'text-neo-cream/40', 'text-neo-cream/30',
    'text-neo-cream/80',  # Borderline on dark backgrounds
    'text-slate-300', 'text-slate-400'  # These can be borderline on dark backgrounds
}

# Problematic low opacity patterns for dark text on light backgrounds (75% and below)
LOW_OPACITY_DARK_TEXT_PATTERNS = {
    'text-neo-black/70', 'text-neo-black/60', 'text-neo-black/50', 'text-neo-black/40', 'text-neo-black/30',
    'text-neo-black/75',  # Borderline on light backgrounds
    'text-black/70', 'text-black/60', 'text-black/50', 'text-black/40', 'text-black/30',
    'text-black/75',  # Borderline on light backgrounds
}

# Colors that work with light text
DARK_BG_COLORS = {
    'neo-navy', 'neo-navy-light', 'neo-gray', 'neo-black',
    'neo-pink', 'neo-purple', 'neo-red',
    'black', 'gray-900', 'gray-800', 'gray-700',
    'slate-900', 'slate-800', 'slate-700'
}

# Colors that work with dark text
LIGHT_BG_COLORS = {
    'neo-cream', 'neo-yellow', 'neo-lime', 'neo-cyan', 'neo-orange', 'neo-white',
    'white', 'gray-100', 'gray-200', 'gray-300',
    'slate-100', 'slate-200', 'slate-300'
}


@dataclass
class ContrastIssue:
    """Represents a contrast issue found in the code"""
    file: str
    line: int
    severity: str  # 'error' or 'warning'
    issue_type: str
    description: str
    code_snippet: str
    fix_suggestion: Optional[str] = None
    ancestor_line: Optional[int] = None  # For inherited issues


class ContrastDetector:
    def __init__(self, max_depth: int = 10, verbose: bool = False):
        self.max_depth = max_depth
        self.verbose = verbose
        self.issues: List[ContrastIssue] = []
        self.scanned_files = 0

    def extract_tailwind_classes(self, class_str: str) -> Set[str]:
        """Extract individual Tailwind classes from className string"""
        # Handle template literals and concatenations
        class_str = re.sub(r'[`${}]', ' ', class_str)
        # Split by whitespace
        classes = set(class_str.split())
        return {c for c in classes if c and not c.startswith('$')}

    def get_color_from_class(self, cls: str, prefix: str) -> Optional[str]:
        """Extract color name from a Tailwind class with given prefix"""
        # Match patterns like: text-neo-navy, bg-neo-cream/50, dark:text-white
        pattern = rf'{prefix}-([a-zA-Z0-9-]+)(?:/\d+)?$'
        match = re.search(pattern, cls)
        if match:
            return match.group(1)
        return None

    def has_dark_mode_class(self, classes: Set[str], prefix: str) -> bool:
        """Check if classes contain a dark mode variant of the given prefix"""
        for cls in classes:
            if cls.startswith(f'dark:{prefix}-'):
                return True
        return False

    def get_dark_mode_opacity(self, classes: Set[str]) -> Optional[int]:
        """Get opacity percentage from dark mode text classes (e.g., dark:text-neo-cream/50 returns 50)"""
        for cls in classes:
            if cls.startswith('dark:text-'):
                match = re.search(r'/(\d+)$', cls)
                if match:
                    return int(match.group(1))
        return None

    def classify_text_color(self, color: str) -> Optional[str]:
        """Classify if a text color is dark or light"""
        if color in DARK_COLORS:
            return 'dark'
        if color in LIGHT_COLORS:
            return 'light'
        return None

    def classify_bg_color(self, color: str) -> Optional[str]:
        """Classify if a background color needs light or dark text"""
        if color in DARK_BG_COLORS:
            return 'needs-light-text'
        if color in LIGHT_BG_COLORS:
            return 'needs-dark-text'
        return None

    def check_element_contrast(self, classes: Set[str], line_num: int,
                             file_path: str, line_content: str) -> List[ContrastIssue]:
        """Check contrast issues for a single element"""
        issues = []

        # Extract colors
        bg_color = None
        text_color = None
        dark_bg_color = None

        # Check for problematic low opacity patterns on dark backgrounds
        for cls in classes:
            # Check if using white/cream with 60% or lower opacity on dark bg
            if any(pattern in cls for pattern in ['text-white/60', 'text-white/50', 'text-white/40', 'text-white/30',
                                                    'text-neo-white/60', 'text-neo-white/50', 'text-neo-white/40',
                                                    'text-neo-cream/60', 'text-neo-cream/50', 'text-neo-cream/40',
                                                    'text-neo-cream/80']):
                issues.append(ContrastIssue(
                    file=file_path,
                    line=line_num,
                    severity='warning',
                    issue_type='low-opacity-light-text-on-dark',
                    description=f'Low opacity light text "{cls}" may have poor contrast on dark backgrounds',
                    code_snippet=line_content.strip(),
                    fix_suggestion='Use text-neo-white or text-slate-300 for better contrast on dark backgrounds'
                ))

            # Check if using black with 75% or lower opacity on light bg (hard to read)
            if any(pattern in cls for pattern in ['text-neo-black/70', 'text-neo-black/75', 'text-neo-black/60',
                                                    'text-neo-black/50', 'text-neo-black/40', 'text-neo-black/30',
                                                    'text-black/70', 'text-black/75', 'text-black/60',
                                                    'text-black/50', 'text-black/40', 'text-black/30']):
                issues.append(ContrastIssue(
                    file=file_path,
                    line=line_num,
                    severity='warning',
                    issue_type='low-opacity-dark-text-on-light',
                    description=f'Low opacity dark text "{cls}" may have poor contrast on light backgrounds',
                    code_snippet=line_content.strip(),
                    fix_suggestion='Use text-neo-gray or text-neo-black for better contrast on light backgrounds'
                ))

        for cls in classes:
            if 'bg-' in cls and not cls.startswith('dark:'):
                bg_color = self.get_color_from_class(cls, 'bg')
            if 'text-' in cls and not cls.startswith('dark:'):
                text_color = self.get_color_from_class(cls, 'text')
            if cls.startswith('dark:bg-'):
                dark_bg_color = self.get_color_from_class(cls, 'dark:bg')

        # Check 1: Missing foreground on colored background
        if bg_color and not text_color:
            issues.append(ContrastIssue(
                file=file_path,
                line=line_num,
                severity='warning',
                issue_type='missing-foreground',
                description=f'Background color "bg-{bg_color}" without explicit text color',
                code_snippet=line_content.strip(),
                fix_suggestion=self._suggest_text_color(bg_color)
            ))

        # Check 2: Dark-on-Dark
        if bg_color and text_color:
            bg_class = self.classify_bg_color(bg_color)
            text_class = self.classify_text_color(text_color)

            if bg_class == 'needs-light-text' and text_class == 'dark':
                issues.append(ContrastIssue(
                    file=file_path,
                    line=line_num,
                    severity='error',
                    issue_type='dark-on-dark',
                    description=f'Dark text "text-{text_color}" on dark background "bg-{bg_color}"',
                    code_snippet=line_content.strip(),
                    fix_suggestion=f'Replace text-{text_color} with text-neo-white or text-neo-cream'
                ))

            # Check 3: Light-on-Light
            elif bg_class == 'needs-dark-text' and text_class == 'light':
                issues.append(ContrastIssue(
                    file=file_path,
                    line=line_num,
                    severity='error',
                    issue_type='light-on-light',
                    description=f'Light text "text-{text_color}" on light background "bg-{bg_color}"',
                    code_snippet=line_content.strip(),
                    fix_suggestion=f'Replace text-{text_color} with text-neo-black'
                ))

        # Check 4: Missing dark mode text override when dark:bg-* exists
        if dark_bg_color and text_color:
            text_class = self.classify_text_color(text_color)
            has_dark_text_override = self.has_dark_mode_class(classes, 'text')

            if text_class == 'dark' and not has_dark_text_override:
                issues.append(ContrastIssue(
                    file=file_path,
                    line=line_num,
                    severity='error',
                    issue_type='missing-dark-mode-override',
                    description=f'Dark text "text-{text_color}" without dark:text-* override when dark:bg-{dark_bg_color} exists',
                    code_snippet=line_content.strip(),
                    fix_suggestion=f'Add dark:text-neo-white or remove text-{text_color} if children have explicit colors'
                ))

        # Check 5: Low opacity dark mode text (<=50%)
        dark_opacity = self.get_dark_mode_opacity(classes)
        if dark_opacity is not None and dark_opacity <= 50:
            issues.append(ContrastIssue(
                file=file_path,
                line=line_num,
                severity='error',
                issue_type='low-opacity-dark-mode-text',
                description=f'Dark mode text has {dark_opacity}% opacity - hard to read on dark backgrounds',
                code_snippet=line_content.strip(),
                fix_suggestion='Use solid color like dark:text-slate-400 or increase opacity to 80%+'
            ))

        return issues

    def _suggest_text_color(self, bg_color: str) -> str:
        """Suggest appropriate text color for a background"""
        bg_class = self.classify_bg_color(bg_color)
        if bg_class == 'needs-light-text':
            return 'Add text-neo-white or text-neo-cream'
        elif bg_class == 'needs-dark-text':
            return 'Add text-neo-black'
        return 'Add explicit text color'

    def parse_jsx_element(self, line: str) -> Optional[str]:
        """Extract className from a JSX line"""
        # Match className="..." or className={...}
        patterns = [
            r'className=["\']([^"\']+)["\']',
            r'className=\{`([^`]+)`\}',
            r'className=\{([^}]+)\}'
        ]

        for pattern in patterns:
            match = re.search(pattern, line)
            if match:
                return match.group(1)
        return None

    def check_file(self, file_path: Path) -> List[ContrastIssue]:
        """Check a single file for contrast issues"""
        if self.verbose:
            print(f"Scanning: {file_path}")

        self.scanned_files += 1
        issues = []

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()

            # Build element tree to track ancestor backgrounds
            element_stack: List[Tuple[int, Set[str]]] = []  # (line_num, classes)

            for i, line in enumerate(lines, 1):
                # Track opening/closing tags for inheritance
                if '<' in line and '>' in line:
                    # Check for opening tags
                    if re.search(r'<\w+[^/>]*>', line):
                        class_str = self.parse_jsx_element(line)
                        if class_str:
                            classes = self.extract_tailwind_classes(class_str)
                            element_stack.append((i, classes))

                            # Check direct contrast issues
                            issues.extend(self.check_element_contrast(
                                classes, i, str(file_path), line
                            ))

                            # Check inherited contrast issues
                            issues.extend(self.check_inherited_contrast(
                                classes, i, str(file_path), line, element_stack
                            ))

                    # Check for closing tags (simplified - just pop stack)
                    if re.search(r'</\w+>', line) and element_stack:
                        # Keep stack depth reasonable
                        if len(element_stack) > self.max_depth:
                            element_stack.pop(0)

        except Exception as e:
            print(f"Error scanning {file_path}: {e}", file=sys.stderr)

        return issues

    def check_inherited_contrast(self, classes: Set[str], line_num: int,
                                 file_path: str, line_content: str,
                                 element_stack: List[Tuple[int, Set[str]]]) -> List[ContrastIssue]:
        """Check if text color conflicts with ancestor background colors"""
        issues = []

        # Get text color from current element
        text_color = None
        for cls in classes:
            if 'text-' in cls and not cls.startswith('dark:'):
                text_color = self.get_color_from_class(cls, 'text')
                break

        if not text_color:
            return issues

        text_class = self.classify_text_color(text_color)
        if not text_class:
            return issues

        # Check ancestors for background colors (skip current element)
        for ancestor_line, ancestor_classes in reversed(element_stack[:-1]):
            bg_color = None
            for cls in ancestor_classes:
                if 'bg-' in cls and not cls.startswith('dark:'):
                    bg_color = self.get_color_from_class(cls, 'bg')
                    break

            if bg_color:
                bg_class = self.classify_bg_color(bg_color)

                # Inherited dark-on-dark
                if bg_class == 'needs-light-text' and text_class == 'dark':
                    issues.append(ContrastIssue(
                        file=file_path,
                        line=line_num,
                        severity='error',
                        issue_type='inherited-dark-on-dark',
                        description=f'Dark text "text-{text_color}" inside dark background "bg-{bg_color}" (line {ancestor_line})',
                        code_snippet=line_content.strip(),
                        fix_suggestion=f'Replace text-{text_color} with text-neo-white or text-neo-cream',
                        ancestor_line=ancestor_line
                    ))
                    break  # Report only the closest ancestor issue

                # Inherited light-on-light
                elif bg_class == 'needs-dark-text' and text_class == 'light':
                    issues.append(ContrastIssue(
                        file=file_path,
                        line=line_num,
                        severity='error',
                        issue_type='inherited-light-on-light',
                        description=f'Light text "text-{text_color}" inside light background "bg-{bg_color}" (line {ancestor_line})',
                        code_snippet=line_content.strip(),
                        fix_suggestion=f'Replace text-{text_color} with text-neo-black',
                        ancestor_line=ancestor_line
                    ))
                    break

        return issues

    def scan_directory(self, path: Path) -> List[ContrastIssue]:
        """Recursively scan directory for React/Next.js files"""
        all_issues = []

        for file_path in path.rglob('*'):
            # Skip node_modules, .next, build directories
            if any(part in file_path.parts for part in ['node_modules', '.next', 'build', 'dist', '.git']):
                continue

            # Only scan JSX/TSX files
            if file_path.suffix in ['.jsx', '.tsx', '.js', '.ts']:
                issues = self.check_file(file_path)
                all_issues.extend(issues)

        return all_issues

    def print_report(self, issues: List[ContrastIssue], show_fixes: bool = False):
        """Print human-readable report"""
        if not issues:
            print("✅ No contrast issues found!")
            return

        # Group by severity
        errors = [i for i in issues if i.severity == 'error']
        warnings = [i for i in issues if i.severity == 'warning']

        print(f"\n🔍 Scanned {self.scanned_files} files")
        print(f"❌ Found {len(errors)} errors and ⚠️  {len(warnings)} warnings\n")

        # Print errors
        if errors:
            print("=" * 80)
            print("ERRORS (Critical - must fix)")
            print("=" * 80)
            for issue in errors:
                self._print_issue(issue, show_fixes)

        # Print warnings
        if warnings:
            print("\n" + "=" * 80)
            print("WARNINGS (Should fix)")
            print("=" * 80)
            for issue in warnings:
                self._print_issue(issue, show_fixes)

    def _print_issue(self, issue: ContrastIssue, show_fix: bool):
        """Print a single issue"""
        print(f"\n📄 {issue.file}:{issue.line}")
        print(f"   Type: {issue.issue_type}")
        print(f"   Issue: {issue.description}")
        print(f"   Code: {issue.code_snippet}")
        if show_fix and issue.fix_suggestion:
            print(f"   Fix: {issue.fix_suggestion}")
        if issue.ancestor_line:
            print(f"   Background defined at line: {issue.ancestor_line}")


def main():
    parser = argparse.ArgumentParser(
        description='Detect color contrast issues in React/Next.js Tailwind projects'
    )
    parser.add_argument(
        '--path',
        type=str,
        default='.',
        help='Directory to scan (default: current directory)'
    )
    parser.add_argument(
        '--fix',
        action='store_true',
        help='Show fix suggestions inline'
    )
    parser.add_argument(
        '--json',
        action='store_true',
        help='Output as JSON for programmatic use'
    )
    parser.add_argument(
        '--severity',
        choices=['error', 'warning', 'info'],
        default='warning',
        help='Filter by minimum severity (default: warning)'
    )
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Show all scanned files'
    )
    parser.add_argument(
        '--max-depth',
        type=int,
        default=10,
        help='Maximum ancestor depth to check for inherited backgrounds (default: 10)'
    )

    args = parser.parse_args()

    # Validate path
    scan_path = Path(args.path)
    if not scan_path.exists():
        print(f"Error: Path '{args.path}' does not exist", file=sys.stderr)
        sys.exit(1)

    # Run detection
    detector = ContrastDetector(max_depth=args.max_depth, verbose=args.verbose)
    issues = detector.scan_directory(scan_path)

    # Filter by severity
    if args.severity == 'error':
        issues = [i for i in issues if i.severity == 'error']

    # Output results
    if args.json:
        print(json.dumps([asdict(i) for i in issues], indent=2))
    else:
        detector.print_report(issues, show_fixes=args.fix)

    # Exit with error code if errors found
    errors = [i for i in issues if i.severity == 'error']
    sys.exit(1 if errors else 0)


if __name__ == '__main__':
    main()
