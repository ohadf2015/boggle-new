#!/usr/bin/env python3
"""
GIF optimization script for reducing file sizes of processed GIFs.
Uses gifsicle (if available) or Pillow optimization.

Usage:
    python scripts/optimize_processed_gifs.py <input.gif> [output.gif]
    python scripts/optimize_processed_gifs.py --batch [directory]

Requirements:
    pip install pillow
    brew install gifsicle  # Optional but recommended for better compression
"""

import sys
import os
import subprocess
import shutil
from pathlib import Path
from typing import Optional
import argparse

try:
    from PIL import Image
except ImportError:
    print("Error: Pillow not installed.")
    print("Please install: pip install pillow")
    sys.exit(1)


def check_gifsicle_available() -> bool:
    """Check if gifsicle is installed and available."""
    try:
        subprocess.run(
            ['gifsicle', '--version'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def optimize_with_gifsicle(
    input_path: Path,
    output_path: Path,
    lossy: int = 80
) -> bool:
    """
    Optimize GIF using gifsicle (best compression).

    Args:
        input_path: Input GIF file
        output_path: Output GIF file
        lossy: Lossy compression level (0-200, 80 is good balance)

    Returns:
        True if successful, False otherwise
    """
    try:
        cmd = [
            'gifsicle',
            '-O3',  # Optimization level 3 (maximum)
            f'--lossy={lossy}',
            str(input_path),
            '-o', str(output_path)
        ]

        result = subprocess.run(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            check=True
        )

        return True

    except subprocess.CalledProcessError as e:
        print(f"   ❌ gifsicle error: {e.stderr.decode()}")
        return False


def optimize_with_pillow(
    input_path: Path,
    output_path: Path
) -> bool:
    """
    Optimize GIF using Pillow (fallback, less effective than gifsicle).

    Args:
        input_path: Input GIF file
        output_path: Output GIF file

    Returns:
        True if successful, False otherwise
    """
    try:
        # Open GIF
        img = Image.open(input_path)

        # Save with optimization
        img.save(
            output_path,
            save_all=True,
            optimize=True,
            quality=85
        )

        return True

    except Exception as e:
        print(f"   ❌ Pillow error: {e}")
        return False


def optimize_gif(
    input_path: Path,
    output_path: Optional[Path] = None,
    use_gifsicle: bool = True,
    lossy: int = 80
) -> bool:
    """
    Optimize a GIF file to reduce file size.

    Args:
        input_path: Input GIF file
        output_path: Output GIF file (defaults to overwriting input)
        use_gifsicle: Whether to try gifsicle first
        lossy: Lossy compression level for gifsicle

    Returns:
        True if successful, False otherwise
    """
    # Validate input
    if not input_path.exists():
        print(f"❌ Error: File not found: {input_path}")
        return False

    # Default output (overwrite input)
    if output_path is None:
        # Create temp file for optimization
        output_path = input_path.with_suffix('.gif.tmp')
        overwrite = True
    else:
        overwrite = False

    print(f"\n🔧 Optimizing: {input_path.name}")

    # Get original size
    original_size = input_path.stat().st_size / 1024  # KB

    # Try gifsicle first (better compression)
    success = False

    if use_gifsicle and check_gifsicle_available():
        print(f"   Using gifsicle (lossy={lossy})...")
        success = optimize_with_gifsicle(input_path, output_path, lossy)

    # Fallback to Pillow if gifsicle unavailable or failed
    if not success:
        if use_gifsicle:
            print(f"   ⚠️  gifsicle not available, using Pillow (less effective)...")
        else:
            print(f"   Using Pillow optimization...")

        success = optimize_with_pillow(input_path, output_path)

    if not success:
        return False

    # Get optimized size
    optimized_size = output_path.stat().st_size / 1024  # KB
    savings = ((original_size - optimized_size) / original_size) * 100

    print(f"   📊 {original_size:.1f}KB → {optimized_size:.1f}KB ({savings:.1f}% reduction)")

    # Check if optimization was beneficial
    if optimized_size >= original_size:
        print(f"   ⚠️  No size reduction achieved")
        if overwrite and output_path.exists():
            output_path.unlink()  # Remove temp file
        return False

    # Overwrite original if that was the goal
    if overwrite:
        output_path.replace(input_path)
        print(f"   ✅ Optimized in-place")
    else:
        print(f"   ✅ Saved: {output_path.name}")

    # Warn if still large
    if optimized_size > 500:  # 500KB
        print(f"   ⚠️  Still large ({optimized_size:.1f}KB). Consider increasing lossy compression.")

    return True


def batch_optimize(
    directory: Path,
    pattern: str = '*-nobg.gif',
    lossy: int = 80
) -> None:
    """
    Batch optimize all matching GIF files in a directory.

    Args:
        directory: Directory containing GIF files
        pattern: Glob pattern for matching files
        lossy: Lossy compression level for gifsicle
    """
    # Find matching GIF files
    gif_files = list(directory.glob(pattern))

    if not gif_files:
        print(f"No files matching '{pattern}' found in {directory}")
        return

    print(f"\n🎬 Found {len(gif_files)} GIF file(s) to optimize:")
    print("=" * 60)

    for gif_file in sorted(gif_files):
        print(f"📝 {gif_file.name}")

    print("=" * 60)

    # Check tools
    has_gifsicle = check_gifsicle_available()
    if has_gifsicle:
        print("✅ gifsicle available (using lossy compression)")
    else:
        print("⚠️  gifsicle not available (using Pillow - less effective)")
        print("   Install with: brew install gifsicle  # macOS")

    print()

    # Optimize each file
    success_count = 0
    fail_count = 0

    for gif_file in sorted(gif_files):
        if optimize_gif(gif_file, use_gifsicle=has_gifsicle, lossy=lossy):
            success_count += 1
        else:
            fail_count += 1

    # Summary
    print("\n" + "=" * 60)
    print("📊 OPTIMIZATION SUMMARY")
    print("=" * 60)
    print(f"✅ Successful: {success_count}")
    if fail_count > 0:
        print(f"❌ Failed: {fail_count}")
    print("=" * 60)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Optimize GIF files to reduce file size.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Optimize single GIF
  python scripts/optimize_processed_gifs.py public/mascot/main-nobg.gif

  # Optimize with custom output
  python scripts/optimize_processed_gifs.py input.gif output-optimized.gif

  # Batch optimize all processed GIFs
  python scripts/optimize_processed_gifs.py --batch public/mascot/

  # Custom lossy compression level (higher = more compression)
  python scripts/optimize_processed_gifs.py --batch --lossy 100 public/mascot/
        """
    )

    parser.add_argument(
        'input',
        nargs='?',
        help='Input GIF file or directory (with --batch)'
    )

    parser.add_argument(
        'output',
        nargs='?',
        help='Output GIF file (optional, defaults to overwriting input)'
    )

    parser.add_argument(
        '--batch',
        action='store_true',
        help='Batch optimize all *-nobg.gif files in directory'
    )

    parser.add_argument(
        '--lossy',
        type=int,
        default=80,
        help='Lossy compression level for gifsicle (0-200, default: 80)'
    )

    parser.add_argument(
        '--pattern',
        default='*-nobg.gif',
        help='Glob pattern for batch mode (default: *-nobg.gif)'
    )

    args = parser.parse_args()

    # Validate arguments
    if not args.input:
        parser.print_help()
        sys.exit(1)

    input_path = Path(args.input)

    # Batch mode
    if args.batch:
        if not input_path.exists():
            # Default to public/mascot if no path specified
            input_path = Path(__file__).parent.parent / 'public' / 'mascot'

        if not input_path.is_dir():
            print(f"Error: {input_path} is not a directory")
            sys.exit(1)

        batch_optimize(input_path, pattern=args.pattern, lossy=args.lossy)

    # Single file mode
    else:
        if not input_path.exists():
            print(f"Error: Input file not found: {input_path}")
            sys.exit(1)

        output_path = Path(args.output) if args.output else None

        has_gifsicle = check_gifsicle_available()
        success = optimize_gif(
            input_path,
            output_path,
            use_gifsicle=has_gifsicle,
            lossy=args.lossy
        )

        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
