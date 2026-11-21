import PageHeader from '../components/PageHeader.jsx'
import { Link } from 'react-router-dom'

const link = 'text-coreaccent hover:underline'

function Person({ href, name, affiliation }) {
  return (
    <p>
      <a href={href} className={link} target="_blank" rel="noopener noreferrer">{name}</a>
      {' · '}{affiliation}
    </p>
  )
}

export default function About({ data }) {
  const { summary } = data
  return (
    <div>
      <PageHeader eyebrow="Reference" title="About" />

      <div className="px-5 sm:px-10 py-8 max-w-3xl space-y-8">
        <section>
          <h2 className="text-[15px] font-semibold mb-2">What the Atlas records</h2>
          <p className="text-sm text-inkmid leading-relaxed">
            The Indoor Thermal Physiology Metadata Atlas describes how researchers studied people’s responses to
            indoor thermal environments in publications from {summary.year_min} to {summary.year_max}. Each record
            brings together what the paper reports about the participants, exposures, measurements and protocol.
            A detail coded as unreported could not be recovered from the publication. Deciding whether
            two experiments can be compared still requires reading their methods.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Why we built it</h2>
          <p className="text-sm text-inkmid leading-relaxed">
            Planning a study often starts with a practical question. Where have other teams placed their sensors?
            How long did participants spend at each temperature? Answering those questions usually means
            reconstructing protocols paper by paper. We extracted those details in a common format so that
            researchers can find relevant experiments, compare methods and see which information is available for reuse.
          </p>
        </section>

        <section id="team" className="scroll-mt-4">
          <h2 className="text-[15px] font-semibold mb-2">Research team</h2>

          <div className="text-sm text-inkmid leading-relaxed">
            <p className="mb-2">
              Bilge Kobas led the review and primary extraction. The contributors to the review and Atlas are listed below.
            </p>

            <Person
              href="https://www.arc.ed.tum.de/klima/team/bilge-kobas/"
              name="Bilge Kobas"
              affiliation="Technical University of Munich, Chair of Building Technology and Climate Responsive Design"
            />
            <Person
              href="https://cbe.berkeley.edu/about-us/people/tobias-kramer/"
              name="Tobias Kramer"
              affiliation="UC Berkeley, Center for the Built Environment"
            />
            <Person
              href="https://orcid.org/0009-0007-2605-0515"
              name="Jian Pan"
              affiliation="RWTH Aachen, Healthy Living Spaces Research Group"
            />
            <Person
              href="https://cris.maastrichtuniversity.nl/en/persons/cynthia-ly/"
              name="Cynthia Ly"
              affiliation="Maastricht University, Faculty of Health, Medicine and Life Sciences"
            />
            <Person
              href="https://people.epfl.ch/matteo.favero"
              name="Matteo Favero"
              affiliation="EPFL, Human-Oriented Built Environment Lab"
            />
          </div>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Updating the corpus</h2>
          <p className="text-sm text-inkmid leading-relaxed">
            The <Link to="/methodology" className={link}>review methods</Link> and{' '}
            <Link to="/dictionary" className={link}>variable dictionary</Link> document the inclusion criteria and
            coding conventions for future updates. Each public release is versioned. The figures on this site
            are rebuilt from the data in the repository.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Coding decisions and limitations</h2>
          <p className="text-sm text-inkmid leading-relaxed">
            Classifying comfort scales, grouping sensor names and mapping study locations all require interpretation.
            The reasoning behind these choices is documented in{' '}
            <a
              href="https://github.com/bilgekobas/indoor-thermal-physiology-metadata-atlas/blob/main/LIMITATIONS.md"
              className={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              LIMITATIONS.md
            </a>{' '}
            in the repository.
          </p>
        </section>

        <section>
          <h2 className="text-[15px] font-semibold mb-2">Citing and reusing this work</h2>
          <p className="text-sm text-inkmid leading-relaxed">
            Cite the archive corresponding to the material you used. The{' '}
            <a href="https://doi.org/10.5281/zenodo.21511034" className={link}>coded dataset</a> and the{' '}
            <a href="https://doi.org/10.5281/zenodo.21516763" className={link}>Atlas software</a> have
            separate Zenodo records with citation details.
          </p>
          <p className="text-sm text-inkmid leading-relaxed mt-3">
            Found an error, or know a study that belongs in the corpus? Please open an issue on{' '}
            <a
              href="https://github.com/bilgekobas/indoor-thermal-physiology-metadata-atlas/issues"
              className={link}
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>.
          </p>
        </section>
      </div>
    </div>
  )
}
