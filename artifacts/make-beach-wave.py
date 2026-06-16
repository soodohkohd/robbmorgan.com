#!/usr/bin/env python3
"""Bake the beach surf animation, one looping WebP per time-of-day.

The effect is a wave whose surf/foam is dragged UP the sand and drawn back,
the leading-edge points fanning out (perpendicular to the curved shore)
while the sea-side anchor points stay fixed. That is a per-pixel mesh
deform (inverse-distance-weighted / Shepard warp) and cannot run live in
CSS, so it is baked here to an animated WebP and dropped into the landing
component as a positioned <div> background (see .beach-wave / waveSrc).

ROLLING WAVES: each frame composites TWO wave instances half a period
apart. One advances up the sand while forming (fading in); the other eases
back slightly (PULLBACK) at the washed-up end as it DISSOLVES (fading out) —
it does not fully recede. As the new wave washes up, the previous one
dissolves at the top, so
the surf rolls continuously. Because the two instances are identical and
offset by half a period, the composite repeats every HALF instance period —
so the baked loop (N frames) shows a full per-wave cycle. The incoming
(advancing) wave is composited ON TOP of the dissolving one.

Per instance:
  - Control points morph from `start` (resting wave) to `end` (washed-up
    wave) by a LINEAR t over the first half, then ease back PULLBACK of the
    way over the second half as it dissolves. The remaining reset to `start`
    happens at the loop wrap, while fully transparent. Anchors are identical
    in both, so they don't move.
  - Each output pixel samples the source at I + (start - I) weighted by a
    LOCALIZED gaussian falloff (+ a zero baseline) so only the surf band is
    dragged and the far water/coastline stay undeformed.
  - Masked to the current polygon, soft front edge (foam), translucent, with
    the palm trees punched out of the alpha so the wave passes BEHIND them.
  - Opacity fades in (smoothstep) early in the advance, holds full to the
    beach, then fades LINEARLY to 0 as the wave pulls back (see FADE_IN /
    DISSOLVE_SPAN), fully gone before the loop wrap so the next wave overlaps.

Control points are in % of the full scene image (captured via ?debug=1).
Anchors (do NOT move): index 0 (pt 1) and 17/18/19 (pts 18/19/20).

Run from the repo root:  python3 artifacts/make-beach-wave.py
This writes the WebPs to artifacts/waves/ as local working copies you can open
and inspect. Production SERVES them FROM AZURE BLOB (each is ~1 MB, too heavy
for the deploy zip — see waveSrc in landing.ts). When a regen looks right,
upload from artifacts/waves/ (the local copies stay put for next time):
  for t in morning afternoon evening night; do \
    az storage blob upload --account-name robbmorganmedia --container-name media \
      --name beach-wave-$t.webp --file artifacts/waves/beach-wave-$t.webp \
      --content-type image/webp --auth-mode key --overwrite; done

To LOCAL-TEST in the browser before uploading, copy the staged WebPs into the
dev-served public dir and temporarily point waveSrc at them (the dev server
only serves code/public/, not artifacts/ — and needs a restart to see new
files, per the "Dev server quirk" note in CLAUDE.md):
  cp artifacts/waves/beach-wave-*.webp code/public/
then in landing.ts set waveSrc to `/beach-wave-${this.activeTime()}.webp`.
Revert both before committing (the blob URL is the production source).
"""
from PIL import Image, ImageDraw, ImageFilter
import numpy as np
import os

