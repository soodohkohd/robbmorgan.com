#!/usr/bin/env python3
"""Bake the beach surf animation, one looping WebP per time-of-day.

The effect is a wave whose surf/foam is dragged UP the sand and drawn back,
the leading-edge points fanning out (perpendicular to the curved shore)
while the sea-side anchor points stay fixed. That is a per-pixel mesh
deform (inverse-distance-weighted / Shepard warp) and cannot run live in
CSS, so it is baked here to an animated WebP and dropped into the landing
component as a positioned <div> background (see .beach-wave / waveSrc).

How it works per frame:
  - Control points morph from `start` (resting wave) to `end` (washed-up
    wave). Anchors are identical in both, so they don't move.
  - For frame time t, the intermediate control points are I = start + (end-start)*t.
    Each output pixel samples the source at I + (start - I) weighted by
    inverse-distance to every control point -> the surf content slides up
    the sand and recedes.
  - The wave is masked to the current (intermediate) polygon, soft-edged
    (foam), made translucent, and the palm trees are punched out of the
    alpha (vegetation detection) so the wave passes BEHIND them.
  - Many frames on a full cosine cycle (0 -> 1 -> 0) give a smooth,
    seamless, rush-in/draw-out loop (frame rate, not just count, drives
    smoothness: N frames * FRAME_MS ms = the loop length / fps).

Control points are in % of the full scene image (captured via ?debug=1).
Anchors (do NOT move): index 0 (point 1) and 10/11/12 (points 11/12/13).
Run from the repo root:  python3 artifacts/make-beach-wave.py
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import os

# Resting wave (start) and washed-up wave (end), % of the scene image.
# Anchors (do NOT move): index 0 (pt 1) and 17/18/19 (pts 18/19/20).
# Leading edge (pts 2-17), by direction group:
#   pts 2-6  -> left and slightly up
#   pts 7-10 -> left
#   pts 11-14-> left and slightly down
#   pts 15-17-> down
start = [(27.70, 24.80), (27.00, 25.00), (26.40, 25.30), (25.90, 25.80),
         (25.30, 26.10), (24.70, 26.30), (24.40, 27.10), (24.10, 27.70),
         (24.60, 28.70), (25.20, 29.40), (26.00, 30.10), (26.90, 30.70),
         (27.70, 31.30), (28.50, 31.90), (29.10, 32.30), (29.90, 32.70),
         (31.00, 33.20), (31.00, 31.10), (26.70, 28.30), (29.10, 26.00)]
end   = [(27.70, 24.80), (25.20, 24.80), (24.60, 25.10), (24.00, 25.60),
         (23.30, 25.90), (22.80, 26.20), (22.50, 27.10), (22.30, 27.70),
         (22.70, 28.70), (23.30, 29.40), (24.20, 30.40), (25.20, 31.00),
         (26.10, 31.70), (27.00, 32.30), (28.90, 33.10), (29.70, 33.70),
         (31.00, 34.50), (31.00, 31.10), (26.70, 28.30), (29.10, 26.00)]

R0 = np.array(start)
E0 = np.array(end)
allp = np.vstack([R0, E0])
# Operating bbox in scene-% (small margins so the soft edge has room).
BL = allp[:, 0].min() - 0.5
BT = allp[:, 1].min() - 0.3
BW = allp[:, 0].max() + 0.6 - BL
BH = allp[:, 1].max() + 0.8 - BT

sc = 2          # supersample factor (display is ~145px wide, so 2x is ample)
N = 288         # frames — high count for a smooth, non-choppy loop
FRAME_MS = 85   # per-frame duration; N * FRAME_MS = ~24.5s loop at ~12fps
                # (halved speed vs 144 frames by doubling the COUNT, not the
                # per-frame ms, so it stays smooth instead of getting choppy)
FEATHER = 9     # leading-edge feather width (source px) — bigger = softer front
FEATHER_START = 0.8  # wash progress (0..1) at which the front feather begins
                     # (stays foamy/defined until here, then feathers out on the crash)
SIGMA_FRAC = 0.13   # warp locality (fraction of crop width) — smaller = more
                    # localized drag, less global deformation
W0 = 0.06           # zero-displacement baseline weight — pulls the far field
                    # back to no-warp so only the surf band deforms
ts = [(1 - np.cos(np.pi * 2 * i / N)) / 2 for i in range(N)]  # cosine 0->1->0


def gen(t_name):
    im = Image.open(f'code/public/desk-scene-{t_name}.webp').convert('RGB')
    W, H = im.size
    x0, y0 = int(BL / 100 * W), int(BT / 100 * H)
    x1, y1 = int((BL + BW) / 100 * W), int((BT + BH) / 100 * H)
    crop = np.asarray(
        im.crop((x0, y0, x1, y1)).resize(((x1 - x0) * sc, (y1 - y0) * sc), Image.LANCZOS)
    ).astype(np.float32)
    ch, cw = crop.shape[:2]

    R = np.array([[(x - BL) / BW * cw, (y - BT) / BH * ch] for x, y in start])
    E = np.array([[(x - BL) / BW * cw, (y - BT) / BH * ch] for x, y in end])

    # Tree mask: detect vegetation (green-ish or dark) so the palms along
    # the shoreline punch through the wave's alpha (wave goes behind them).
    Rc, Gc, Bc = crop[:, :, 0], crop[:, :, 1], crop[:, :, 2]
    bright = (Rc + Gc + Bc) / 3
    veg = ((Gc > Bc) & (Gc > Rc * 0.85) & (bright < 150)) | (bright < 70)
    treem = np.asarray(
        Image.fromarray((veg * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(sc * 0.6))
    ).astype(np.float32) / 255

    ys, xs = np.mgrid[0:ch, 0:cw]
    gx = xs.astype(np.float32)
    gy = ys.astype(np.float32)

    fr = []
    for t in ts:
        I = R + (E - R) * t       # intermediate control points
        disp = R - I              # output -> source displacement
        # Localized warp: gaussian-falloff weights + a zero-displacement
        # baseline (W0), so the drag is confined to the surf band near the
        # front and the far water/coastline stay undeformed. (Plain 1/d^2
        # IDW has a long tail and dragged the whole region -> smeared end.)
        sigma = cw * SIGMA_FRAC
        ws = np.full((ch, cw), W0, np.float32)
        dx = np.zeros_like(ws)
        dy = np.zeros_like(ws)
        for i in range(len(I)):
            w = np.exp(-((gx - I[i, 0]) ** 2 + (gy - I[i, 1]) ** 2) / (2 * sigma * sigma))
            ws += w
            dx += w * disp[i, 0]
            dy += w * disp[i, 1]
        dx /= ws
        dy /= ws
        sxc = np.clip(gx + dx, 0, cw - 1)
        syc = np.clip(gy + dy, 0, ch - 1)
        xi = np.floor(sxc).astype(int)
        yi = np.floor(syc).astype(int)
        xj = np.clip(xi + 1, 0, cw - 1)
        yj = np.clip(yi + 1, 0, ch - 1)
        fx = (sxc - xi)[..., None]
        fy = (syc - yi)[..., None]
        wp = (crop[yi, xi] * (1 - fx) * (1 - fy) + crop[yi, xj] * fx * (1 - fy)
              + crop[yj, xi] * (1 - fx) * fy + crop[yj, xj] * fx * fy)

        m = Image.new('L', (cw, ch), 0)
        ImageDraw.Draw(m).polygon([tuple(p) for p in I], fill=255)
        mm = np.asarray(m.filter(ImageFilter.GaussianBlur(sc * 1.4))).astype(np.float32) / 255

        # Leading-edge feather: fade alpha to 0 as pixels approach the
        # moving front (pts 2-10) so the wave dissolves into the sand with
        # no hard or colored edge. The sea-side boundary is left solid.
        lead = I[1:17]
        edist = np.full((ch, cw), 1e9, np.float32)
        for i in range(len(lead) - 1):
            ax, ay = lead[i]
            bx, by = lead[i + 1]
            ddx, ddy = bx - ax, by - ay
            L2 = ddx * ddx + ddy * ddy + 1e-6
            tt = np.clip(((gx - ax) * ddx + (gy - ay) * ddy) / L2, 0, 1)
            px, py = ax + tt * ddx, ay + tt * ddy
            edist = np.minimum(edist, np.sqrt((gx - px) ** 2 + (gy - py) ** 2))
        ledge = np.clip(edist / (sc * FEATHER), 0, 1)
        # Only feather the front near the END of the wash — AS THE WAVE
        # CRASHES ON THE SHORE (t -> 1) the foam thins into the sand. Early
        # in the wash (and as it draws back) the front stays defined.
        tf = np.clip((t - FEATHER_START) / (1 - FEATHER_START), 0, 1)
        ledge = 1 - tf * (1 - ledge)

        a = mm * 0.8 * (1 - treem) * ledge   # translucent, trees out, front feathered on crash
        fr.append(Image.fromarray(np.dstack([wp, a * 255]).astype('uint8')))

    out = f'code/public/beach-wave-{t_name}.webp'
    fr[0].save(out, 'webp', save_all=True, append_images=fr[1:],
               duration=FRAME_MS, loop=0, quality=80, method=4)
    return round(os.path.getsize(out) / 1024)


if __name__ == '__main__':
    print('bbox (scene-%):',
          'left', round(BL, 2), 'top', round(BT, 2),
          'width', round(BW, 2), 'height', round(BH, 2))
    for t in ['morning', 'afternoon', 'evening', 'night']:
        print(f'beach-wave-{t}.webp', gen(t), 'KB')
