# Limitations & methodological judgment calls

This file documents every non-obvious decision baked into
`scripts/build_data.py` and `scripts/cognitive_taxonomy.py` — the kind of
thing a paper reviewer or a future maintainer would otherwise have to
reverse-engineer from the code. Each entry says what the raw corpus
actually contains, what was decided, and why. Numbers cited here are from
the 269-study corpus version current as of this writing and will shift
slightly whenever the corpus is updated; re-run the relevant query in
`build_data.py` to refresh them rather than trusting this file's numbers
indefinitely.

If you're citing this site or its derived figures in a paper, this is the
file to check first when a reviewer asks "how exactly did you handle X."

---

## 1. Corpus-level exclusions

**One publication has no usable ID.** Marchenko et al. (2020), "The study
of facial muscle movements for non-invasive thermal discomfort detection,"
is missing its `id-pub-id` and `id` values in the source CSV — almost
certainly a data-entry gap, not a deliberate omission. Because every join,
deduplication, and count in the pipeline keys on `id`, this row is excluded
entirely from `studies_u` (see `build_data.py`, the comment above
`studies_u = df.drop_duplicates(...)`). This is why the corpus is reported
as **269 studies**, not 270 — `df['id'].nunique()` (which excludes NaN)
gives the trustworthy count; a naive `drop_duplicates()` would have counted
the NaN-id rows as one additional phantom "study," inflating every
percentage on the site by a small, silent amount. If this study's metadata
is recovered, re-add its `id` and it will flow through automatically.

## 2. Categorical-code parsing (`clean_num`)

Python's `float()` accepts the strings `"nan"`, `"NAN"`, `"NaN"` and
returns an actual IEEE NaN. This corpus uses the string `"NAN"` as a
missing-value code ("not applicable"), so without a guard, every numeric
column would silently leak `float('nan')` for NAN-coded cells — which then
serializes as the bare token `NaN`, invalid JSON that crashes strict
parsers (including every browser). `clean_num()` explicitly checks for and
rejects `nan`/`nr`/`mnr`/`nc`/empty-string before calling `float()`. This
was found and fixed once, centrally, after it first surfaced as a broken
`climate_vs_temp.json` — if you add a new numeric aggregation, route it
through `clean_num()` rather than calling `float()` directly.

## 3. Sensor & brand name canonicalization

Free-text sensor and brand fields contain casing and whitespace variants
that are the same real-world entity written differently:

