#!/usr/bin/env python3
"""
Contrast Issue Detector for Tailwind CSS + React/Next.js Projects

Detects potential contrast issues:
- Dark text on dark backgrounds (including inherited from ancestors)
- Light text on light backgrounds (including inherited from ancestors)
- Missing foreground colors on colored backgrounds
- Inherited background context issues
- Missing dark mode text overrides (text-neo-black without dark:text-* when dark mode bg exists)
- Low-opacity dark mode text (dark:text-neo-cream/50 etc. that's hard to read)
- Conditional state-based contrast issues (ternary expressions where active/selected state has bg without text)
- Template literal variable lookup issues (e.g., difficultyColors[key] with mismatched keys)

Usage:
    python detect-contrast-issues.py [--path <directory>] [--fix] [--json]

Options:
    --path      Directory to scan (default: current directory)
    --fix       Suggest fixes inline
    --json      Output results as JSON
    --verbose   Show all scanned files
    --max-depth Maximum ancestor depth to check (default: 10)
"""

import os
import re
import sys
import json
import argparse
from pathlib import Path
from dataclasses import dataclass, asdict, field
from typing import List, Dict, Tuple, Optional, Set, Deque
from collections import deque

# Color classifications based on Tailwind and common patterns
DARK_COLORS = {
    # Standard Tailwind darks
    'black', 'gray-900', 'gray-800', 'gray-700', 'slate-900', 'slate-800', 'slate-700',
    'zinc-900', 'zinc-800', 'zinc-700', 'neutral-900', 'neutral-800', 'neutral-700',
    'stone-900', 'stone-800', 'stone-700',
    # Neo-Brutalist theme darks
    'neo-black', 'neo-navy', 'neo-navy-light', 'neo-gray',
    # Generic dark patterns
    'dark', 'navy', 'indigo-900', 'indigo-800', 'purple-900', 'purple-800',
    'blue-900', 'blue-800', 'green-900', 'green-800', 'red-900', 'red-800',
}

LIGHT_COLORS = {
    # Standard Tailwind lights
    'white', 'gray-100', 'gray-50', 'slate-100', 'slate-50',
    'zinc-100', 'zinc-50', 'neutral-100', 'neutral-50',
    'stone-100', 'stone-50',
    # Neo-Brutalist theme lights
    'neo-white', 'neo-cream', 'neo-yellow', 'neo-lime', 'neo-cyan',
    # Generic light patterns
    'light', 'cream', 'ivory', 'beige',
}

# Medium/vibrant colors that need specific foreground handling
VIBRANT_COLORS = {
    'neo-pink', 'neo-purple', 'neo-orange', 'neo-red',
    'pink', 'purple', 'orange', 'red', 'blue', 'green', 'indigo', 'violet',
    'amber', 'yellow', 'lime', 'emerald', 'teal', 'cyan', 'sky', 'fuchsia', 'rose',
}

# Mapping of background colors to recommended foreground colors
FOREGROUND_RECOMMENDATIONS = {
    # Dark backgrounds -> light text
    'bg-neo-navy': 'text-neo-white or text-neo-cream',
    'bg-neo-gray': 'text-neo-white or text-neo-cream',
    'bg-neo-black': 'text-neo-white',
    'bg-slate-900': 'text-white or text-slate-100',
    'bg-slate-800': 'text-white or text-slate-100',
    'bg-slate-700': 'text-white or text-slate-100',
    'bg-gray-900': 'text-white or text-gray-100',
    'bg-black': 'text-white',
    # Light backgrounds -> dark text
    'bg-neo-cream': 'text-neo-black',
    'bg-neo-yellow': 'text-neo-black',
    'bg-white': 'text-black or text-gray-900',
    'bg-neo-lime': 'text-neo-black',
    # Vibrant backgrounds
    'bg-neo-pink': 'text-neo-white or text-neo-black',
    'bg-neo-purple': 'text-neo-white',
    'bg-neo-orange': 'text-neo-black',
    'bg-neo-cyan': 'text-neo-black',
}


