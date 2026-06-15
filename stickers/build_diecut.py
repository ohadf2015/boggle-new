#!/usr/bin/env python3
"""True die-cut sticker: strip ALL background white, re-grow a uniform white
contour from the art silhouette (alpha dilation), optional small QR tag, export
transparent PNG sized to 10 cm @ 300 DPI.

Why re-grow the border: the AI draws a white contour that is the SAME white as
the background, so flood-fill removes both. Re-growing gives a clean, consistent
cut border independent of what the model drew.
"""
import sys, argparse
from PIL import Image, ImageDraw
import cv2, numpy as np
import qrcode
from qrcode.constants import ERROR_CORRECT_Q

DPI = 300
CM10 = int(10 / 2.54 * DPI)        # 1181px target long edge
# Short URL = lower QR version = bigger modules = scans easier at sticker size.
# utm_source still read by PostHog autocapture.
URL = "https://www.lexiclash.live/?utm_source=sticker"
FONT_SEMI = "assets/Fredoka-SemiBold.ttf"
FONT_BOLD = "assets/Fredoka-Bold.ttf"


def art_alpha(bgr, tol=20):
    """Alpha of the artwork = everything NOT background-connected white."""
    h, w = bgr.shape[:2]
    mask = np.zeros((h + 2, w + 2), np.uint8)
    flags = 4 | (255 << 8) | cv2.FLOODFILL_MASK_ONLY | cv2.FLOODFILL_FIXED_RANGE
    lo = hi = (tol, tol, tol)
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1),
                 (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)]:
        if bgr[seed[1], seed[0]].min() > 235:        # only seed from white-ish corners/edges
            cv2.floodFill(bgr.copy(), mask, seed, 0, lo, hi, flags)
    bg = mask[1:-1, 1:-1]
    alpha = np.where(bg > 0, 0, 255).astype(np.uint8)
    # fill interior pinholes (background specks fully inside art stay opaque)
    alpha = cv2.morphologyEx(alpha, cv2.MORPH_CLOSE, np.ones((7, 7), np.uint8))
    n, lbl, stats, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), 8)
    if n > 1:                                        # keep only the largest blob (drop stray flecks)
        big = 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])
        alpha = np.where(lbl == big, 255, 0).astype(np.uint8)
    return alpha


def qr_url(slug):
    return f"{URL}&utm_content={slug}" if slug else URL


def make_qr(px, slug):
    qr = qrcode.QRCode(error_correction=ERROR_CORRECT_Q, box_size=10, border=4)
    qr.add_data(qr_url(slug)); qr.make(fit=True)
    return qr.make_image(fill_color="#0c0c12", back_color="#FFFEF0").convert("RGBA").resize((px, px), Image.NEAREST)


ACCENTS = {"lime": (191,255,0), "pink": (255,20,147), "cyan": (0,255,255), "purple": (139,92,246)}


def _fit(path, text, max_w, start, lo=14):
    from PIL import ImageFont
    for s in range(start, lo-1, -2):
        f = ImageFont.truetype(path, s)
        if f.getbbox(text)[2]-f.getbbox(text)[0] <= max_w:
            return f
    return ImageFont.truetype(path, lo)


