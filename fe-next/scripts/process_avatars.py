#!/usr/bin/env python3
"""
Avatar Background Processing Script
Removes backgrounds from avatar images and adds cool neo-brutalist backgrounds.
"""

import os
import sys
from pathlib import Path

try:
    from PIL import Image, ImageDraw, ImageFilter
    from rembg import remove
    import numpy as np
except ImportError:
    print("Installing required packages...")
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "pillow", "rembg", "numpy"])
    from PIL import Image, ImageDraw, ImageFilter
    from rembg import remove
    import numpy as np


# Neo-brutalist color palette from the design system
BACKGROUNDS = [
    # Gradient backgrounds (start_color, end_color, name)
    {"type": "gradient", "colors": ["#FF6B35", "#FFE135"], "name": "sunset"},  # orange to yellow
    {"type": "gradient", "colors": ["#FF1493", "#FF6B35"], "name": "hot"},  # pink to orange
    {"type": "gradient", "colors": ["#00FFFF", "#FF1493"], "name": "cyber"},  # cyan to pink
    {"type": "gradient", "colors": ["#FFE135", "#00FFFF"], "name": "electric"},  # yellow to cyan
    {"type": "gradient", "colors": ["#9B59B6", "#FF1493"], "name": "purple_pink"},  # purple to pink
    {"type": "gradient", "colors": ["#00FFFF", "#39FF14"], "name": "neon"},  # cyan to lime
    {"type": "solid", "color": "#FF6B35", "name": "orange"},  # solid orange
    {"type": "solid", "color": "#FF1493", "name": "pink"},  # solid pink
    {"type": "solid", "color": "#00FFFF", "name": "cyan"},  # solid cyan
    {"type": "solid", "color": "#FFE135", "name": "yellow"},  # solid yellow
    {"type": "solid", "color": "#9B59B6", "name": "purple"},  # solid purple
    {"type": "solid", "color": "#39FF14", "name": "lime"},  # solid lime
    {"type": "radial", "colors": ["#FFE135", "#FF6B35"], "name": "radial_warm"},
    {"type": "radial", "colors": ["#00FFFF", "#9B59B6"], "name": "radial_cool"},
    {"type": "radial", "colors": ["#FF1493", "#1a1a2e"], "name": "radial_pink"},
    {"type": "halftone", "bg": "#1a1a2e", "dot": "#FF6B35", "name": "halftone_orange"},
    {"type": "halftone", "bg": "#FF6B35", "dot": "#1a1a2e", "name": "halftone_dark"},
]


def hex_to_rgb(hex_color: str) -> tuple:
    """Convert hex color to RGB tuple."""
    hex_color = hex_color.lstrip('#')
    return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))


def create_gradient_background(size: tuple, color1: str, color2: str, direction: str = "diagonal") -> Image.Image:
    """Create a gradient background."""
    width, height = size
    img = Image.new('RGBA', size)
    draw = ImageDraw.Draw(img)

    c1 = hex_to_rgb(color1)
    c2 = hex_to_rgb(color2)

    for y in range(height):
        for x in range(width):
            if direction == "diagonal":
                ratio = (x + y) / (width + height)
            elif direction == "horizontal":
                ratio = x / width
            else:  # vertical
                ratio = y / height

            r = int(c1[0] + (c2[0] - c1[0]) * ratio)
            g = int(c1[1] + (c2[1] - c1[1]) * ratio)
            b = int(c1[2] + (c2[2] - c1[2]) * ratio)

            draw.point((x, y), fill=(r, g, b, 255))

    return img


def create_radial_gradient(size: tuple, color1: str, color2: str) -> Image.Image:
    """Create a radial gradient background."""
    width, height = size
    img = Image.new('RGBA', size)

    c1 = hex_to_rgb(color1)
    c2 = hex_to_rgb(color2)

    center_x, center_y = width // 2, height // 2
    max_dist = ((width/2)**2 + (height/2)**2) ** 0.5

    pixels = img.load()
    for y in range(height):
        for x in range(width):
            dist = ((x - center_x)**2 + (y - center_y)**2) ** 0.5
            ratio = min(dist / max_dist, 1.0)

            r = int(c1[0] + (c2[0] - c1[0]) * ratio)
            g = int(c1[1] + (c2[1] - c1[1]) * ratio)
            b = int(c1[2] + (c2[2] - c1[2]) * ratio)

            pixels[x, y] = (r, g, b, 255)

    return img


