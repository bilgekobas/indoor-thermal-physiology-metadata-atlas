import { ChapterHeader, ChapterSection } from '../components/Chapter.jsx'
import ComparisonExplorer from '../components/ComparisonExplorer.jsx'

export default function ChapterCombinations({ data }) {
  return <div>
    <ChapterHeader title="Explore combinations"
      framing={<>
        <p>Choose two variables to compare their recorded combinations across the {data.summary.n_experiments} experiments. Start with physiological signals and experimental settings, or select another pair from the dataset.</p>
        <p>Counts describe the included corpus. Row and column percentages use the corresponding category totals; they describe measurement and reporting patterns without establishing causation or scientific comparability.</p>
      </>} />
    <ChapterSection title="Choose what to compare">
      <ComparisonExplorer explorer={data.comparison_explorer} studies={data.studies} />
    </ChapterSection>
  </div>
}
