// Shared color tokens. Default-to-black-unless-accenting rule:
//   - #0A0A0A (near-black "ink") is the default for anything that doesn't
//     need to stand out — most bars, most lines, most text.
//   - #5B5BFF (blue) is the primary accent — single most important number
//     or series in a figure, active/selected states, primary CTAs.
//   - #FB3640 (red) is the secondary/rare-emphasis accent — flagged
//     outliers, "pay attention to this" moments. Used sparingly.
//   - #D5FF99 (lime), #C5FFFD (pale cyan), #F1FF71 (yellow) are tertiary
//     categorical colors, used only when a chart needs to distinguish more
//     than 2 genuinely different categories (e.g. domain groupings) and
//     ink/blue/red alone aren't enough.
//   - #FCFCFC (near-white) is the page/card background.
export const INK = '#0A0A0A'
export const BLUE = '#5B5BFF'
export const RED = '#FB3640'
export const LIME = '#D5FF99'
export const WHITE = '#FCFCFC'
export const CYAN = '#C5FFFD'
export const YELLOW = '#F1FF71'

// Derived/utility shades used throughout (tracks, faint text, gridlines).
export const INK_FAINT = '#8A8A8A'
export const INK_MID = '#4A4A4A'
export const LINE = '#E4E4E4'
export const TRACK = '#EFEFEF'

// Small categorical palette for charts needing >2 distinguishable series
// (Sankey domain groups, climate groups), built from the palette above,
// leading with ink/blue/red before reaching for the tertiary colors.
export const CATEGORICAL = [INK, BLUE, RED, INK_MID, LIME, YELLOW, CYAN, INK_FAINT]
