import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import { Link } from 'react-router-dom'
import FigureCard from '../components/FigureCard.jsx'
import { SignalSettingMatrix } from '../components/CombinationViews.jsx'
import { figNum } from '../figureRegistry.js'

export default function ChapterCombinations({ data }) {
  const matrix = data.combination_views.signal_setting
  const core = matrix.rows.find(r => r.label === 'Core/Body temperature')
  const coreLab = core?.cells.find(c => c.setting === 'Lab')?.count || 0
  return <div>
    <ChapterHeader eyebrow="Chapter 7 of 8" title="Combining context and measurement"
      framing={<>
        <p>The preceding chapters describe experimental settings and measurement choices separately. This view connects them within the same experiments: which physiological signals are measured in laboratories, field settings, living labs, or mixed settings?</p>
        <p>Two percentage views answer different questions. Within-setting percentages describe the measurement choices in each setting. Within-signal percentages describe where experiments measuring a particular signal were conducted. All counts refer to the review's included experiments.</p>
      </>}
      headline={matrix.settings.map(s => ({ value: s.n, label: `${s.label} experiments` }))} />
    <ChapterSection title="Physiological signals across study settings"
      intro={`For example, ${coreLab} of ${core.count} experiments measuring core/body temperature were classified as laboratory studies. The matrix allows the same comparison for other signals, while retaining the number of experiments available in each setting.`}>
      <FigureCard figNumber={figNum('signal-by-setting')} title="Physiological signal × experimental setting" plotWidth={1120}
        commentary="Switch the denominator to distinguish a common measurement within a small setting category from a large share of the evidence for that signal. Select a cell to inspect the contributing experiments.">
        <SignalSettingMatrix matrix={matrix} studies={data.studies} />
      </FigureCard>
      <p className="text-[12px] text-inkmid max-w-3xl">
        These combinations describe measurement choices. To check whether the metadata needed for a comparison are available together, <Link to="/reporting#which-details-are-documented-together" className="text-coreaccent hover:underline">inspect joint reporting completeness</Link>.
      </p>
    </ChapterSection>
  </div>
}