- `Digital Sphygmomanometer` / `Digital sphygmomanometer` → merged
- `Laser doppler` / `Laser Doppler` → merged
- `Living lab` / `Living Lab` (experiment type) → merged
- Sensor **brands**: canonicalized generally, not via a manual list — every
  brand string is grouped by its lowercase form, and the most frequently
  occurring original casing is kept as the display label (`canonical_label`
  dict, built once and reused for both the standalone brand chart and the
  Sankey's third column). This caught `OMRON`/`Omron`, `Omega`/`OMEGA`,
  `Andon`/`ANDON`, `NeuroSky`/`Neurosky`, `ADInstruments`/`ADinstruments`,
  `Tanita`/`TANITA`, `Interaxon`/`InterAxon`, `Cosmed`/`COSMED`,
  `HOBO`/`Hobo`, and one trailing-whitespace duplicate of `iButton`. This is
  a general rule, not a fixed lookup table, so it should keep working as new
  papers are added — but it can still be fooled by a genuinely different
  brand that happens to share a lowercase form with an existing one (none
  currently in the corpus, but worth a spot-check after each update).

## 4. Skin-temperature body-site consolidation

39 raw body-site labels are merged into 23 canonical sites (`SITE_MERGE` in
`build_data.py`): Lower arm→Forearm, Calf/Shin→Lower leg, Arm→Upper arm,
Leg→Thigh, Lumbar→Lower back, Scapula→Back, and all facial sub-sites
(cheek, nose, chin, mouth, temple, ear, head, eye, earlobe)→Face. This
merge was decided by inspecting the raw label list directly, not
algorithmically — if a future paper introduces a body-site term not in this
list, it will currently fall through unmerged rather than being silently
miscategorized, but it also won't be merged into the right bucket until the
dict is updated.

## 5. MST formula attribution

`physio-mst-formula` is marked `NR` (not the formula name) whenever the
reported weighting coefficients don't match a recognized named formula —
the actual equation text is preserved in `physio-formulas` instead of being
forced into a named bucket it doesn't belong to. The six named formulas
tracked (`TOP_FORMULAS`): Ramanathan (1964), Hardy & DuBois (1938), ISO
9886:2004, Colin & Houdas (1982), Ouyang (1985), McIntyre (1980). Anything
else recognized-but-uncommon is bucketed as `Other/Multiple`.

**Paper 263's formula is a known ambiguous case**: it groups several
measured body sites under one shared coefficient (e.g. forehead + upper arm
+ forearm all under a single 0.07 weight), and the source text doesn't
specify how that coefficient splits across the three sites. This was
extracted with the ambiguity flagged in `physio-formulas` rather than
guessing an even split.

## 6. Thermal Comfort Vote (TCV) polarity classification

**This is the most consequential single judgment call in the pipeline.**
The appendix's own Figure 16 finding is that TCV scale polarity is
inconsistent across studies — some put "comfortable" at the scale's
negative end, others at the positive end. A purely numeric coloring (lowest
number = one color, highest = another) would have silently mislabeled
roughly a quarter of studies.

Fixed by classifying each scale endpoint by its **label text**, not its
numeric position: `COMFORT_WORDS = {comfortable, comfort, satisfied,
satisfaction, pleasant}`, `DISCOMFORT_WORDS = {uncomfortable, discomfort,
unbearable, intolerable, unacceptable, unendurable, dissatisfied,
unpleasant}` (case-insensitive substring match). A study is excluded from
the TCV chart entirely if **neither** endpoint label contains a recognized
word — better to drop an unclassifiable study than silently guess its
polarity. This excluded 2 studies (116 → 114 in the TCV chart). Thermal
Sensation Vote (TSV) does **not** need this treatment — verified that every
parsed TSV scale has "cold"-family labels at the numeric minimum and
"hot"-family labels at the maximum, with no exceptions in this corpus.

If a future paper's TCV scale uses a label not covered by either word set
(e.g. a purely numeric scale with no comfort-related word at either end),
it will be silently excluded rather than erroring — worth a periodic check
of the excluded-count number after each corpus update.

## 7. Cognitive test instrument harmonization

The raw `cognitive-test-type` field is free text, comma-separated, but
**not safely splittable by a naive comma split** — several entries use
commas *inside* parentheses to list sub-components of one instrument (e.g.
`"d2 test (sustained concentration, visual scanning ability, sustained
attention)"`), and a naive split corrupts these into meaningless fragments.
`split_cognitive_tests()` in `cognitive_taxonomy.py` is parenthesis-depth
aware and only splits on top-level commas/semicolons.

After splitting, every token is mapped through a hand-built
`CANONICAL_MAP` (64 canonical instruments) plus a `DOMAIN_MAP` separating
**performance tasks** (something the participant does — Stroop, N-back,
mental arithmetic) from **subjective self-report scales** (something the
participant rates about themselves — NASA-TLX, Karolinska Sleepiness
Scale). The raw corpus field does not distinguish these two kinds of
measure at all; this distinction is original analysis, not derived from
existing literature, and is worth citing explicitly if used in the paper.

Coverage was verified exhaustively against the real data: all 217 tokens
across 56 cognitive-testing studies resolve to a canonical instrument with
zero unrecognized tokens remaining (`unrecognized_count: 0` in
`cognitive_tests.json`). If a future paper introduces a new instrument name
not in `CANONICAL_MAP`, it will pass through as a literal title-cased
string tagged `Unclassified (not in taxonomy)` rather than being dropped —
check this domain bucket after each update for anything that should be
merged into an existing canonical entry.

One genuinely compound entry could not be safely decomposed further
without guessing how its sub-components map to the corpus's other
single-instrument entries, and was kept intact as one combined canonical
label: *"Neurobehavioral battery (visual RT, Stroop, redirection,
overlapping, arithmetic, visual learning)"*.

## 8. Köppen climate grouping

