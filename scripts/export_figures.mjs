// Batch-exports every figure on the site as high-resolution images and/or
// true vector PDFs with editable/selectable text.
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
// site order (e.g. fig-29-mst-points-by-period.pdf).
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

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173'
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

// Reads the page once to build a manifest of {route, figNumber, title} for
// every figure, without mutating anything -- used to drive both export
// passes below.
async function buildManifest(page) {
  const manifest = []
  for (const route of ROUTES) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-fig]', { timeout: 20000 })
    await page.waitForTimeout(400)
    const figs = await page.$$('[data-fig]')
    for (const fig of figs) {
      const figNumber = await fig.getAttribute('data-fig')
      const titleEl = await fig.$('h3')
      const title = titleEl ? (await titleEl.innerText()) : 'figure'
      manifest.push({ route, figNumber, title })
    }
  }
  return manifest
}

async function exportPng(page, entry) {
  const filename = `fig-${padFigNumber(entry.figNumber)}-${slugify(entry.title)}.png`
  const fig = await page.$(`[data-fig="${entry.figNumber}"]`)
  await fig.scrollIntoViewIfNeeded()
  await page.waitForTimeout(100)
  await fig.screenshot({ path: path.join(OUT_DIR, filename) })
  return filename
}

async function exportPdf(page, entry) {
  const filename = `fig-${padFigNumber(entry.figNumber)}-${slugify(entry.title)}.pdf`
  // Fresh navigation per figure -- the isolation step below clears the page,
  // so each PDF export needs to start from a clean, fully-loaded copy.
  await page.goto(`${BASE_URL}${entry.route}`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-fig]', { timeout: 20000 })
  await page.waitForTimeout(400)
  const fig = await page.$(`[data-fig="${entry.figNumber}"]`)
  const box = await fig.boundingBox()

  // Isolate: move just this figure into a cleared, unstyled body so the
  // printed page contains nothing but the figure, sized to fit it exactly
  // (no page margins, no cropping, no surrounding chrome).
  await fig.evaluate((el) => {
    document.body.style.margin = '0'
    document.body.innerHTML = ''
    document.body.appendChild(el)
  })
  await page.waitForTimeout(150)

  await page.pdf({
    path: path.join(OUT_DIR, filename),
    width: `${Math.ceil(box.width)}px`,
    height: `${Math.ceil(box.height)}px`,
    margin: { top: 0, bottom: 0, left: 0, right: 0 },
    printBackground: true,
  })
  return filename
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
    console.log(`Fig ${entry.figNumber}: ${entry.title}`)
    if (FORMAT === 'png' || FORMAT === 'both') {
      await page.goto(`${BASE_URL}${entry.route}`, { waitUntil: 'networkidle' })
      await page.waitForSelector('[data-fig]', { timeout: 20000 })
      await page.waitForTimeout(400)
      const f = await exportPng(page, entry)
      console.log(`  saved ${f}`)
    }
    if (FORMAT === 'pdf' || FORMAT === 'both') {
      const f = await exportPdf(page, entry)
      console.log(`  saved ${f}`)
    }
  }

  await browser.close()
  console.log(`\nDone: ${manifest.length} figures exported to ${OUT_DIR}/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
