// Shared color tokens for the site. Per the updated palette:
//   - Blue (#005EF5) is the primary accent — used for emphasis, single-series
//     charts, hover/active states, and the one "this is the interesting bit"
//     highlight in any given figure.
//   - Coral (#FF5964) is the secondary accent, reserved for a small number
//     of "pay attention to this" moments (e.g. flagged outliers) — used
//     sparingly, not as a second default.
//   - Ink (#31393C) is the default color for anything that doesn't need to
//     stand out: most bars, most lines, most text.
//   - Sand (#E4DFDA) is the default "track"/background color behind bars,
//     unfilled matrix cells, and gridlines.
// Categorical charts that distinguish several genuinely different groups
// (the 6 thermophysiological domains in the Sankey, the Köppen climate
// groups on the map) still need more than two colors to function — those
// keep their own small palettes, defined locally where they're used, but
// should still lead with ink/blue/coral before reaching for anything else.

export const INK = '#31393C'
export const CORAL = '#FF5964'
export const BLUE = '#005EF5'
export const SAND = '#E4DFDA'

// Common derived/utility shades used throughout (lighter sand for tracks,
// faint text, etc.) — kept here so every component pulls from one place.
export const SAND_LIGHT = '#F1EDE6' // unfilled track / empty matrix cell
export const INK_FAINT = '#8A8783' // de-emphasized text/labels
export const INK_MID = '#5C6166'   // secondary text
