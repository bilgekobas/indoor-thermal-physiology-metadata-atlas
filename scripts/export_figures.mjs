// Batch-exports every figure on the site as high-resolution images and/or
// true vector PDFs with editable/selectable text.
//
// Content-changing toggles (the signal selector on Fig 25, the by-sensor/
// collapsed brand view on Fig 22, the body-site signal tabs on Fig 24, the
// by-country split on Fig 2) are each exported as a separate file, since
// they show genuinely different data, not just a different display format.
// Purely cosmetic toggles (the %/count and count/%-of-corpus controls on
// every PeriodHeatmap) are deliberately left at their default state, since
// they re-format the same numbers rather than changing what's shown -- only
// toggles explicitly marked with data-toggle-group="content" in the JSX are
// cycled through; everything else is left alone.
//
// Requires the dev server (or preview server) to already be running:
//   npm run dev                      (in one terminal)
//   node scripts/export_figures.mjs  (in another)
//
// One-time setup:
//   npm install -D playwright
//   npx playwright install chromium
//
// Output goes to exports/, named by registry figure number so files sort in
// site order (e.g. fig-29-mst-points-by-period.pdf). Figures with a
// content-changing toggle get one file per toggle state, suffixed with the
// toggle's label (e.g. fig-25-sensor-choice-by-signal--heart-pulse-rate.pdf).
//
// Options (env vars, all optional):
//   FORMAT=both     png | pdf | both   (default: both)
//   BASE_URL=http://localhost:5173     (point at :4173 for `npm run preview`)
//   SCALE=3                            PNG device scale factor (print-quality
//                                      at this site's figure widths; use 4
//                                      for very large-format printing)
//
// How the PDF export works: PNG screenshots are always raster, no matter the
// resolution. To get a REAL vector file -- text you can still select/edit,
// paths you can still restyle in Illustrator/Inkscape -- this uses Chromium's
// native print-to-PDF pipeline instead of screenshotting. That pipeline
// treats both inline SVG (the Sankeys, the map) and plain HTML/CSS (the bar
// charts, heatmaps) as real vector content with live text objects and
// embedded fonts, rather than converting anything to pixels. Each figure is
// isolated on its own page (all other content cleared, page size trimmed to
// exactly that figure's rendered size) so every PDF contains just one figure.

import { chromium } from 'playwright'
import fs from 'fs'
import path from 'path'
import viteConfig from '../vite.config.js'

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
// vite.config.js sets `base: '/indoor-thermal-physiology-metadata-atlas/'` so
// the site is served under that path prefix in both `npm run dev` and
// `npm run preview` -- not at root. Read it from the config itself (rather
// than hardcoding it here) so this never silently drifts out of sync if the
// base path is ever changed.
const BASE_PATH = (viteConfig.base || '/').replace(/\/$/, '')
const SCALE = Number(process.env.SCALE || 3)
const FORMAT = process.env.FORMAT || 'both' // png | pdf | both
const OUT_DIR = path.resolve('exports')

const ROUTES = [
  '/context',
  '/population',
  '/body',
  '/environment',
  '/questionnaires',
  '/cognitive',
  '/reporting',
]

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

// Zero-pads the leading numeric part of a figure number so plain figures
// (5, 9, 21) and sub-lettered figures (32a, 32b) both sort correctly as
// filenames -- "05" before "09" before "21", and "32a" before "32b".
function padFigNumber(figNumber) {
  const m = figNumber.match(/^(\d+)(.*)$/)
  if (!m) return figNumber
  const [, digits, suffix] = m
  return digits.padStart(2, '0') + suffix
}

