#!/usr/bin/env python3
"""
Advanced GIF background removal using chromakey with edge smoothing and anti-aliasing.
Works best with solid color backgrounds, optimized for cartoon/illustrated content.

Usage:
    python3 scripts/remove_gif_bg_chromakey_v2.py <input.gif> [output.gif]
    python3 scripts/remove_gif_bg_chromakey_v2.py --batch <directory>
"""

import sys
import os
import argparse
from pathlib import Path
from typing import List, Tuple, Dict

try:
    import imageio.v3 as iio
    from PIL import Image, ImageFilter
    import numpy as np
except ImportError as e:
    print(f"Error: Missing required package: {e}")
    print("Install with: pip install imageio pillow numpy")
    sys.exit(1)


def color_distance(c1: Tuple[int, int, int], c2: Tuple[int, int, int]) -> float:
    """
    Calculate perceptual color distance (weighted for human vision).
    Uses weighted Euclidean distance emphasizing green (human eye sensitivity).
    """
    r_diff = c1[0] - c2[0]
    g_diff = c1[1] - c2[1]
    b_diff = c1[2] - c2[2]

    # Weighted formula closer to human perception
    return (2 * r_diff * r_diff +
            4 * g_diff * g_diff +
            3 * b_diff * b_diff) ** 0.5


def remove_color_advanced(
    frame: np.ndarray,
    target_color: Tuple[int, int, int] = (0, 0, 0),
    tolerance: int = 30,
    feather: int = 10,
    smoothing: bool = True
) -> Image.Image:
    """
    Remove a specific color from a frame with advanced edge smoothing.

    Args:
        frame: Frame as numpy array
        target_color: RGB color to remove (default: black)
        tolerance: Color matching tolerance (0-255)
        feather: Edge feathering amount for smooth transitions
        smoothing: Apply edge smoothing filter

    Returns:
        PIL Image with transparent background
    """
    # Convert to PIL Image
    if len(frame.shape) == 2:
        img = Image.fromarray(frame).convert('RGBA')
    elif frame.shape[2] == 3:
        img = Image.fromarray(frame).convert('RGBA')
    elif frame.shape[2] == 4:
        img = Image.fromarray(frame).convert('RGBA')
    else:
        raise ValueError(f"Unsupported frame format: shape {frame.shape}")

    # Make a copy to ensure writability
    img = img.copy()
    pixels = img.load()
    width, height = img.size

    target_r, target_g, target_b = target_color

    # First pass: Calculate alpha based on color distance with feathering
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]

            # Calculate color distance from target
            dist = color_distance((r, g, b), target_color)

            if dist <= tolerance:
                # Within tolerance: fully transparent
                pixels[x, y] = (r, g, b, 0)
            elif dist <= tolerance + feather:
                # Within feather range: gradient transparency
                # Linear interpolation from transparent to opaque
                alpha_ratio = (dist - tolerance) / feather
                new_alpha = int(255 * alpha_ratio)
                pixels[x, y] = (r, g, b, new_alpha)
            else:
                # Beyond feather range: keep original alpha
                pixels[x, y] = (r, g, b, a)

    # Apply edge smoothing to reduce jaggedness
    if smoothing:
        # Smooth the alpha channel
        img = img.filter(ImageFilter.SMOOTH_MORE)

        # Additional light blur on edges
        img = img.filter(ImageFilter.BoxBlur(radius=0.5))

    return img


def process_frame(
    frame: np.ndarray,
    frame_num: int,
    total: int,
    target_color: Tuple[int, int, int],
    tolerance: int,
    feather: int,
    smoothing: bool
) -> Image.Image:
    """Process a single frame with progress indicator."""
    print(f"\r   Processing frame {frame_num}/{total}...", end='', flush=True)
    return remove_color_advanced(frame, target_color, tolerance, feather, smoothing)


def extract_gif_frames(input_path: Path) -> Tuple[List[np.ndarray], Dict]:
    """Extract all frames and metadata from GIF."""
    frames = []
    properties = iio.improps(input_path)

    for frame in iio.imiter(input_path):
        frames.append(frame)

    metadata = {
        'duration': properties.duration if hasattr(properties, 'duration') else 40,
        'loop': properties.loop if hasattr(properties, 'loop') else 0,
    }

    return frames, metadata


def reconstruct_gif(
    frames: List[Image.Image],
    metadata: Dict,
    output_path: Path
) -> None:
    """Reconstruct GIF from processed frames."""
    # Convert PIL Images to numpy arrays
    frame_arrays = [np.array(frame) for frame in frames]

    duration_ms = metadata.get('duration', 40)
    loop = metadata.get('loop', 0)

    iio.imwrite(
        output_path,
        frame_arrays,
        duration=duration_ms,
        loop=loop,
    )


