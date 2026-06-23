/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FCFCFC',
        ink: '#0A0A0A',
        inkmid: '#4A4A4A',
        inkfaint: '#8A8A8A',
        line: '#E4E4E4',
        // Primary accent: blue leads, red is the secondary/rare-emphasis accent.
        coreaccent: '#5B5BFF',
        accentcoral: '#FB3640',
        // Categorical domain colors (Sankey, climate groups) — kept
        // distinct since collapsing these to one color would break the
        // charts that exist specifically to show several categories.
        peripheral: '#5B5BFF',
        cardio: '#0A0A0A',
        central: '#FB3640',
        sudomotor: '#4A4A4A',
        neuro: '#8A8A8A',
        metabolic: '#BBBBBB',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
