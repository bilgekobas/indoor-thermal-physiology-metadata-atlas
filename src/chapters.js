// Shared by the homepage guide, sidebar and chapter headings.
export const chapters = [
  {
    to: '/context', label: 'When, where & how',
    description: 'Publication dates, locations, indoor settings, session timing, open resources and protocol controls.',
    subtitles: ['Authorship as field structure', 'When and where research happens', 'Setting and timing', 'How many variables are manipulated at once', 'Open data, in practice', 'Protocol & standardisation controls'],
  },
  {
    to: '/population', label: 'Who is studied',
    description: 'Sample sizes, participant characteristics, recruitment criteria and the information reported about participants.',
    subtitles: ['Demographics', 'Was sample size justified?', 'Who was excluded, and why', 'What else is known about participants'],
  },
  {
    to: '/body', label: 'Measuring the human',
    description: 'Physiological signals, sensors, body sites and methods for calculating mean skin temperature.',
    subtitles: ["What's measured, and how", 'Signals, sensor types, and brands', 'How sensor choice has shifted over time', 'Skin temperature body sites', 'Where other signals are measured', 'Mean skin temperature'],
  },
  {
    to: '/environment', label: 'Measuring the environment',
    description: 'Environmental variables measured together and the heights at which sensors were placed.',
    subtitles: ['What gets measured together', 'Where sensors are placed'],
  },
  {
    to: '/questionnaires', label: 'Measuring the perception',
    description: 'Questionnaire domains, response positions and the wording of thermal sensation and comfort scales.',
    subtitles: ['Questionnaire usage by domain', 'Scale heterogeneity: sensation vs. comfort'],
  },
  {
    to: '/cognitive', label: 'Cognition and subjective state',
    description: 'Performance tasks, subjective scales and stress-induction protocols alongside physiological measurements.',
    subtitles: ['What kind of measure is actually used'],
  },
  {
    to: '/combinations', label: 'Explore combinations',
    description: 'Compare two coded variables and inspect the experiments behind each combination.',
    subtitles: ['Choose what to compare'],
  },
  {
    to: '/reporting', label: 'Data completeness',
    description: 'Which details papers report and which are missing, among the experiments where each field applies.',
    subtitles: ['Full field-level completeness list'],
  },
]
