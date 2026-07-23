# Limitations & methodological judgment calls

This file documents every non-obvious decision baked into
`scripts/build_data.py`, `scripts/cognitive_taxonomy.py`, and
`scripts/city_coordinates.py`. Each entry says what the raw corpus actually
contains, what was decided, and why. Numbers cited here are from the
273-publication / 295-experiment corpus version current as of this writing
and will shift slightly whenever the corpus is updated; re-run the relevant
query in `build_data.py` to refresh them rather than trusting this file's
numbers indefinitely.

This is a living document: it should only describe the decisions actually
reflected in the current pipeline. When a method is replaced or reverted,
update or remove the corresponding entry rather than appending a note next
to the old one.

---

## 1. Categorical-code parsing (`clean_num`)

Python's `float()` accepts the strings `"nan"`, `"NAN"`, `"NaN"` and returns
an actual IEEE NaN. This corpus uses the string `"NAN"` as a missing-value
code ("not applicable"), so without a guard, every numeric column would
silently leak `float('nan')` for NAN-coded cells — which then serializes as
the bare token `NaN`, invalid JSON that crashes strict parsers (including
every browser). `clean_num()` explicitly checks for and rejects
`nan`/`nr`/`mnr`/`nc`/empty-string before calling `float()`. This was found
and fixed once, centrally, after it first surfaced as a broken
`climate_vs_temp.json` — if you add a new numeric aggregation, route it
through `clean_num()` rather than calling `float()` directly.

## 2. Sensor & brand name canonicalization

Free-text sensor and brand fields contain casing and whitespace variants
that are the same real-world entity written differently. The first order of
clean-up and consistency checks should ideally be done in the main dataset.

- `Digital Sphygmomanometer` / `Digital sphygmomanometer` → merged
- `Laser doppler` / `Laser Doppler` → merged
- `Living lab` / `Living Lab` (experiment type) → merged
- Sensor **brands**: canonicalized generally, not via a manual list — every
  brand string is grouped by its lowercase form, and the most frequently
  occurring original casing is kept as the display label (`canonical_label`
  dict, built once and reused across the standalone brand chart, the
  Sankey diagrams, and the brand/model reference table). This caught
  `OMRON`/`Omron`, `Omega`/`OMEGA`, `Andon`/`ANDON`, `NeuroSky`/`Neurosky`,
  `ADInstruments`/`ADinstruments`, `Tanita`/`TANITA`, `Interaxon`/`InterAxon`,
  `Cosmed`/`COSMED`, `HOBO`/`Hobo`, and one trailing-whitespace duplicate of
  `iButton`. This is a general rule, not a fixed lookup table, so it should
  keep working as new papers are added — but it can still be fooled by a
  genuinely different brand that happens to share a lowercase form with an
  existing one (none currently in the corpus, but worth a spot-check after
  each update).

## 3. Skin-temperature body-site consolidation

39 raw body-site labels are merged into 23 canonical sites (`SITE_MERGE` in
`build_data.py`): Lower arm→Forearm, Calf/Shin→Lower leg, Arm→Upper arm,
Leg→Thigh, Lumbar→Lower back, Scapula→Back, and all facial sub-sites (cheek,
nose, chin, mouth, temple, ear, head, eye, earlobe)→Face. This merge was
decided by inspecting the raw label list directly, not algorithmically — if
a future paper introduces a body-site term not in this list, it will
currently fall through unmerged rather than being silently miscategorized,
but it also won't be merged into the right bucket until the dict is
updated. This same merge is reused for the skin-temperature branch of the
signal × sensing method × body site Sankey (Section 12).

## 4. MST measured → points → formula Sankey

The Mean Skin Temperature figure is a three-column Sankey rather than a bar
chart or bucketed table: MST measured (Y/N) → number of MST points →
formula used. Each column reflects the actual raw values rather than a
grouped approximation:

Y/N column: the Y node label now also shows its share of the corpus
as a percentage, alongside its count, so the reader doesn't have to hold
the denominator in their head to judge how common MST measurement is.
Points column: shows the exact point count reported by each study
(1, 3, 4, 5, 6, 8, 9…), ordered smallest → largest. This replaces the
earlier bucketed ranges (2–4 / 5–8 / 9–14 / 15+) — the exact values are
few enough in practice to be individually legible, and buckets were
hiding real structure in the distribution (e.g. the common 4-, 7-, 8-, and
9-point conventions collapsing together).
Formula column: all 29 individually named formulas are shown as their
own nodes — nothing is grouped into an Other/Multiple catch-all the way
the standalone MST-formula chart still does (Section 4 above only ever
applied to that chart; the two now diverge in this respect, see note
below). NR remains its own node for studies where the formula doesn't
match a recognized name.

Multi-formula studies are split and counted under each formula they
name, rather than being forced into a single Multiple bucket or an
arbitrary first-listed formula. A study reporting two named formulas (e.g.
comparing Gagge/Nishi 8-point against Hardy & DuBois 7-point in the same
paper) contributes a flow to both formula nodes.

This makes the formula column's counts non-exclusive — they sum to more
than the number of MST-measuring studies, since a handful of studies are
counted more than once. A footnote on the figure states this explicitly, so
the formula totals aren't misread as a clean partition of all MST-measuring
studies the way the Y/N and points columns are.

## 5. Thermal Comfort Vote (TCV) polarity classification

**This is the most consequential single judgment call in the pipeline.**
TCV scale polarity is inconsistent across studies — some put "comfortable"
at the scale's negative end, others at the positive end. A purely numeric
coloring (lowest number = one color, highest = another) would have silently
mislabeled roughly a quarter of studies.

Fixed by classifying each scale endpoint by its **label text**, not its
numeric position: `COMFORT_WORDS = {comfortable, comfort, satisfied,
satisfaction, pleasant}`, `DISCOMFORT_WORDS = {uncomfortable, discomfort,
unbearable, intolerable, unacceptable, unendurable, dissatisfied,
unpleasant}` (case-insensitive substring match). A study is excluded from
the TCV chart entirely if **neither** endpoint label contains a recognized
word — better to drop an unclassifiable study than silently guess its
polarity. Thermal Sensation Vote (TSV) does **not** need this treatment —
every parsed TSV scale has "cold"-family labels at the numeric minimum and
"hot"-family labels at the maximum, with no exceptions found in this corpus.

If a future paper's TCV scale uses a label not covered by either word set
(e.g. a purely numeric scale with no comfort-related word at either end), it
will be silently excluded rather than erroring — worth a periodic check of
the excluded-count number after each corpus update.

## 6. Cognitive test instrument harmonization

The raw `cognitive-test-type` field is free text, comma-separated, but **not
safely splittable by a naive comma split** — several entries use commas
*inside* parentheses to list sub-components of one instrument (e.g. `"d2
test (sustained concentration, visual scanning ability, sustained
attention)"`), and a naive split corrupts these into meaningless fragments.
`split_cognitive_tests()` in `cognitive_taxonomy.py` is parenthesis-depth
aware and only splits on top-level commas/semicolons.

After splitting, every token is mapped through a hand-built `CANONICAL_MAP`
plus a `DOMAIN_MAP` separating **performance tasks** (something the
participant does — Stroop, N-back, mental arithmetic) from **subjective
self-report scales** (something the participant rates about themselves —
NASA-TLX, Karolinska Sleepiness Scale). The raw corpus field does not
distinguish these two kinds of measure at all; this distinction is original
analysis, not derived from existing literature, and is worth citing
explicitly if used in the paper.

Coverage is currently verified exhaustively against the real data: all 251
tokens across 66 cognitive-testing studies resolve to a canonical instrument
with zero unrecognized tokens remaining (`unrecognized_count: 0` in
`cognitive_tests.json`). If a future paper introduces a new instrument name
not in `CANONICAL_MAP`, it will pass through as a literal title-cased string
tagged `Unclassified (not in taxonomy)` rather than being dropped — check
this domain bucket after each update for anything that should be merged
into an existing canonical entry.