# Local staging dir for the baked WebPs. These are the working copies you can
# open/inspect and point the dev server at for local tests. Production serves
# them from Azure Blob (see waveSrc in landing.ts) — upload from here when a
# regen looks right (see the az command in this module's docstring).
OUT_DIR = 'artifacts/waves'

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
FRAME_MS = 85       # per-frame duration. NIGHT plays slower (calmer sea, and a
NIGHT_FRAME_MS = 110  # slower, more gradual dissolve) — see frame_ms in gen.
# Per-wave timeline in instance-phase units (phi in [0,1) = one per-wave cycle).
# advance: t 0->1 over [0, ADV_END]; then NO pause — pull back + dissolve over
# the next DISSOLVE_SPAN, reaching fully transparent exactly when the wave has
# eased PULLBACK of the way back (so a 0.25 pull-back is fully gone at 25% back);
# then the wave is gone until the loop wrap. The two instances are half a cycle
# apart, so the NEXT wave is already advancing while this one pulls back.
FADE_IN = 0.25    # incoming (new) wave is fully visible by 50% of the way up from
                  # its start — a gentle build (fast-in looked abrupt).
ADV_END = 0.5     # phi at which the advance ends (wave reaches the beach).
DISSOLVE_SPAN = 0.35  # phi span of the (visible) pull-back + dissolve. Bigger =
                  # slower / more visible retreat. Must be < (1 - ADV_END) so the
                  # wave is fully gone before the wrap and the next wave overlaps.
PULLBACK = 0.25   # fraction of the way back the wave eases as it dissolves; the
                  # dissolve completes exactly at this point (0.25 = gone at 25%
                  # back toward the start). All scenes.
# Foam-gate the leading wash so the FOAM is the true leading edge with bare sand
# in front of it, instead of a tongue of blue water washing up onto the beach
# (very noticeable on bright morning/afternoon sand). In the forward zone, dim
# water is cut and bright foam is kept; the foam/water split is a per-frame
# RELATIVE brightness threshold (percentiles of the wave's own pixels) so it
# adapts across times of day. The sea-side wave body is left fully intact.
FRONT_DEPTH = 7   # source px sea-ward of the front that the foam-gate covers
FRONT_CUT = 1.0   # strength of the forward water cut (0 = off, 1 = full)
FOAM_LO_PCT = 55  # brightness percentile at/below which a forward pixel reads as
FOAM_HI_PCT = 88  # water (cut); at/above FOAM_HI_PCT it reads as foam (kept)
# Synthetic white foam crest, NIGHT ONLY. The night base water is dark and the
# swell retouch left little natural foam, so the wave reads flat. This paints a
# soft light-white band along the moving leading edge, tied to the wave's
# opacity (o) so it forms as the wave washes up and vanishes as the wave pulls
# back and dissolves. Daytime scenes get their foam from the source image, so
# NIGHT_FOAM only applies to night.
NIGHT_FOAM = 0.7      # white-blend strength at the crest (0 = none, 1 = pure white)
FOAM_EDGE_W = 3.5     # foam band gaussian width (source px) — bigger = thicker foam
FOAM_EDGE_OFF = 2.5   # foam crest offset sea-side of the front (source px)
FOAM_SCATTER = 0.7    # how much a blobby noise texture breaks up the foam (0 =
                      # solid line, 1 = fully scattered) so it reads as foam, not
                      # a bold clean line. Only the advancing wave gets foam; the
                      # dissolving wave leaves none (no line at the washed-up edge).
FEATHER = 9     # leading-edge feather width (source px) — bigger = softer front
FEATHER_START = 0.8  # wash progress (0..1) at which the front feather begins
                     # (stays foamy/defined until here, then feathers out on the crash)
SIGMA_FRAC = 0.13   # warp locality (fraction of crop width) — smaller = more
                    # localized drag, less global deformation
W0 = 0.06           # zero-displacement baseline weight — pulls the far field
                    # back to no-warp so only the surf band deforms