@dataclass
class ElementContext:
    """Represents an element in the JSX hierarchy with its styling context"""
    tag_name: str
    line_num: int
    bg_color: Optional[str] = None
    text_color: Optional[str] = None
    dark_bg_color: Optional[str] = None  # dark:bg-* color
    dark_text_color: Optional[str] = None  # dark:text-* color
    classes: List[str] = field(default_factory=list)
    is_self_closing: bool = False
    raw_element: str = ""


@dataclass
class ContrastIssue:
    """Represents a detected contrast issue"""
    file: str
    line: int
    column: int
    issue_type: str  # 'dark-on-dark', 'light-on-light', 'missing-foreground', 'inherited-contrast', 'missing-dark-mode-override'
    severity: str    # 'error', 'warning', 'info'
    context: str     # The line content
    bg_color: Optional[str]
    text_color: Optional[str]
    suggestion: str
    element_snippet: str
    inherited_from_line: Optional[int] = None  # Line where background was defined (if inherited)
    ancestor_depth: int = 0  # How many levels up the background was found


def get_opacity(color: str) -> Optional[int]:
    """Extract opacity percentage from a color string like 'white/20' or 'neo-cream/50'"""
    match = re.search(r'/(\d+)\]?$', color)
    if match:
        return int(match.group(1))
    return None


def get_base_color(color: str) -> str:
    """Extract the base color without opacity suffix"""
    return re.sub(r'/\d+$', '', color)


def is_low_opacity_bg(color: str) -> bool:
    """Check if a background color has low opacity (<=30%) making it essentially transparent"""
    opacity = get_opacity(color)
    return opacity is not None and opacity <= 30


def is_low_opacity_text(color: str) -> bool:
    """Check if a text color has low opacity (<=50%) making it hard to read"""
    opacity = get_opacity(color)
    return opacity is not None and opacity <= 50


def is_dark_color(color: str) -> bool:
    """Check if a color is classified as dark"""
    if not color:
        return False

    # Low opacity backgrounds don't really affect contrast
    if is_low_opacity_bg(color):
        return False

    # Check the base color (without opacity suffix)
    base_color = get_base_color(color).lower()

    for dark in DARK_COLORS:
        if dark in base_color:
            return True
    return False


def is_light_color(color: str) -> bool:
    """Check if a color is classified as light"""
    if not color:
        return False

    # Low opacity backgrounds don't really affect contrast
    if is_low_opacity_bg(color):
        return False

    # Check the base color (without opacity suffix)
    base_color = get_base_color(color).lower()

    for light in LIGHT_COLORS:
        if light in base_color:
            return True
    return False


def extract_color_from_class(class_name: str) -> Optional[str]:
    """Extract the color portion from a Tailwind class, preserving opacity suffix"""
    # Match patterns like: text-neo-black, bg-slate-900, text-white/50
    patterns = [
        r'^(?:text|bg|border|ring)-(.+)$',  # Preserve opacity suffix like /50
        r'^(?:text|bg|border|ring)-\[(.+?)\]$',
    ]
    for pattern in patterns:
        match = re.match(pattern, class_name)
        if match:
            return match.group(1)
    return None


def find_classes_in_element(element_str: str) -> Tuple[List[str], List[str], List[str], List[str], List[str]]:
    """Extract background, text, dark:bg, dark:text, and other color classes from an element string"""
    # Find className or class attribute
    class_patterns = [
        r'className\s*=\s*[`"\']([^`"\']+)[`"\']',
        r'className\s*=\s*\{[`"\']([^`"\']+)[`"\']\}',
        r'className\s*=\s*\{\s*`([^`]+)`\s*\}',
        r'class\s*=\s*["\']([^"\']+)["\']',
    ]

    all_classes = []
    for pattern in class_patterns:
        matches = re.findall(pattern, element_str, re.DOTALL)
        for match in matches:
            # Handle template literals
            clean_match = re.sub(r'\$\{[^}]+\}', '', match)
            all_classes.extend(clean_match.split())

    # Separate regular and dark mode classes
    bg_classes = [c for c in all_classes if c.startswith('bg-') and not c.startswith('dark:')]
    text_classes = [c for c in all_classes if (c.startswith('text-') and not c.startswith('text-[') or c.startswith('text-neo-')) and not c.startswith('dark:')]
    dark_bg_classes = [c.replace('dark:', '') for c in all_classes if c.startswith('dark:bg-')]
    dark_text_classes = [c.replace('dark:', '') for c in all_classes if c.startswith('dark:text-')]
    other_classes = [c for c in all_classes if c not in bg_classes and c not in text_classes and not c.startswith('dark:')]

    return bg_classes, text_classes, dark_bg_classes, dark_text_classes, other_classes