At least one genuinely compound entry could not be safely decomposed
further without guessing how its sub-components map to the corpus's other
single-instrument entries, and was kept intact as one combined canonical
label (e.g. a "Neurobehavioral battery" entry spanning visual RT, Stroop,
redirection, overlapping, and arithmetic sub-tasks).

## 7. Köppen climate grouping

The corpus records exact Köppen-Geiger codes (e.g. `Cfa`, `BSk`, `Dwa`). For
readability, these are grouped into 11 broader categories (`KOPPEN_GROUP`)
following standard first-letter/second-letter Köppen conventions (Tropical,
Arid, Semi-arid, Mediterranean, Humid subtropical, Oceanic, Continental,
Subarctic, Polar), with anything not matched falling into `Other/Mixed`. A
handful of studies report **two combined codes** (e.g. `"Csa/Cfb"`,
`"Aw/Am/As"`) for a site near a climate boundary; only the first code is
used for grouping (`.split('/')[0]`) rather than treating it as two separate
observations.

**Verified**: climate class is consistent per city in this corpus — no city
has two different recorded climate values — so the per-city climate
grouping used on the geography map is internally consistent and not an
artifact of averaging conflicting values.

## 8. City-level geocoding (no live geocoding API used)

This environment has no general internet access — only a small allowlist of
package registries. There is no live geocoding service reachable from here,
so **every coordinate in `scripts/city_coordinates.py` was entered by hand**
from known reference points, not verified against an independent geocoding
API. Coverage is complete (every distinct raw `id-city` string resolves to a
coordinate), but the coordinates themselves carry that caveat. **This is
explicitly flagged for a follow-up pass once you finalize the dataset and
provide geocoded lat/longs** — when that happens, this hand-built table
should be replaced or cross-checked against it, not assumed correct by
default.

Known resolution issues, handled visibly rather than silently:

- **Province/state names, not cities** (e.g. `Hunan`, `Guangdong`, `Anhui`,
  `Shaanxi`, `Jiangsu`, `California`, `Washington`, `Virginia`, `North
  Dakota`, `Paraíba`) — no more specific location is recoverable from the
  source text. Plotted at that region's capital/largest city, tagged
  `precision: 'province'` and surfaced in the map tooltip as
  "province/state-level location only." Currently 13 of the mapped cities
  carry this flag — treat any finding sensitive to exact city location with
  that in mind.
- **One study spans four named Brazilian cities** in a single `id-city`
  field — represented as four separate map points sharing one study ID
  (`precision: 'multi'`), rather than picking one arbitrarily or collapsing
  them into a single averaged point that wouldn't correspond to any real
  location.
- **Hong Kong has no separate polygon** in the bundled world-atlas topojson
  at this resolution — its study count is folded into China's polygon on
  the *country* choropleth (the city-level map is unaffected, since it
  plots Kowloon's own coordinates directly).
- A stray internal space inside one study's GitHub data-link URL (likely a
  line-wrap artifact from data entry) is stripped before display, since an
  unmodified copy would render as a dead link.

**275 of 295 experiments (93%) resolve to a city-level point** across 90
distinct mapped cities; the remainder have no city recorded at all
(`NR`/missing) and are excluded from the city map (they remain in the
country-level choropleth via `id-country`, which has better coverage).

## 9. Domain co-manipulation, Sankey thresholds, and other cutoffs

- The signal → sensor type → brand Sankey only shows **signals measured in
  ≥5 studies** and **sensor brands used in ≥2 studies** — both cutoffs
  chosen to keep the diagram legible rather than cluttered with one-off
  entries (with the omitted count stated in the chapter text, not hidden).