def process_gif_file(
    input_path: Path,
    output_path: Path,
    target_color: Tuple[int, int, int] = (0, 0, 0),
    tolerance: int = 30,
    feather: int = 10,
    smoothing: bool = True
) -> bool:
    """
    Process a single GIF file to remove background color with advanced edge handling.

    Args:
        input_path: Path to input GIF
        output_path: Path to save output
        target_color: RGB color to remove (default: black)
        tolerance: Color matching tolerance (default: 30)
        feather: Edge feathering amount (default: 10)
        smoothing: Apply edge smoothing (default: True)

    Returns:
        True if successful, False otherwise
    """
    try:
        print(f"\n🎬 Processing: {input_path.name}")
        print("=" * 60)
        print(f"🎨 Target color: RGB{target_color}")
        print(f"📏 Tolerance: {tolerance} | Feather: {feather}")
        print(f"✨ Smoothing: {'enabled' if smoothing else 'disabled'}")

        # Extract frames
        print(f"📖 Reading GIF: {input_path.name}")
        frames, metadata = extract_gif_frames(input_path)

        duration = metadata.get('duration', 40)
        print(f"   Frames: {len(frames)}")
        print(f"   Duration: {duration} ms/frame")

        # Process frames
        print(f"🔧 Removing background from {len(frames)} frames...")
        processed_frames = []

        for i, frame in enumerate(frames, start=1):
            processed_frame = process_frame(
                frame, i, len(frames), target_color, tolerance, feather, smoothing
            )
            processed_frames.append(processed_frame)

        print()  # New line after progress

        # Reconstruct GIF
        print("📦 Reconstructing GIF...")
        reconstruct_gif(processed_frames, metadata, output_path)

        # Report sizes
        input_size = input_path.stat().st_size / 1024 / 1024
        output_size = output_path.stat().st_size / 1024 / 1024

        print(f"✅ Saved: {output_path.name}")
        print(f"📊 File size: {input_size:.2f}MB → {output_size:.2f}MB")

        print("=" * 60)
        print(f"✅ Success: {output_path.name}\n")

        return True

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        return False


def batch_process(
    directory: Path,
    target_color: Tuple[int, int, int],
    tolerance: int,
    feather: int,
    smoothing: bool
) -> None:
    """Batch process all GIF files in a directory."""
    # Find all GIF files (exclude already processed ones)
    gif_files = [
        f for f in directory.glob('*.gif')
        if not f.stem.endswith('-nobg')
        and not f.suffix == '.backup'
    ]

    if not gif_files:
        print("No GIF files found to process.")
        return

    print(f"\nFound {len(gif_files)} GIF file(s)")
    print("=" * 60)

    for gif_file in sorted(gif_files):
        output_name = f"{gif_file.stem}-nobg.gif"
        output_path = gif_file.parent / output_name

        if output_path.exists():
            print(f"⊘ Skip (exists): {gif_file.name}")
            continue

        print(f"📝 {gif_file.name} → {output_name}")

    print("=" * 60)
    print()

    # Process each file
    success_count = 0
    fail_count = 0

    for gif_file in sorted(gif_files):
        output_name = f"{gif_file.stem}-nobg.gif"
        output_path = gif_file.parent / output_name

        if output_path.exists():
            continue

        if process_gif_file(
            gif_file, output_path, target_color, tolerance, feather, smoothing
        ):
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
    print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description='Advanced GIF background removal with edge smoothing and anti-aliasing.',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Remove black background with default settings
  python3 scripts/remove_gif_bg_chromakey_v2.py public/mascot/main.gif

  # Custom tolerance and feathering
  python3 scripts/remove_gif_bg_chromakey_v2.py input.gif output.gif --tolerance 40 --feather 15

  # Batch process all GIFs
  python3 scripts/remove_gif_bg_chromakey_v2.py --batch public/mascot/

  # Remove white background with no smoothing
  python3 scripts/remove_gif_bg_chromakey_v2.py input.gif --color 255 255 255 --no-smoothing
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
        '--color',
        nargs=3,
        type=int,
        metavar=('R', 'G', 'B'),
        default=[0, 0, 0],
        help='Target color to remove (default: 0 0 0 for black)'
    )

    parser.add_argument(
        '--tolerance',
        type=int,
        default=30,
        help='Color matching tolerance 0-255 (default: 30)'
    )

    parser.add_argument(
        '--feather',
        type=int,
        default=10,
        help='Edge feathering amount 0-50 (default: 10)'
    )

    parser.add_argument(
        '--no-smoothing',
        action='store_true',
        help='Disable edge smoothing filter'
    )

    args = parser.parse_args()

    # Validate arguments
    if not args.input:
        parser.print_help()
        sys.exit(1)

    input_path = Path(args.input)
    target_color = tuple(args.color)
    smoothing = not args.no_smoothing

    # Batch mode
    if args.batch:
        if not input_path.exists():
            input_path = Path(__file__).parent.parent / 'public' / 'mascot'

        if not input_path.is_dir():
            print(f"Error: {input_path} is not a directory")
            sys.exit(1)

        batch_process(input_path, target_color, args.tolerance, args.feather, smoothing)

    # Single file mode
    else:
        if not input_path.exists():
            print(f"Error: Input file not found: {input_path}")
            sys.exit(1)

        output_path = (
            Path(args.output) if args.output
            else input_path.parent / f"{input_path.stem}-nobg.gif"
        )

        success = process_gif_file(
            input_path, output_path, target_color, args.tolerance, args.feather, smoothing
        )
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
