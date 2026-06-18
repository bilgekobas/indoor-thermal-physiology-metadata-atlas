# Indoor Thermal Physiology Corpus — interactive site

A static React site for browsing and visualizing the indoor thermal-physiology
metadata corpus. Built with Vite + React + Tailwind, designed to be hosted on
GitHub Pages and re-published each time the underlying corpus is updated.

## Quick start

```bash
npm install
npm run dev
```

Open the printed localhost URL. The site loads its data from
`public/data/bundle.json`, which is generated from the corpus CSV (see below).

## Updating the corpus

Whenever you re-extract or expand the corpus (e.g. the 250 → 278 study
expansion, or a future 5-year refresh):

1. Replace `corpus_main_dataset.csv` with the updated file (update the `SRC`
   path in `scripts/build_data.py` if needed).
2. Run the data pipeline:
   ```bash
   python3 scripts/build_data.py
   ```
   This regenerates every JSON file in `public/data/`, including the combined
   `bundle.json` that the site fetches at runtime.
3. Commit the updated `public/data/*.json` files alongside the new CSV.
4. Rebuild and redeploy (see below).

The pipeline recomputes: corpus-level summary stats, the full studies lookup
table, signal × sensor counts (overall and by two-year period), skin-temperature
site prevalence (with the same terminology consolidation rules used in the
paper: e.g. calf/shin → lower leg), MST calculation rate / formula / point-count
breakdowns, the core-temperature sensor × site crossmap, and per-category
reporting completeness.

If you add new analysis figures later, add a new aggregation block to
`scripts/build_data.py` following the existing pattern, write a new page in
`src/pages/`, and add it to the sidebar in `src/components/Sidebar.jsx` and the
route table in `src/App.jsx`.

## Deploying to GitHub Pages

1. In `vite.config.js`, set `base` to match your repository name exactly,
   e.g. `base: '/thermal-physio-corpus/'`. If you're deploying to a
   `username.github.io` root repo instead, set `base: '/'`.
2. Build:
   ```bash
   npm run build
   ```
   This outputs static files to `dist/`.
3. Push `dist/` to the `gh-pages` branch (or configure GitHub Actions to do
   this automatically — a minimal workflow is included at
   `.github/workflows/deploy.yml`).
4. In your repo settings → Pages, set the source to the `gh-pages` branch.

## Project structure

```
public/data/        — generated JSON artifacts (do not hand-edit; see scripts/build_data.py)
scripts/build_data.py — the only place that should read corpus_main_dataset.csv
src/components/     — shared UI: Sidebar, PageHeader, CodeChip (the missing-value motif)
src/pages/          — one file per site section
src/useCorpusData.js — fetches public/data/bundle.json once and caches it
```

## Design notes

The color palette and the Y/N/NR/MNR/NC chip motif are drawn directly from the
corpus's own coding conventions (see the main repo's `README.md` and
`variable_dictionary.csv`), so the site's visual language and the dataset's
documentation stay in sync rather than diverging over time.