- The by-period binary-matrix views (protocol controls, participant
  metadata, selection criteria) currently show the **full field list** by
  period, not a restricted top-N subset — this replaced an earlier
  top-8-by-completeness restriction once the full grid stayed legible.
- Climate-vs-tested-temperature analysis only includes studies that have
  both a usable climate class and a parseable tested-temperature range;
  studies missing either are excluded rather than imputed.

## 10. Sample size by country: minimum-count threshold, and a deliberately-avoided comparison

Countries with fewer than **3 studies** are excluded from the
sample-size-by-country comparison (`min_count_threshold` in
`sample_size_by_country.json`) — a median or mean computed from 1–2 studies
isn't a meaningful summary statistic, and showing it alongside genuinely
multi-study countries would imply a precision that doesn't exist. Countries
below the threshold remain visible individually in the Browse table and the
geography map, just not in this particular comparison.

Both **mean and median** are shown, deliberately not collapsed to one
number: a country's median sample size can be unremarkable while its mean is
pulled up by a handful of large field studies — showing only the mean would
make that country's studies look systematically larger than they typically
are; showing only the median would hide that those large outlier studies
exist at all.

## 11. Body-site treatment for heart rate, skin conductance, and sweat indicators

Generalizes the skin-temperature site-prevalence treatment (Section 3) to
three more signals where measurement site is a real methodological choice,
not incidental detail. Unlike skin temperature's 39 raw labels needing
consolidation into 23 canonical sites, these three signals each have only a
handful of distinct raw site labels — shown as-is, no merging rules applied.

Heart rate has enough studies with a known site to support a by-period
breakdown; skin conductance and sweat indicators would average too few
studies per two-year bin if split that way, so they're shown overall-only.

**Sweat indicators deserves a specific flag**: the large majority of those
studies record "Whole body" as the site, which is not really a *site* in the
same sense as "forearm" or "finger" — it reflects an entirely different
measurement method (whole-body mass-loss sweat rate) rather than a local
sensor placement. The chart and its commentary say this explicitly rather
than letting "Whole body" sit in a body-site bar chart as if it were just
another anatomical location like the rest.

## 12. Sankey diagrams: two diagrams, a join-bug fix, and a legibility strategy

Two complementary Sankey diagrams cover sensor/device metadata; both share
canonicalization and filtering infrastructure but serve different questions.

**12a. Signal → sensor type → brand** (original Sankey). Signals need ≥5
studies for their own node; brands need ≥2 studies to appear in the third
column (67 of ~131 raw brand strings are one-off and omitted, with the
omitted count stated in the chapter text). Brand casing/whitespace variants
are canonicalized (Section 2).

**12b. Signal × sensing method × body site** (agreeability-focused Sankey).
Complements 12a with brand deliberately removed and body site added
instead — validation/agreeability concerns track *sensing method* (ECG vs.
optical PPG, thermocouple vs. infrared) more directly than brand does, since
two devices from the same brand can differ in validation tier, while
ECG-vs-PPG is a genuine mechanistic difference that changes what "heart
rate" represents. Three independent filtering thresholds keep it legible:
signals need ≥5 studies for their own node (same as 12a); sensing methods
need ≥2 occurrences among those active signals; body sites need ≥3 total
occurrences among the qualifying methods. The skin-temperature site-merge
rules (Section 3) are applied here too, but only to skin-temperature
rows — other signals' site vocabularies are shown as-is, since none of them
has anywhere near the same label-fragmentation problem.

**12c. Brand + model reference table (not a third Sankey column).** Model
names are far too dense (237 distinct, roughly 4x the density that already
strained the brand-only column) for a third Sankey column to stay
legible — forcing them in would require filtering so aggressive it stops
answering the question it's meant to answer. Built as a searchable, sortable
table instead (`/devices` route, `brand_model_reference.json`), showing
every signal → sensing-method → brand → model combination with its study
count and the actual study IDs. This table reuses the same brand-casing
canonicalization (Section 2) so variants collapse consistently across every
view that shows brand names.

