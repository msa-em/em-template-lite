"""Build widget-friendly data file for the volume anywidgets.

Quantizes notebooks/data/CNT_overlap_tomo_missing.h5 (float32 reconstruction)
to a uint8 volume plus a JSON sidecar. The same .bin is used by both
interactive-volume-slicing.js and interactive-volume-rendering.js.

    widgets/data/interactive_volume.bin    # uint8 voxel data, raw row-major
    widgets/data/interactive_volume.json   # shape, raw min/max/mean/std, units

The widget de-quantizes as needed for display-range UI:

    raw_value = vmin_raw + (uint8 / 255) * (vmax_raw - vmin_raw)

Run once before building the site (CI does this automatically):

    python scripts/prep_volume_widget_data.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

REPO_ROOT = Path(__file__).resolve().parent.parent
H5_PATH = REPO_ROOT / "notebooks" / "data" / "CNT_overlap_tomo_missing.h5"
OUT_BIN = REPO_ROOT / "widgets" / "data" / "interactive_volume.bin"
OUT_META = REPO_ROOT / "widgets" / "data" / "interactive_volume.json"


def main() -> int:
    if not H5_PATH.exists():
        print(f"Input not found: {H5_PATH}", file=sys.stderr)
        return 1

    import h5py

    print(f"[load] {H5_PATH.name}")
    with h5py.File(H5_PATH, "r") as f:
        vol = f["reconstruction"][:].astype(np.float32)
    D0, D1, D2 = vol.shape
    print(f"        shape={vol.shape} dtype={vol.dtype}")

    vmin_raw = float(vol.min())
    vmax_raw = float(vol.max())
    mean_raw = float(vol.mean())
    std_raw = float(vol.std())

    scale = 255.0 / (vmax_raw - vmin_raw) if vmax_raw > vmin_raw else 0.0
    quantized = np.round((vol - vmin_raw) * scale).clip(0, 255).astype(np.uint8)

    OUT_BIN.parent.mkdir(parents=True, exist_ok=True)
    OUT_BIN.write_bytes(quantized.tobytes())
    print(f"[write] {OUT_BIN.relative_to(REPO_ROOT)}  {OUT_BIN.stat().st_size / 1e6:.2f} MB")

    meta = {
        "shape": [D0, D1, D2],
        "axis_labels": ["x", "y", "z"],  # naming for the orthoview UI
        "dtype": "uint8",
        "vmin_raw": vmin_raw,
        "vmax_raw": vmax_raw,
        "mean_raw": mean_raw,
        "std_raw": std_raw,
    }
    OUT_META.write_text(json.dumps(meta, indent=2) + "\n")
    print(f"[write] {OUT_META.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
