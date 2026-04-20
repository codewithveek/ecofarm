#!/usr/bin/env python3
"""
resize_sprites.py — EcoFarm sprite resizer
==========================================
Resizes AI-generated tree sprites to the correct game dimensions.
Requires ONLY Python 3 + Pillow (pip install Pillow).
No Photoshop, no GIMP, no paid tools needed.

USAGE
─────
1. Put all your AI-generated images into a folder called  input_sprites/
   They can be any size — 512×768, 1024×1536, whatever the AI gave you.

2. Run:
     python3 resize_sprites.py

3. Find your resized sprites in  output_sprites/
   Each one will be exactly 128×192px, nearest-neighbor scaled,
   with a transparent background (black removed).

WHAT THIS SCRIPT DOES
─────────────────────
  ✓ Nearest-neighbor resize (preserves pixel art crispness)
  ✗ NOT bicubic / NOT lanczos (those blur pixel art — never use them)
  ✓ Removes the black background → transparent PNG
  ✓ Centres the sprite if it's not already filling the frame
  ✓ Batch-processes an entire folder at once
  ✓ Generates a preview contact sheet so you can see all sprites together

TARGET SIZE: 128px wide × 192px tall per sprite

NAMING CONVENTION (rename your files before running):
  mango_seed.png
  mango_seedling.png
  mango_sapling.png
  mango_young.png
  mango_mature.png
  mango_harvestable.png
  coconut_seed.png
  coconut_seedling.png
  ... etc.
"""

from PIL import Image
import os, sys

# ── Config ────────────────────────────────────────────────────────────
TARGET_W   = 128
TARGET_H   = 192
INPUT_DIR  = "input_sprites"
OUTPUT_DIR = "output_sprites"

# Black-removal threshold: pixels where R+G+B < this are treated as bg.
# Increase if your sprites have dark areas being accidentally removed.
# Decrease if you see leftover dark fringe around sprites.
BLACK_THRESHOLD = 40
# ──────────────────────────────────────────────────────────────────────


def remove_black_background(img: Image.Image, threshold: int = 40) -> Image.Image:
    """
    Converts pure/near-black pixels to transparent.
    Works on the original AI output (no transparency) by checking
    whether each pixel's R+G+B sum is below the threshold.

    For pixel art with dark-colored areas (e.g. dark trunk shadow),
    raise threshold slightly, then manually touch up any holes.
    """
    img = img.convert("RGBA")
    data = list(img.getdata())
    new_data = []
    for r, g, b, a in data:
        if r + g + b < threshold:
            new_data.append((0, 0, 0, 0))     # fully transparent
        else:
            new_data.append((r, g, b, 255))   # keep pixel, fully opaque
    img.putdata(new_data)
    return img


def resize_nearest(img: Image.Image, w: int, h: int) -> Image.Image:
    """
    Resize using NEAREST NEIGHBOUR — the only correct method for pixel art.
    Bicubic/lanczos introduce blurring that destroys the pixel art look.
    """
    try:
        # Pillow 9.1+ uses Image.Resampling enum
        return img.resize((w, h), Image.Resampling.NEAREST)
    except AttributeError:
        # Older Pillow uses the integer constant
        return img.resize((w, h), Image.NEAREST)


def find_content_bbox(img: Image.Image, threshold: int = 40):
    """
    Find the bounding box of non-black content in the image.
    Returns (left, top, right, bottom) or None if image is all black.
    """
    rgb = img.convert("RGB")
    pixels = rgb.load()
    w, h = rgb.size
    min_x, min_y = w, h
    max_x, max_y = 0, 0
    found = False
    for y in range(h):
        for x in range(w):
            r, g, b = pixels[x, y]
            if r + g + b >= threshold:
                min_x = min(min_x, x)
                min_y = min(min_y, y)
                max_x = max(max_x, x)
                max_y = max(max_y, y)
                found = True
    return (min_x, min_y, max_x + 1, max_y + 1) if found else None


def process_sprite(input_path: str, output_path: str) -> bool:
    """
    Full pipeline:
    1. Load image
    2. Auto-crop to content bounding box (removes excess black border)
    3. Resize content to fit inside TARGET_W × TARGET_H with correct aspect
    4. Center on a TARGET_W × TARGET_H transparent canvas
    5. Remove remaining black background
    6. Save as PNG
    """
    try:
        img = Image.open(input_path)
    except Exception as e:
        print(f"  ERROR loading {input_path}: {e}")
        return False

    # Convert to RGB first (handles palette images, JPEG, etc.)
    img_rgb = img.convert("RGB")

    # Step 1: Find content bounding box and crop to it
    bbox = find_content_bbox(img_rgb, threshold=BLACK_THRESHOLD)
    if bbox is None:
        print(f"  WARNING: {input_path} appears to be all black — skipping")
        return False

    img_cropped = img_rgb.crop(bbox)
    cw, ch = img_cropped.size

    # Step 2: Scale to fit inside target dimensions, preserving aspect ratio
    scale = min(TARGET_W / cw, TARGET_H / ch)
    new_w = max(1, int(cw * scale))
    new_h = max(1, int(ch * scale))
    img_scaled = resize_nearest(img_cropped, new_w, new_h)

    # Step 3: Center on a blank RGBA canvas
    canvas = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))
    paste_x = (TARGET_W - new_w) // 2
    paste_y = (TARGET_H - new_h) // 2
    canvas.paste(img_scaled.convert("RGBA"), (paste_x, paste_y))

    # Step 4: Remove remaining black background
    canvas = remove_black_background(canvas, threshold=BLACK_THRESHOLD)

    # Step 5: Save
    canvas.save(output_path, "PNG")
    print(f"  ✓  {os.path.basename(input_path):40s} → {new_w}×{new_h} → {TARGET_W}×{TARGET_H}")
    return True


