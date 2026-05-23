"""One-shot script (idempotent) that adapts notebooks for JupyterLite.

Two adjustments:

1. **mp4 -> npz.** Pyodide doesn't ship pyav, so notebooks 02 and 03 can't
   decode the .mp4 directly. We rewrite the data-loading block to read from
   `data/45grains_frames.npz` instead (produced by `scripts/prep_data.py`).

2. **piplite install.** Pyodide ships numpy/matplotlib/ipywidgets but NOT
   ipympl (required by `%matplotlib widget`) or k3d (volume rendering).
   We prepend a `%pip install` line to each labeled cell so piplite pulls
   them in at kernel boot.

Idempotent: if a notebook has already been patched, this is a no-op.

Run once after copying notebooks from upstream em-template:

    python scripts/_adapt_notebooks.py
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "notebooks"

NB02 = ROOT / "02.animation_movie.ipynb"
NB03 = ROOT / "03.interactive_movie.ipynb"

OLD_IMPORT = "import imageio.v3 as iio\n"
NEW_IMPORT = (
    "# Frames are pre-decoded by scripts/prep_data.py.\n"
    "# Pyodide (JupyterLite) does not ship pyav, so we load from .npz instead.\n"
)

OLD_02_BLOCK = [
    "plot_every_frame = 6\n",
    'file_name = "data/45grains_compressed.mp4"\n',
    'video_shape = iio.improps(file_name,plugin="pyav").shape\n',
    "num_frames = video_shape[0] // plot_every_frame\n",
    "frames = np.empty((num_frames,)+video_shape[1:-1],dtype=np.uint8)\n",
    "\n",
    'with iio.imopen(file_name,"r",plugin="pyav") as vid:\n',
    "    for index in range(num_frames):\n",
    "        frames[index] = 255 - vid.read(index=index*plot_every_frame)[:,:,0]\n",
]
NEW_02_BLOCK = [
    "plot_every_frame = 6\n",
    '_npz = np.load("data/45grains_frames.npz")\n',
    '_prep_stride = int(_npz["stride"])\n',
    "_subsample = max(1, plot_every_frame // _prep_stride)\n",
    'frames = 255 - _npz["frames"][::_subsample]\n',
    "num_frames = frames.shape[0]\n",
]

OLD_03_BLOCK = [
    "plot_every_frame = 2\n",
    'file_name = "data/45grains_compressed.mp4"\n',
    'video_shape = iio.improps(file_name,plugin="pyav").shape\n',
    "num_frames = video_shape[0] // plot_every_frame\n",
]
NEW_03_BLOCK = [
    "plot_every_frame = 2\n",
    '_npz = np.load("data/45grains_frames.npz")\n',
    '_prep_stride = int(_npz["stride"])\n',
    "_subsample = max(1, plot_every_frame // _prep_stride)\n",
    'frames = _npz["frames"][::_subsample]\n',
    "num_frames = frames.shape[0]\n",
]

# Line-level swaps inside notebook 03's callbacks / plot setup.
LINE_SWAPS_03 = {
    "array = iio.imread(file_name,index=0,plugin='pyav')[:,:,0]\n": "array = frames[0]\n",
    "    array = iio.imread(file_name,index=index*plot_every_frame,plugin='pyav')[:,:,0] # grayscale image\n":
        "    array = frames[index] # grayscale image\n",
}


def replace_subseq(lines: list[str], old: list[str], new: list[str]) -> tuple[list[str], bool]:
    """Replace the first contiguous occurrence of `old` in `lines` with `new`."""
    n = len(old)
    for i in range(len(lines) - n + 1):
        if lines[i:i + n] == old:
            return lines[:i] + new + lines[i + n:], True
    return lines, False


def patch_cell_source(src: str | list[str], replacements) -> tuple[list[str], bool]:
    lines = src.splitlines(keepends=True) if isinstance(src, str) else list(src)
    changed = False
    for old, new in replacements:
        if isinstance(old, list):
            lines, did = replace_subseq(lines, old, new)
            changed = changed or did
        else:
            for i, line in enumerate(lines):
                if line == old:
                    lines[i] = new
                    changed = True
    return lines, changed


def patch_notebook(path: Path, replacements, marker: str) -> None:
    nb = json.loads(path.read_text())
    any_changed = False
    for cell in nb["cells"]:
        if cell["cell_type"] != "code":
            continue
        src = cell.get("source", "")
        src_str = "".join(src) if isinstance(src, list) else src
        if marker not in src_str:
            continue
        new_lines, changed = patch_cell_source(src, replacements)
        if changed:
            cell["source"] = new_lines
            any_changed = True
    if any_changed:
        path.write_text(json.dumps(nb, indent=1) + "\n")
        print(f"[patched] {path.name}")
    else:
        print(f"[skip] {path.name} already patched (or marker not found)")


def main() -> int:
    if not NB02.exists() or not NB03.exists():
        print("Notebooks not found; nothing to patch.", file=sys.stderr)
        return 1

    replacements_02 = [
        (OLD_IMPORT, NEW_IMPORT.splitlines(keepends=True)[0] if False else None),  # see below
        (OLD_02_BLOCK, NEW_02_BLOCK),
    ]
    # The import replacement is special-cased: one line -> two lines. Handle
    # it by replacing the import line as a single-line entry whose value is a
    # *joined* string covering both new lines (Jupyter accepts either form).
    replacements_02 = [
        (OLD_IMPORT, NEW_IMPORT),
        (OLD_02_BLOCK, NEW_02_BLOCK),
    ]

    replacements_03 = [
        (OLD_IMPORT, NEW_IMPORT),
        (OLD_03_BLOCK, NEW_03_BLOCK),
        *list(LINE_SWAPS_03.items()),
    ]

    patch_notebook(NB02, replacements_02, marker="iio.improps")
    patch_notebook(NB03, replacements_03, marker="iio.improps")

    # Prepend a JupyterLite bootstrap block to every notebook's first code cell:
    #   1. `%pip install` for Pyodide-missing packages (ipympl, k3d)
    #   2. chdir into `/drive` (where JupyterLite mounts contents) so relative
    #      data paths like `data/foo.npz` resolve. No-op in standard Jupyter.
    bootstraps = {
        "01.interactive_image.ipynb":            ["%pip install -q ipympl\n"],
        "02.animation_movie.ipynb":              ["%pip install -q ipympl\n"],
        "03.interactive_movie.ipynb":            ["%pip install -q ipympl\n"],
        "04.interactive_volume_slicing.ipynb":   ["%pip install -q ipympl\n"],
        "05.interactive_volume_rendering.ipynb": ["%pip install -q ipympl k3d\n"],
        "06.custom_FT_1D.ipynb":                 ["%pip install -q ipympl\n"],
    }
    chdir_lines = [
        "import os\n",
        "if os.path.isdir('/drive'):  # JupyterLite: contents mount, kernel CWD is /home/pyodide\n",
        "    os.chdir('/drive')\n",
    ]
    for filename, pip_lines in bootstraps.items():
        prepend_bootstrap(ROOT / filename, pip_lines + ["\n"] + chdir_lines)

    return 0


def prepend_bootstrap(path: Path, bootstrap_lines: list[str]) -> None:
    """Insert a bootstrap block (pip install + chdir) at the top of the first
    code cell of `path`.

    Idempotent across the two markers we use:
      - "pip install" implies the install line is already there
      - "/drive"      implies the chdir line is already there

    If either is found, the existing block is replaced wholesale so we can
    safely re-run after the bootstrap content changes.
    """
    if not path.exists():
        print(f"[skip] {path.name} not found", file=sys.stderr)
        return
    nb = json.loads(path.read_text())
    for cell in nb["cells"]:
        if cell["cell_type"] != "code":
            continue
        src = cell.get("source", "")
        lines = src if isinstance(src, list) else src.splitlines(keepends=True)

        # Strip any prior bootstrap block: contiguous lines mentioning
        # `pip install` or `/drive`, plus any blank line immediately after.
        marker = lambda ln: "pip install" in ln or "/drive" in ln or "os.chdir" in ln
        if any(marker(ln) for ln in lines):
            # Remove the first contiguous run of marker+context.
            start = next(i for i, ln in enumerate(lines) if marker(ln))
            end = start
            while end < len(lines) and (marker(lines[end]) or lines[end].strip() == "" or lines[end].startswith("import os")):
                end += 1
            lines = lines[:start] + lines[end:]
            print(f"[strip] {path.name} (removed prior bootstrap)")

        # Insert after any leading comment/blank lines so `#| label:` stays at top.
        insert_at = 0
        for i, line in enumerate(lines):
            if line.startswith("#") or line.strip() == "":
                insert_at = i + 1
            else:
                break
        new_lines = lines[:insert_at] + bootstrap_lines + ["\n"] + lines[insert_at:]
        cell["source"] = new_lines
        path.write_text(json.dumps(nb, indent=1) + "\n")
        print(f"[patched] {path.name} (+bootstrap)")
        return
    print(f"[skip] {path.name} has no code cells", file=sys.stderr)


if __name__ == "__main__":
    raise SystemExit(main())
