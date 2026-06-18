---
title: Figures and Image Widgets
numbering:
  enumerator: 1.%s
---

Figures are typically the most important part of any scientific paper, especially for studies focused on microscopy. Below we showcase the same dataset — a HRTEM focal-series reconstruction of a single-layer graphene grain boundary — four different ways, starting from the most interactive in-browser widget and working back to the kind of static composite panel a print journal would publish.

The most expressive option is to build the controls in JavaScript and ship them directly with the page. [](#fig_EWR_graphene_anywidget) shows the exit-wave reconstruction this way using [anywidget](https://anywidget.dev): no Python kernel, no waiting, works offline.

::::{figure}
:name: fig_EWR_graphene_anywidget

:::{anywidget} ./widgets/interactive-image.js
{
  "data_url": "../widgets/data/interactive_image.bin",
  "meta_url": "../widgets/data/interactive_image.json"
}
:::

Exit wave reconstruction of a single-layer graphene GB, from HRTEM focal series. Adapted from {cite:t}`ophus2016automatic`.
::::

The same controls can also be driven by a Python kernel running in the reader's browser via [JupyterLite](https://jupyterlite.readthedocs.io/). [](#fig_EWR_graphene_interactive) is feature-equivalent to [](#fig_EWR_graphene_anywidget) but implemented as a Jupyter notebook on Pyodide — useful when the controls need access to the broader scientific Python stack.

:::{figure} #app:interactive_image
:name: fig_EWR_graphene_interactive
:placeholder: ./figures/EWR_graphene_interactive.png
Exit wave reconstruction of a single-layer graphene GB, from HRTEM focal series. Adapted from {cite:t}`ophus2016automatic`.
:::

For datasets where multiple static panels would normally sit side-by-side — for example, the phase and amplitude of an exit wave — tabbed viewing lets each panel use the full screen width. The reader can flip between [](#fig_EWR_graphene_phase) and [](#fig_EWR_graphene_amp) without scrolling, and mouseover previews still pop the referenced panel inline.

:::::{tab-set}

::::{tab-item} Graphene GB exit wave phase
:sync: tab1

:::{figure} ./figures/EWR_graphene_phase.jpg
:name: fig_EWR_graphene_phase
:width: 512px
Exit wave phase of a single-layer graphene GB, from HRTEM focal series reconstruction. Adapted from {cite:t}`ophus2016automatic`.
:::

::::

::::{tab-item} Graphene GB exit wave amplitude
:sync: tab2

:::{figure} ./figures/EWR_graphene_amp.jpg
:name: fig_EWR_graphene_amp
:width: 512px
Exit wave amplitude of a single-layer graphene GB, from HRTEM focal series reconstruction. Adapted from {cite:t}`ophus2016automatic`.
:::

::::

:::::

Finally, the traditional approach: a single static figure with multiple labeled panels. This is what a print journal would publish, and it remains useful as a high-level overview that doesn't require interaction. [](#fig_EWR_graphene) shows the same graphene-GB reconstruction as a four-panel composite — full-FOV exit wave phase (a) with an enlargement (b), and the corresponding amplitude (c, d).

:::{figure} ./figures/EWR_graphene_v03.svg
:name: fig_EWR_graphene
HRTEM focal series reconstruction of a single-layer graphene GB. (a) Exit wave phase, enlarged in (b). (c) Exit wave amplitude, enlarged in (d).
Adapted from {cite:t}`ophus2016automatic`.
:::