**12d. A real join bug, and its correction.** The original implementation
derived signal→brand counts by joining two separately-aggregated tables:
signal→sensor-type totals, and sensor-type→brand totals. This silently
double-attributed a brand's full count to every signal that happens to
share a sensing method with it. The concrete failure: OMRON makes both a
digital sphygmomanometer (blood pressure + heart rate) and, in a few
studies, an infrared thermometer — joining through sensing method alone
gave OMRON a spuriously inflated count under "Skin temperature" that didn't
match the raw rows.

Fixed by deriving signal→brand directly from `brand_model_reference.json`
(itself built from the raw per-row `physio-parameter` +
`physio-sensor-brand` pairs, not from a join of two aggregates). This
surfaced a real, previously-misreported finding: **OMRON, not iButton, is
the most-cited brand overall** once counted correctly — but OMRON's count is
spread across multiple signals via its combination devices, while iButton's
is concentrated almost entirely in one signal. Both facts are worth keeping
in view; neither "most-cited brand" framing alone tells the full story. Note
that this "most-cited brand" claim counts each brand once per signal it's
used for (so combination devices count more than once) — a different,
equally valid question from "how many distinct experiments use this brand,"
and the two metrics can disagree on brand ranking. Chapter captions
referencing this figure compute their numbers live from
`brand_model_reference.data` rather than hardcoding them, but deliberately
keep the sum-across-signals framing rather than switching metrics.

**12e. Per-signal top-3 brand grouping.** The Sankey's brand column groups
each signal's brands to its own top 3 by default, collapsing the rest into
a clickable "Other brands (N)" node that expands to the full list on
click — scoped per signal rather than a single flat global threshold, since
a globally-rare brand can still be a signal's #2 or #3 choice and deserves
to be visible there.

**12f. Signal totals were double-counting multi-method experiments.** Both
Sankey components computed each signal's node total by summing counts
across all sensing methods, which silently inflates any signal where some
experiments use more than one sensing method for it (e.g. thermocouple at
some skin-temperature sites, thermochron at others, within the same
experiment) — that experiment gets counted once per method, not once. Fixed
by adding a deduplicated `signal_totals` field to `physio_signal_sensor.json`
(`id`-deduplicated per signal, computed once in `build_data.py`), with both
Sankey components and the ChapterBody prose captions reading from it instead
of summing the per-method counts.

## 13. Page layout: commentary column and the matrix-width tradeoff

`FigureCard` was restructured so commentary sits in a fixed ~280px left
column with its own background/border, and the plot starts at the same
horizontal position for every figure on the page — previously the plot came
first and commentary trailed it at a variable position depending on that
figure's own width, so there was no consistent column for the eye to track
down the page.

This reduces the space available to wide charts, so two were deliberately
shrunk to fit better within it:

- The signal → sensor type → brand Sankey's column spacing was compressed
  (signal/sensor/brand columns moved from x=230/560/900 to x=190/440/700,
  total width 1160px → 890px), checked against the longest actual label in
  each column to confirm neither overlaps the next column at the new
  spacing.
- The protocol/participant-metadata/selection-criteria binary matrices went
  from 3px to 2px per study column, with the inter-column gap removed.

Even after both reductions, the largest binary matrix (one column per
study) may still need its own horizontal scroll on narrower viewports —
fitting that many individually-visible data columns into the available
width is a hard floor, not a CSS fix; going denser than 2px/column would
make individual studies impossible to distinguish, which defeats the
chart's purpose (showing per-study heterogeneity, not just an aggregate).

---

This file documents pipeline-level (`build_data.py`) decisions — i.e.,
choices made while turning the raw corpus into the JSON the site reads. It
does not re-document the original metadata-extraction conventions used to
build `corpus_main_dataset.csv` itself (body-site sagittal/surface coding,
MST point-count conventions, the Y/N/NR/MNR/NC vocabulary definitions,
etc.) — those are covered in the main repository's `README.md` and
`variable_dictionary.csv`.
