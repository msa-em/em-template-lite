---
title: Complex interactive examples
numbering:
  enumerator: 4.%s
---


So far we have seen examples of how we can extend the functionality and interactivity of existing figures, especially images, movies and 3D plots. 
This is only scratching the surface however - because we can embed code directly into our manuscript, we can create arbitrarily complex widgets.
The two widgets below are both written in plain JavaScript via [anywidget](https://anywidget.dev) — no Python kernel required — but the underlying physics simulation can be arbitrarily intricate.

::::{figure}
:name: fig_stem4d_sim

:::{anywidget} ./widgets/stem4d-sim.js
{}
:::

Interactive 4D-STEM diffraction simulation. Drag the electron probe across the polycrystalline sample (left panel) to watch the diffraction pattern (lower right) and atomic structure (upper right) update at each scan position. The convergence-semiangle and defocus sliders switch the imaging mode between nanobeam diffraction (small semiangle, separated Bragg disks) and ptychographic (large semiangle, overlapping disks).
::::

The next widget is implemented as a kernel-backed Jupyter notebook instead — same idea (a small interactive teaching tool), but the controls run inside the browser's Pyodide kernel.

:::{figure} #app:custom_fft
:name: fig_fft_1d
:placeholder: ./figures/fft_1d.png
Teaching widget for the one-dimensional FFT.
:::
