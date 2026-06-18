/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#FAF8F4',
        ink: '#1A1A18',
        inkmid: '#5F5E58',
        inkfaint: '#A8A59C',
        line: '#E2DED4',
        peripheral: '#D94F6E',
        cardio: '#4855C8',
        central: '#E07820',
        sudomotor: '#B8C020',
        neuro: '#8A8A86',
        metabolic: '#BBBBBB',
        coreaccent: '#7A1830',
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
        sans: ['"IBM Plex Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
