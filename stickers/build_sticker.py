#!/usr/bin/env python3
"""LexiClash die-cut sticker compositor.

AI makes ONLY the mascot cutout; this script lays out the entire sticker so we get
exact brand hex, hard neo-brutalist shadows, correct caption text, and a QR that is
guaranteed-scannable (decoded back from the FINAL rendered PNG, not the raw QR).

Output: 300 DPI transparent PNG, die-cut (white rim) rounded card.
"""
import sys, argparse
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qrcode
from qrcode.constants import ERROR_CORRECT_Q
import cv2, numpy as np

# ---- Brand palette (neo-brutalist) ----
NAVY      = (26, 26, 46, 255)     # #1a1a2e
NAVY_LT   = (22, 33, 62, 255)     # #16213e
CREAM     = (255, 254, 240, 255)  # #FFFEF0
WHITE     = (255, 255, 255, 255)
BLACK     = (12, 12, 18, 255)
LIME      = (191, 255, 0, 255)    # #BFFF00
PINK      = (255, 20, 147, 255)   # #FF1493
CYAN      = (0, 255, 255, 255)    # #00FFFF
PURPLE    = (139, 92, 246, 255)   # #8B5CF6
ACCENTS   = {"lime": LIME, "pink": PINK, "cyan": CYAN, "purple": PURPLE}

DPI   = 300
INCH  = DPI
BLEED = int(0.125 * INCH)          # 37px full-bleed
SIZE  = 3 * INCH + 2 * BLEED       # 974px square canvas
FONT_BOLD = "assets/Fredoka-Bold.ttf"
FONT_SEMI = "assets/Fredoka-SemiBold.ttf"

URL = "https://www.lexiclash.live/?utm_source=sticker&utm_medium=irl&utm_campaign=mascot"


def rrect(draw, box, r, fill=None, outline=None, width=1):
    draw.rounded_rectangle(box, radius=r, fill=fill, outline=outline, width=width)


def hard_shadow_rrect(base, box, r, fill, off=(7, 7), outline=BLACK, ow=5):
    """Neo-brutalist hard (no-blur) shadow: solid black offset block behind shape."""
    d = ImageDraw.Draw(base)
    sx, sy = off
    rrect(d, (box[0] + sx, box[1] + sy, box[2] + sx, box[3] + sy), r, fill=BLACK)
    rrect(d, box, r, fill=fill, outline=outline, width=ow)


def fit_font(path, text, max_w, start=84, min_size=30):
    for s in range(start, min_size - 1, -2):
        f = ImageFont.truetype(path, s)
        if f.getbbox(text)[2] - f.getbbox(text)[0] <= max_w:
            return f, s
    return ImageFont.truetype(path, min_size), min_size