The corpus records exact Köppen-Geiger codes (e.g. `Cfa`, `BSk`, `Dwa`).
For readability, these are grouped into 11 broader categories
(`KOPPEN_GROUP`) following standard first-letter/second-letter Köppen
conventions (Tropical, Arid, Semi-arid, Mediterranean, Humid subtropical,
Oceanic, Continental, Subarctic, Polar), with anything not matched falling
into `Other/Mixed`. A handful of studies report **two combined codes**
(e.g. `"Csa/Cfb"`, `"Aw/Am/As"`) for a site near a climate boundary; only
the first code is used for grouping (`.split('/')[0]`) rather than treating
it as two separate observations.

**Verified**: climate class is consistent per city in this corpus — no city
has two different recorded climate values — so the per-city climate
grouping used on the geography map is internally consistent and not an
artifact of averaging conflicting values.

## 9. City-level geocoding (no live geocoding API available)

This environment has no general internet access — only a small allowlist
of package registries. There is no live geocoding service reachable from
here, so **every coordinate in `scripts/city_coordinates.py` was entered by
hand** from known reference points, not verified against an independent
geocoding API. Coverage is complete (all 78 distinct raw `id-city` strings
in the 269-study corpus resolve to a coordinate; zero gaps as of this
writing), but the coordinates themselves carry that caveat. **This is
explicitly flagged for a follow-up pass once you finalize the dataset and
provide geocoded lat/longs** — when that happens, this hand-built table
should be replaced or cross-checked against it, not assumed correct by
default.

Known resolution issues, handled visibly rather than silently:

- **10 entries are province/state names, not cities** (`Hunan`, `Guangdong`,
  `Anhui`, `Shaanxi`, `Jiangsu`, `California`, `Washington`, `Virginia`,
  `North Dakota`, `Paraíba`) — no more specific location is recoverable from
  the source text. Plotted at that region's capital/largest city, tagged
  `precision: 'province'` and surfaced in the map tooltip as
  "province/state-level location only." **12 of 81 mapped cities carry this
  flag** — treat any finding sensitive to exact city location with that in
  mind.
- **`'Tsinghua'`** is an institution name (Tsinghua University), not a
  place name — resolved to its host city, Beijing, tagged `precision:
  'institute'`.
- **`'Naogoya'`** is a typo for Nagoya (no other Japanese city of that
  spelling exists, and the surrounding study context matches known
  Nagoya-area research groups) — corrected silently but documented here.
- **One study (id `153_1`) spans four named Brazilian cities** in a single
  `id-city` field (Teresina, Petrolina, João Pessoa, Manaus) — represented
  as four separate map points sharing one study ID (`precision: 'multi'`),
  rather than picking one arbitrarily or collapsing them into a single
  averaged point that wouldn't correspond to any real location.
- **Hong Kong has no separate polygon** in the bundled world-atlas
  topojson at this resolution — its study count is folded into China's
  polygon on the *country* choropleth (the city-level map is unaffected,
  since it plots Kowloon's own coordinates directly).
- A stray internal space inside one study's GitHub data-link URL (likely a
  line-wrap artifact from data entry) is stripped before display, since an
  unmodified copy would render as a dead link.

**250 of 269 studies (93%) resolve to a city-level point**; the remaining
19 have no city recorded at all (`NR`/missing) and are excluded from the
city map (they remain in the country-level choropleth via `id-country`,
which has better coverage).

## 10. Domain co-manipulation, Sankey thresholds, and other cutoffs

- The Sankey diagram (signal → sensor type → brand) only shows **signals
  measured in ≥5 studies** and **sensor brands used in ≥2 studies** — both
  cutoffs chosen to keep the diagram legible rather than cluttered with
  one-off entries. 131 raw brand strings exist; 67 are used in exactly one
  study each and are omitted from the third column (with the omitted count
  stated in the chapter text, not hidden).
- The by-period binary-matrix views (protocol controls, participant
  metadata, selection criteria) restrict to the **top 8 fields by overall
  completeness** rather than showing all fields by period — chosen for
  legibility on a 6-period x N-field grid; the full field list remains
  visible in the corresponding "overall" view.
- Climate-vs-temperature analysis only includes the **216 of 269 studies**
  that have both a usable climate class and a parseable tested-temperature
  range; studies missing either are excluded rather than imputed.