def create_halftone_background(size: tuple, bg_color: str, dot_color: str, dot_size: int = 8, spacing: int = 16) -> Image.Image:
    """Create a halftone dot pattern background."""
    width, height = size
    img = Image.new('RGBA', size, hex_to_rgb(bg_color) + (255,))
    draw = ImageDraw.Draw(img)

    dot_rgb = hex_to_rgb(dot_color) + (180,)  # Semi-transparent dots

    for y in range(0, height + spacing, spacing):
        offset = (spacing // 2) if (y // spacing) % 2 else 0
        for x in range(offset, width + spacing, spacing):
            draw.ellipse([x - dot_size//2, y - dot_size//2,
                         x + dot_size//2, y + dot_size//2],
                        fill=dot_rgb)

    return img


def create_background(size: tuple, bg_config: dict) -> Image.Image:
    """Create a background based on configuration."""
    bg_type = bg_config["type"]

    if bg_type == "gradient":
        return create_gradient_background(size, bg_config["colors"][0], bg_config["colors"][1])
    elif bg_type == "solid":
        return Image.new('RGBA', size, hex_to_rgb(bg_config["color"]) + (255,))
    elif bg_type == "radial":
        return create_radial_gradient(size, bg_config["colors"][0], bg_config["colors"][1])
    elif bg_type == "halftone":
        return create_halftone_background(size, bg_config["bg"], bg_config["dot"])

    return Image.new('RGBA', size, (255, 255, 255, 255))


def add_neo_shadow(img: Image.Image, offset: int = 6, color: tuple = (0, 0, 0, 200)) -> Image.Image:
    """Add a neo-brutalist hard shadow to the image."""
    # Create a new image with space for shadow
    new_size = (img.width + offset + 4, img.height + offset + 4)
    result = Image.new('RGBA', new_size, (0, 0, 0, 0))

    # Create shadow by using the alpha channel
    if img.mode == 'RGBA':
        alpha = img.split()[3]
        shadow = Image.new('RGBA', img.size, color)
        shadow.putalpha(alpha)

        # Paste shadow offset
        result.paste(shadow, (offset + 2, offset + 2))

    # Paste original image
    result.paste(img, (2, 2), img if img.mode == 'RGBA' else None)

    return result


def process_avatar(input_path: Path, output_dir: Path, bg_index: int = 0) -> Path:
    """Process a single avatar: remove background and add new one."""
    print(f"Processing: {input_path.name}")

    # Read image
    with open(input_path, 'rb') as f:
        input_data = f.read()

    # Remove background
    output_data = remove(input_data)

    # Convert to PIL Image
    from io import BytesIO
    img = Image.open(BytesIO(output_data)).convert('RGBA')

    # Resize to consistent size (512x512)
    target_size = (512, 512)

    # Calculate scaling to fit while maintaining aspect ratio
    ratio = min(target_size[0] / img.width, target_size[1] / img.height) * 0.85
    new_size = (int(img.width * ratio), int(img.height * ratio))
    img = img.resize(new_size, Image.Resampling.LANCZOS)

    # Get background config (cycle through backgrounds)
    bg_config = BACKGROUNDS[bg_index % len(BACKGROUNDS)]

    # Create background
    background = create_background(target_size, bg_config)

    # Center the avatar on background
    x_offset = (target_size[0] - img.width) // 2
    y_offset = (target_size[1] - img.height) // 2

    # Add shadow to avatar
    img_with_shadow = add_neo_shadow(img, offset=8, color=(0, 0, 0, 180))

    # Adjust offset for shadow
    x_offset = (target_size[0] - img_with_shadow.width) // 2
    y_offset = (target_size[1] - img_with_shadow.height) // 2

    # Composite
    background.paste(img_with_shadow, (x_offset, y_offset), img_with_shadow)

    # Save result
    output_path = output_dir / input_path.name
    background.save(output_path, 'PNG', optimize=True)

    print(f"  -> Saved: {output_path.name} (bg: {bg_config['name']})")
    return output_path


def main():
    # Paths
    script_dir = Path(__file__).parent
    project_root = script_dir.parent
    avatars_dir = project_root / "public" / "avatars"
    output_dir = avatars_dir  # Overwrite originals (backup first!)
    backup_dir = avatars_dir / "backup_originals"

    # Create backup directory
    backup_dir.mkdir(exist_ok=True)

    # Find all avatar images
    avatar_files = list(avatars_dir.glob("*.png"))
    avatar_files = [f for f in avatar_files if f.is_file() and f.name != "backup_originals"]

    if not avatar_files:
        print("No avatar images found!")
        return

    print(f"Found {len(avatar_files)} avatar images")
    print(f"Backing up originals to: {backup_dir}")
    print("-" * 50)

    # Process each avatar
    for i, avatar_path in enumerate(sorted(avatar_files)):
        # Backup original
        backup_path = backup_dir / avatar_path.name
        if not backup_path.exists():
            import shutil
            shutil.copy(avatar_path, backup_path)
            print(f"Backed up: {avatar_path.name}")

        # Process with a unique background for each
        process_avatar(avatar_path, output_dir, bg_index=i)

    print("-" * 50)
    print(f"Done! Processed {len(avatar_files)} avatars.")
    print(f"Originals backed up to: {backup_dir}")


if __name__ == "__main__":
    main()