def make_contact_sheet(output_dir: str, cols: int = 6):
    """
    Creates a contact sheet showing all output sprites side by side
    on a dark green background (so transparency is visible).
    Saved as  output_sprites/_contact_sheet.png
    """
    files = sorted([
        f for f in os.listdir(output_dir)
        if f.endswith(".png") and not f.startswith("_")
    ])
    if not files:
        return

    PAD   = 8
    LABEL = 16   # height for filename label below each sprite

    rows = (len(files) + cols - 1) // cols
    sheet_w = cols * (TARGET_W + PAD) + PAD
    sheet_h = rows * (TARGET_H + PAD + LABEL) + PAD

    sheet = Image.new("RGBA", (sheet_w, sheet_h), (20, 44, 20, 255))

    for i, fname in enumerate(files):
        col = i % cols
        row = i // cols
        x = PAD + col * (TARGET_W + PAD)
        y = PAD + row * (TARGET_H + PAD + LABEL)

        # Checkerboard background to show transparency
        checker = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))
        for cy in range(0, TARGET_H, 8):
            for cx in range(0, TARGET_W, 8):
                color = (30, 60, 30, 255) if (cx // 8 + cy // 8) % 2 == 0 else (40, 80, 40, 255)
                for py in range(min(8, TARGET_H - cy)):
                    for px2 in range(min(8, TARGET_W - cx)):
                        checker.putpixel((cx + px2, cy + py), color)

        sprite = Image.open(os.path.join(output_dir, fname)).convert("RGBA")
        checker.paste(sprite, (0, 0), sprite)
        sheet.paste(checker, (x, y), checker)

        # Draw filename label (draw simple text approximation with dots)
        # For full text rendering: pip install Pillow[freetype]
        # We keep it dependency-free with just a colour bar
        label_bar = Image.new("RGBA", (TARGET_W, LABEL - 2), (10, 30, 10, 200))
        sheet.paste(label_bar, (x, y + TARGET_H + 2), label_bar)

    sheet_path = os.path.join(output_dir, "_contact_sheet.png")
    sheet.save(sheet_path)
    print(f"\n  Contact sheet saved: {sheet_path}  ({sheet_w}×{sheet_h}px)")


def main():
    # Create output directory
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    # Check input directory exists
    if not os.path.isdir(INPUT_DIR):
        print(f"""
ERROR: Input folder '{INPUT_DIR}' not found.

Create it and put your AI-generated images inside:
    mkdir {INPUT_DIR}
    # copy your PNGs/JPGs into {INPUT_DIR}/

Then run this script again:
    python3 resize_sprites.py
""")
        sys.exit(1)

    # Find all images
    exts   = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff"}
    images = [
        f for f in os.listdir(INPUT_DIR)
        if os.path.splitext(f)[1].lower() in exts
    ]

    if not images:
        print(f"No images found in '{INPUT_DIR}'. Add your AI-generated PNGs and try again.")
        sys.exit(1)

    print(f"\nEcoFarm Sprite Resizer")
    print(f"  Input : {INPUT_DIR}/  ({len(images)} images)")
    print(f"  Output: {OUTPUT_DIR}/")
    print(f"  Target: {TARGET_W}×{TARGET_H}px, nearest-neighbor, transparent BG\n")

    success = 0
    for fname in sorted(images):
        input_path  = os.path.join(INPUT_DIR,  fname)
        output_name = os.path.splitext(fname)[0] + ".png"
        output_path = os.path.join(OUTPUT_DIR, output_name)
        if process_sprite(input_path, output_path):
            success += 1

    print(f"\n  Done: {success}/{len(images)} sprites processed")

    # Generate contact sheet
    if success > 0:
        print("  Generating contact sheet...")
        make_contact_sheet(OUTPUT_DIR)

    print(f"""
Next steps:
  1. Open output_sprites/_contact_sheet.png to review all sprites together
  2. Check that mature stage matches the visual weight of Trees_.png
  3. Upload sprites to free-tex-packer.com to create atlas JSON
  4. Replace public/assets/sprites/trees.png with your atlas
  5. Update PreloadScene.js → load.atlas() instead of load.spritesheet()
""")


if __name__ == "__main__":
    main()