// Reads the page once to build a manifest of {route, figNumber, title,
// toggleLabels} for every figure, without mutating anything -- used to
// drive both export passes below. toggleLabels is null for figures with no
// data-toggle-group="content" marker (the common case), or an array of each
// button's label text for figures that have one.
async function buildManifest(page) {
  const manifest = []
  for (const route of ROUTES) {
    await page.goto(`${BASE_URL}${BASE_PATH}${route}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-fig]', { timeout: 20000 })
    await page.waitForTimeout(400)
    const figs = await page.$$('[data-fig]')
    for (const fig of figs) {
      const figNumber = await fig.getAttribute('data-fig')
      const titleEl = await fig.$('h3')
      const title = titleEl ? (await titleEl.innerText()) : 'figure'
      const toggleGroup = await fig.$('[data-toggle-group="content"]')
      let toggleLabels = null
      if (toggleGroup) {
        const buttons = await toggleGroup.$$('button')
        if (buttons.length > 1) {
          toggleLabels = []
          for (const b of buttons) toggleLabels.push((await b.innerText()).trim())
        }
      }
      manifest.push({ route, figNumber, title, toggleLabels })
    }
  }
  return manifest
}

async function exportPng(page, entry) {
  const base = `fig-${padFigNumber(entry.figNumber)}-${slugify(entry.title)}`
  const fig = await page.$(`[data-fig="${entry.figNumber}"]`)
  await fig.scrollIntoViewIfNeeded()

  if (!entry.toggleLabels) {
    const filename = `${base}.png`
    await page.waitForTimeout(100)
    await fig.screenshot({ path: path.join(OUT_DIR, filename) })
    return [filename]
  }

  const filenames = []
  for (const label of entry.toggleLabels) {
    await page.locator(`[data-fig="${entry.figNumber}"] [data-toggle-group="content"] button`, { hasText: label }).click()
    await page.waitForTimeout(200)
    const filename = `${base}--${slugify(label)}.png`
    await fig.screenshot({ path: path.join(OUT_DIR, filename) })
    filenames.push(filename)
  }
  return filenames
}

async function exportPdf(page, entry) {
  const base = `fig-${padFigNumber(entry.figNumber)}-${slugify(entry.title)}`
  // Fresh navigation per figure -- the isolation step below clears the page,
  // so each PDF export needs to start from a clean, fully-loaded copy.
  await page.goto(`${BASE_URL}${BASE_PATH}${entry.route}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-fig]', { timeout: 20000 })
  await page.waitForTimeout(400)
  const fig = await page.$(`[data-fig="${entry.figNumber}"]`)

  // Isolate: move just this figure into a cleared, unstyled body so the
  // printed page contains nothing but the figure, sized to fit it exactly
  // (no page margins, no cropping, no surrounding chrome). Done once even
  // for multi-toggle-state figures -- the toggle buttons are still part of
  // this same isolated subtree afterwards, so clicking between print passes
  // works without re-isolating or re-navigating.
  await fig.evaluate((el) => {
    document.body.style.margin = '0'
    document.body.innerHTML = ''
    document.body.appendChild(el)
  })

  async function printCurrentState(filename) {
    const box = await fig.boundingBox()
    // Wait for the actual web fonts (IBM Plex Mono/Sans) to finish loading
    // before printing. Without this, a slow connection or cold cache could
    // have Chromium print with a fallback system font instead -- the text
    // would still be selectable, just in the wrong typeface.
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(150)
    await page.pdf({
      path: path.join(OUT_DIR, filename),
      width: `${Math.ceil(box.width)}px`,
      height: `${Math.ceil(box.height)}px`,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
      printBackground: true,
    })
  }

  if (!entry.toggleLabels) {
    const filename = `${base}.pdf`
    await printCurrentState(filename)
    return [filename]
  }

  const filenames = []
  for (const label of entry.toggleLabels) {
    await page.locator(`[data-fig="${entry.figNumber}"] [data-toggle-group="content"] button`, { hasText: label }).click()
    await page.waitForTimeout(200)
    const filename = `${base}--${slugify(label)}.pdf`
    await printCurrentState(filename)
    filenames.push(filename)
  }
  return filenames
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1200 },
    deviceScaleFactor: SCALE,
  })
  const page = await context.newPage()

  console.log('Building figure manifest...')
  const manifest = await buildManifest(page)
  console.log(`Found ${manifest.length} figures.\n`)

  for (const entry of manifest) {
    const toggleNote = entry.toggleLabels ? ` (${entry.toggleLabels.length} toggle states)` : ''
    console.log(`Fig ${entry.figNumber}: ${entry.title}${toggleNote}`)
    if (FORMAT === 'png' || FORMAT === 'both') {
      await page.goto(`${BASE_URL}${BASE_PATH}${entry.route}`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-fig]', { timeout: 20000 })
      await page.waitForTimeout(400)
      const files = await exportPng(page, entry)
      files.forEach((f) => console.log(`  saved ${f}`))
    }
    if (FORMAT === 'pdf' || FORMAT === 'both') {
      const files = await exportPdf(page, entry)
      files.forEach((f) => console.log(`  saved ${f}`))
    }
  }

  await browser.close()
  console.log(`\nDone: ${manifest.length} figures exported to ${OUT_DIR}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