def parse_jsx_hierarchy(content: str) -> List[Tuple[ElementContext, List[ElementContext]]]:
    """
    Parse JSX content and return elements with their ancestor context.
    Returns list of (element, ancestors) tuples where ancestors[0] is immediate parent.
    """
    results = []
    lines = content.split('\n')

    # Stack to track open elements and their backgrounds
    # Each entry: (tag_name, line_num, bg_color, depth)
    element_stack: Deque[ElementContext] = deque()

    # Pattern to find opening tags with className
    opening_tag_pattern = r'<(\w+)([^>]*(?:className|class)\s*=\s*[{"\'][^>]*)(/?)>'
    closing_tag_pattern = r'</(\w+)>'

    # Self-closing tags that don't need closing
    self_closing_tags = {'img', 'br', 'hr', 'input', 'meta', 'link', 'area', 'base', 'col', 'embed', 'param', 'source', 'track', 'wbr'}

    for line_num, line in enumerate(lines, 1):
        # Process closing tags first (they come before opening in same line sometimes)
        for match in re.finditer(closing_tag_pattern, line):
            tag_name = match.group(1)
            # Pop matching elements from stack
            while element_stack and element_stack[-1].tag_name != tag_name:
                element_stack.pop()
            if element_stack:
                element_stack.pop()

        # Find opening tags
        for match in re.finditer(opening_tag_pattern, line, re.DOTALL):
            tag_name = match.group(1)
            is_self_closing = match.group(3) == '/' or tag_name.lower() in self_closing_tags

            # Skip React fragments and other non-elements
            if tag_name in ('Fragment', 'React.Fragment', ''):
                continue

            # Extract colors from this element
            full_element = match.group(0)
            bg_classes, text_classes, dark_bg_classes, dark_text_classes, _ = find_classes_in_element(full_element)

            bg_color = None
            text_color = None
            dark_bg_color = None
            dark_text_color = None

            for bg_class in bg_classes:
                color = extract_color_from_class(bg_class)
                if color:
                    bg_color = color
                    break

            for text_class in text_classes:
                color = extract_color_from_class(text_class)
                if color:
                    text_color = color
                    break

            for dark_bg_class in dark_bg_classes:
                color = extract_color_from_class(dark_bg_class)
                if color:
                    dark_bg_color = color
                    break

            for dark_text_class in dark_text_classes:
                color = extract_color_from_class(dark_text_class)
                if color:
                    dark_text_color = color
                    break

            # Get all classes for decorative element detection
            all_classes = []
            for pattern in [
                r'className\s*=\s*[`"\']([^`"\']+)[`"\']',
                r'className\s*=\s*\{[`"\']([^`"\']+)[`"\']\}',
            ]:
                matches = re.findall(pattern, full_element, re.DOTALL)
                for match in matches:
                    all_classes.extend(match.split())

            # Create element context
            element = ElementContext(
                tag_name=tag_name,
                line_num=line_num,
                bg_color=bg_color,
                text_color=text_color,
                dark_bg_color=dark_bg_color,
                dark_text_color=dark_text_color,
                classes=all_classes,  # Store all classes for decorative detection
                is_self_closing=is_self_closing,
                raw_element=full_element[:200]
            )

            # Record this element with its ancestors
            ancestors = list(element_stack)
            ancestors.reverse()  # Now ancestors[0] is immediate parent
            results.append((element, ancestors))

            # Add to stack if not self-closing
            if not is_self_closing:
                element_stack.append(element)

    return results


