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

# Explicit markers bracketing the auto-generated bootstrap block so the strip
# step in prepend_bootstrap() can replace the block wholesale without false
# matches on innocent code that happens to mention `os` or `pip`.
BOOTSTRAP_START_MARKER = "# --- jupyterlite bootstrap (auto-generated; do not edit) ---\n"
BOOTSTRAP_END_MARKER = "# --- end jupyterlite bootstrap ---\n"

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
    # JupyterLite on GitHub Pages can't mount the contents filesystem (no
    # SharedArrayBuffer headers, no working Service Worker). So `data/foo.npz`
    # paths don't resolve. We install a small async helper that:
    #   - tries the local filesystem first (works in standard Jupyter)
    #   - falls back to pyfetch for HTTP fetch from the JupyterLite contents
    helper_lines = [
        BOOTSTRAP_START_MARKER,
        "import os, sys, io, logging\n",
        "# Silence matplotlib's first-import font-cache build chatter.\n",
        "logging.getLogger('matplotlib.font_manager').setLevel(logging.WARNING)\n",
        "async def _smart_open_bytes(path):\n",
        "    \"\"\"Read a data file; fall back to HTTP fetch in JupyterLite (no FS mount on GH Pages).\"\"\"\n",
        "    if os.path.exists(path):\n",
        "        with open(path, 'rb') as _f:\n",
        "            return _f.read()\n",
        "    # JupyterLite Pyodide kernel: derive the contents URL from the worker's\n",
        "    # own location. Two known layouts:\n",
        "    #   (a) full JupyterLite: worker is inside `/lite/...`     -> root is up to `/lite/`\n",
        "    #   (b) thebe-lite-min:   worker is at the deploy root      -> `lite/` is a sibling\n",
        "    # We derive the JupyterLite root from `js.self.location.href` and append\n",
        "    # `files/<path>`. No hardcoded deploy path, no URL guessing.\n",
        "    import js\n",
        "    from pyodide.http import pyfetch\n",
        "    worker_url = str(js.self.location.href)\n",
        "    if '/lite/' in worker_url:\n",
        "        lite_root = worker_url[:worker_url.find('/lite/') + len('/lite/')]\n",
        "    else:\n",
        "        lite_root = worker_url.rsplit('/', 1)[0] + '/lite/'\n",
        "    url = lite_root + 'files/' + path\n",
        "    r = await pyfetch(url)\n",
        "    if r.status != 200:\n",
        "        raise FileNotFoundError(f'{path}: HTTP {r.status} from {url}')\n",
        "    return await r.bytes()\n",
        BOOTSTRAP_END_MARKER,
    ]
    for filename, pip_lines in bootstraps.items():
        prepend_bootstrap(ROOT / filename, pip_lines + ["\n"] + helper_lines)

    # Per-notebook: rewrite the actual file-opening calls to go through the helper.
    rewrite_data_loads()

    return 0


def rewrite_data_loads() -> None:
    """Replace direct `np.load(...)` and `h5py.File(...)` calls that reference
    `data/...` paths with `_smart_open_bytes`-based equivalents.

    Idempotent: detects the `_smart_open_bytes` marker before rewriting.
    """
    swaps = {
        "01.interactive_image.ipynb": [
            (
                "np.load('data/im_graphene_EWR_small.npz')['im_graphene_EWR']",
                "np.load(io.BytesIO(await _smart_open_bytes('data/im_graphene_EWR_small.npz')))['im_graphene_EWR']",
            ),
        ],
        "02.animation_movie.ipynb": [
            (
                'np.load("data/45grains_frames.npz")',
                'np.load(io.BytesIO(await _smart_open_bytes("data/45grains_frames.npz")))',
            ),
        ],
        "03.interactive_movie.ipynb": [
            (
                'np.load("data/45grains_frames.npz")',
                'np.load(io.BytesIO(await _smart_open_bytes("data/45grains_frames.npz")))',
            ),
        ],
        "04.interactive_volume_slicing.ipynb": [
            (
                'h5py.File("data/CNT_overlap_tomo_missing.h5","r")',
                'h5py.File(io.BytesIO(await _smart_open_bytes("data/CNT_overlap_tomo_missing.h5")), "r")',
            ),
        ],
        "05.interactive_volume_rendering.ipynb": [
            (
                'h5py.File("data/CNT_overlap_tomo_missing.h5","r")',
                'h5py.File(io.BytesIO(await _smart_open_bytes("data/CNT_overlap_tomo_missing.h5")), "r")',
            ),
        ],
    }
    for filename, pairs in swaps.items():
        path = ROOT / filename
        if not path.exists():
            continue
        nb = json.loads(path.read_text())
        changed = False
        for cell in nb["cells"]:
            if cell["cell_type"] != "code":
                continue
            src = cell.get("source", "")
            lines = src if isinstance(src, list) else src.splitlines(keepends=True)
            for old, new in pairs:
                for i, line in enumerate(lines):
                    if old in line and new not in line:
                        lines[i] = line.replace(old, new)
                        changed = True
            cell["source"] = lines
        if changed:
            path.write_text(json.dumps(nb, indent=1) + "\n")
            print(f"[rewrote data loads] {filename}")
        else:
            print(f"[skip data loads] {filename} (already rewritten or pattern absent)")


def prepend_bootstrap(path: Path, bootstrap_lines: list[str]) -> None:
    """Insert a bootstrap block (pip install + JupyterLite helpers) at the top
    of the first code cell of `path`.

    Idempotent: any block between BOOTSTRAP_START_MARKER and BOOTSTRAP_END_MARKER
    (plus any leading `%pip install` line and surrounding blank lines) is
    stripped before insertion. So re-running this script always yields the
    current canonical bootstrap, regardless of what the previous run produced.
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

        # Strip prior bootstrap. Find the start marker; if present, drop from
        # there to the end marker (inclusive). Also drop any %pip install line
        # immediately before, and any surrounding blank lines, to keep the cell
        # clean across re-runs.
        if BOOTSTRAP_START_MARKER in lines:
            start = lines.index(BOOTSTRAP_START_MARKER)
            try:
                end = lines.index(BOOTSTRAP_END_MARKER, start) + 1
            except ValueError:
                end = start + 1  # malformed; just remove the start marker
            # Extend left across any blank/pip-install lines so we don't leave
            # orphans behind.
            while start > 0 and (lines[start - 1].strip() == "" or "pip install" in lines[start - 1]):
                start -= 1
            # Extend right across blank lines.
            while end < len(lines) and lines[end].strip() == "":
                end += 1
            lines = lines[:start] + lines[end:]
            print(f"[strip] {path.name} (removed prior bootstrap)")
        elif any("pip install" in ln for ln in lines):
            # Older-style bootstrap (no markers); strip the contiguous run
            # around the pip install line.
            marker = lambda ln: "pip install" in ln or "/drive" in ln or "os.chdir" in ln
            start = next(i for i, ln in enumerate(lines) if marker(ln))
            end = start
            while end < len(lines) and (marker(lines[end]) or lines[end].strip() == "" or lines[end].lstrip().startswith("import os")):
                end += 1
            lines = lines[:start] + lines[end:]
            print(f"[strip-legacy] {path.name} (removed pre-marker bootstrap)")

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
