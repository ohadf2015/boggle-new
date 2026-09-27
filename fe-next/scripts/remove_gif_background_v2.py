#!/usr/bin/env python3
"""
Improved GIF background removal with multiple quality enhancement options.

Models available:
- u2net: General purpose (default, but can have rough edges)
- u2netp: Faster, lighter version
- isnet-general-use: Better for illustrations and cartoons
- silueta: Human segmentation optimized
"""

import sys
import os
import io
import shutil
import argparse
from pathlib import Path
from typing import List, Dict, Tuple, Optional

try:
    import imageio.v3 as iio
    import numpy as np
    from PIL import Image
    from rembg import remove, new_session
except ImportError as e:
    print(f"Error: Missing required package: {e}")
    print("Install with: pip install imageio rembg pillow")
    sys.exit(1)


def process_frame(
    frame: np.ndarray,
    frame_num: int,
    total: int,
    session,
    post_process: bool = True
) -> Image.Image:
    """
    Remove background from a single GIF frame with high quality settings.
    """
    print(f"\r   Processing frame {frame_num}/{total}...", end='', flush=True)

    # Convert to PIL Image
    if len(frame.shape) == 2:
        img = Image.fromarray(frame, mode='L').convert('RGB')
    elif frame.shape[2] == 3:
        img = Image.fromarray(frame, mode='RGB')
    elif frame.shape[2] == 4:
        img = Image.fromarray(frame, mode='RGBA')
    else:
        raise ValueError(f"Unsupported frame format: shape {frame.shape}")

    # Convert to bytes
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)

    # Remove background with enhanced quality settings
    output_bytes = remove(
        img_bytes.getvalue(),
        session=session,
        alpha_matting=True,  # Smooth edges
        alpha_matting_foreground_threshold=270,  # Higher = cleaner foreground
        alpha_matting_background_threshold=20,   # Lower = more aggressive removal
        alpha_matting_erode_size=15,  # Larger = smoother edges
        post_process_mask=post_process,  # Additional cleanup
    )

    processed_img = Image.open(io.BytesIO(output_bytes))

    if processed_img.mode != 'RGBA':
        processed_img = processed_img.convert('RGBA')

    # Optional: Additional post-processing to clean edges
    if post_process:
        processed_img = clean_edges(processed_img)

    return processed_img


def clean_edges(img: Image.Image, threshold: int = 10) -> Image.Image:
    """
    Clean up edge artifacts while preserving the main subject.
    Removes only truly transparent pixels and very dark shadow remnants.
    """
    pixels = img.load()
    width, height = img.size

    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]

            # Remove only very transparent pixels (likely background)
            if a < threshold:
                pixels[x, y] = (0, 0, 0, 0)
                continue

            # Only remove very dark pixels that are also quite transparent
            # (likely shadow artifacts, not part of the character)
            brightness = (r + g + b) / 3
            if brightness < 30 and a < 100:  # Very dark AND very transparent
                pixels[x, y] = (0, 0, 0, 0)
                continue

    return img


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


def process_single_frame_test(
    input_path: Path,
    frame_index: int = 0,
    model: str = 'isnet-general-use'
) -> Path:
    """
    Test processing on a single frame for quality check.
    Returns path to test output image.
    """
    print(f"🧪 Testing frame {frame_index} with model: {model}")
    
    # Create session with specified model
    session = new_session(model)
    
    # Extract frames
    frames, _ = extract_gif_frames(input_path)
    
    if frame_index >= len(frames):
        print(f"Error: Frame {frame_index} doesn't exist (only {len(frames)} frames)")
        return None
    
    # Process single frame
    processed = process_frame(frames[frame_index], frame_index + 1, len(frames), session, post_process=True)
    
    # Save test output
    test_output = input_path.parent / f"{input_path.stem}-test-frame{frame_index}.png"
    processed.save(test_output)
    
    print(f"\n✅ Test frame saved: {test_output}")
    print(f"📂 Open this file to verify quality before processing all frames")
    
    return test_output


