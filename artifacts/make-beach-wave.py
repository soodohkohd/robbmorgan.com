#!/usr/bin/env python3
"""Bake the beach surf animation, one looping WebP per time-of-day.

The effect is a wave whose surf/foam is dragged UP the sand and drawn back,
the leading-edge points fanning out (perpendicular to the curved shore)
while the sea-side anchor points stay fixed. That is a per-pixel mesh
deform (inverse-distance-weighted / Shepard warp) and cannot run live in
CSS, so it is baked here to an animated WebP and dropped into the landing
component as a positioned <div> background (see .beach-wave / waveSrc).

ROLLING WAVES: each frame composites TWO wave instances half a period
apart. One advances up the sand while forming (fading in); the other
recedes while dissolving (fading out). They cross at the midway point with
the receding wave fully gone and the advancing wave fully visible, so the
surf rolls continuously. Because the two instances are identical and offset
by half a period, the composite repeats every HALF instance period — so the
baked loop (N frames) is one half period yet shows a full per-wave cycle.
The incoming (advancing) wave is composited ON TOP of the outgoing one.

Per instance:
  - Control points morph from `start` (resting wave) to `end` (washed-up
    wave) by a LINEAR (triangle) t, so position goes start->end->start and
    the wave starts moving immediately as it fades in. Anchors are identical
    in both, so they don't move.
  - Each output pixel samples the source at I + (start - I) weighted by a
    LOCALIZED gaussian falloff (+ a zero baseline) so only the surf band is
    dragged and the far water/coastline stay undeformed.
  - Masked to the current polygon, soft front edge (foam), translucent, with
    the palm trees punched out of the alpha so the wave passes BEHIND them.
  - Opacity (smoothstep) fades in over the first half of the advance and out
    over the first half of the recede (see FADE), so by the midway crossover
    the advancing wave is fully visible and the receding one fully gone.

Control points are in % of the full scene image (captured via ?debug=1).
Anchors (do NOT move): index 0 (pt 1) and 17/18/19 (pts 18/19/20).

Run from the repo root:  python3 artifacts/make-beach-wave.py
This writes the WebPs to code/public/, but they are SERVED FROM AZURE BLOB
(each is ~1 MB, too heavy for the deploy zip — see waveSrc in landing.ts).
After regenerating, re-upload and clear the local copies:
  for t in morning afternoon evening night; do \
    az storage blob upload --account-name robbmorganmedia --container-name media \
      --name beach-wave-$t.webp --file code/public/beach-wave-$t.webp \
      --content-type image/webp --auth-mode key --overwrite; done
  rm -f code/public/beach-wave-*.webp
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
N = 144         # frames in the loop. ROLLING WAVES: two instances offset by
                # half a period make the composite repeat every HALF instance
                # period, so 144 frames here = a ~24.5s per-wave cycle at ~12fps
                # (same per-wave speed as a 288-frame single wave) at ~half the
                # file size. N * FRAME_MS = the composite loop length.
FRAME_MS = 85
FADE = 0.25     # phase span of the fade in / fade out. 0.25 = the first half
                # of the advance / recede, so the fade completes exactly at the
                # midway point: incoming wave 100% visible, outgoing 100% gone.
FEATHER = 9     # leading-edge feather width (source px) — bigger = softer front
FEATHER_START = 0.8  # wash progress (0..1) at which the front feather begins
                     # (stays foamy/defined until here, then feathers out on the crash)
SIGMA_FRAC = 0.13   # warp locality (fraction of crop width) — smaller = more
                    # localized drag, less global deformation
W0 = 0.06           # zero-displacement baseline weight — pulls the far field
                    # back to no-warp so only the surf band deforms


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
    sigma = cw * SIGMA_FRAC

    def inst(phi):
        """One wave instance at phase phi in [0,1): advances start->end while
        forming, recedes end->start while dissolving. Returns (rgb, alpha, o)."""
        # Linear (triangle) position so the wave starts MOVING immediately as
        # it fades in — no slow ease-in lingering at the start. Still crosses
        # the midway point (t=0.5) at phi=0.25, where the cross-fade is keyed.
        t = 2.0 * phi if phi < 0.5 else 2.0 * (1.0 - phi)
        I = R + (E - R) * t                       # intermediate control points
        disp = R - I                              # output -> source displacement
        # Localized warp: gaussian-falloff weights + a zero-displacement
        # baseline (W0), so the drag is confined to the surf band near the
        # front and the far water/coastline stay undeformed.
        ws = np.full((ch, cw), W0, np.float32)
        dx = np.zeros_like(ws)
        dy = np.zeros_like(ws)
        for k in range(len(I)):
            w = np.exp(-((gx - I[k, 0]) ** 2 + (gy - I[k, 1]) ** 2) / (2 * sigma * sigma))
            ws += w
            dx += w * disp[k, 0]
            dy += w * disp[k, 1]
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
        ImageDraw.Draw(m).polygon([tuple(pp) for pp in I], fill=255)
        mm = np.asarray(m.filter(ImageFilter.GaussianBlur(sc * 1.4))).astype(np.float32) / 255

        # Leading-edge feather: fade alpha to 0 near the moving front so it
        # dissolves into the sand with no hard/colored edge; sea side stays
        # solid. Only near the crash (t -> 1) per FEATHER_START.
        lead = I[1:17]
        edist = np.full((ch, cw), 1e9, np.float32)
        for k in range(len(lead) - 1):
            ax, ay = lead[k]
            bx, by = lead[k + 1]
            ddx, ddy = bx - ax, by - ay
            L2 = ddx * ddx + ddy * ddy + 1e-6
            tt = np.clip(((gx - ax) * ddx + (gy - ay) * ddy) / L2, 0, 1)
            px, py = ax + tt * ddx, ay + tt * ddy
            edist = np.minimum(edist, np.sqrt((gx - px) ** 2 + (gy - py) ** 2))
        ledge = np.clip(edist / (sc * FEATHER), 0, 1)
        tf = np.clip((t - FEATHER_START) / (1 - FEATHER_START), 0, 1)
        ledge = 1 - tf * (1 - ledge)

        # Opacity (smoothstep, so the fade is smooth — no hard corners):
        #   advance: fade in 0->1 over [0, FADE], then hold full to the shore
        #            -> 100% visible by the midway point (phi = 0.25).
        #   recede:  fade out 1->0 over [0.5, 0.5+FADE], then stay gone
        #            -> 100% transparent by the midway point (phi = 0.75).
        if phi < FADE:
            u = phi / FADE
            o = u * u * (3.0 - 2.0 * u)
        elif phi < 0.5:
            o = 1.0
        elif phi < 0.5 + FADE:
            u = 1.0 - (phi - 0.5) / FADE
            o = u * u * (3.0 - 2.0 * u)
        else:
            o = 0.0

        a = mm * 0.8 * (1 - treem) * ledge * o
        return wp, a, o

    # ROLLING WAVES: two instances half a period apart. Over the loop, one
    # advances+forms while the other recedes+dissolves; they cross at the
    # midway point (the receding one fully gone, the advancing one fully
    # visible). The incoming (advancing) wave is drawn ON TOP the moment it
    # starts, with the outgoing (receding) wave behind it.
    fr = []
    for i in range(N):
        ph = (i / N) * 0.5            # instance A: 0 -> 0.5 (advancing, incoming)
        adv = inst(ph)
        rec = inst(ph + 0.5)          # instance B: 0.5 -> 1 (receding, outgoing)
        acc_rgb = np.zeros((ch, cw, 3), np.float32)
        acc_a = np.zeros((ch, cw), np.float32)
        for wp, a, _o in (rec, adv):  # back-to-front: receding behind, advancing on top
            out_a = a + acc_a * (1.0 - a)
            guard = np.where(out_a > 1e-6, out_a, 1.0)[..., None]
            acc_rgb = (wp * a[..., None] + acc_rgb * (acc_a * (1.0 - a))[..., None]) / guard
            acc_a = out_a
        fr.append(Image.fromarray(np.dstack([acc_rgb, acc_a * 255]).astype('uint8')))

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
