# em-template-lite

A self-hosted, in-browser-compute version of the [Elemental Microscopy](https://www.elementalmicroscopy.org) article template.

This is a fork of [`msa-em/em-template`](https://github.com/msa-em/em-template) with the Curvenote / Binder dependency replaced by:

- **[JupyterLite](https://jupyterlite.readthedocs.io)** running in the reader's browser (Pyodide kernel)
- **GitHub Pages** for static hosting
- **GitHub Actions** for build + deploy

No external compute service is required to view, build, or interact with the article.

## What's the same

- Author workflow: write MyST markdown + Jupyter notebooks
- Article layout: MyST `book-theme`, same typography, same figure widgets
- Content: image / movie / 3D / FFT interactives

## What's different

- No Curvenote, no Binder server, no `CURVENOTE_TOKEN`
- Interactive cells run via [Thebe](https://thebe.readthedocs.io) → JupyterLite (in-browser Pyodide)
- Movie data is pre-decoded from `.mp4` to `.npz` in CI (Pyodide doesn't ship `pyav`)
- Deploys to `https://msa-em.github.io/em-template-lite/`

## Local development

```bash
conda env create -f environment.yml
conda activate em-template-lite

# preview the article (no kernel needed for static content)
myst start
```

To work on interactive cells, run a local Jupyter server in parallel:

```bash
jupyter lab --IdentityProvider.token=devtoken --ServerApp.allow_origin='http://localhost:3000' --port=8888
```

…and uncomment the `jupyter.server` block in `myst.yml`.

## Deploy

Pushing to `main` triggers `.github/workflows/deploy.yml`, which:

1. Pre-decodes mp4 → npz so notebooks can run in Pyodide
2. Builds JupyterLite (`jupyter lite build`)
3. Builds the MyST static site (`myst build --html`)
4. Combines them and publishes to GitHub Pages