def process_gif_file(
    input_path: Path,
    output_path: Path,
    model: str = 'isnet-general-use',
    create_backup: bool = True
) -> bool:
    """Process entire GIF file."""
    try:
        # Create backup
        if create_backup:
            backup_path = Path(str(input_path) + '.backup')
            if not backup_path.exists():
                shutil.copy2(input_path, backup_path)
                print(f"💾 Backup created: {backup_path.name}\n")

        print(f"🎬 Processing: {input_path.name}")
        print("=" * 60)

        # Create session with model
        session = new_session(model)
        print(f"🤖 Using model: {model}")

        # Extract frames
        print(f"📖 Reading GIF: {input_path.name}")
        frames, metadata = extract_gif_frames(input_path)
        
        duration = metadata.get('duration', 40)
        print(f"   Frames: {len(frames)}")
        print(f"   Duration: {duration} ms/frame")

        # Process frames
        print(f"🔧 Removing backgrounds from {len(frames)} frames...")
        processed_frames = []
        
        for i, frame in enumerate(frames, start=1):
            processed_frame = process_frame(frame, i, len(frames), session, post_process=True)
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

        if output_size > 0.5:
            print(f"⚠️  Large file. Consider running optimization.")

        print("=" * 60)
        print(f"✅ Success: {output_path.name}\n")

        return True

    except Exception as e:
        print(f"\n❌ Error: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(description='High-quality GIF background removal')
    
    parser.add_argument('input', type=str, help='Input GIF file or directory')
    parser.add_argument('output', type=str, nargs='?', help='Output GIF file')
    parser.add_argument('--model', type=str, default='isnet-anime',
                       choices=['u2net', 'u2netp', 'isnet-general-use', 'isnet-anime', 'silueta'],
                       help='AI model (isnet-anime best for cartoon characters)')
    parser.add_argument('--test-frame', type=int, metavar='N',
                       help='Test single frame N for quality check')
    parser.add_argument('--batch', action='store_true',
                       help='Process all GIFs in directory')
    
    args = parser.parse_args()
    
    input_path = Path(args.input)
    
    if not input_path.exists():
        print(f"Error: {input_path} not found")
        sys.exit(1)
    
    # Test mode
    if args.test_frame is not None:
        if input_path.is_dir():
            gif_files = list(input_path.glob('*.gif'))
            if gif_files:
                process_single_frame_test(gif_files[0], args.test_frame, args.model)
            else:
                print("No GIF files found")
        else:
            process_single_frame_test(input_path, args.test_frame, args.model)
        return
    
    # Batch mode
    if args.batch:
        if not input_path.is_dir():
            print("Error: --batch requires directory")
            sys.exit(1)
        
        gif_files = [f for f in input_path.glob('*.gif') 
                    if not f.stem.endswith('-nobg') and not f.suffix == '.backup']
        
        if not gif_files:
            print("No GIF files found")
            return
        
        print(f"Found {len(gif_files)} GIF file(s)")
        print("=" * 60)
        
        for gif_file in sorted(gif_files):
            output_path = gif_file.parent / f"{gif_file.stem}-nobg.gif"
            if output_path.exists():
                print(f"⊘ Skip (exists): {gif_file.name}")
                continue
            print(f"📝 {gif_file.name} → {output_path.name}")
        
        print("=" * 60)
        print()
        
        for gif_file in sorted(gif_files):
            output_path = gif_file.parent / f"{gif_file.stem}-nobg.gif"
            if output_path.exists():
                continue
            process_gif_file(gif_file, output_path, args.model, create_backup=True)
        
        return
    
    # Single file mode
    if input_path.is_dir():
        print("Error: Provide output filename or use --batch")
        sys.exit(1)
    
    output_path = Path(args.output) if args.output else input_path.parent / f"{input_path.stem}-nobg.gif"
    process_gif_file(input_path, output_path, args.model, create_backup=True)


if __name__ == '__main__':
    main()