def is_decorative_element(element: ElementContext) -> bool:
    """Check if an element is likely decorative (small indicators, separators, etc.)"""
    classes_str = ' '.join(element.classes)

    # Small fixed-size elements (indicators, dots)
    if re.search(r'\b(w-[1-4]|h-[1-4])\b', classes_str):
        return True

    # Ping/pulse animations (status indicators)
    if 'animate-ping' in classes_str or 'animate-pulse' in classes_str:
        return True

    # Separator-like elements
    if re.search(r'\b(w-1|h-1|w-px|h-px)\b', classes_str) and 'rounded' in classes_str:
        return True

    return False


def find_inherited_background(ancestors: List[ElementContext], max_depth: int = 10) -> Tuple[Optional[str], Optional[int], int]:
    """
    Find the nearest ancestor with an effective background color.
    Skips low-opacity backgrounds and decorative elements.
    Returns (bg_color, line_num, depth) or (None, None, 0)
    """
    for depth, ancestor in enumerate(ancestors[:max_depth], 1):
        if ancestor.bg_color:
            # Skip low-opacity backgrounds as they don't really affect contrast
            if is_low_opacity_bg(ancestor.bg_color):
                continue

            # Skip decorative elements (small indicators, separators)
            if is_decorative_element(ancestor):
                continue

            return (ancestor.bg_color, ancestor.line_num, depth)

    return (None, None, 0)


