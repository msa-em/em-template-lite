"""Build widget-friendly data files from notebook .npz inputs.

The interactive image anywidget loads pixel data directly in the browser.
Shipping the raw float32 npz (15.7 MB) over the wire is wasteful, so this
script quantizes each frame to uint16 with per-frame vmin/vmax and writes:

    widgets/data/interactive_image.bin    # raw uint16 frame data
    widgets/data/interactive_image.json   # metadata (shape, labels, ranges)

The widget reconstructs an approximate float value as:

    f = vmin_i + (uint16_value / 65535) * (vmax_i - vmin_i)

65535 levels is far more than any display can show; quantization is lossless
for visualization purposes.

Run once before building the site (CI does this automatically):

    python scripts/prep_widget_data.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent
NPZ_PATH = REPO_ROOT / "notebooks" / "data" / "im_graphene_EWR_small.npz"
OUT_BIN = REPO_ROOT / "widgets" / "data" / "interactive_image.bin"
OUT_META = REPO_ROOT / "widgets" / "data" / "interactive_image.json"

# Matches notebooks/01.interactive_image.ipynb: ~130 pixels per 2 nm.
PIXEL_SIZE_NM = 2.0 / 130.0
FRAME_LABELS = ["exit wave phase", "exit wave amplitude"]


def main() -> int:
    if not NPZ_PATH.exists():
        print(f"Input not found: {NPZ_PATH}", file=sys.stderr)
        return 1

    print(f"[load] {NPZ_PATH.name}")
    with np.load(NPZ_PATH) as f:
        stack = f["im_graphene_EWR"].astype(np.float32)  # (N, H, W)

    n_frames, h, w = stack.shape
    print(f"       shape={stack.shape} dtype={stack.dtype}")

    frame_meta = []
    quantized = np.empty(stack.shape, dtype=np.uint16)
    for i in range(n_frames):
        frame = stack[i]
        vmin = float(frame.min())
        vmax = float(frame.max())
        # Use a small percentile-based default display window for the widget.
        # The original notebook centers around mean +/- std; we preserve that
        # behaviour at the JS side and just remember the raw float window here.
        scale = 65535.0 / (vmax - vmin) if vmax > vmin else 0.0
        quantized[i] = np.round((frame - vmin) * scale).clip(0, 65535).astype(np.uint16)
        mean = float(frame.mean())
        std = float(np.sqrt(np.mean((frame - mean) ** 2)))
        frame_meta.append({
            "label": FRAME_LABELS[i] if i < len(FRAME_LABELS) else f"frame {i}",
            "vmin": vmin,
            "vmax": vmax,
            "mean": mean,
            "std": std,
        })

    OUT_BIN.parent.mkdir(parents=True, exist_ok=True)
    OUT_BIN.write_bytes(quantized.tobytes())
    print(f"[write] {OUT_BIN.relative_to(REPO_ROOT)}  {OUT_BIN.stat().st_size / 1e6:.2f} MB")

    meta = {
        "shape": list(stack.shape),         # [N, H, W]
        "dtype_stored": "uint16",
        "dtype_logical": "float32",
        "pixel_size_nm": PIXEL_SIZE_NM,
        "scalebar_length_nm": 2.0,
        "frames": frame_meta,
    }
    OUT_META.write_text(json.dumps(meta, indent=2) + "\n")
    print(f"[write] {OUT_META.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
