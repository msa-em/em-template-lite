---
title: Complex interactive examples
numbering:
  enumerator: 4.%s
---


So far we have seen examples of how we can extend the functionality and interactivity of existing figures, especially images, movies and 3D plots. This is only scratching the surface — because we can embed code directly into the manuscript, we can build arbitrarily complex widgets. The two examples below show what's possible at each end of the spectrum.

[](#fig_stem4d_sim) is an interactive 4D-STEM diffraction simulation written entirely in JavaScript via [anywidget](https://anywidget.dev): no Python kernel, no waiting on a server, the physics runs in the reader's browser as they drag the probe.

::::{figure}
:name: fig_stem4d_sim

:::{anywidget} ./widgets/stem4d-sim.js
{}
:::

Interactive 4D-STEM diffraction simulation. Drag the electron probe across the polycrystalline sample (left panel) to watch the diffraction pattern (lower right) and atomic structure (upper right) update at each scan position. The convergence-semiangle and defocus sliders switch the imaging mode between nanobeam diffraction (small semiangle, separated Bragg disks) and ptychographic (large semiangle, overlapping disks).
::::

[](#fig_fft_1d) is the same idea — a small interactive teaching tool — but implemented as a kernel-backed Jupyter notebook running on Pyodide. The widget's logic lives in Python and can pull in any of the scientific stack the kernel ships.

:::{figure} #app:custom_fft
:name: fig_fft_1d
:placeholder: ./figures/fft_1d.png
Teaching widget for the one-dimensional FFT.
:::
