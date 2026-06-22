/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF8F4',
        ink: '#31393C',
        inkmid: '#5C6166',
        inkfaint: '#8A8783',
        line: '#E4DFDA',
        // Primary accent (per the updated palette): blue leads, coral is
        // the secondary/rare-emphasis accent. coreaccent now points at
        // blue since that's the new "this is the headline number" color.
        coreaccent: '#005EF5',
        accentcoral: '#FF5964',
        // Categorical domain colors (Sankey, climate groups) — kept
        // distinct since collapsing these to one color would break the
        // charts that exist specifically to show 6+ different categories.
        peripheral: '#FF5964',
        cardio: '#005EF5',
        central: '#31393C',
        sudomotor: '#8A8783',
        neuro: '#5C6166',
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
