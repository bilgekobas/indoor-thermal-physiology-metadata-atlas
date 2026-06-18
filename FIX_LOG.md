# Fix log — 2026-06-18

Changes applied in this zip:

1. Removed one accidental duplicate study row with missing `id` / `id-pub-id` from the runtime JSON data.
   - `public/data/studies.json` now has 269 study-experiment rows, matching `summary.n_experiments`.
   - `public/data/bundle.json` was regenerated from the corrected JSON artifacts.
   - Null-id records were also removed from the affected figure files: `fig05_time_of_day.json`, `fig10_sex_distribution.json`, and `fig11_sample_size.json`.

2. Fixed the data-build script so it is portable.
   - `scripts/build_data.py` no longer uses machine-specific absolute paths.
   - By default it reads `corpus_main_dataset.csv` from the project root.
   - You can also run it with `CORPUS_CSV=/path/to/corpus.csv npm run build:data`.
   - It now writes all JSON artifacts to `public/data/` and rebuilds `bundle.json` automatically.

3. Fixed GitHub Pages deployment robustness.
   - The workflow now uses `npm ci` for reproducible installs.
   - It copies `dist/index.html` to `dist/404.html`, so direct route reloads such as `/browse` or `/measurement` work on GitHub Pages.

4. Updated build dependencies.
   - Updated Vite and the React plugin.
   - `npm audit --audit-level=moderate` returns zero vulnerabilities.

Validation performed:

- `python3 -m py_compile scripts/build_data.py`
- `npm ci`
- `npm audit --audit-level=moderate`
- `npm run build`

## 2026-06-18 GitHub Actions hotfix

The GitHub Pages build failed with `sh: 1: vite: not found` after `npm ci`. This occurs when the Actions environment installs production dependencies only, so Vite, which is correctly listed as a dev dependency, is omitted.

Changed `.github/workflows/deploy.yml` from `npm ci` to `npm ci --include=dev`, and named the install/build steps for easier debugging. Local clean install still builds successfully with `npm run build`.
