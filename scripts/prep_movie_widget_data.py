"""Build widget-friendly data file for the interactive-movie anywidget.

Decodes notebooks/data/45grains_compressed.mp4 to uint8 grayscale frames and
writes them as a contiguous binary blob plus a JSON metadata sidecar:

    widgets/data/interactive_movie.bin    # raw uint8 frame data
    widgets/data/interactive_movie.json   # shape, fps, pixel_size_nm, ...

Decoding stride matches notebook 02 (`plot_every_frame=6`), giving 72 frames
from the 432-frame source. The widget renders one frame at a time, applying
the user's chosen colormap and display window in JavaScript.

Run once before building the site (CI does this automatically):

    python scripts/prep_movie_widget_data.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent
MP4_PATH = REPO_ROOT / "notebooks" / "data" / "45grains_compressed.mp4"
OUT_BIN = REPO_ROOT / "widgets" / "data" / "interactive_movie.bin"
OUT_META = REPO_ROOT / "widgets" / "data" / "interactive_movie.json"

STRIDE = 6                # match notebook 02 — every 6th source frame
PIXEL_SIZE_NM = 0.0151    # from notebook 02
SCALEBAR_LENGTH_NM = 2.0  # initial / default scalebar


def main() -> int:
    if not MP4_PATH.exists():
        print(f"Input not found: {MP4_PATH}", file=sys.stderr)
        return 1

    import imageio.v3 as iio

    print(f"[probe] {MP4_PATH.name}")
    props = iio.improps(MP4_PATH, plugin="pyav")
    total_frames = props.shape[0]
    num_frames = total_frames // STRIDE
    print(f"        source: {total_frames} frames, decoding stride={STRIDE} -> {num_frames} frames")

    first = iio.imread(MP4_PATH, index=0, plugin="pyav")[:, :, 0]
    H, W = first.shape
    frames = np.empty((num_frames, H, W), dtype=np.uint8)

    with iio.imopen(MP4_PATH, "r", plugin="pyav") as vid:
        for i in range(num_frames):
            frames[i] = vid.read(index=i * STRIDE)[:, :, 0]
            if (i + 1) % 12 == 0 or i == num_frames - 1:
                print(f"        decoded {i + 1}/{num_frames}")

    OUT_BIN.parent.mkdir(parents=True, exist_ok=True)
    OUT_BIN.write_bytes(frames.tobytes())
    print(f"[write] {OUT_BIN.relative_to(REPO_ROOT)}  {OUT_BIN.stat().st_size / 1e6:.2f} MB")

    meta = {
        "shape": [num_frames, H, W],         # [N, H, W]
        "dtype": "uint8",
        "stride": STRIDE,
        "source_fps": 30,
        "playback_fps_default": 20,          # matches notebook anim interval=50 ms
        "pixel_size_nm": PIXEL_SIZE_NM,
        "scalebar_length_nm": SCALEBAR_LENGTH_NM,
    }
    OUT_META.write_text(json.dumps(meta, indent=2) + "\n")
    print(f"[write] {OUT_META.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
