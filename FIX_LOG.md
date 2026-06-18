# Fix log

## v3 GitHub Actions dependency fix

The GitHub Actions run still failed with:

```text
sh: 1: vite: not found
```

This means the deployed GitHub environment was still installing only production dependencies, so the build tools under `devDependencies` were not available when `npm run build` called `vite build`.

Changes in this version:

1. Moved the build-time packages from `devDependencies` into `dependencies`:
   - `vite`
   - `@vitejs/plugin-react`
   - `tailwindcss`
   - `postcss`
   - `autoprefixer`
2. Regenerated `package-lock.json`.
3. Kept the workflow dependency step explicit:

```yaml
- name: Install dependencies
  run: npm ci --include=dev
```

Validation performed locally from a clean unzip:

```bash
npm ci --omit=dev
npm run build
```

This passed, confirming that the GitHub Pages build no longer depends on devDependencies being installed.
