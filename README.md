# Indoor Thermal Physiology Corpus — interactive site

A static React site for browsing and visualizing the indoor thermal-physiology
metadata corpus. Built with Vite + React + Tailwind, designed to be hosted on
GitHub Pages and re-published each time the underlying corpus is updated.


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
