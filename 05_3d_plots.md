---
title: 3D Plots and 3D Widgets
numbering:
  enumerator: 3.%s
---

While most microscopy images are obtained in projection, advanced techniques such as electron tomography and multislice ptychography enable 3D reconstruction. Due to the limitations of print journals these results are often shown as 2D slices or, at best, as 360° orbit movies — both make the structure hard to interpret. Below we show the same CNT reconstruction four different ways: two pure-JavaScript widgets first, then matching kernel-backed versions in a tab-set.

[](#fig_volume_rendering_anywidget) ray-casts the volume directly on the GPU via WebGL: drag to orbit, scroll to zoom, double-click to reset. Toggle the **Volume** and **Atom-maxima** layers, or click ▶ Play for an auto-orbit.

::::{figure}
:name: fig_volume_rendering_anywidget

:::{anywidget} ./widgets/interactive-volume-rendering.js
{
  "data_url": "../widgets/data/interactive_volume.bin",
  "meta_url": "../widgets/data/interactive_volume.json"
}
:::

Joint ptychographic-tomographic reconstruction of a simulated CNT with a missing wedge of 60 deg, rendered by a WebGL fragment-shader ray-march with front-to-back alpha compositing. Reproduced from {cite:p}`varnavides2024iterative`.
::::

[](#fig_volume_slicing_anywidget) shows the same volume sliced by three orthogonal planes. The planes use real depth testing so they occlude each other correctly along the intersection lines. Drag to orbit, scroll to zoom, use the sliders to move the slices, or drag the histogram handles to tighten the display range.

::::{figure}
:name: fig_volume_slicing_anywidget

:::{anywidget} ./widgets/interactive-volume-slicing.js
{
  "data_url": "../widgets/data/interactive_volume.bin",
  "meta_url": "../widgets/data/interactive_volume.json"
}
:::

Same CNT reconstruction shown as three orthogonal slice planes intersecting in 3D. Reproduced from {cite:p}`varnavides2024iterative`.
::::

The kernel-backed equivalents use [k3d](https://github.com/K3D-tools/K3D-jupyter) for volume rendering and matplotlib for slicing. They run inside the reader's Pyodide kernel and are useful when the analysis pipeline needs the rest of the scientific Python stack.

:::::{tab-set}

::::{tab-item} Volume Rendering
:sync: tabmovie2

:::{figure} #app:interactive_volume_rendering
:name: fig_volume_rendering
:placeholder: ./figures/volume_rendering.png
Joint ptychographic-tomographic reconstruction of a simulated CNT with a missing wedge of 60 deg.
Reproduced from{cite:p}`varnavides2024iterative`.
:::

::::

::::{tab-item} Volume Slicing
:sync: tabmovie1

:::{figure} #app:interactive_volume_slicing
:name: fig_volume_slicing
:placeholder: ./figures/volume_slicing.png
Joint ptychographic-tomographic reconstruction of a simulated CNT with a missing wedge of 60 deg.
Reproduced from{cite:p}`varnavides2024iterative`.
:::

::::

:::::
