#!/bin/bash
# docshot.sh <out-name> <target-width> <capture-selector|VIEWPORT> [box-selector]
#
# Captures a documentation screenshot from a running `agent-browser` session, draws the red box the
# Documentation Guide requires, and resamples to exactly <target-width> px (960 = `extra`,
# 650 = `large`, 350 = `medium`, 150 = `small` — `size` is mandatory in the `documentation` space,
# so the capture width is what decides sharpness).
#
#   AB_SESSION=doc SHOTS=shots ./docshot.sh applications-panel 960 VIEWPORT '.panel li.selected'
#
# Set the viewport before calling, at devicePixelRatio 1, wide enough that the box is not against
# an edge:  agent-browser --session doc set viewport 1280 560 1
#
# The box is an overlay appended to <body>, NOT a CSS outline on the target: an outline (and a
# box-shadow) is clipped by any ancestor with `overflow: hidden` — XWiki's `.xwikipanelcontents` is
# one — which silently yields a box missing an edge. Body-level positioning escapes that. The script
# then fails rather than shooting if a box falls outside the viewport, since the capture itself
# would cut it. Run `checkredbox.py` afterwards to prove the saved PNG holds a closed rectangle.
set -e

SESSION="${AB_SESSION:-doc}"
DIR="${SHOTS:-shots}"
mkdir -p "$DIR"
OUT="$DIR/$1.png"
WIDTH="$2"
CAPTURE="$3"
BOX="$4"

if [ -n "$BOX" ]; then
  agent-browser --session "$SESSION" eval --stdin >/dev/null <<JS
(() => {
  document.querySelectorAll('[data-doc-box]').forEach(e => e.remove());
  const els = [...document.querySelectorAll('$BOX')];
  if (!els.length) throw new Error('box selector matched nothing: $BOX');
  let clipped = 0;
  els.forEach(e => {
    const r = e.getBoundingClientRect();
    const box = document.createElement('div');
    box.setAttribute('data-doc-box', '1');
    Object.assign(box.style, {
      position: 'absolute',
      left: (r.left + scrollX - 6) + 'px',
      top: (r.top + scrollY - 6) + 'px',
      width: (r.width + 6) + 'px',
      height: (r.height + 6) + 'px',
      border: '3px solid rgb(255, 0, 0)',
      borderRadius: '2px',
      pointerEvents: 'none',
      zIndex: '2147483647',
    });
    document.body.appendChild(box);
    const b = box.getBoundingClientRect();
    if (b.left < 0 || b.top < 0 || b.right > innerWidth || b.bottom > innerHeight) clipped++;
  });
  if (clipped) throw new Error(clipped + ' box(es) fall outside the viewport — enlarge it or scroll');
  return els.length;
})()
JS
fi

if [ "$CAPTURE" = "VIEWPORT" ]; then
  agent-browser --session "$SESSION" screenshot "$OUT" >/dev/null
else
  agent-browser --session "$SESSION" screenshot "$CAPTURE" "$OUT" >/dev/null
fi

# `sips` ships with macOS; there is no PIL or ImageMagick to assume.
sips --resampleWidth "$WIDTH" "$OUT" >/dev/null
sips -g pixelWidth -g pixelHeight "$OUT" | tr '\n' ' '
echo "-> $OUT"