def analyze_element_with_context(
    element: ElementContext,
    ancestors: List[ElementContext],
    file_path: str,
    max_depth: int = 10
) -> List[ContrastIssue]:
    """Analyze an element considering its ancestor context"""
    issues = []

    # Get the effective background (either from this element or inherited)
    effective_bg = element.bg_color
    bg_line = element.line_num
    inherited_depth = 0

    if not effective_bg:
        inherited_bg, inherited_line, depth = find_inherited_background(ancestors, max_depth)
        if inherited_bg:
            effective_bg = inherited_bg
            bg_line = inherited_line
            inherited_depth = depth

    text_color = element.text_color

    # Check for contrast issues with inherited background
    if effective_bg and text_color:
        # Dark text on dark background (inherited or not)
        if is_dark_color(effective_bg) and is_dark_color(text_color):
            issue_type = 'inherited-dark-on-dark' if inherited_depth > 0 else 'dark-on-dark'
            suggestion = f"Use light text (text-neo-white, text-neo-cream, text-white) instead of text-{text_color}"
            if inherited_depth > 0:
                suggestion += f" (background inherited from line {bg_line})"

            issues.append(ContrastIssue(
                file=file_path,
                line=element.line_num,
                column=0,
                issue_type=issue_type,
                severity='error',
                context=element.raw_element,
                bg_color=effective_bg,
                text_color=text_color,
                suggestion=suggestion,
                element_snippet=element.raw_element[:100],
                inherited_from_line=bg_line if inherited_depth > 0 else None,
                ancestor_depth=inherited_depth
            ))

        # Light text on light background (inherited or not)
        elif is_light_color(effective_bg) and is_light_color(text_color):
            issue_type = 'inherited-light-on-light' if inherited_depth > 0 else 'light-on-light'
            suggestion = f"Use dark text (text-neo-black, text-black, text-gray-900) instead of text-{text_color}"
            if inherited_depth > 0:
                suggestion += f" (background inherited from line {bg_line})"

            issues.append(ContrastIssue(
                file=file_path,
                line=element.line_num,
                column=0,
                issue_type=issue_type,
                severity='error',
                context=element.raw_element,
                bg_color=effective_bg,
                text_color=text_color,
                suggestion=suggestion,
                element_snippet=element.raw_element[:100],
                inherited_from_line=bg_line if inherited_depth > 0 else None,
                ancestor_depth=inherited_depth
            ))

    # Check for missing foreground on colored backgrounds (only on the element itself)
    if element.bg_color and not text_color:
        # Check if any child might have text - skip purely structural/decorative elements
        structural_patterns = ['absolute', 'inset', 'w-', 'h-', 'animate-']
        is_structural = any(
            any(pattern in c for pattern in structural_patterns)
            for c in element.classes
        ) and 'flex' not in ' '.join(element.classes) and 'grid' not in ' '.join(element.classes)

        if not is_structural:
            bg_class = f"bg-{element.bg_color}"
            if bg_class in FOREGROUND_RECOMMENDATIONS:
                issues.append(ContrastIssue(
                    file=file_path,
                    line=element.line_num,
                    column=0,
                    issue_type='missing-foreground',
                    severity='warning',
                    context=element.raw_element,
                    bg_color=element.bg_color,
                    text_color=None,
                    suggestion=f"Add explicit text color: {FOREGROUND_RECOMMENDATIONS[bg_class]}",
                    element_snippet=element.raw_element[:100],
                    inherited_from_line=None,
                    ancestor_depth=0
                ))
            elif is_dark_color(element.bg_color):
                issues.append(ContrastIssue(
                    file=file_path,
                    line=element.line_num,
                    column=0,
                    issue_type='missing-foreground',
                    severity='info',
                    context=element.raw_element,
                    bg_color=element.bg_color,
                    text_color=None,
                    suggestion="Consider adding explicit light text color for dark background",
                    element_snippet=element.raw_element[:100],
                    inherited_from_line=None,
                    ancestor_depth=0
                ))

    # Check for missing dark mode text override
    # This detects: text-neo-black (dark text) without dark:text-* when dark mode bg exists
    if text_color and not element.dark_text_color:
        # Skip if element has its own light background (that doesn't change in dark mode)
        # e.g., bg-neo-yellow text-neo-black is correct because yellow stays light in dark mode
        has_shielding_light_bg = element.bg_color and is_light_color(element.bg_color) and not element.dark_bg_color

        # Also check if any ancestor has a light background that shields from dark mode
        # e.g., <div bg-neo-yellow><p text-neo-black>...</p></div> is correct
        if not has_shielding_light_bg:
            for ancestor in ancestors[:max_depth]:
                if ancestor.bg_color and is_light_color(ancestor.bg_color) and not ancestor.dark_bg_color:
                    has_shielding_light_bg = True
                    break

        if not has_shielding_light_bg:
            # Check if this element or any ancestor has a dark mode background
            has_dark_mode_bg = element.dark_bg_color is not None
            dark_bg_source_line = element.line_num if has_dark_mode_bg else None

            if not has_dark_mode_bg:
                for ancestor in ancestors[:max_depth]:
                    if ancestor.dark_bg_color:
                        has_dark_mode_bg = True
                        dark_bg_source_line = ancestor.line_num
                        break

            if has_dark_mode_bg:
                # Dark text without dark mode override - will be unreadable on dark backgrounds
                if is_dark_color(text_color):
                    issues.append(ContrastIssue(
                        file=file_path,
                        line=element.line_num,
                        column=0,
                        issue_type='missing-dark-mode-override',
                        severity='error',
                        context=element.raw_element,
                        bg_color=element.dark_bg_color or f"dark mode bg from line {dark_bg_source_line}",
                        text_color=text_color,
                        suggestion=f"Add dark:text-neo-white or dark:text-neo-cream alongside text-{text_color} (dark mode background exists at line {dark_bg_source_line})",
                        element_snippet=element.raw_element[:100],
                        inherited_from_line=dark_bg_source_line if dark_bg_source_line != element.line_num else None,
                        ancestor_depth=0
                    ))

    # Check for low-opacity dark mode text
    # This detects: dark:text-neo-cream/50 or similar low-opacity text that's hard to read
    if element.dark_text_color and is_low_opacity_text(element.dark_text_color):
        opacity = get_opacity(element.dark_text_color)
        base_color = get_base_color(element.dark_text_color)
        issues.append(ContrastIssue(
            file=file_path,
            line=element.line_num,
            column=0,
            issue_type='low-opacity-dark-mode-text',
            severity='error',
            context=element.raw_element,
            bg_color=element.dark_bg_color or "dark mode background",
            text_color=f"dark:{element.dark_text_color}",
            suggestion=f"Increase dark mode text opacity: use dark:text-{base_color} or dark:text-slate-400 instead of dark:text-{element.dark_text_color} ({opacity}% opacity is hard to read)",
            element_snippet=element.raw_element[:100],
            inherited_from_line=None,
            ancestor_depth=0
        ))

    return issues


