# Interpretation and analysis decisions

These notes describe the current figures and their derivation from the coded
corpus. Exact counts belong to the generated datasets and should be refreshed
with `scripts/build_data.py`. The Atlas describes the included literature and
its metadata; it does not independently reassess every experimental procedure.

## 1. Units of analysis

A publication can contain more than one experiment. Experiment counts use the
unique `id`; publication counts use `id-pub-id`. The main CSV contains multiple
measurement rows per experiment, often for different signals, anatomical sites
or sensing methods. Raw row counts must not be interpreted as experiment counts.
Summed experiment-level sample sizes are not a count of unique individuals;
participants may recur across experiments.

## 2. Missing and conditional codes

`NR` means not reported, `MNR` means measured or administered but the requested
detail is missing, `NC` means unclear or conflicting, and `NAN` means not
applicable under the extraction rules. These codes are not interchangeable.
`Y` and `N` record explicit positive and negative statements where the field
allows them. Missing reporting does not prove that an action was not performed.

One extraction batch used `NAN` in place of `NR` for missing environment and
questionnaire fields. The build normalises that batch convention within those
column groups; it does not apply that substitution to every conditional field.
`clean_num` rejects all missing codes and non-finite numeric values before
numeric analysis.

## 3. Publication periods and experiment dates

The six two-year periods group publication years, not dates of data collection.
Calendar years, seasons and clock times of testing are separate metadata fields.
Differences across publication periods describe the composition of this corpus;
they do not establish a continuous trend or its cause.

## 4. Geography and host climate

The country and city views count experiments. City coordinates come from the
repository's lookup and harmonisation rules. Unresolvable cities are omitted
from the city map, while records can still contribute to country summaries.
Köppen classes are assigned from the recorded location and grouped for display.
For combined class strings, the existing grouping uses the first class.
Headline country shares retain reported country labels, while the map may combine labels to match its geographic categories. A raster basemap preserves the map when WebGL2 is unavailable.
Host climate is a locational descriptor, not a measurement of participants'
thermal history or achieved indoor exposure.

Country sample-size comparisons show countries with at least three experiments.
This is a display threshold, not a test of precision. Country sample shares use
the sum of all usable experiment-level sample sizes, including experiments
whose country is unspecified, as their corpus-wide denominator. Both mean and
median are retained because larger experiments can strongly affect the mean.

## 5. Signal, sensing method and brand

The signal–method–brand diagram includes signals coded in at least five
experiments. Missing sensing-method and brand codes remain visible categories.
Brand casing and whitespace variants are harmonised in the build.

A flow instance is an experiment × signal × sensing-method combination. Its
brand status is a single brand, multiple brands, or a missing-code category.
Signal labels report unique-experiment prevalence. A sensing method shared
by several signals has an instance count, without one pooled percentage against
a single parent signal. Incoming links retain their signal-specific denominator.

The default brand column shows the three most frequent brand categories per
sensing method. The alternative collapses across methods and shows the leading
15 brand categories. These are display restrictions; omitted categories are not
reclassified as absent. A brand count across signals or methods is not generally
a count of distinct experiments using that brand. Device names do not establish
measurement accuracy or validation status.

## 6. Anatomical sites and body diagrams

Skin-temperature harmonisation collapses selected near-synonyms: Lower arm to
Forearm, Calf/Shin to Lower leg, Lumbar to Lower back, and Scapula to Back.
Broad labels such as Arm and Leg are retained rather than automatically assigned
to upper arm or thigh. Distinct face sites remain separate.

The surface field distinguishes dorsal/palmar hand and dorsal/plantar foot
placements where possible. The build contains explicit mappings for older
anterior/posterior terminology on extremities. Unspecified surfaces stay
unspecified. Left/right or dominant/non-dominant side is separate from surface
orientation; the historical column identifiers are preserved.

The diagram consolidates some surface-specific rows for anatomical display;
the period matrix retains the more detailed labels. A site can occur in several
experiments and an experiment can measure several sites. Diagram marker size
increases with count; its base radius means area is not strictly proportional
to count. Dashed outlines identify estimated drawing locations. Non-anatomical
entries such as Whole body or sample types are listed separately.

## 7. Core/body-temperature classification

The core/body-temperature label is split by recorded anatomical site. Each
experiment belongs to one class: rectal or gastrointestinal measurement takes
priority, followed by tympanic/oral/axillary estimates, followed by other
peripheral measurements. Missing sites remain unspecified. “Mouth” is harmonised
with oral cavity for this classification.

An experiment with several sites is counted once in the class view; anatomical
site counts are non-exclusive. The denominator in both period views is the
number of experiments measuring core/body temperature in that publication
period. The classification preserves physiologically relevant distinctions but
does not establish interchangeability within a class.

## 8. Mean skin temperature

MST calculation status is aggregated across measurement rows because the fields
may be populated only on skin-temperature rows. The pathway retains the recorded
point counts and named formulas. Point and formula token lists are paired in
their recorded order; ambiguous mappings raise an error rather than being
assigned arbitrarily. Single-site temperatures are not represented as MST
point-count configurations.