def draw_caption(base, text, cx, cy, max_w, accent):
    """Centered punch caption on an accent block with hard shadow + black border."""
    d = ImageDraw.Draw(base)
    lines = text.replace("\\n", "\n").split("\n")
    start = 60 if len(lines) > 1 else 84
    font, fs = fit_font(FONT_BOLD, max(lines, key=len), max_w - 70, start=start)
    lh = int(fs * 1.06)
    th = lh * len(lines)
    # measure widest
    tw = max(font.getbbox(l)[2] - font.getbbox(l)[0] for l in lines)
    pad_x, pad_y = 34, 22
    box = (cx - tw // 2 - pad_x, cy - th // 2 - pad_y,
           cx + tw // 2 + pad_x, cy + th // 2 + pad_y)
    hard_shadow_rrect(base, box, 26, accent, off=(8, 8), ow=5)
    # text color: max-contrast black/white vs accent luminance
    lum = 0.299 * accent[0] + 0.587 * accent[1] + 0.114 * accent[2]
    tcol = BLACK if lum > 140 else WHITE
    y = cy - th // 2
    for l in lines:
        w = font.getbbox(l)[2] - font.getbbox(l)[0]
        d.text((cx - w // 2, y), l, font=font, fill=tcol)
        y += lh
    return box


def make_qr(px):
    qr = qrcode.QRCode(version=None, error_correction=ERROR_CORRECT_Q,
                       box_size=10, border=4)  # keep quiet zone
    qr.add_data(URL)
    qr.make(fit=True)
    img = qr.make_image(fill_color="#0c0c12", back_color="#FFFEF0").convert("RGBA")
    return img.resize((px, px), Image.NEAREST)


def build(mascot_path, caption, accent_name, out_path):
    accent = ACCENTS[accent_name]
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d = ImageDraw.Draw(canvas)

    # die-cut white rim -> navy card
    rrect(d, (0, 0, SIZE - 1, SIZE - 1), 70, fill=WHITE)
    inset = 26
    rrect(d, (inset, inset, SIZE - 1 - inset, SIZE - 1 - inset), 58, fill=NAVY,
          outline=BLACK, width=6)

    safe = BLEED + 20  # ~57px inner safe zone

    # --- mascot (top) ---
    m = Image.open(mascot_path).convert("RGBA")
    MAX_W, MAX_H = 540, 400
    scale = min(MAX_W / m.width, MAX_H / m.height)
    mw, mh = int(m.width * scale), int(m.height * scale)
    m = m.resize((mw, mh), Image.LANCZOS)
    mx = (SIZE - mw) // 2
    my = safe + max(0, (MAX_H - mh) // 2) + 4   # vertically center within the art band
    canvas.alpha_composite(m, (mx, my))

    # --- caption (sits between mascot band and QR panel) ---
    cap_cy = safe + MAX_H + 78
    cbox = draw_caption(canvas, caption, SIZE // 2, cap_cy, SIZE - 2 * safe, accent)

    # --- bottom row: QR + CTA ---
    qr_px = 248
    qy = SIZE - safe - qr_px
    qx = safe + 14
    # cream panel behind QR (light bg = scannable) + hard shadow
    pad = 16
    pbox = (qx - pad, qy - pad, qx + qr_px + pad, qy + qr_px + pad)
    hard_shadow_rrect(canvas, pbox, 22, CREAM, off=(7, 7), ow=5)
    qr = make_qr(qr_px)
    canvas.alpha_composite(qr, (qx, qy))

    # CTA text right of QR
    tx = qx + qr_px + pad + 30
    f_scan, _ = fit_font(FONT_BOLD, "SCAN ME", SIZE - tx - safe, start=70)
    d = ImageDraw.Draw(canvas)
    # accent "SCAN ME" with hard shadow text
    sy = qy + 18
    d.text((tx + 4, sy + 4), "SCAN", font=f_scan, fill=BLACK)
    d.text((tx, sy), "SCAN", font=f_scan, fill=accent)
    d.text((tx + 4, sy + f_scan.size + 4), "ME", font=f_scan, fill=BLACK)
    d.text((tx, sy + f_scan.size), "ME", font=f_scan, fill=accent)
    f_url, _ = fit_font(FONT_SEMI, "lexiclash.live", SIZE - tx - safe, start=40)
    uy = qy + qr_px - f_url.size - 4
    d.text((tx, uy), "lexiclash.live", font=f_url, fill=CREAM)
    f_tag, _ = fit_font(FONT_SEMI, "the word brawl", SIZE - tx - safe, start=30)
    d.text((tx, uy - f_tag.size - 6), "the word brawl", font=f_tag, fill=accent)

    canvas.save(out_path, dpi=(DPI, DPI))

    # ---- VERIFY: decode QR back from FINAL rendered PNG ----
    rgb = cv2.cvtColor(np.array(canvas.convert("RGB")), cv2.COLOR_RGB2BGR)
    data, _, _ = cv2.QRCodeDetector().detectAndDecode(rgb)
    ok = data == URL
    print(f"{'OK ' if ok else 'FAIL'} {out_path}  decoded={'MATCH' if ok else repr(data)}")
    return ok


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--mascot", required=True)
    ap.add_argument("--caption", required=True)
    ap.add_argument("--accent", default="pink", choices=list(ACCENTS))
    ap.add_argument("--out", required=True)
    a = ap.parse_args()
    sys.exit(0 if build(a.mascot, a.caption, a.accent, a.out) else 1)
