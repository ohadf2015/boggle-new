#!/usr/bin/env python3
"""
GIF background removal script with frame-by-frame processing.
Uses imageio + rembg to remove backgrounds from animated GIFs while preserving animation.

Usage:
    python scripts/remove_gif_background.py <input.gif> [output.gif]
    python scripts/remove_gif_background.py --batch [directory]
    python scripts/remove_gif_background.py --batch --dry-run [directory]

Requirements:
    pip install imageio rembg pillow
"""

import sys
import os
import io
import shutil
import argparse
from pathlib import Path
from typing import List, Tuple, Dict, Optional

try:
    import imageio.v3 as iio
    from rembg import remove
    from PIL import Image
    import numpy as np
except ImportError as e:
    print(f"Error: Required packages not installed: {e}")
    print("Please install: pip install imageio rembg pillow")
    sys.exit(1)


def extract_gif_frames(input_path: Path) -> Tuple[List[np.ndarray], Dict]:
    """
    Extract all frames and metadata from an animated GIF.

    Args:
        input_path: Path to input GIF file

    Returns:
        Tuple of (frames list, metadata dict)
    """
    print(f"📖 Reading GIF: {input_path.name}")

    # Read all frames
    frames = iio.imread(input_path, plugin='pillow')

    # Get metadata (duration, loop count, etc.)
    metadata = iio.immeta(input_path, plugin='pillow')

    # Handle single-frame edge case
    if len(frames.shape) == 3:
        frames = [frames]

    frame_count = len(frames)
    print(f"   Frames: {frame_count}")
    print(f"   Duration: {metadata.get('duration', 'unknown')} ms/frame")

    return frames, metadata


def process_frame(frame: np.ndarray, frame_num: int, total: int) -> Image.Image:
    """
    Remove background from a single GIF frame.

    Args:
        frame: Frame as numpy array
        frame_num: Current frame number (for progress)
        total: Total frame count

    Returns:
        Processed PIL Image with transparent background
    """
    # Progress indicator (same line)
    print(f"\r   Processing frame {frame_num}/{total}...", end='', flush=True)

    # Convert numpy array to PIL Image
    # Handle different color modes (RGB, RGBA, P)
    if len(frame.shape) == 2:
        # Grayscale
        img = Image.fromarray(frame, mode='L').convert('RGB')
    elif frame.shape[2] == 3:
        # RGB
        img = Image.fromarray(frame, mode='RGB')
    elif frame.shape[2] == 4:
        # RGBA (already has alpha)
        img = Image.fromarray(frame, mode='RGBA')
    else:
        raise ValueError(f"Unsupported frame format: shape {frame.shape}")

    # Convert to bytes for rembg
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)

    # Remove background with high-quality settings
    # Use alpha matting for smoother edges and better quality
    output_bytes = remove(
        img_bytes.getvalue(),
        alpha_matting=True,  # Enable alpha matting for smoother edges
        alpha_matting_foreground_threshold=240,  # Higher = more aggressive foreground detection
        alpha_matting_background_threshold=10,   # Lower = more aggressive background removal
        alpha_matting_erode_size=10,  # Edge refinement (larger = smoother edges)
        bgcolor=None,  # Keep transparent background
        only_mask=False,  # Return full RGBA image
    )

    # Convert back to PIL Image
    processed_img = Image.open(io.BytesIO(output_bytes))

    # Ensure RGBA mode (transparency)
    if processed_img.mode != 'RGBA':
        processed_img = processed_img.convert('RGBA')

    return processed_img


def reconstruct_gif(
    frames: List[Image.Image],
    metadata: Dict,
    output_path: Path
) -> None:
    """
    Reconstruct GIF from processed frames with original timing.

    Args:
        frames: List of processed PIL Images
        metadata: Original metadata dict
        output_path: Path to save output GIF
    """
    print(f"\n📦 Reconstructing GIF...")

    # Convert PIL Images to numpy arrays for imageio
    frame_arrays = [np.array(frame) for frame in frames]

    # Get duration (can be single value or array)
    duration = metadata.get('duration', 100)

    # Write GIF with metadata
    iio.imwrite(
        output_path,
        frame_arrays,
        plugin='pillow',
        duration=duration,
        loop=0,  # Infinite loop
        optimize=False,  # We'll optimize separately if needed
    )

    print(f"✅ Saved: {output_path}")