Point-count prevalence counts each experiment once per point count. Formula
uses count distinct experiment × point-count × formula combinations; an
experiment comparing several formulas or point configurations can contribute
more than once. Formula percentages therefore use the total number of formula
instances, including missing or unclear formula categories. The explicit MST
calculation count is a different denominator. Weighted and unweighted
calculations remain represented as coded.

## 9. Questionnaires and scale displays

Questionnaire administration, a coded scale description, a stated point count,
and sufficient information for plotting are different levels of documentation.
They have different denominators. `MNR` indicates administration without the
requested detail; `NC` does not count as a complete scale description.

The response-position grids include discrete scales with enough numeric and
anchor information for plotting. This does not require every intermediate
anchor to be known. Continuous/VAS formats are counted separately and are not
rendered as discrete point scales. Exact numeric positions, response order and
wording are retained apart from typographic normalisation when counting scale
combinations. Seven response positions alone do not establish a common scale.

TCV endpoint colours are based on verbal meaning, rather than assuming that
higher numbers always mean greater comfort. Colouring and numeric alignment are
display aids; they do not establish construct equivalence or justify a particular
harmonisation of responses.

## 10. Performance, subjective state and stress protocols

The performance and subjective-state fields are parsed separately. Token
splitting respects parentheses so that commas inside instrument descriptions
do not create additional instruments. Canonical instrument and domain labels
are assigned using the repository's taxonomy and explicit domain tags.

Performance tasks, subjective-state scales and stress-induction protocols remain
separate categories. Sleepiness or workload self-reports are not automatically
objective measures of cognitive performance. In the diagram, type-to-domain
links count distinct experiments per connection; domain-to-instrument links
count distinct experiment–instrument uses. Several instruments in one
experiment can therefore produce different totals across the two stages.

## 11. Reporting completeness and joint reporting

The field-level view counts experiments with at least one substantive value for
the relevant field. For physiological fields this does not establish that every
signal, method or site in that experiment is documented. Coded sensing methods
can include permitted deterministic device-based inference.

Environment fields store placement metadata, usually heights in metres or a
non-numeric placement description, rather than environmental measurement
values. The completeness view includes substantive descriptions such as Desk.
The height-distribution chart uses parsed numeric heights within its displayed
range. Matching a reference height does not establish standards compliance.

Environmental and questionnaire details are evaluated within their coded
applicability sets. Measured-but-unspecified and unclear details are incomplete;
MST-specific fields are evaluated among experiments explicitly calculating MST.
Other participant-state and protocol fields are shown in their relevant chapters.

The joint-reporting view counts the intersection of selected requirements.
Physiological presets require the selected measurement fields on every row for
the selected signal. These counts describe metadata availability, not an overall
quality score, scientific equivalence or established poolability.

## 12. Complete signal sets and setting combinations

Exact signal sets use distinct coded physiological parameter labels per
experiment. Additional sites, repetitions or sensing methods for the same
parameter do not increase the set size. Each experiment belongs to exactly one
complete set. The displayed leading sets are a subset of all sets, and the
number of hidden sets and experiments is reported explicitly.

The setting matrix assigns each experiment to one recorded setting, retaining
mixed and unspecified settings. Within-setting percentages divide by all
experiments in that setting; within-signal percentages divide by all experiments
measuring that signal. Mixed experiments are not split into unrecorded phases.
These descriptive comparisons do not explain method choice or establish a
causal effect of setting on measurement practice.

## 13. Sex and hormone-related characterisation

Male-only, female-only and mixed-sex cohorts are classified from usable numeric
male/female counts. Unresolved composition remains separate. Sex-based
recruitment criteria are retained independently, so experiments without a
resolved count breakdown can still contribute to that criterion.

The participant view includes single-sex samples, sex-based recruitment,
contraceptive-method, pregnancy/breastfeeding, hormone-therapy and menopausal-
status criteria, menstrual and contraceptive metadata, and menstrual-timing
protocol controls. These categories overlap; their combined count is a union
of experiment IDs. Single-sex recruitment does not itself establish hormonal
status or menstrual control. A sex-hormone assay as an outcome is not inferred
to be an eligibility criterion. Applicability varies by participants and question.

## 14. Testing windows and durations

The time-of-day chart includes parseable non-zero clock ranges within 00:00–24:00.
Invalid or zero-length placeholders are not interpreted as actual sessions.
An experiment is counted once per 15-minute interval even if its reported
windows overlap. The denominator is distinct experiments with usable windows,
not the number of listed clock ranges. A reported testing window does not prove
continuous measurement or participant presence throughout it.

Session and normalisation distributions describe coded durations. The session
plot omits values longer than 600 minutes and reports that omission; its
statistics refer to the displayed observations. The source convention retains
the minimum where only a lower bound or duration range was reported.

## 15. Scope of interpretation

The inclusion criteria are described in Methodology and constrain the
populations, activities and settings represented. Reported patterns concern
this corpus, rather than all physiology or heat-health research. Metadata
completeness, methodological diversity, measurement validity and data access
are distinct properties and should be interpreted separately.