---

## 11. Verified chart-to-description matches

After building most of the site's commentary text, every chart was checked
against what its own caption/commentary claims it visually encodes —
prompted by a direct question about whether the time-of-day chart actually
colored sessions by circadian-control status the way the original appendix
spec (Figure 5) describes. **It didn't** — an earlier version plotted every
session line in one flat grey, with no connection to
`protocol-circadian` at all, despite the appendix explicitly calling for
"colour coding indicating whether circadian timing effects were explicitly
considered or not reported." Fixed by joining `protocol-circadian` onto
each session in the pipeline (`fig05_time_of_day.json` now carries a
`circadian_considered` boolean per session) and coloring the chart
accordingly (blue = considered, grey = not considered/unspecified); 35 of
73 sessions with known timing show `circadian_considered: true`.

Every other chart making an explicit visual-encoding claim in its
commentary was re-checked against its actual rendering code at the same
time: TCV polarity coloring (Section 6 above), the city map's Köppen
coloring, the co-occurrence matrix's diagonal-cell outline, the Sankey's
domain-ordered sort, and the ascending-sort claims on the age/BMI/sex
charts. All of those held up against the live code. The lesson, not just
the fix: a chart's prose description and its rendering logic can drift
apart silently across edits in a long session, and the only reliable check
is reading the actual rendering code line by line against each specific
claim, not assuming a chart still does what an earlier version of its
caption said it does.

---

## 12. Sample size by country: minimum-count threshold, and a deliberately-avoided comparison

Countries with fewer than **3 studies** are excluded from the sample-size-
by-country comparison (`min_count_threshold` in `sample_size_by_country.json`)
— a median or mean computed from 1–2 studies isn't a meaningful summary
statistic, and showing it alongside genuinely multi-study countries would
imply a precision that doesn't exist. This leaves 13 of the corpus's
countries with their own line; the rest remain visible individually in the
Browse table and the geography map, just not in this particular
comparison.

Both **mean and median** are shown, deliberately not collapsed to one
number: China's median sample size (24) is unremarkable, but its mean (56)
is pulled up by a handful of large field studies (one with n=2,110) —
showing only the mean would make Chinese studies look systematically larger
than they typically are; showing only the median would hide that those
large outlier studies exist at all.

**A related cross-country comparison was deliberately not built**: protocol
rigor (blinding, randomisation, etc.) broken down by country. Geographic
concentration is already a documented finding (Chapter 1), and rigor trends
over time are already a documented finding (Chapter 7) — but combining them
into "which country's studies are more rigorous" invites a reading the
corpus isn't making and doesn't intend to support, since differences likely
reflect reporting conventions and journal norms more than researcher
competence, and the framing is an easy target for misrepresentation outside
the site's control. Sample size by country was built instead, since it's a
resourcing/capacity question, not a quality judgment, and doesn't carry the
same risk.

## 13. Body-site treatment for heart rate, skin conductance, and sweat indicators

Generalizes the skin-temperature site-prevalence treatment (Chapter 3,
Section 4 above) to three more signals where measurement site is a real
methodological choice, not incidental detail. Unlike skin temperature's 39
raw labels needing consolidation into 23 canonical sites, these three
signals each have only 8–10 distinct raw site labels — shown as-is, no
merging rules applied.

**Heart rate** has enough studies with a known site (99) to support a
by-period breakdown; **skin conductance** (25) and **sweat indicators**
(32) would average under 5 studies per two-year bin if split six ways — too
thin to be meaningful, so they're shown overall-only. Same reasoning
already applied to the environmental co-occurrence matrix (Section 13 of
the original audit) and the climate/geography concentration figures.

**Sweat indicators deserves a specific flag**: 27 of 35 studies (77%)
record "Whole body" as the site, which is not really a *site* in the same
sense as "forearm" or "finger" — it reflects an entirely different
measurement method (whole-body mass-loss sweat rate) rather than a local
sensor placement. The chart and its commentary say this explicitly rather
than letting "Whole body" sit in a body-site bar chart as if it were just
another anatomical location like the rest.

## 14. Signal × sensing method × body site Sankey

