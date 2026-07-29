#!/usr/bin/env python3
"""
Smart GIF background removal that only removes OUTER background.
Preserves inner black pixels (eyes, outlines) using flood fill from edges.

Usage:
    python3 scripts/remove_gif_bg_smart.py <input.gif> [output.gif]
    python3 scripts/remove_gif_bg_smart.py --batch <directory>
"""

import sys
import os
import argparse
from pathlib import Path
from typing import List, Tuple, Dict, Set

try:
    import imageio.v3 as iio
    from PIL import Image
    import numpy as np
except ImportError as e:
    print(f"Error: Missing required package: {e}")
    print("Install with: pip install imageio pillow numpy")
    sys.exit(1)


def flood_fill_edges(
    img: Image.Image,
    target_color: Tuple[int, int, int],
    tolerance: int
) -> Set[Tuple[int, int]]:
    """
    Find all pixels connected to edges that match target color.
    This identifies OUTER background only, preserving INNER pixels.
    """
    pixels = img.load()
    width, height = img.size
    visited = set()
    to_remove = set()

    def color_matches(pos: Tuple[int, int]) -> bool:
        """Check if pixel color matches target within tolerance."""
        if pos in visited:
            return False
        x, y = pos
        if x < 0 or x >= width or y < 0 or y >= height:
            return False

        r, g, b = pixels[x, y][:3]
        target_r, target_g, target_b = target_color

        distance = (
            abs(r - target_r) +
            abs(g - target_g) +
            abs(b - target_b)
        )

        return distance <= tolerance

    def flood_fill(start_x: int, start_y: int):
        """Flood fill from a starting position."""
        stack = [(start_x, start_y)]

        while stack:
            x, y = stack.pop()

            if (x, y) in visited:
                continue
            if not color_matches((x, y)):
                continue

            visited.add((x, y))
            to_remove.add((x, y))

            # Check 4 neighbors (up, down, left, right)
            for dx, dy in [(0, 1), (0, -1), (1, 0), (-1, 0)]:
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    if (nx, ny) not in visited:
                        stack.append((nx, ny))

    # Start flood fill from all edges
    # Top and bottom edges
    for x in range(width):
        if color_matches((x, 0)):
            flood_fill(x, 0)
        if color_matches((x, height - 1)):
            flood_fill(x, height - 1)

    # Left and right edges
    for y in range(height):
        if color_matches((0, y)):
            flood_fill(0, y)
        if color_matches((width - 1, y)):
            flood_fill(width - 1, y)

    return to_remove


def remove_outer_background(
    frame: np.ndarray,
    target_color: Tuple[int, int, int] = (0, 0, 0),
    tolerance: int = 40
) -> Image.Image:
    """
    Remove only OUTER background, preserving INNER black pixels.

    Args:
        frame: Frame as numpy array
        target_color: RGB color to remove (default: black)
        tolerance: Color matching tolerance (0-255)

    Returns:
        PIL Image with outer background transparent
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

    # Make a copy
    img = img.copy()

    # Find outer background pixels using flood fill
    pixels_to_remove = flood_fill_edges(img, target_color, tolerance)

    # Remove only outer background pixels
    pixels = img.load()
    for x, y in pixels_to_remove:
        r, g, b, a = pixels[x, y]
        pixels[x, y] = (0, 0, 0, 0)  # Fully transparent

    # Make all other pixels fully opaque (binary transparency)
    width, height = img.size
    for y in range(height):
        for x in range(width):
            if (x, y) not in pixels_to_remove:
                r, g, b, a = pixels[x, y]
                pixels[x, y] = (r, g, b, 255)  # Fully opaque

    return img


def process_frame(
    frame: np.ndarray,
    frame_num: int,
    total: int,
    target_color: Tuple[int, int, int],
    tolerance: int
) -> Image.Image:
    """Process a single frame with progress indicator."""
    print(f"\r   Processing frame {frame_num}/{total}...", end='', flush=True)
    return remove_outer_background(frame, target_color, tolerance)


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
    """Reconstruct GIF from processed frames with proper disposal."""
    # Convert PIL Images to numpy arrays
    frame_arrays = [np.array(frame) for frame in frames]

    duration_ms = metadata.get('duration', 40)
    loop = metadata.get('loop', 0)

    # Write with disposal=2 to clear frame before next (prevents trails)
    iio.imwrite(
        output_path,
        frame_arrays,
        duration=duration_ms,
        loop=loop,
        disposal=2,  # Clear to background before rendering next frame
    )


def process_gif_file(
    input_path: Path,
    output_path: Path,
    target_color: Tuple[int, int, int] = (0, 0, 0),
    tolerance: int = 40
) -> bool:
    """
    Process a single GIF file removing only outer background.

    Args:
        input_path: Path to input GIF
        output_path: Path to save output
        target_color: RGB color to remove (default: black)
        tolerance: Color matching tolerance (default: 40)

    Returns:
        True if successful, False otherwise
    """
    try:
        print(f"\n🎬 Processing: {input_path.name}")
        print("=" * 60)
        print(f"🎨 Target color: RGB{target_color}")
        print(f"📏 Tolerance: {tolerance}")
        print(f"✨ Mode: Smart (outer background only)")

        # Extract frames
        print(f"📖 Reading GIF: {input_path.name}")
        frames, metadata = extract_gif_frames(input_path)

        duration = metadata.get('duration', 40)
        print(f"   Frames: {len(frames)}")
        print(f"   Duration: {duration} ms/frame")

        # Process frames
        print(f"🔧 Removing outer background from {len(frames)} frames...")
        processed_frames = []

        for i, frame in enumerate(frames, start=1):
            processed_frame = process_frame(
                frame, i, len(frames), target_color, tolerance
            )
            processed_frames.append(processed_frame)

        print()  # New line after progress

        # Reconstruct GIF
        print("📦 Reconstructing GIF with disposal=2 (no trails)...")
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
    tolerance: int
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

        if process_gif_file(gif_file, output_path, target_color, tolerance):
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
        description='Smart GIF background removal (outer only, preserves inner black pixels).',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Remove outer black background only
  python3 scripts/remove_gif_bg_smart.py public/mascot/main.gif

  # Custom tolerance
  python3 scripts/remove_gif_bg_smart.py input.gif output.gif --tolerance 50

  # Batch process all GIFs
  python3 scripts/remove_gif_bg_smart.py --batch public/mascot/
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
        default=40,
        help='Color matching tolerance 0-255 (default: 40)'
    )

    args = parser.parse_args()

    # Validate arguments
    if not args.input:
        parser.print_help()
        sys.exit(1)

    input_path = Path(args.input)
    target_color = tuple(args.color)

    # Batch mode
    if args.batch:
        if not input_path.exists():
            input_path = Path(__file__).parent.parent / 'public' / 'mascot'

        if not input_path.is_dir():
            print(f"Error: {input_path} is not a directory")
            sys.exit(1)

        batch_process(input_path, target_color, args.tolerance)

    # Single file mode
    else:
        if not input_path.exists():
            print(f"Error: Input file not found: {input_path}")
            sys.exit(1)

        output_path = (
            Path(args.output) if args.output
            else input_path.parent / f"{input_path.stem}-nobg.gif"
        )

        success = process_gif_file(input_path, output_path, target_color, args.tolerance)
        sys.exit(0 if success else 1)


if __name__ == '__main__':
    main()
