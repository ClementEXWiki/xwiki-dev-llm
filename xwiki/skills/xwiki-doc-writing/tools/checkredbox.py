# -*- coding: utf-8 -*-
"""Prove that the red box on each screenshot is a *complete* rectangle.

    python3 checkredbox.py [shot-name …]        # default: every PNG under SHOTS (default "shots")

A box clipped by an ancestor with `overflow: hidden`, or cut off by the capture region, loses an edge
— and nothing else in the pipeline notices: the PNG is valid, the page renders, the checker stays
quiet, and the defect is found by a human looking at the published page.

Two things make this less obvious than it sounds:

- **Decoding.** Neither PIL nor ImageMagick can be assumed, so the decoder is the browser: the PNG is
  handed to a canvas as a data URL through the same `agent-browser` session used to capture it.
- **A whole-image red bounding box is not a usable test.** Red page content — error boxes, warning
  text, a red link — stretches it, so the edge coverage of that box means nothing. What is looked for
  instead is a *closed* rectangle: two long horizontal red runs of equal extent joined by vertical
  runs at both ends. Stray red text yields only short runs. The vertical probes are inset a few
  pixels because a rounded corner leaves the very ends of an edge unpainted.
"""
import base64
import glob
import os
import subprocess
import sys

SESSION = os.environ.get('AB_SESSION', 'doc')
SHOTS = os.environ.get('SHOTS', 'shots')

JS = r"""
(async () => {
  const img = new Image();
  img.src = 'data:image/png;base64,' + BASE64;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, c.width, c.height).data;
  const W = c.width, H = c.height;
  // Resampling to the target width softens pure 255,0,0, so match on hue rather than equality.
  const red = (x, y) => { const i = (y * W + x) * 4;
    return d[i] > 150 && d[i+1] < 110 && d[i+2] < 110 && d[i] - Math.max(d[i+1], d[i+2]) > 60; };
  const near = (x, y) => red(x, y) || red(x, y + 1) || red(x, y - 1);
  const vnear = (x, y) => red(x, y) || red(x + 1, y) || red(x - 1, y);
  let any = false;
  for (let y = 0; y < H && !any; y++) for (let x = 0; x < W; x++) if (red(x, y)) { any = true; break; }
  if (!any) return JSON.stringify({ok: false, why: 'no red pixels at all'});
  const MINW = 20, MINH = 12;
  const hruns = [];
  for (let y = 0; y < H; y++) {
    let s = -1;
    for (let x = 0; x <= W; x++) {
      const on = x < W && near(x, y);
      if (on && s < 0) s = x;
      if (!on && s >= 0) { if (x - s >= MINW) hruns.push({y, x0: s, x1: x - 1}); s = -1; }
    }
  }
  const solid = (fn, from, to) => {
    let k = 0; for (let i = from; i <= to; i++) if (fn(i)) k++; return k / (to - from + 1);
  };
  const boxes = [];
  for (let i = 0; i < hruns.length; i++) for (let j = i + 1; j < hruns.length; j++) {
    const a = hruns[i], b = hruns[j];
    if (b.y - a.y < MINH) continue;
    if (Math.abs(a.x0 - b.x0) > 3 || Math.abs(a.x1 - b.x1) > 3) continue;
    const inset = Math.min(6, Math.floor((b.y - a.y) / 4));
    if (solid(y => vnear(a.x0, y), a.y + inset, b.y - inset) > 0.9 &&
        solid(y => vnear(a.x1, y), a.y + inset, b.y - inset) > 0.9) boxes.push([a.x0, a.y, a.x1, b.y]);
  }
  // A 3px border matches at three concentric offsets; keep only the outermost of each family.
  const outer = boxes.filter(b => !boxes.some(o => o !== b &&
    o[0] <= b[0] && o[1] <= b[1] && o[2] >= b[2] && o[3] >= b[3] && (o[2] - o[0]) > (b[2] - b[0])));
  return JSON.stringify({ok: outer.length > 0, boxes: outer.slice(0, 4), size: [W, H]});
})()
"""


def check(path):
    b64 = base64.b64encode(open(path, 'rb').read()).decode()
    p = subprocess.run(['agent-browser', '--session', SESSION, 'eval', '--stdin'],
                       input=JS.replace('BASE64', repr(b64)), capture_output=True, text=True)
    if p.returncode != 0:
        return None, p.stderr.strip()[:200]
    return p.stdout.strip().strip('"').replace('\\"', '"'), None


def main():
    names = sys.argv[1:] or sorted(os.path.basename(f)[:-4]
                                   for f in glob.glob(os.path.join(SHOTS, '*.png')))
    if not names:
        raise SystemExit(f'no PNG found under {SHOTS}/')
    bad = 0
    for name in names:
        res, err = check(os.path.join(SHOTS, f'{name}.png'))
        if err:
            print(f'{name}: ERROR {err}')
            bad += 1
            continue
        print(f'{name}: {res}')
        if '"ok":false' in res.replace(' ', ''):
            bad += 1
    print(f'\n{len(names)} screenshot(s) checked, {bad} with an incomplete red box')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