def analyze_conditional_contrast(content: str, file_path: str) -> List[ContrastIssue]:
    """
    Detect contrast issues in conditional/ternary className expressions.
    Catches patterns like:
    - isSelected ? 'bg-neo-cyan' : 'bg-neo-cream text-neo-black'
    - difficultyColors[key] || 'bg-neo-cyan'  (fallback without text color)
    """
    issues = []
    lines = content.split('\n')

    # Pattern for ternary expressions with className strings
    # Matches: condition ? 'classes' : 'classes' or condition ? `classes` : `classes`
    ternary_pattern = r'(\w+(?:\s*===?\s*\w+)?)\s*\?\s*[`\'"]([^`\'"]+)[`\'"]\s*:\s*[`\'"]([^`\'"]+)[`\'"]'

    # Pattern for template literal with fallback: ${var} || 'fallback'
    fallback_pattern = r'\$\{([^}]+)\s*\|\|\s*[\'"]([^\'"]+)[\'"]\}'

    # Pattern for className with cn() containing ternary
    cn_ternary_pattern = r'cn\([^)]*(\w+)\s*\?\s*[`\'"]([^`\'"]+)[`\'"]\s*:\s*[`\'"]([^`\'"]+)[`\'"]'

    for line_num, line in enumerate(lines, 1):
        # Check for ternary patterns
        for match in re.finditer(ternary_pattern, line):
            condition = match.group(1)
            true_classes = match.group(2)
            false_classes = match.group(3)

            # Check if "true" branch (typically selected/active state) has bg without text
            if _has_bg_without_text_in_classes(true_classes):
                bg_color = _extract_bg_from_classes(true_classes)
                if bg_color and (is_light_color(bg_color) or is_dark_color(bg_color)):
                    # Determine what text color is needed
                    suggested_text = 'text-neo-black' if is_light_color(bg_color) else 'text-neo-white'
                    issues.append(ContrastIssue(
                        file=file_path,
                        line=line_num,
                        column=match.start(),
                        issue_type='state-based-missing-text-color',
                        severity='error',
                        context=line.strip(),
                        bg_color=bg_color,
                        text_color=None,
                        suggestion=f"Add {suggested_text} to active/selected state: '{true_classes}' needs explicit text color",
                        element_snippet=match.group(0)[:100],
                        inherited_from_line=None,
                        ancestor_depth=0
                    ))

        # Check for cn() with ternary
        for match in re.finditer(cn_ternary_pattern, line):
            condition = match.group(1)
            true_classes = match.group(2)
            false_classes = match.group(3)

            if _has_bg_without_text_in_classes(true_classes):
                bg_color = _extract_bg_from_classes(true_classes)
                if bg_color and (is_light_color(bg_color) or is_dark_color(bg_color)):
                    suggested_text = 'text-neo-black' if is_light_color(bg_color) else 'text-neo-white'
                    issues.append(ContrastIssue(
                        file=file_path,
                        line=line_num,
                        column=match.start(),
                        issue_type='state-based-missing-text-color',
                        severity='error',
                        context=line.strip(),
                        bg_color=bg_color,
                        text_color=None,
                        suggestion=f"Add {suggested_text} to active/selected state in cn(): needs explicit text color",
                        element_snippet=match.group(0)[:100],
                        inherited_from_line=None,
                        ancestor_depth=0
                    ))

        # Check for fallback patterns that might miss text color
        for match in re.finditer(fallback_pattern, line):
            var_name = match.group(1)
            fallback_classes = match.group(2)

            if _has_bg_without_text_in_classes(fallback_classes):
                bg_color = _extract_bg_from_classes(fallback_classes)
                if bg_color and (is_light_color(bg_color) or is_dark_color(bg_color)):
                    suggested_text = 'text-neo-black' if is_light_color(bg_color) else 'text-neo-white'
                    issues.append(ContrastIssue(
                        file=file_path,
                        line=line_num,
                        column=match.start(),
                        issue_type='fallback-missing-text-color',
                        severity='error',
                        context=line.strip(),
                        bg_color=bg_color,
                        text_color=None,
                        suggestion=f"Fallback '{fallback_classes}' needs explicit text color. Add {suggested_text} or ensure {var_name} always includes text color",
                        element_snippet=match.group(0)[:100],
                        inherited_from_line=None,
                        ancestor_depth=0
                    ))

    return issues