def make_chip(qpx, slug, caption=None, accent="pink"):
    """Connected tab: optional accent flex-banner + QR + 'lexiclash.live', cream, dark keyline."""
    from PIL import ImageFont
    ac = ACCENTS[accent]
    pad = int(qpx * 0.11)
    cap_h = int(qpx * 0.20)
    ban_h = int(qpx * 0.30) if caption else 0
    W = qpx + 2*pad
    chip = Image.new("RGBA", (W, ban_h + qpx + 2*pad + cap_h), (0, 0, 0, 0))
    cd = ImageDraw.Draw(chip)
    r = int(qpx*0.13)
    cd.rounded_rectangle((2, 2, W-3, chip.height-3), radius=r,
                         fill=(255, 254, 240, 255), outline=(20, 20, 28, 255), width=max(4, qpx//34))
    if caption:
        cd.rounded_rectangle((2, 2, W-3, ban_h+r), radius=r, fill=(*ac, 255))
        cd.rectangle((2, ban_h, W-3, ban_h+r), fill=(*ac, 255))
        f = _fit(FONT_BOLD, caption, W-int(qpx*0.18), int(ban_h*0.62))
        tw = f.getbbox(caption)[2]-f.getbbox(caption)[0]
        lum = 0.299*ac[0]+0.587*ac[1]+0.114*ac[2]
        cd.text(((W-tw)//2, (ban_h-f.size)//2-2), caption, font=f,
                fill=(20,20,28,255) if lum > 140 else (255,255,255,255))
    chip.alpha_composite(make_qr(qpx, slug), (pad, ban_h + pad))
    f = ImageFont.truetype(FONT_BOLD, int(qpx*0.165))
    t = "lexiclash.live"
    tw = f.getbbox(t)[2]-f.getbbox(t)[0]
    cd.text(((W-tw)//2, ban_h + qpx + pad + int(cap_h*0.04)), t, font=f, fill=(20, 20, 28, 255))
    return chip


def diecut_layer(alpha, rgb, border_px):
    """Compose white die-cut border + dark keyline + art from an alpha mask."""
    H, W = alpha.shape
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (border_px*2+1, border_px*2+1))
    grown = cv2.dilate(alpha, k)
    k2 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (border_px*2+7, border_px*2+7))
    outer = cv2.dilate(alpha, k2)
    c = np.zeros((H, W, 4), np.uint8)
    c[outer > 0] = (20, 20, 28, 255)
    c[grown > 0] = (255, 255, 255, 255)
    art = alpha > 0
    c[art, :3] = rgb[art]; c[art, 3] = 255
    return c


def build(src, out, slug=None, border_mm=3.0, with_qr=True, caption=None, accent="pink"):
    bgr = cv2.imread(src, cv2.IMREAD_COLOR)
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    alpha = art_alpha(bgr)
    H, W = alpha.shape
    bpx = max(18, int(border_mm / 25.4 * DPI * (W / CM10)))

    if with_qr:
        # Hang the QR off the BOTTOM as a connected tab: it bridges to the art's
        # white border (one cut piece) WITHOUT covering the illustration.
        # Pad the canvas downward so the tab has room.
        scale_to_final = CM10 / max(H, W)
        qpx_src = int(0.22 * CM10 / scale_to_final)
        chip = make_chip(qpx_src, slug, caption=caption, accent=accent)
        ca = np.array(chip)[:, :, 3]
        cax = np.where(ca.max(0) > 8)[0]; cay = np.where(ca.max(1) > 8)[0]
        chip_w, chip_h = cax[-1]-cax[0]+1, cay[-1]-cay[0]+1
        sub = (ca > 8).astype(np.uint8)*255

        grown_art = cv2.dilate(alpha, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (bpx*2+1, bpx*2+1)))
        ys, xs = np.where(alpha > 0)
        cx = int(np.median(xs))
        # bottom of the WHITE BORDER directly under cx -> place tab just into it
        col = np.where(grown_art[:, cx] > 0)[0]
        border_bottom = int(col.max()) if col.size else int(ys.max())

        padH = chip_h + bpx*4
        Hc = H + padH
        art2 = np.zeros((Hc, W), np.uint8); art2[:H] = alpha
        rgb2 = np.zeros((Hc, W, 3), np.uint8); rgb2[:H] = rgb
        px = int(np.clip(cx - chip_w//2, 4, W - chip_w - 4))
        py = int(np.clip(border_bottom - bpx, 4, Hc - chip_h - 4))   # overlap border by ~bpx, not art
        chip_alpha = np.zeros((Hc, W), np.uint8)
        chip_alpha[py:py+chip.height, px:px+chip.width] = sub[:Hc-py, :W-px]

        core = ((art2 > 0) | (chip_alpha > 0)).astype(np.uint8)*255
        canvas = diecut_layer(core, rgb2, bpx)        # border bridges the small gap -> one piece
        # restore: only the art pixels show the illustration; chip drawn on top of its own area
        base = Image.fromarray(canvas, "RGBA")
        base.alpha_composite(chip, (px, py))
        im = base
    else:
        im = Image.fromarray(diecut_layer(alpha, rgb, bpx), "RGBA")

    a = np.array(im)[:, :, 3]
    ys, xs = np.where(a > 8); pad = 6
    im = im.crop((max(xs.min()-pad,0), max(ys.min()-pad,0),
                  min(xs.max()+pad,im.width), min(ys.max()+pad,im.height)))
    s = CM10 / max(im.size)
    im = im.resize((round(im.width*s), round(im.height*s)), Image.LANCZOS)
    im.save(out, dpi=(DPI, DPI))

    # ---- decode-verify the QR from the FINAL 10cm pixels ----
    status = "no-qr"
    if with_qr:
        flat = Image.new("RGB", im.size, (255, 255, 255)); flat.paste(im, (0, 0), im)
        det = cv2.QRCodeDetector()
        want = qr_url(slug)
        ok = False
        for sc in (1.0, 1.5, 2.0):                       # detector is scale-finicky; retry upscaled
            arr = np.array(flat if sc == 1.0 else flat.resize((int(im.width*sc), int(im.height*sc)), Image.LANCZOS))
            data, _, _ = det.detectAndDecode(cv2.cvtColor(arr, cv2.COLOR_RGB2BGR))
            if data == want:
                ok = True; break
        status = "QR-OK" if ok else "QR-FAIL"
    print(f"{'OK ' if status!='QR-FAIL' and 'FAIL' not in status else 'FAIL'} {out}  "
          f"{im.size[0]}x{im.size[1]}px (~{im.size[0]/DPI*2.54:.1f}x{im.size[1]/DPI*2.54:.1f}cm)  {status}")
    return "FAIL" not in status


if __name__ == "__main__":
    import os
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--slug", default=None, help="utm_content value; defaults to output basename")
    ap.add_argument("--caption", default=None, help="flex banner line on the QR tab (swag)")
    ap.add_argument("--accent", default="pink", choices=list(ACCENTS))
    ap.add_argument("--no-qr", action="store_true")
    a = ap.parse_args()
    slug = a.slug or os.path.splitext(os.path.basename(a.out))[0]
    sys.exit(0 if build(a.src, a.out, slug=slug, with_qr=not a.no_qr,
                        caption=a.caption, accent=a.accent) else 1)
