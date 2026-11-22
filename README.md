# Indoor Thermal Physiology Corpus — interactive site

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.21516763.svg)](https://doi.org/10.5281/zenodo.21516763)

A static React site for browsing and visualizing the indoor thermal-physiology
metadata corpus. Built with Vite + React + Tailwind, designed to be hosted on
GitHub Pages and re-published each time the underlying corpus is updated.


## Navigation

The site root opens the animated data story. “Explore the Atlas” opens
`/overview`; the Atlas title returns to the story. Chapter URLs remain unchanged.
The story’s scripts, illustrations and fonts are served locally from
`public/datastory/`.

## Project structure

```
public/data/                       — source tables and generated figure data
public/data/corpus_main_dataset.csv — the coded publication, experiment and measurement records
public/data/variable_dictionary.csv — field definitions and metadata categories
public/data/review_search.json     — original search window, databases and recorded screening counts
scripts/build_data.py              — rebuilds the figures, variable dictionary and co-authorship network
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
itself, cite the code DOI. The [Atlas homepage](https://bilgekobas.github.io/indoor-thermal-physiology-metadata-atlas/overview#team)
lists the research team and links to both archives.

## Build locally

Use Node.js 20 and Python 3 in an environment with the packages in
`requirements.txt` installed.

```sh
python3 -m pip install -r requirements.txt
npm ci
npm run dev
```

Run `npm run build` to generate the static site in `dist/`. Run the existing
tests with `node --test tests/*.test.mjs` and
`python3 -m unittest discover -s tests`.

## Refresh the data story

Update `public/data/corpus_main_dataset.csv` and, when the schema changes,
`public/data/variable_dictionary.csv`. Both `npm run dev` and `npm run build`
run the Atlas data builder, which also writes
`public/datastory/corpus.generated.js`. This generated file supplies the story's
figures and aggregate text. For an existing dev session, run `npm run build:data`
and reload after changing the CSV. City coordinates are maintained in
`scripts/city_coordinates.py`.

The illustrated skin-temperature examples and link-audit findings require
editorial review. Record checked links and their audit date in
`scripts/datastory_access_audit.json`. Verification is attached to the coded URL
as well as the experiment ID, so a changed URL requires a new check. The story
counts experiments coded as sharing separately from previously verified links.