def _has_bg_without_text_in_classes(classes_str: str) -> bool:
    """Check if a class string has a background color but no text color"""
    classes = classes_str.split()
    has_bg = any(c.startswith('bg-') for c in classes)
    has_text = any(c.startswith('text-') and not c.startswith('text-[') and not c.startswith('text-xs') and not c.startswith('text-sm') and not c.startswith('text-base') and not c.startswith('text-lg') and not c.startswith('text-xl') and not c.startswith('text-2xl') and not c.startswith('text-3xl') for c in classes)
    return has_bg and not has_text


def _extract_bg_from_classes(classes_str: str) -> Optional[str]:
    """Extract the background color from a class string"""
    classes = classes_str.split()
    for c in classes:
        if c.startswith('bg-'):
            color = extract_color_from_class(c)
            if color:
                return color
    return None


def scan_file(file_path: str, max_depth: int = 10) -> List[ContrastIssue]:
    """Scan a single file for contrast issues including inherited backgrounds"""
    issues = []

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {file_path}: {e}", file=sys.stderr)
        return issues

    # Parse the JSX hierarchy
    elements_with_context = parse_jsx_hierarchy(content)

    # Analyze each element with its context
    for element, ancestors in elements_with_context:
        element_issues = analyze_element_with_context(element, ancestors, file_path, max_depth)
        issues.extend(element_issues)

    # Analyze conditional/ternary contrast issues
    conditional_issues = analyze_conditional_contrast(content, file_path)
    issues.extend(conditional_issues)

    return issues


def scan_directory(directory: str, extensions: Set[str] = None, max_depth: int = 10) -> List[ContrastIssue]:
    """Scan a directory recursively for contrast issues"""
    if extensions is None:
        extensions = {'.tsx', '.jsx', '.ts', '.js'}

    all_issues = []
    directory = Path(directory)

    # Skip node_modules and other common directories
    skip_dirs = {'node_modules', '.git', '.next', 'dist', 'build', '.claude'}

    for file_path in directory.rglob('*'):
        if file_path.is_file() and file_path.suffix in extensions:
            # Check if we should skip this path
            if any(skip_dir in file_path.parts for skip_dir in skip_dirs):
                continue

            issues = scan_file(str(file_path), max_depth)
            all_issues.extend(issues)

    return all_issues


def format_issue(issue: ContrastIssue, show_fix: bool = False) -> str:
    """Format a single issue for console output"""
    severity_colors = {
        'error': '\033[91m',    # Red
        'warning': '\033[93m',  # Yellow
        'info': '\033[94m',     # Blue
    }
    reset = '\033[0m'
    bold = '\033[1m'

    color = severity_colors.get(issue.severity, '')

    output = []
    output.append(f"\n{color}{bold}[{issue.severity.upper()}]{reset} {issue.file}:{issue.line}")
    output.append(f"  Type: {issue.issue_type}")
    if issue.bg_color:
        bg_info = f"  Background: {issue.bg_color}"
        if issue.inherited_from_line:
            bg_info += f" (inherited from line {issue.inherited_from_line}, depth: {issue.ancestor_depth})"
        output.append(bg_info)
    if issue.text_color:
        output.append(f"  Text: {issue.text_color}")
    output.append(f"  {color}Suggestion: {issue.suggestion}{reset}")

    if show_fix:
        output.append(f"  Context: {issue.element_snippet}...")

    return '\n'.join(output)


