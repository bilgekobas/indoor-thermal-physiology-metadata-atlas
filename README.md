# Indoor Thermal Physiology Corpus — interactive site

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.21516763.svg)](https://doi.org/10.5281/zenodo.21516763)

A static React site for browsing and visualizing the indoor thermal-physiology
metadata corpus. Built with Vite + React + Tailwind, designed to be hosted on
GitHub Pages and re-published each time the underlying corpus is updated.


## Project structure

```
public/data/                       — generated JSON artifacts (do not hand-edit; see scripts/build_data.py)
public/data/corpus_main_dataset.csv — the coded corpus (273 publications, 295 experiments)
public/data/variable_dictionary.csv — field-level data dictionary (206 fields, 14 categories)
scripts/build_data.py              — the only place that should read corpus_main_dataset.csv
src/components/                    — shared UI: Sidebar, PageHeader, CodeChip (the missing-value motif)
src/pages/                         — one file per site section
src/useCorpusData.js               — fetches public/data/bundle.json once and caches it
```

## Design notes

The color palette and the Y/N/NR/MNR/NC chip motif are drawn directly from the
corpus's own coding conventions (see `public/data/variable_dictionary.csv`),
so the site's visual language and the dataset's documentation stay in sync
rather than diverging over time.

## Citation

There are two separate archives — cite the one relevant to what you used:

- **This site/code** (this repository, as of the release you used):
  [10.5281/zenodo.21516763](https://doi.org/10.5281/zenodo.21516763)
- **The underlying dataset** (`corpus_main_dataset.csv` + `variable_dictionary.csv`):
  [10.5281/zenodo.21511034](https://doi.org/10.5281/zenodo.21511034)

Machine-readable citation metadata for the code is in [`CITATION.cff`](./CITATION.cff)
(GitHub renders a "Cite this repository" button from it automatically). If you use
the corpus in analysis, cite the dataset DOI; if you reference or reuse the site
itself, cite the code DOI. See `About` on the live site for author details and the
accompanying manuscript.