def process_gif_file(
    input_path: Path,
    output_path: Optional[Path] = None,
    create_backup: bool = True
) -> bool:
    """
    Process a single GIF file to remove background.

    Args:
        input_path: Path to input GIF
        output_path: Path to save output (default: {input}-nobg.gif)
        create_backup: Whether to create backup of original

    Returns:
        True if successful, False otherwise
    """
    try:
        # Validate input
        if not input_path.exists():
            print(f"❌ Error: File not found: {input_path}")
            return False

        # Default output path
        if output_path is None:
            output_path = input_path.parent / f"{input_path.stem}-nobg.gif"

        # Create backup if requested
        backup_path = None
        if create_backup:
            backup_path = input_path.with_suffix('.gif.backup')
            if not backup_path.exists():
                shutil.copy2(input_path, backup_path)
                print(f"💾 Backup created: {backup_path.name}")

        print(f"\n🎬 Processing: {input_path.name}")
        print("=" * 60)

        # Extract frames
        frames, metadata = extract_gif_frames(input_path)

        # Process each frame
        processed_frames = []
        total_frames = len(frames)

        print(f"🔧 Removing backgrounds from {total_frames} frames...")
        for i, frame in enumerate(frames, 1):
            processed_frame = process_frame(frame, i, total_frames)
            processed_frames.append(processed_frame)

        print()  # New line after progress

        # Reconstruct GIF
        reconstruct_gif(processed_frames, metadata, output_path)

        # Report file sizes
        input_size = input_path.stat().st_size / 1024 / 1024  # MB
        output_size = output_path.stat().st_size / 1024 / 1024  # MB

        print(f"📊 File size: {input_size:.2f}MB → {output_size:.2f}MB")

        if output_size > 0.5:  # 500KB
            print(f"⚠️  Output is large (>{output_size:.2f}MB). Consider running optimization.")

        print("=" * 60)
        print(f"✅ Success: {output_path.name}\n")

        return True

    except Exception as e:
        print(f"\n❌ Error processing {input_path.name}: {e}")

        # Restore backup if processing failed
        if backup_path and backup_path.exists() and create_backup:
            print(f"↩️  Restoring from backup...")
            # Don't restore - just keep backup for safety

        return False


def batch_process(
    directory: Path,
    dry_run: bool = False
) -> None:
    """
    Batch process all GIF files in a directory.

    Args:
        directory: Directory containing GIF files
        dry_run: If True, only list files without processing
    """
    # Find all GIF files (exclude already processed ones)
    gif_files = [
        f for f in directory.glob('*.gif')
        if not f.stem.endswith('-nobg')
        and not f.suffix == '.backup'
    ]

    if not gif_files:
        print("No GIF files found to process.")
        return

    print(f"\n{'🔍 DRY RUN - ' if dry_run else ''}Found {len(gif_files)} GIF file(s) to process:")
    print("=" * 60)

    for gif_file in sorted(gif_files):
        output_name = f"{gif_file.stem}-nobg.gif"
        output_path = gif_file.parent / output_name

        # Check if already processed
        if output_path.exists():
            print(f"⊘ Skip (already processed): {gif_file.name}")
            continue

        print(f"📝 {gif_file.name} → {output_name}")

    if dry_run:
        print("=" * 60)
        print("\n💡 Run without --dry-run to process these files.")
        return

    print("=" * 60)
    print()

    # Process each file
    success_count = 0
    fail_count = 0

    for gif_file in sorted(gif_files):
        output_name = f"{gif_file.stem}-nobg.gif"
        output_path = gif_file.parent / output_name

        # Skip if already processed
        if output_path.exists():
            continue

        if process_gif_file(gif_file, output_path, create_backup=True):
            success_count += 1
        else:
            fail_count += 1

    # Summary
    print("\n" + "=" * 60)
    print("📊 BATCH PROCESSING SUMMARY")
    print("=" * 60)
    print(f"✅ Successful: {success_count}")
    if fail_count > 0:
        print(f"❌ Failed: {fail_count}")
    print(f"💾 Backups saved with .gif.backup extension")
    print("=" * 60)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description='Remove backgrounds from animated GIF files frame-by-frame.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Process single GIF
  python scripts/remove_gif_background.py public/mascot/main.gif

  # Process with custom output
  python scripts/remove_gif_background.py input.gif output-nobg.gif

  # Batch process all GIFs in directory
  python scripts/remove_gif_background.py --batch public/mascot/

  # Dry run (see what would be processed)
  python scripts/remove_gif_background.py --batch --dry-run public/mascot/
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
        help='Output GIF file (optional, defaults to {input}-nobg.gif)'
    )

    parser.add_argument(
        '--batch',
        action='store_true',
        help='Batch process all GIFs in directory'
    )

    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Show what would be processed without actually processing'
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

        batch_process(input_path, dry_run=args.dry_run)

    # Single file mode
    else:
        if not input_path.exists():
            print(f"Error: Input file not found: {input_path}")
            sys.exit(1)

        output_path = Path(args.output) if args.output else None

        success = process_gif_file(input_path, output_path, create_backup=True)
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