def main():
    parser = argparse.ArgumentParser(
        description='Detect contrast issues in React/Next.js Tailwind projects'
    )
    parser.add_argument('--path', default='.', help='Directory to scan')
    parser.add_argument('--fix', action='store_true', help='Show fix suggestions inline')
    parser.add_argument('--json', action='store_true', help='Output as JSON')
    parser.add_argument('--verbose', action='store_true', help='Show all scanned files')
    parser.add_argument('--severity', choices=['error', 'warning', 'info'],
                       help='Minimum severity to report')
    parser.add_argument('--max-depth', type=int, default=10,
                       help='Maximum ancestor depth to check for inherited backgrounds')

    args = parser.parse_args()

    # Scan the directory
    issues = scan_directory(args.path, max_depth=args.max_depth)

    # Filter by severity
    if args.severity:
        severity_order = {'error': 0, 'warning': 1, 'info': 2}
        min_severity = severity_order[args.severity]
        issues = [i for i in issues if severity_order[i.severity] <= min_severity]

    # Sort issues by severity and file
    severity_order = {'error': 0, 'warning': 1, 'info': 2}
    issues.sort(key=lambda x: (severity_order[x.severity], x.file, x.line))

    # Output results
    if args.json:
        print(json.dumps([asdict(i) for i in issues], indent=2))
    else:
        if not issues:
            print("\n\033[92m✓ No contrast issues detected!\033[0m")
            return 0

        # Group by file
        by_file: Dict[str, List[ContrastIssue]] = {}
        for issue in issues:
            if issue.file not in by_file:
                by_file[issue.file] = []
            by_file[issue.file].append(issue)

        # Summary
        errors = sum(1 for i in issues if i.severity == 'error')
        warnings = sum(1 for i in issues if i.severity == 'warning')
        infos = sum(1 for i in issues if i.severity == 'info')
        inherited = sum(1 for i in issues if i.inherited_from_line is not None)
        dark_mode_issues = sum(1 for i in issues if i.issue_type == 'missing-dark-mode-override')
        low_opacity_issues = sum(1 for i in issues if i.issue_type == 'low-opacity-dark-mode-text')
        state_based_issues = sum(1 for i in issues if i.issue_type in ('state-based-missing-text-color', 'fallback-missing-text-color'))

        print(f"\n{'='*60}")
        print(f"CONTRAST ISSUE REPORT")
        print(f"{'='*60}")
        print(f"Scanned: {args.path}")
        print(f"Issues found: {len(issues)} ({errors} errors, {warnings} warnings, {infos} info)")
        if inherited > 0:
            print(f"Inherited background issues: {inherited}")
        if dark_mode_issues > 0:
            print(f"Missing dark mode overrides: {dark_mode_issues}")
        if low_opacity_issues > 0:
            print(f"Low-opacity dark mode text: {low_opacity_issues}")
        if state_based_issues > 0:
            print(f"State-based contrast issues (ternary/conditional): {state_based_issues}")
        print(f"{'='*60}")

        for file_path, file_issues in by_file.items():
            print(f"\n\033[1m{file_path}\033[0m ({len(file_issues)} issues)")
            for issue in file_issues:
                print(format_issue(issue, args.fix))

        print(f"\n{'='*60}")
        print("Fix priority:")
        print("  1. \033[91mERROR\033[0m - Dark-on-dark or light-on-light text (unreadable)")
        print("     - Includes inherited-* issues where background is from ancestor")
        print("     - Includes missing-dark-mode-override (dark text without dark:text-*)")
        print("     - Includes low-opacity-dark-mode-text (e.g., dark:text-neo-cream/50)")
        print("     - Includes state-based-missing-text-color (ternary with bg but no text)")
        print("     - Includes fallback-missing-text-color (|| fallback with bg but no text)")
        print("  2. \033[93mWARNING\033[0m - Missing explicit foreground color")
        print("  3. \033[94mINFO\033[0m - Potential issues to review")
        print(f"{'='*60}\n")

        return 1 if errors > 0 else 0

    return 0


if __name__ == '__main__':
    sys.exit(main())
