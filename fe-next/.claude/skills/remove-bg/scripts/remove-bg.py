#!/usr/bin/env python3
"""
Remove background from PNG images using rembg.
Supports single files, multiple files, and directory processing.
"""

import argparse
import sys
import os
from pathlib import Path


def check_rembg_installed():
    """Check if rembg is installed, provide installation instructions if not."""
    try:
        from rembg import remove
        return True
    except ImportError:
        print("Error: rembg is not installed.")
        print("\nInstall it with:")
        print("  pip3 install rembg[cli]")
        print("\nOr for GPU acceleration (CUDA):")
        print("  pip3 install rembg[gpu]")
        return False


def remove_background(input_path: str, output_path: str = None, suffix: str = "-nobg") -> bool:
    """
    Remove background from a single image.

    Args:
        input_path: Path to input image
        output_path: Path to output image (optional, will use suffix if not provided)
        suffix: Suffix to add before extension for output file

    Returns:
        True if successful, False otherwise
    """
    from rembg import remove
    from PIL import Image

    input_path = Path(input_path)

    if not input_path.exists():
        print(f"Error: File not found: {input_path}")
        return False

    if not input_path.suffix.lower() in ['.png', '.jpg', '.jpeg', '.webp', '.gif']:
        print(f"Warning: Skipping unsupported file type: {input_path}")
        return False

    # Determine output path
    if output_path:
        out_path = Path(output_path)
    else:
        out_path = input_path.parent / f"{input_path.stem}{suffix}.png"

    try:
        # Read input image
        with Image.open(input_path) as img:
            # Remove background
            output = remove(img)

            # Save result
            output.save(out_path, "PNG")
            print(f"✓ Saved: {out_path}")
            return True

    except Exception as e:
        print(f"Error processing {input_path}: {e}")
        return False


def process_directory(dir_path: str, output_dir: str = None, suffix: str = "-nobg", recursive: bool = False) -> tuple:
    """
    Process all images in a directory.

    Args:
        dir_path: Directory containing images
        output_dir: Output directory (optional, will save alongside originals if not provided)
        suffix: Suffix to add before extension for output files
        recursive: Process subdirectories recursively

    Returns:
        Tuple of (success_count, failure_count)
    """
    dir_path = Path(dir_path)

    if not dir_path.is_dir():
        print(f"Error: Not a directory: {dir_path}")
        return (0, 0)

    if output_dir:
        output_dir = Path(output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)

    # Find all image files
    extensions = ['*.png', '*.jpg', '*.jpeg', '*.webp', '*.gif']
    files = []

    for ext in extensions:
        if recursive:
            files.extend(dir_path.rglob(ext))
            files.extend(dir_path.rglob(ext.upper()))
        else:
            files.extend(dir_path.glob(ext))
            files.extend(dir_path.glob(ext.upper()))

    # Filter out already processed files
    files = [f for f in files if suffix not in f.stem]

    if not files:
        print(f"No image files found in {dir_path}")
        return (0, 0)

    print(f"Found {len(files)} image(s) to process...")

    success = 0
    failure = 0

    for file in files:
        if output_dir:
            # Maintain relative structure in output directory
            rel_path = file.relative_to(dir_path)
            out_path = output_dir / rel_path.parent / f"{file.stem}{suffix}.png"
            out_path.parent.mkdir(parents=True, exist_ok=True)
        else:
            out_path = None

        if remove_background(str(file), str(out_path) if out_path else None, suffix):
            success += 1
        else:
            failure += 1

    return (success, failure)


def main():
    parser = argparse.ArgumentParser(
        description="Remove background from PNG images using AI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Remove background from a single file
  python3 remove-bg.py image.png

  # Process with custom output path
  python3 remove-bg.py image.png -o clean-image.png

  # Process all images in a directory
  python3 remove-bg.py --dir ./images

  # Process directory with custom output location
  python3 remove-bg.py --dir ./raw-images --output-dir ./processed

  # Overwrite original files (use with caution!)
  python3 remove-bg.py image.png --overwrite

  # Process directory recursively
  python3 remove-bg.py --dir ./images --recursive
        """
    )

    parser.add_argument(
        "files",
        nargs="*",
        help="Image file(s) to process"
    )
    parser.add_argument(
        "-d", "--dir",
        help="Directory containing images to process"
    )
    parser.add_argument(
        "-o", "--output",
        help="Output file path (for single file) or directory (with --dir)"
    )
    parser.add_argument(
        "--output-dir",
        help="Output directory for processed images"
    )
    parser.add_argument(
        "-s", "--suffix",
        default="-nobg",
        help="Suffix to add to output filenames (default: -nobg)"
    )
    parser.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite original files instead of creating new ones"
    )
    parser.add_argument(
        "-r", "--recursive",
        action="store_true",
        help="Process directories recursively"
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Check if rembg is installed without processing"
    )

    args = parser.parse_args()

    # Check installation
    if args.check:
        if check_rembg_installed():
            print("✓ rembg is installed and ready")
            sys.exit(0)
        else:
            sys.exit(1)

    if not check_rembg_installed():
        sys.exit(1)

    # Validate arguments
    if not args.files and not args.dir:
        parser.print_help()
        print("\nError: Provide either file(s) or --dir argument")
        sys.exit(1)

    suffix = "" if args.overwrite else args.suffix

    # Process directory
    if args.dir:
        output_dir = args.output_dir or args.output
        success, failure = process_directory(
            args.dir,
            output_dir,
            suffix,
            args.recursive
        )
        print(f"\nCompleted: {success} succeeded, {failure} failed")
        sys.exit(0 if failure == 0 else 1)

    # Process individual files
    success = 0
    failure = 0

    for i, file in enumerate(args.files):
        # Use custom output only for single file
        output = args.output if len(args.files) == 1 else None

        if remove_background(file, output, suffix):
            success += 1
        else:
            failure += 1

    if len(args.files) > 1:
        print(f"\nCompleted: {success} succeeded, {failure} failed")

    sys.exit(0 if failure == 0 else 1)


if __name__ == "__main__":
    main()