A second Sankey, complementing the original signal → sensor type → brand
diagram, with brand deliberately removed and body site added instead. The
reasoning: validation/agreeability concerns track *sensing method* (ECG vs.
optical PPG, thermocouple vs. infrared) more directly than brand does — two
devices from the same brand can differ in validation tier, while ECG vs.
PPG is a genuine mechanistic difference that changes what "heart rate"
represents. Three independent filtering thresholds keep the diagram
legible rather than cluttered:

- **Signals** need ≥5 studies for their own node (same threshold as the
  original Sankey) — 14 signals qualify.
- **Sensing methods** need ≥2 occurrences among those active signals — 34
  of 49 raw methods qualify; 15 one-off methods are omitted (count stated
  in the chapter text, not hidden).
- **Body sites** need ≥3 total occurrences among the qualifying methods —
  31 of 60 raw sites qualify.

The skin-temperature site-merge rules (`SITE_MERGE`, see Section 4 above)
are applied here too, but **only to skin-temperature rows** — they collapse
that signal's 39 raw site labels into the same 23 canonical sites used in
the body-site prevalence heatmap, so the two figures are directly
comparable. Other signals' site vocabularies are shown as-is, since none of
them has anywhere near the same label fragmentation problem (8–20 raw
labels each, not 39).

## 15. Brand + model reference table (not a third Sankey column)

237 distinct sensor model names exist in the corpus — roughly 4x the
density that already strained the brand-only Sankey column (131→64 brands
after filtering to ≥2 studies). Forcing model names into a third Sankey
column would require filtering so aggressive it stops answering the
question it's meant to answer, or render as illegible clutter. Built as a
searchable, sortable table instead (`/devices` route,
`brand_model_reference.json`), showing every signal → sensing-method →
brand → model combination with its study count and the actual study IDs —
the format that actually serves an agreeability check ("which specific
devices measured heart rate, and via which mechanism") better than a
diagram would.

This table reuses the same brand-casing canonicalization built for the
standalone brand chart (Section 3 above) — `canonical_label`, applied here
too rather than re-derived, so `'iButton '`/`'iButton'` and similar
variants collapse consistently across every view that shows brand names.

## 16. Signal → sensor type → brand Sankey: a real join bug, and its correction

The original implementation derived signal→brand counts by joining two
separately-aggregated tables: signal→sensor-type totals, and sensor-type→
brand totals (`sensor_type_brand.json`). This silently double-attributed a
brand's full count to every signal that happens to share a sensing method
with it. The concrete failure: **OMRON** makes both a digital
sphygmomanometer (blood pressure + heart rate) and, in a few studies, an
infrared thermometer — joining through sensing method alone gave OMRON a
spuriously inflated count under "Skin temperature" (14, when the real
number checked against the raw rows is 2).

Fixed by deriving signal→brand directly from `brand_model_reference.json`
(itself built from the raw per-row `physio-parameter` + `physio-sensor-brand`
pairs, not from a join of two aggregates), which is the same data backing
the `/devices` reference table. This changed a real, previously-reported
finding: **OMRON, not iButton, is the most-cited brand overall** (65 vs. 49
studies) once counted correctly — but OMRON's count is spread across
multiple signals via its combination devices (blood pressure 30, heart rate
20, core temperature 12), while iButton's is concentrated almost entirely
in one signal (44 of 49 in skin temperature). Both facts are worth keeping
in view; neither "most-cited brand" framing alone tells the full story.

The Sankey's brand column now also groups each signal's brands to its own
top 3 by default, collapsing the rest into a clickable "Other brands (N)"
node that expands to the full list on click — a different legibility
strategy than the earlier flat ≥2-studies global threshold, scoped per
signal instead of globally, since a globally-rare brand can still be a
signal's #2 or #3 choice and deserves to be visible there.

## What this file does not cover

This file documents pipeline-level (`build_data.py`) decisions — i.e.,
choices made while turning the raw corpus into the JSON the site reads.
It does not re-document the original metadata-extraction conventions used
to build `corpus_main_dataset.csv` itself (body-site sagittal/surface
coding, MST point-count conventions, the Y/N/NR/MNR/NC vocabulary
definitions, etc.) — those are covered in the main repository's `README.md`
and `variable_dictionary.csv`.
