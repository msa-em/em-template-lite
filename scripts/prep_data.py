"""Pre-decode notebook data for Pyodide compatibility.

Pyodide (the Python distribution that powers JupyterLite) does not ship `pyav`,
the FFmpeg-binding library that the original notebooks use to read .mp4 files.
We work around this by decoding the videos once in CI (or locally) and saving
the resulting frames as a compressed .npz file. Notebooks then load the npz
with stdlib + numpy, both of which are present in Pyodide.

Run this script before building JupyterLite:

    python scripts/prep_data.py

It is idempotent: if the output file already exists and is newer than the
input, it is skipped.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "notebooks" / "data"

# Decode every Nth frame. The interactive_movie notebook uses every 2nd frame;
# the animation_movie notebook uses every 6th. We pre-decode at the finer
# stride (2) and let the coarser notebook subsample further at load time.
STRIDE = 2


def decode_mp4_to_npz(src: Path, dst: Path, stride: int = STRIDE) -> None:
    if dst.exists() and dst.stat().st_mtime > src.stat().st_mtime:
        print(f"[skip] {dst.name} is up to date")
        return

    import imageio.v3 as iio

    print(f"[decode] {src.name} -> {dst.name} (stride={stride})")
    props = iio.improps(src, plugin="pyav")
    total_frames = props.shape[0]
    num_frames = total_frames // stride

    # Read first frame to learn the spatial dims after grayscale conversion.
    first = iio.imread(src, index=0, plugin="pyav")[:, :, 0]
    frames = np.empty((num_frames,) + first.shape, dtype=np.uint8)

    with iio.imopen(src, "r", plugin="pyav") as vid:
        for i in range(num_frames):
            frames[i] = vid.read(index=i * stride)[:, :, 0]

    np.savez_compressed(dst, frames=frames, stride=stride)
    print(f"        {frames.shape} {frames.dtype}, "
          f"{dst.stat().st_size / 1e6:.1f} MB compressed")


def main() -> int:
    if not DATA_DIR.exists():
        print(f"Data dir not found: {DATA_DIR}", file=sys.stderr)
        return 1

    decode_mp4_to_npz(
        DATA_DIR / "45grains_compressed.mp4",
        DATA_DIR / "45grains_frames.npz",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
