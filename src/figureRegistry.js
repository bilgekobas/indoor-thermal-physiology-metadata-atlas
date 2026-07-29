// ─────────────────────────────────────────────────────────────────────────
// Single source of truth for figure numbering across the whole site.
//
// Every FigureCard's number is DERIVED from its position in this array
// instead of being typed as a literal string in each chapter file. That
// means:
//   - Two figures can never accidentally share a number (each key is
//     asserted unique below, and the number is just "index + 1").
//   - Inserting a new figure anywhere in this list automatically renumbers
//     every figure that comes after it -- no manual find-and-replace across
//     chapter files needed.
//
// To add a new figure: pick a short, stable, descriptive key and insert it
// at the position where it should appear in the overall sequence, then use
// figNum('your-key') as the figNumber prop in the chapter file. The array
// order here IS the canonical global figure order (Context -> Population ->
// Body -> Environment -> Questionnaires -> Cognitive -> Reporting, matching
// the route order in App.jsx).
const FIGURE_ORDER = [
  'author-network',                  // ChapterContext
  'pubs-by-year',
  'geography',
  'sample-size-by-country',
  'temp-by-climate',
  'setting-type',
  'time-of-day',
  'session-length',
  'normalization-length',
  'domains-manipulated-count',
  'domains-manipulated-together',
  'data-availability',
  'protocol-standardisation',
  'participant-age',                 // ChapterPopulation
  'participant-bmi',
  'sex-distribution',
  'sample-size-distribution',
  'sample-size-calc-type',
  'inclusion-exclusion',
  'participant-metadata-collected',
  'signals-measured-freq',           // ChapterBody
  'signals-cooccurrence',
  'signal-sensor-brand',
  'body-site-per-signal',
  'sensor-choice-by-signal',
  'site-prevalence-by-period',
  'hr-measurement-site',
  'mst-calc-pathway',
  'mst-points-by-period',
  'env-cooccurrence',                // ChapterEnvironment
  'sensor-heights',
  'questionnaire-domain-group',      // ChapterQuestionnaires (sub-lettered: 32a, 32b, ...)
  'tsv-scales',
  'tcv-scales',
  'cognitive-domain-flow',           // ChapterCognitive
  'reporting-fields',                // ChapterReporting
]

const seen = new Set()
for (const key of FIGURE_ORDER) {
  if (seen.has(key)) {
    throw new Error(`figureRegistry: duplicate key "${key}" in FIGURE_ORDER -- each figure needs a unique key`)
  }
  seen.add(key)
}

const INDEX = new Map(FIGURE_ORDER.map((key, i) => [key, i + 1]))

/**
 * Returns the display number for a figure, e.g. figNum('mst-calc-pathway') -> "28".
 * Pass a suffix for sub-lettered figures within a loop, e.g.
 * figNum('questionnaire-domain-group', String.fromCharCode(97 + i)) -> "32a", "32b", ...
 */
export function figNum(key, suffix = '') {
  const n = INDEX.get(key)
  if (n == null) {
    throw new Error(`figNum: unknown figure key "${key}" -- add it to FIGURE_ORDER in src/figureRegistry.js`)
  }
  return `${n}${suffix}`
}