WAVE_ALPHA = 1.0    # peak opacity of the warped surf. Must be ~1.0 so the
                    # moving wave fully COVERS the static surf baked into the
                    # source desk-scene image. At <1 the static surf bleeds
                    # through — invisible by day, but at night the original's
                    # bright static foam reads clearly over the dark water and
                    # looks like the (unmoving) original is always showing.
                    # The far/sea side warps ~0 so the overlay matches the
                    # source there: full opacity creates no seam.


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

    # Tree mask: detect vegetation so the palms along the shoreline punch
    # through the wave's alpha (wave goes behind them). Green-ish foliage, OR
    # very dark NON-BLUE pixels (palm silhouettes). The non-blue guard is
    # essential at NIGHT: the dark sea is dark-but-BLUISH (B noticeably > R),
    # so without it the dark clause mistakes the whole night ocean for foliage
    # and punches the wave + foam out across most of the surf.
    Rc, Gc, Bc = crop[:, :, 0], crop[:, :, 1], crop[:, :, 2]
    bright = (Rc + Gc + Bc) / 3
    veg = ((Gc > Bc) & (Gc > Rc * 0.85) & (bright < 150)) | ((bright < 70) & (Bc < Rc + 8))
    treem = np.asarray(
        Image.fromarray((veg * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(sc * 0.6))
    ).astype(np.float32) / 255

    ys, xs = np.mgrid[0:ch, 0:cw]
    gx = xs.astype(np.float32)
    gy = ys.astype(np.float32)
    sigma = cw * SIGMA_FRAC
    foam_white = NIGHT_FOAM if t_name == 'night' else 0.0  # night-only foam crest
    frame_ms = NIGHT_FRAME_MS if t_name == 'night' else FRAME_MS  # night runs slower

    # Per-control-point warp scale (1 = full warp). NIGHT: damp the TOP end of
    # the leading edge — pts 2 & 3 (the upper wave near the headland) were
    # washing in too far — tapering back to full so there's no kink.
    warp_scale = np.ones(len(start), np.float32)
    if t_name == 'night':
        warp_scale[1] = 0.40   # pt 2 (top)
        warp_scale[2] = 0.60   # pt 3
        warp_scale[3] = 0.85   # pt 4 (taper back to full)

    # Night foam scatter texture: blobby noise in crop space so the foam reads
    # as scattered foam instead of a clean bold line. Fixed seed -> the bake is
    # deterministic (no Math.random-style nondeterminism between runs).
    if foam_white > 0:
        rng = np.random.default_rng(1234)
        nz = rng.random((ch, cw)).astype(np.float32)
        nz = np.asarray(Image.fromarray((nz * 255).astype('uint8'))
                        .filter(ImageFilter.GaussianBlur(sc * 0.9))).astype(np.float32) / 255
        nz = (nz - nz.min()) / (nz.max() - nz.min() + 1e-6)
        foam_tex = (1 - FOAM_SCATTER) + FOAM_SCATTER * np.clip((nz - 0.30) / 0.5, 0, 1)
    else:
        foam_tex = None

    def inst(phi):
        """One wave instance at phase phi in [0,1): advances start->end while
        forming, then (no pause) eases back PULLBACK of the way while it
        dissolves. Returns (rgb, alpha, o)."""
        # Position: advance start->end linearly over [0, ADV_END] (the wave
        # starts MOVING immediately as it fades in), then with NO pause recede
        # PULLBACK of the way back over the next DISSOLVE_SPAN while it dissolves.
        # It is fully transparent (and held just shy of the start) once that
        # completes, so the remaining snap back to the start at the loop wrap is
        # invisible and the next cycle begins cleanly from the start.
        if phi < ADV_END:
            t = phi / ADV_END                                       # advance 0 -> 1
        elif phi < ADV_END + DISSOLVE_SPAN:
            t = 1.0 - PULLBACK * (phi - ADV_END) / DISSOLVE_SPAN     # pull back 1 -> 1-PULLBACK
        else:
            t = 1.0 - PULLBACK                                       # gone (invisible) until wrap
        I = R + (E - R) * t * warp_scale[:, None]  # intermediate control points
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

        # Opacity:
        #   advance:  smooth fade-in 0->1 over [0, FADE_IN], then hold full to the
        #             beach (no settle).
        #   dissolve: LINEAR fade 1->0 over [ADV_END, ADV_END+DISSOLVE_SPAN] — a
        #             steady, gradual fade so the pull-back is visible the whole
        #             way — then gone until the loop wrap.
        if phi < FADE_IN:
            u = phi / FADE_IN
            o = u * u * (3.0 - 2.0 * u)
        elif phi < ADV_END:
            o = 1.0
        elif phi < ADV_END + DISSOLVE_SPAN:
            o = 1.0 - (phi - ADV_END) / DISSOLVE_SPAN
        else:
            o = 0.0

        # Foam-gate the forward wash (see FRONT_* tunables): keep bright foam at
        # the leading edge, cut the dim blue water that would otherwise sit on
        # the sand in front of it. Per-frame relative brightness so it adapts to
        # the time of day; only the forward zone (small edist) is affected.
        b = wp.mean(axis=2)
        sel = mm > 0.3
        if sel.any():
            lo = np.percentile(b[sel], FOAM_LO_PCT)
            hi = np.percentile(b[sel], FOAM_HI_PCT)
            foam = np.clip((b - lo) / max(hi - lo, 1.0), 0, 1)
        else:
            foam = np.ones_like(b)
        fwd = np.clip(1 - edist / (sc * FRONT_DEPTH), 0, 1)
        front_keep = 1 - fwd * FRONT_CUT * (1 - foam)

        a = mm * WAVE_ALPHA * (1 - treem) * ledge * o * front_keep

        # Night-only white foam crest along the moving leading edge: a soft
        # bright band centered just inside the front. Tied to o, so it forms as
        # the wave washes up and fades out as it pulls back and dissolves. It
        # overrides the feathered front (that is the point — a defined foam lip).
        if foam_white > 0:
            # Foam envelope: full through the advance, then fade WITH the linear
            # dissolve while the edge recedes — so the foam carries up the beach
            # and is visibly there as the wave pulls back, then gone.
            if phi < ADV_END:
                foam_env = min(1.0, o * 1.6)            # full through the advance
            else:
                foam_env = o                            # fade with the dissolve / recede
            band = np.exp(-((edist - sc * FOAM_EDGE_OFF) / (sc * FOAM_EDGE_W)) ** 2)
            band = band * foam_tex                      # scatter into foamy clumps
            fa = band * mm * (1 - treem) * foam_env * foam_white
            wp = wp * (1 - fa[..., None]) + 255.0 * fa[..., None]
            a = a + fa * (1 - a)
        return wp, a, o

    # ROLLING WAVES: two instances half a period apart. Over the loop, one
    # advances+forms while the other pulls back + dissolves. The incoming
    # (advancing) wave is drawn ON TOP, with the outgoing (receding) one behind.
    fr = []
    for i in range(N):
        ph = (i / N) * 0.5            # instance A: 0 -> 0.5 (advancing, incoming)
        adv = inst(ph)
        rec = inst(ph + 0.5)          # instance B: 0.5 -> 1 (pulling back + dissolving)
        acc_rgb = np.zeros((ch, cw, 3), np.float32)
        acc_a = np.zeros((ch, cw), np.float32)
        for wp, a, _o in (rec, adv):  # back-to-front: dissolving behind, advancing on top
            out_a = a + acc_a * (1.0 - a)
            guard = np.where(out_a > 1e-6, out_a, 1.0)[..., None]
            acc_rgb = (wp * a[..., None] + acc_rgb * (acc_a * (1.0 - a))[..., None]) / guard
            acc_a = out_a
        fr.append(Image.fromarray(np.dstack([acc_rgb, acc_a * 255]).astype('uint8')))

    os.makedirs(OUT_DIR, exist_ok=True)
    out = f'{OUT_DIR}/beach-wave-{t_name}.webp'
    fr[0].save(out, 'webp', save_all=True, append_images=fr[1:],
               duration=frame_ms, loop=0, quality=80, method=4)
    return round(os.path.getsize(out) / 1024)


if __name__ == '__main__':
    print('bbox (scene-%):',
          'left', round(BL, 2), 'top', round(BT, 2),
          'width', round(BW, 2), 'height', round(BH, 2))
    for t in ['morning', 'afternoon', 'evening', 'night']:
        print(f'beach-wave-{t}.webp', gen(t), 'KB')
