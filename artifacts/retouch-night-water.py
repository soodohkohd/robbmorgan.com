#!/usr/bin/env python3
"""Calm the static open-water swell lines in the NIGHT desk scene.

The AI-generated night background baked visible swell/foam contour lines across
the whole bay. The beach-wave animation (make-beach-wave.py) only warps the
SHORE foam line inside a small patch, so those open-sea swells stay frozen and
read as grey outlines at night (dark water makes them pop). This retouch pulls
the cool-blue swell pixels in the open sea toward a median-filtered (thin-line-
removing) version of the water, dissolving the contours into ambient sea while:
  - PRESERVING the warm city lights + their water reflections (hue gate: only
    cool B>R pixels are calmed), and
  - STAYING SEA-SIDE of the shore foam line (the SEA polygon below) so the
    animated surf the wave generator samples is left intact.

Run from the repo root:
  python3 artifacts/retouch-night-water.py            # writes /tmp preview only
  python3 artifacts/retouch-night-water.py --apply    # writes the PNG + WebP

--apply updates BOTH artifacts/background-night.png (source) and
code/public/desk-scene-night.webp (served, quality 85). After --apply,
REGENERATE the night wave so its far field matches the calmed base:
  python3 artifacts/make-beach-wave.py
"""
import sys
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

SRC = 'artifacts/background-night.png'
WEBP = 'code/public/desk-scene-night.webp'

# Open-sea polygon in scene-% (sea-side of the shore foam line; avoids the sand
# and stays clear of the brightest light cluster — the hue gate handles any
# warm pixels that fall inside it). Points trace: top-right horizon -> down the
# right image edge -> back along the beach a touch sea-side of the surf line.
SEA = [(26.5, 23.0), (32.2, 22.0), (32.2, 37.5), (30.2, 37.5),
       (28.8, 33.5), (27.6, 29.5), (26.8, 26.0), (26.3, 24.0)]

MEDIAN = 11      # median window (odd). Bigger = removes wider swell bands but
                 # risks dulling broad features. 11px kills the thin contours.
STRENGTH = 0.92  # blend toward the calmed median inside the mask (1 = full).
FEATHER = 7      # mask edge feather (scene px) so the calmed sea blends in.


def retouch(im):
    W, H = im.size
    arr = np.asarray(im).astype(np.float32)
    med = np.asarray(im.filter(ImageFilter.MedianFilter(MEDIAN))).astype(np.float32)

    # Feathered sea mask.
    m = Image.new('L', (W, H), 0)
    ImageDraw.Draw(m).polygon([(x / 100 * W, y / 100 * H) for x, y in SEA], fill=255)
    m = m.filter(ImageFilter.GaussianBlur(FEATHER))
    M = np.asarray(m).astype(np.float32) / 255

    # Hue gate: only calm COOL pixels (B > R) — leaves warm city lights and their
    # reflections. Ramp over a small band so the gate has no hard cutoff.
    R, B = arr[:, :, 0], arr[:, :, 2]
    cool = np.clip((B - R * 1.02) / 12.0, 0, 1)

    alpha = (M * cool * STRENGTH)[:, :, None]
    out = arr * (1 - alpha) + med * alpha
    return Image.fromarray(np.clip(out, 0, 255).astype('uint8'))


def main():
    apply = '--apply' in sys.argv
    im = Image.open(SRC).convert('RGB')
    out = retouch(im)
    if apply:
        out.save(SRC)
        out.save(WEBP, 'webp', quality=85, method=6)
        print('wrote', SRC, 'and', WEBP)
        print('NOW REGENERATE THE WAVE: python3 artifacts/make-beach-wave.py')
    else:
        out.save('/tmp/night-retouched.png')
        im.save('/tmp/night-original.png')
        print('preview -> /tmp/night-retouched.png (and /tmp/night-original.png)')


if __name__ == '__main__':
    main()
