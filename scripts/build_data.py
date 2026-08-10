"""
Builds static JSON artifacts from corpus_main_dataset.csv for the GitHub Pages site.
Run this script whenever the corpus is updated (e.g. after a new extraction round).
Outputs go to ../public/data/
"""
import pandas as pd
import numpy as np
import json
import re
from pathlib import Path

SRC = str(Path(__file__).resolve().parents[1] / 'public' / 'data' / 'corpus_main_dataset.csv')
OUT_DIR = Path(__file__).resolve().parents[1] / 'public' / 'data'
OUT_DIR.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(SRC, encoding='utf-8-sig', low_memory=False)
df = df.replace({np.nan: None})

# Data-quality normalization: 46 studies (a contiguous id block, 198_1-240_1 —
# one extraction batch, not a publication-year cohort) code every missing
# env-/ques- value as "NAN" ("not applicable") instead of "NR" ("not
# reported"). Confirmed this is a data-entry habit, not a real semantic
# distinction: across all 269 studies, a study is either 100% NR-for-missing
# or 100% NAN-for-missing within these two column groups, never mixed, and
# there's no legitimate "not applicable" case for a top-level questionnaire
# or environment-measurement field (unlike domain-conditional columns
# elsewhere in the corpus, where NAN genuinely means the domain wasn't part
# of the study design). This was already confirmed as a known issue to fix
# at the source when new entries are added; until then, normalize here so
# the NR/MNR/NC breakdown in fig14/15/16 reflects it correctly rather than
# silently absorbing these into "other_missing". Does not change any
# previously-reported completeness percentage, since NAN and NR were already
# both treated as "not reported" by is_missing_code()/CODES.
for prefix in ('env-', 'ques-'):
    cols = [c for c in df.columns if c.startswith(prefix)]
    df[cols] = df[cols].replace({'NAN': 'NR'})

# Shared pretty-name lookup, defined once near the top so every function that
# builds a protocol/participant-metadata/selection-criteria view (overall AND
# by-period) uses the identical label for the same underlying column. Without
# this, the fallback "strip prefix, replace hyphens" naming produces inputs
# like "no ongoing treatment medication use" instead of a properly punctuated
# label, and — worse — could drift between an overall view and its by-period
# companion if each built its labels independently.
FIELD_PRETTY_NAMES = {
    'protocol-fixed-clo': 'Fixed clothing insulation', 'protocol-observed-clo': 'Observed clothing',
    'protocol-defined-activity': 'Defined activity protocol', 'protocol-observed-met': 'Observed metabolic rate',
    'protocol-avoid-stimulant': 'Avoid stimulants', 'protocol-avoid-activity': 'Avoid physical activity',
    'protocol-avoid-heavy-food': 'Avoid heavy meals',
    'protocol-rest-sleep': 'Pre-experiment rest/sleep', 'protocol-maintain-routine': 'Maintain routine',
    'protocol-circadian': 'Circadian control', 'protocol-mens-timing': 'Menstrual timing control',
    'protocol-time-btw-sessions': 'Time between sessions', 'protocol-instruction-practice': 'Pre-study instruction/practice',
    'protocol-diary': 'Activity diary use',
    'protocol-blinded': 'Blinding', 'protocol-random': 'Randomisation', 'protocol-balancing': 'Balanced session order',
    'protocol-subjects-not-allowed-to-discuss': 'Participants not allowed to discuss study',
    'protocol-food': 'Controlled food intake', 'protocol-water': 'Controlled water intake',
    'protocol-prep-body-site': 'Body-site preparation for sensors',
    'part-meta-age': 'Age', 'part-meta-sex': 'Sex', 'part-meta-height': 'Height', 'part-meta-weight': 'Weight',
    'part-meta-bmi': 'BMI', 'part-meta-ponderal-index': 'Ponderal index', 'part-meta-body-fat': 'Body fat %',
    'part-meta-ethnicity-nationality': 'Ethnicity/nationality', 'part-meta-bsa': 'Body surface area',
    'part-meta-thermal-history-background': 'Thermal history', 'part-meta-education-profession': 'Education/profession',
    'part-meta-thermal-sensitivity-preference': 'Thermal sensitivity/preference', 'part-meta-personality': 'Personality',
    'part-meta-psych-eval': 'Psychological evaluation', 'part-meta-smoking': 'Smoking behaviour',
    'part-meta-activity-level': 'Activity level', 'part-meta-health-status': 'General health status',
    'part-meta-chronotype': 'Chronotype', 'part-recent-chrono-change': 'Recent chronotype shift',
    'part-meta-bmr-rmr': 'Basal/resting metabolic rate', 'part-meta-alcohol-use': 'Alcohol use',
    'part-meta-mens-timing': 'Menstrual timing', 'part-meta-contraceptive-type': 'Contraceptive method',
    'part-meta-reg-coffee': 'Coffee consumption', 'part-meta-reg-sleep-time': 'Regular sleep time',
    'part-meta-reg-work time': 'Regular work time',
    'select-healthy': 'Healthy', 'select-active-recent-illness': 'No active/recent illness',
    'select-no-ongoing-treatment-medication-use': 'No ongoing medication use', 'select-age-range': 'Age range',
    'select-healthy-cv-bp-disease': 'No CV/BP disease', 'select-neuro-disease': 'No neuro disease',
    'select-metabolic-syndrome': 'No metabolic syndrome', 'select-immune-related-diseases': 'No immune-related disease',
    'select-previous-knowledge': 'No previous knowledge', 'select-thermal-history': 'Thermal history assessed',
    'select-smoking': 'Smoking status', 'select-bmi-range': 'BMI range', 'select-colour-weakness-eyesight': 'Colour weak./eyesight',
    'select-hearing': 'Hearing', 'select-lang-skills': 'Language skills', 'select-alcohol': 'Alcohol',
    'select-dominant-hand': 'Dominant hand', 'select-contraceptive-type': 'Contraceptive type',
    'select-activity-level': 'Activity level', 'select-chronotype': 'Chronotype',
    'select-emotionally-stable': 'Emotionally stable', 'select-neurodivergent': 'Neurodivergent',
    'select-thermal-sensitivity': 'Thermal sensitivity', 'select-pregnancy': 'Pregnancy',
    'select-diet-weight-change': 'Diet/weight change', 'select-hormone-therapy': 'Hormone therapy',
    'select-menopause': 'Menopause', 'select-no-medical-implant': 'No medical implant', 'select-sex': 'Sex',
}
def pretty_name(col, prefix):
    return FIELD_PRETTY_NAMES.get(col, col.replace(prefix, '').replace('-', ' '))

CODES = {'NR','MNR','NAN','NC'}

# ── 1. Corpus-level summary stats ──────────────────────────────────────────
def is_missing_code(v):
    return v in CODES or v is None or v == ''

n_pubs = df['id-pub-id'].nunique()
n_exps = df['id'].nunique()
n_rows = len(df)
n_vars = len(df.columns)

year_min = int(df['pub-year'].min())
year_max = int(df['pub-year'].max())

summary = {
    'n_publications': int(n_pubs),
    'n_experiments': int(n_exps),
    'n_rows': int(n_rows),
    'n_variables': int(n_vars),
    'year_min': year_min,
    'year_max': year_max,
    'generated_at': pd.Timestamp.now().isoformat(),
}
with open(OUT_DIR / 'summary.json', 'w') as f:
    json.dump(summary, f, indent=2)
print('summary.json written:', summary)

# ── 2. Two-year period bins (used across multiple figures) ────────────────
BINS = [(2013,2014,'2013–14'),(2015,2016,'2015–16'),(2017,2018,'2017–18'),
        (2019,2020,'2019–20'),(2021,2022,'2021–22'),(2023,2024,'2023–24')]

def bin_for_year(y):
    for s,e,label in BINS:
        if s <= y <= e:
            return label
    return None

df['period'] = df['pub-year'].apply(lambda y: bin_for_year(int(y)) if y is not None else None)

# ── 3. Quick lookup table (one row per study) for the explore/browse table ─
study_cols = ['id-pub-id','id','id-title','id-authors','id-city','id-country',
              'id-climate-class','pub-name','pub-year','pub-doi','pub-type',
              'exp-type','exp-spatial-typology','exp-domains','data-avail',
              'pop-no-tot','pop-male-no','pop-fem-no']
studies = df[study_cols].drop_duplicates(subset=['id']).copy()
# Add per-experiment signal list for the browse table. Kept comma-separated in
# display, but the frontend also exposes the distinct tokens as a filter.
signal_lookup = (
    df[['id', 'physio-parameter']]
      .dropna()
      .assign(**{'physio-parameter': lambda x: x['physio-parameter'].astype(str).str.strip()})
)
signal_lookup = signal_lookup[~signal_lookup['physio-parameter'].isin(CODES) & (signal_lookup['physio-parameter'] != 'nan')]
signal_map = signal_lookup.groupby('id')['physio-parameter'].apply(lambda s: ', '.join(sorted(set(s)))).to_dict()
studies['signals_measured'] = studies['id'].map(signal_map).fillna('')
studies = studies.sort_values(['id-pub-id','id'])
studies_records = studies.to_dict('records')
with open(OUT_DIR / 'studies.json', 'w') as f:
    json.dump(studies_records, f, indent=2, default=str)
print(f'studies.json written: {len(studies_records)} study-experiment rows')

print("\nDone with base artifacts. Category-specific aggregates built separately.")

# ── 4. Physiology: signal × sensor × period (for Sankey/heatmap reproduction) ─
physio = df[['id','period','physio-parameter','physio-sensing-method','physio-body-site','physio-sensor-brand']].copy()
# NR/NAN/NC are kept as their own sensing-method categories (rather than
# dropped) so Sankey/heatmap totals reflect every row, not just the subset
# with a named sensing method.
physio = physio[physio['physio-parameter'].notna()]
physio['physio-parameter'] = physio['physio-parameter'].astype(str).str.strip()
physio = physio[~physio['physio-parameter'].isin(CODES) & (physio['physio-parameter'] != 'nan')]
physio['physio-sensing-method'] = physio['physio-sensing-method'].astype(str).str.strip()
physio['physio-sensing-method'] = physio['physio-sensing-method'].replace({
    'Digital Sphygmomanometer': 'Digital sphygmomanometer',
    'Laser doppler': 'Laser Doppler',
})
physio['signal'] = physio['physio-parameter']
physio_dedup = physio.drop_duplicates(subset=['id','signal','physio-sensing-method'])

signal_sensor_counts = (physio_dedup.groupby(['signal','physio-sensing-method'])
                         .size().reset_index(name='count'))
signal_sensor_period = (physio_dedup.groupby(['signal','physio-sensing-method','period'])
                         .size().reset_index(name='count'))

# True per-signal totals: distinct experiments reporting the signal (with a
# valid sensing method), deduplicated on 'id'. NOT the same as summing
# signal_sensor_counts['count'] across methods for a signal -- that sum
# double/triple-counts any experiment using more than one sensing method
# for the same signal (e.g. thermocouple at some skin sites, thermochron at
# others). Affects Skin temperature (+13), Sweat indicators (+6),
# Core/Body temperature (+3), Heart/Pulse rate (+2), Respiration (+1) if
# summed instead of deduplicated. Sankey/chapter totals should read from
# this field, not by summing 'overall'.
signal_totals = (physio_dedup.drop_duplicates(subset=['id','signal'])
                  .groupby('signal').size().reset_index(name='count'))
# Conservative Sankey unit: one signal instance = id × signal × sensing method.
# Each instance receives exactly one consolidated brand status, so every
# signal→method flow also has exactly one method→brand continuation.
def _brand_for_instance(values):
    vals = [str(v).strip() for v in values if v is not None and str(v).strip() != '']
    substantive = sorted(set(v for v in vals if v not in CODES and v.lower() != 'nan'))
    if len(substantive) == 1:
        return substantive[0]
    if len(substantive) > 1:
        return 'Multiple brands'
    for code in ('NR','MNR','NC','NAN'):
        if code in vals:
            return code
    return 'NR'
brand_instances = (physio.groupby(['id','period','signal','physio-sensing-method'], dropna=False)['physio-sensor-brand']
                   .apply(_brand_for_instance).reset_index(name='brand'))
signal_instance_totals = (brand_instances.groupby('signal').size().reset_index(name='count'))
signal_method_brand = (brand_instances.groupby(['signal','physio-sensing-method','brand'])
                       .size().reset_index(name='count'))

with open(OUT_DIR / 'physio_signal_sensor.json', 'w') as f:
    json.dump({
        'overall': signal_sensor_counts.to_dict('records'),
        'by_period': signal_sensor_period.to_dict('records'),
        'signal_totals': signal_totals.to_dict('records'),
        'signal_instance_totals': signal_instance_totals.to_dict('records'),
        'signal_method_brand': signal_method_brand.to_dict('records'),
        'periods': [b[2] for b in BINS],
    }, f, indent=2, default=str)
print(f'physio_signal_sensor.json written: {len(signal_sensor_counts)} signal-sensor pairs')

# ── 5. Skin temperature body sites — prevalence by period ─────────────────
# Only collapse near-synonymous anatomical labels. We deliberately keep
# face sub-sites (cheek, earlobe, temple, forehead, etc.) separate so the
# atlas never implies a more generic location than the paper actually used.
SITE_MERGE = {
    'Lower arm':'Forearm',
    'Calf':'Lower leg',
    'Shin':'Lower leg',
    'Lumbar':'Lower back',
    'Scapula':'Back',
}

# Hand and Foot are measured on genuinely different surfaces (back-of-hand
# vs. palm; top-of-foot vs. sole) that the body-diagram should show as
# distinct points rather than one averaged location. `physio-body-site-
# surface` carries this (Dorsal / Palmar-Plantar / Anterior / Posterior /
# NR / NAN). A handful of Hand/Foot rows use Anterior/Posterior instead of
# the anatomically-correct Dorsal/Palmar-Plantar terms for an extremity —
# this looks like the same kind of inconsistent-vocabulary issue as the
# known NAN-vs-NR data-entry quirk, not a distinct third surface, so we
# fold them in (Anterior=Palmar for a hand, front of a standing foot;
# Posterior=Dorsal for a hand, back of a standing foot). Rows with NR/NAN
# surface keep an honest 'surface not reported' label rather than guessing.
HAND_FOOT_SURFACE_MAP = {
    ('Hand', 'Dorsal'): 'Hand (dorsal)', ('Hand', 'Posterior'): 'Hand (dorsal)',
    ('Hand', 'Palmar/Plantar'): 'Hand (palmar)', ('Hand', 'Anterior'): 'Hand (palmar)',
    ('Foot', 'Dorsal'): 'Foot (dorsal)', ('Foot', 'Anterior'): 'Foot (dorsal)',
    ('Foot', 'Palmar/Plantar'): 'Foot (plantar)', ('Foot', 'Posterior'): 'Foot (plantar)',
}

def split_hand_foot_surface(frame):
    """Combine physio-body-site + physio-body-site-surface into a distinct
    dorsal/palmar(-plantar) site label for Hand and Foot rows. Leaves every
    other site untouched. Also folds the rare literal 'Sole' label straight
    into 'Foot (plantar)', since the raw site name already tells us the
    surface regardless of what the surface column says."""
    frame = frame.copy()
    frame['physio-body-site-surface'] = frame.get('physio-body-site-surface', pd.Series(index=frame.index, dtype=object))
    key = list(zip(frame['physio-body-site'], frame['physio-body-site-surface']))
    mapped = [HAND_FOOT_SURFACE_MAP.get(k) for k in key]
    is_hand_foot = frame['physio-body-site'].isin(['Hand', 'Foot'])
    fallback = np.where(
        frame['physio-body-site'] == 'Hand', 'Hand (surface not reported)',
        np.where(frame['physio-body-site'] == 'Foot', 'Foot (surface not reported)', frame['physio-body-site']),
    )
    frame['physio-body-site'] = np.where(
        is_hand_foot,
        [m if m else f for m, f in zip(mapped, fallback)],
        frame['physio-body-site'],
    )
    frame.loc[frame['physio-body-site'].astype(str).str.strip() == 'Sole', 'physio-body-site'] = 'Foot (plantar)'
    return frame
skin = df[df['physio-parameter']=='Skin temperature'][['id','period','physio-body-site','physio-body-site-surface','physio-sensing-method']].copy()
skin = skin[~skin['physio-body-site'].isin(CODES)]
skin = skin[skin['physio-body-site'].notna()]
skin['physio-body-site'] = skin['physio-body-site'].astype(str).str.strip()
skin = split_hand_foot_surface(skin)
skin['site'] = skin['physio-body-site'].replace(SITE_MERGE)
hf_check = skin[skin['site'].astype(str).str.startswith(('Hand (', 'Foot ('))]
print(f"hand/foot surface split: {hf_check['site'].value_counts().to_dict()}")
skin_dedup = skin.drop_duplicates(subset=['id','site'])

site_period_counts = skin_dedup.groupby(['site','period']).size().reset_index(name='count')
site_totals = skin_dedup['site'].value_counts().reset_index()
site_totals.columns = ['site','total']

# Keep the sensing-method composition at each body site. Counts use the same
# study-level denominator as the site circles: one study contributes at most
# once to a given site-method combination.
skin_methods = skin.copy()
skin_methods['physio-sensing-method'] = skin_methods['physio-sensing-method'].astype(str).str.strip().replace({
    'Digital Sphygmomanometer': 'Digital sphygmomanometer',
    'Laser doppler': 'Laser Doppler',
})
skin_methods = skin_methods[
    ~skin_methods['physio-sensing-method'].isin(CODES)
    & (skin_methods['physio-sensing-method'] != 'nan')
]
skin_method_counts = (
    skin_methods.drop_duplicates(subset=['id', 'site', 'physio-sensing-method'])
    .groupby(['site', 'physio-sensing-method'])['id'].nunique()
    .reset_index(name='count')
)
skin_method_map = {}
for _, row in skin_method_counts.iterrows():
    skin_method_map.setdefault(row['site'], {})[row['physio-sensing-method']] = int(row['count'])
site_totals['sensingMethods'] = site_totals['site'].map(lambda site: skin_method_map.get(site, {}))

period_study_n = skin_dedup.groupby('period')['id'].nunique().reset_index(name='n_studies')

with open(OUT_DIR / 'skintemp_sites.json', 'w') as f:
    json.dump({
        'site_period_counts': site_period_counts.to_dict('records'),
        'site_totals': site_totals.to_dict('records'),
        'n_studies_with_site': int(skin_dedup['id'].nunique()),
        'period_n': period_study_n.to_dict('records'),
        'periods': [b[2] for b in BINS],
    }, f, indent=2, default=str)
print(f'skintemp_sites.json written: {len(site_totals)} sites')

# ── 6. MST: calculated status, points, formula ──────────────────────────
# Aggregate across all rows of each experiment. MST metadata are often coded
# only on skin-temperature rows, so taking the first row per experiment loses
# valid Y/formula/point information.
def _first_substantive(values):
    vals = [str(v).strip() for v in values if v is not None and str(v).strip() != '']
    substantive = [v for v in vals if v not in CODES]
    return substantive[0] if substantive else None

def _mst_status(group):
    vals = {str(v).strip() for v in group['physio-mst-calculated'] if v is not None}
    if 'Y' in vals:
        return 'Y'
    # N is applicable only when skin temperature is measured.
    has_skin = (group['physio-parameter'].astype(str).str.strip() == 'Skin temperature').any()
    if has_skin and 'N' in vals:
        return 'N'
    if has_skin:
        return 'NR'
    return 'NAN'

mst_rows = []
for exp_id, g in df.groupby('id', sort=False):
    period = next((v for v in g['period'] if v is not None), None)
    status = _mst_status(g)
    mst_rows.append({
        'id': exp_id, 'period': period,
        'physio-mst-calculated': status,
        'physio-mst-points': _first_substantive(g['physio-mst-points']),
        'physio-mst-formula': _first_substantive(g['physio-mst-formula']),
    })
studies_mst = pd.DataFrame(mst_rows)
mst_rate = studies_mst.groupby(['period','physio-mst-calculated']).size().reset_index(name='count')

def parse_pts(val):
    if val is None or str(val).strip() in CODES or str(val).strip()=='':
        return None
    nums = re.findall(r'\d+', str(val))
    return int(nums[0]) if nums else None

def clean_formula_tokens(val):
    """Split a possibly multi-formula MST-formula string into individual,
    lightly-normalized labels. Returns [] for NR/NC/missing so the caller
    falls back to a single 'NR' bucket. Deliberately does NOT collapse
    long/multi-value entries into a generic 'Multiple' or 'Other' bucket --
    every formula actually named in the corpus gets its own label, and a
    study naming more than one formula (e.g. "Ramanathan (1964), Hardy &
    DuBois (1938)") is counted once under each. This makes the formula
    column non-exclusive: it can sum to more than the number of
    MST-calculating studies. See the Fig. 27 footnote on the site."""
    if pd.isna(val) or str(val).strip() in CODES or str(val).strip() == '':
        return []
    tokens = []
    for t in str(val).split(','):
        t = t.strip()
        if not t:
            continue
        t = t.replace('Hardy & Dubois', 'Hardy & DuBois')
        t = t.replace('ISO 9920:2007', 'ISO 9920: 2007')
        if t == 'Wang & Lian':  # same formula as 'Wang & Lian (2019)' elsewhere in the corpus, missing its year here
            t = 'Wang & Lian (2019)'
        tokens.append(t)
    return tokens

mst_only = studies_mst[studies_mst['physio-mst-calculated']=='Y'].copy()
mst_only['pts'] = mst_only['physio-mst-points'].apply(parse_pts)
mst_only['formula_tokens'] = mst_only['physio-mst-formula'].apply(clean_formula_tokens)
mst_only['pt_label'] = mst_only['pts'].apply(lambda p: 'NR/NC' if p is None or pd.isna(p) else str(int(p)))

# Exclusive: exactly one point-count bucket per Y-study (used to size the
# point-column nodes -- must NOT be derived from the exploded links below,
# since a study naming two formulas would otherwise get double-counted).
points_totals = mst_only.groupby('pt_label').size().reset_index(name='count')
numeric_points = sorted({int(p) for p in mst_only['pts'].dropna().unique()})
point_order = [str(p) for p in numeric_points] + (['NR/NC'] if (mst_only['pt_label'] == 'NR/NC').any() else [])

# Non-exclusive: one row per (study, formula-it-names) pair.
pt_formula_rows = []
for _, row in mst_only.iterrows():
    for tok in (row['formula_tokens'] or ['NR']):
        pt_formula_rows.append({'pt_label': row['pt_label'], 'formula': tok})
pt_formula_df = pd.DataFrame(pt_formula_rows)
point_formula_links = pt_formula_df.groupby(['pt_label', 'formula']).size().reset_index(name='count')
formula_totals = pt_formula_df.groupby('formula').size().reset_index(name='count')

# Points by period: one row per MST-calculating study (exclusive pt_label),
# broken down by period, so we can chart how point-count choice has shifted
# over time -- restricted to studies where MST was actually calculated.
points_by_period = mst_only.groupby(['period', 'pt_label']).size().reset_index(name='count')
period_n_mst = {k: int(v) for k, v in mst_only.groupby('period').size().to_dict().items()}

with open(OUT_DIR / 'mst.json', 'w') as f:
    json.dump({
        'calc_rate_by_period': mst_rate.to_dict('records'),
        'points_totals': points_totals.to_dict('records'),
        'formula_totals': formula_totals.to_dict('records'),
        'point_formula_links': point_formula_links.to_dict('records'),
        'point_order': point_order,
        'points_by_period': points_by_period.to_dict('records'),
        'period_n_mst': period_n_mst,
        'periods': [b[2] for b in BINS],
        'n_mst_studies': int(len(mst_only)),
    }, f, indent=2, default=str)
print(f'mst.json written: {len(mst_only)} studies calculating MST, {len(formula_totals)} distinct formulas')

# ── 7. Core/Body temperature sensor × site crossmap ────────────────────────
SENSOR_MAP_CBT = {
    'Thermometer':'Thermometer','Mercury thermometer':'Thermometer',
    'Infrared thermometer':'Infrared thermometer','Thermal picker':'Infrared thermometer',
    'Ingestible pill':'Ingestible pill','Thermistor':'Thermistor','Probe':'Probe',
}
KEEP_SITES_CBT = ['Tympanic canal','Gastrointestinal tract','Oral cavity','Rectal','Axilla','Forehead']

cbt = df[df['physio-parameter'] == 'Core/Body temperature'][
    ['id','physio-body-site','physio-sensing-method']].copy()
cbt = cbt[~cbt['physio-body-site'].isin(CODES)]
cbt = cbt[cbt['physio-body-site'].notna()]
cbt['physio-body-site'] = cbt['physio-body-site'].astype(str).str.strip()
cbt['physio-sensing-method'] = cbt['physio-sensing-method'].astype(str).str.strip()
cbt['sensor'] = cbt['physio-sensing-method'].map(SENSOR_MAP_CBT)
cbt = cbt[cbt['sensor'].notna() & cbt['physio-body-site'].isin(KEEP_SITES_CBT)]
cbt_dedup = cbt.drop_duplicates(subset=['id','physio-body-site','sensor'])
cbt_cross = cbt_dedup.groupby(['sensor','physio-body-site']).size().reset_index(name='count')

with open(OUT_DIR / 'core_temp_crossmap.json', 'w') as f:
    json.dump({'data': cbt_cross.to_dict('records')}, f, indent=2, default=str)
print(f'core_temp_crossmap.json written: {len(cbt_cross)} sensor-site pairs')

# ── 8. Reporting completeness — category-level missingness ─────────────────
CATEGORY_PREFIXES = {
    'Population': 'pop-', 'Physiological': 'physio-', 'Environment': 'env-',
    'Questionnaires': 'ques-', 'Cognitive': 'cognitive-', 'Selection criteria': 'select-',
    'Participant metadata': 'part-', 'Protocol': 'protocol-',
}
studies_dedup = df.drop_duplicates(subset=['id'])
completeness = []
for cat, prefix in CATEGORY_PREFIXES.items():
    cols = [c for c in df.columns if c.startswith(prefix)]
    if not cols: continue
    sub = studies_dedup[cols]
    total_cells = sub.shape[0] * sub.shape[1]
    reported_cells = sub.apply(lambda col: ~col.isin(CODES) & col.notna()).sum().sum()
    completeness.append({
        'category': cat,
        'pct_reported': round(100 * reported_cells / total_cells, 1) if total_cells else None,
        'n_fields': len(cols),
    })
with open(OUT_DIR / 'completeness.json', 'w') as f:
    json.dump({'data': completeness}, f, indent=2)
print('completeness.json written:', completeness)

print("\nAll artifacts built in", OUT_DIR)

# ════════════════════════════════════════════════════════════════════════
# APPENDIX FIGURES — reproducing Appendix VI figures 1–23 as data for the
# interactive site. Each block below corresponds to one numbered figure.
# ════════════════════════════════════════════════════════════════════════
# Bug guard: one publication (Marchenko et al. 2020, "facial muscle movements
# for non-invasive thermal discomfort detection") is missing its id-pub-id/id
# values in the source corpus — likely a data-entry gap rather than a study
# that shouldn't exist. Because it has no id, it can't be deduplicated,
# tracked, or cited correctly, and drop_duplicates() was treating its NaN id
# as one additional "study" distinct from every real id — silently inflating
# every count built from studies_u by one (270 instead of the correct 269,
# which is what df['id'].nunique() reports since nunique() excludes NaN by
# default). Filtering it out here makes every downstream count agree.
studies_u = df.drop_duplicates(subset=['id']).copy()
studies_u = studies_u[studies_u['id'].notna()]

def clean_num(v):
    if v is None: return None
    # Bug guard: Python's float() silently accepts the strings 'nan'/'NAN'/
    # 'NaN' and returns an actual IEEE NaN — but in this corpus 'NAN' is the
    # missing-value code for "not applicable", not a number. Without this
    # check, every numeric column reusing the corpus's own NAN code would
    # leak float('nan') downstream, which then serializes as the bare token
    # `NaN` in JSON output — invalid per spec and silently breaks the bundle
    # for any browser using a strict parser. (This exact failure mode bit the
    # climate_vs_temp aggregate earlier; clean_num is the one place to fix it
    # for all 14 call sites at once rather than re-discovering it repeatedly.)
    if isinstance(v, str) and v.strip().lower() in ('nan', 'nr', 'mnr', 'nc', ''):
        return None
    try:
        result = float(v)
        if result != result:  # NaN != NaN is the standard float NaN check
            return None
        return result
    except (ValueError, TypeError):
        pass
    # Fallback: a handful of manually-entered numeric cells use a comma as
    # the decimal separator (e.g. '1,30' instead of '1.30' — a data-entry
    # slip, not a real thousands-separator convention anywhere in this
    # corpus, since no value here is large enough to need one).
    if isinstance(v, str):
        try:
            result = float(v.strip().replace(',', '.'))
            if result == result:
                return result
        except (ValueError, TypeError):
            pass
    return None


_SUBGROUP_RE = re.compile(r'\[\s*(\d+)\s*:\s*([\d.,]+)\s*\]')


def parse_subgroup_pooled(mean_str, std_str):
    """Pool subgroup-level mean±SD into a single overall mean±SD.

    Some studies don't report an overall age/BMI mean±SD, only per-subgroup
    values, entered like:
        pop-age-mean: '[10: 23.90], [10:23.50]'
        pop-age-std:  '[10: 1.00], [10: 1,30]'
    i.e. two subgroups of n=10, means 23.90/23.50, SDs 1.00/1.30 (note the
    comma-decimal typo in the second SD — handled the same way as
    clean_num's fallback).

    Pooled mean uses: pooled_mean = sum(n_i * m_i) / sum(n_i)
    Pooled SD (only computed if the SD string's subgroup n's exactly match
    the mean string's) uses the standard combined-groups formula, which
    accounts for BOTH the within-subgroup spread and the spread *between*
    subgroup means:
        pooled_var = [sum((n_i-1)*s_i^2) + sum(n_i*(m_i-pooled_mean)^2)]
                     / (sum(n_i) - 1)

    Returns (pooled_mean, pooled_std, total_n, issue) where `issue` is a
    short string describing why pooled_std is None (mismatched subgroup n's,
    a malformed number, or SD simply not reported) — surfaced for manual
    review rather than silently guessing which SD belongs to which subgroup.
    pooled_mean is returned whenever the mean string itself parses cleanly,
    independently of whatever went wrong with the SD.
    """
    mean_groups = _SUBGROUP_RE.findall(str(mean_str)) if mean_str else []
    if not mean_groups:
        return None, None, None, None
    try:
        ns = [int(n) for n, _ in mean_groups]
        means = [float(v.replace(',', '.')) for _, v in mean_groups]
    except ValueError:
        return None, None, None, 'unparseable subgroup mean value'
    total_n = sum(ns)
    if total_n <= 0:
        return None, None, None, 'zero total n'
    pooled_mean = round(sum(n * m for n, m in zip(ns, means)) / total_n, 2)

    pooled_std, issue = None, None
    std_groups = _SUBGROUP_RE.findall(str(std_str)) if std_str else []
    if not std_groups:
        issue = 'SD not reported per subgroup'
    else:
        try:
            ns_std = [int(n) for n, _ in std_groups]
            stds = [float(v.replace(',', '.')) for _, v in std_groups]
        except ValueError:
            issue = 'unparseable subgroup SD value'
            ns_std = None
        if ns_std is not None:
            if ns_std != ns:
                issue = f'subgroup n mismatch: mean groups={ns}, SD groups={ns_std}'
            elif total_n <= 1:
                issue = 'total n <= 1'
            else:
                within = sum((n - 1) * s**2 for n, s in zip(ns, stds))
                between = sum(n * (m - pooled_mean)**2 for n, m in zip(ns, means))
                pooled_var = (within + between) / (total_n - 1)
                pooled_std = round(pooled_var ** 0.5, 2)
    return pooled_mean, pooled_std, total_n, issue

# ── Fig 1. Publications by year ────────────────────────────────────────
pubs_dedup = df.drop_duplicates(subset=['id-pub-id'])
pubs_by_year = pubs_dedup['pub-year'].value_counts().sort_index()
fig1 = [{'year': int(y), 'count': int(c)} for y, c in pubs_by_year.items()]

# Per-year split by top-5 countries (by total publication count), with every
# other country collapsed into 'Other'. Uses the same publication-level dedup
# and raw id-country labels as fig1 above (no atlas-name crosswalk needed
# here since this feeds a bar chart, not the choropleth map).
pub_country = pubs_dedup[['pub-year', 'id-country']].copy()
pub_country['id-country'] = pub_country['id-country'].astype(str).str.strip()
pub_country = pub_country[pub_country['id-country'].notna() & ~pub_country['id-country'].isin(CODES)]

top5_countries = pub_country['id-country'].value_counts().head(5).index.tolist()
pub_country['country_bucket'] = pub_country['id-country'].apply(
    lambda c: c if c in top5_countries else 'Other'
)

fig1_by_country_counts = pub_country.groupby(['pub-year', 'country_bucket']).size()
fig1_by_country = [
    {'year': int(y), 'country': c, 'count': int(n)}
    for (y, c), n in fig1_by_country_counts.items()
]

with open(OUT_DIR / 'fig01_pubs_by_year.json', 'w') as f:
    json.dump({
        'data': fig1,
        'by_country': fig1_by_country,
        'top_countries': top5_countries,
    }, f, indent=2)
print('fig01_pubs_by_year.json:', len(fig1), 'years,', len(top5_countries), 'top countries + Other')

# ── Fig 2. Geographical distribution ───────────────────────────────────
country_counts = studies_u['id-country'].value_counts()
country_counts = country_counts[~country_counts.index.isin(CODES)]
fig2 = [{'country': c, 'count': int(n)} for c, n in country_counts.items()]
with open(OUT_DIR / 'fig02_geography.json', 'w') as f:
    json.dump({'data': fig2}, f, indent=2)
print('fig02_geography.json:', len(fig2), 'countries')

# ── Fig 3 & 4. Session length / normalisation length histograms ───────
def parse_minutes(v):
    n = clean_num(v)
    return n

studies_u['session_min'] = studies_u['exp-session-length'].apply(parse_minutes)
studies_u['norm_min'] = studies_u['exp-normalisation-length'].apply(parse_minutes)

session_vals = studies_u['session_min'].dropna().tolist()
norm_vals = studies_u['norm_min'].dropna().tolist()

with open(OUT_DIR / 'fig03_session_length.json', 'w') as f:
    json.dump({'values_minutes': session_vals}, f, indent=2)
with open(OUT_DIR / 'fig04_normalisation_length.json', 'w') as f:
    json.dump({'values_minutes': norm_vals}, f, indent=2)
print(f'fig03/04: {len(session_vals)} session, {len(norm_vals)} normalisation values')

# ── Fig 5. Time of day distribution ────────────────────────────────────
def parse_time_ranges(v):
    """Extract (start_hour, end_hour) tuples in decimal hours from exp-hours text."""
    if v is None or str(v).strip() in CODES:
        return []
    ranges = []
    matches = re.findall(r'(\d{1,2})[:.](\d{2})\s*[-–—]\s*(\d{1,2})[:.](\d{2})', str(v))
    for sh, sm, eh, em in matches:
        start = int(sh) + int(sm) / 60
        end = int(eh) + int(em) / 60
        ranges.append((round(start, 2), round(end, 2)))
    return ranges

studies_u['time_ranges'] = studies_u['exp-hours'].apply(parse_time_ranges)
time_rows = []
for _, row in studies_u.iterrows():
    circadian_considered = row['protocol-circadian'] == 'Y'
    for start, end in row['time_ranges']:
        time_rows.append({'id': row['id'], 'start': start, 'end': end, 'circadian_considered': circadian_considered})

n_circadian_considered = sum(1 for r in time_rows if r['circadian_considered'])
with open(OUT_DIR / 'fig05_time_of_day.json', 'w') as f:
    json.dump({
        'sessions': time_rows,
        'n_reporting': len(set(r['id'] for r in time_rows)),
        'n_circadian_considered': len(set(r['id'] for r in time_rows if r['circadian_considered'])),
    }, f, indent=2)
print(f'fig05_time_of_day.json: {len(time_rows)} session time blocks, '
      f'{n_circadian_considered} with circadian control considered')

# ── Fig 6. Experiment type × spatial typology sunburst ─────────────────
typ = studies_u[['exp-type', 'exp-spatial-typology']].copy()
typ = typ[~typ['exp-type'].isin(CODES) & typ['exp-type'].notna()]
typ['exp-type'] = typ['exp-type'].astype(str).str.strip().replace({'Living lab': 'Living Lab'})
typ['exp-spatial-typology'] = typ['exp-spatial-typology'].apply(
    lambda v: 'NR' if v is None or str(v).strip() in CODES else str(v).strip())
sunburst = typ.groupby(['exp-type', 'exp-spatial-typology']).size().reset_index(name='count')
with open(OUT_DIR / 'fig06_setting_typology.json', 'w') as f:
    json.dump({'data': sunburst.to_dict('records')}, f, indent=2, default=str)
print('fig06_setting_typology.json:', len(sunburst), 'type-typology pairs')

# ── Fig 7. Tested air temperature ranges ───────────────────────────────
def parse_temp_steps(v):
    if v is None or str(v).strip() in CODES:
        return []
    # Bug fix: the naive regex `-?\d+\.?\d*` treated every hyphen before a
    # digit as a negative sign, including hyphens used as range/ramp
    # separators (e.g. "28-43" meaning "ramp from 28 to 43", or
    # "15-30-15" meaning "ramp 15→30, back to 15"), which it misparsed as
    # negative numbers. This corpus genuinely has a few studies with real
    # negative temperatures (e.g. "-20, 0, 10, 20"), so the fix can't just
    # strip all minus signs — it has to tell the two cases apart.
    #
    # The actual disambiguating pattern, confirmed against every occurrence
    # in the corpus: split on commas first. Within each comma-separated
    # token, if it consists ENTIRELY of positive numbers joined by hyphens
    # (one or more — e.g. "28-43" or "15-30-15"), every hyphen is a range
    # separator and every number is a positive waypoint. Otherwise (a
    # single bare number, possibly with one leading minus, e.g. "-2.1" or
    # "24"), parse it as one value, negative sign included. This affected
    # 44 studies' parsed temperature steps when first fixed for the
    # two-segment case, plus 7 more multi-segment ramp tokens
    # (e.g. "15-30-15") caught in a follow-up check.
    s = str(v).strip()
    tokens = [t.strip() for t in s.split(',')]
    nums = []
    for tok in tokens:
        if not tok:
            continue
        all_positive_segments = re.fullmatch(r'\d+\.?\d*(?:-\d+\.?\d*)+', tok)
        if all_positive_segments:
            nums.extend(float(n) for n in tok.split('-'))
        else:
            single_match = re.fullmatch(r'(-?\d+\.?\d*)', tok)
            if single_match:
                nums.append(float(single_match.group(1)))
            else:
                nums.extend(float(n) for n in re.findall(r'-?\d+\.?\d*', tok))
    return nums

studies_u['temp_steps'] = studies_u['exp-tested-target-temps'].apply(parse_temp_steps)
temp_rows = []
for _, row in studies_u.iterrows():
    steps = row['temp_steps']
    if steps:
        temp_rows.append({'id': row['id'], 'min': min(steps), 'max': max(steps), 'steps': steps})

with open(OUT_DIR / 'fig07_temperature_ranges.json', 'w') as f:
    json.dump({'studies': temp_rows}, f, indent=2)
print(f'fig07_temperature_ranges.json: {len(temp_rows)} studies with parseable temps')

# ── Fig 8 & 9. Age and BMI mean±SD per study ───────────────────────────
# Some studies only report per-subgroup mean±SD (e.g. male/female split)
# rather than an overall figure, entered as '[10: 23.90], [10: 23.50]' —
# see parse_subgroup_pooled() for how these get combined into one estimate.
age_rows = []
age_pooled_count = 0
subgroup_pooling_issues = []
for _, row in studies_u.iterrows():
    mean = clean_num(row['pop-age-mean'])
    std_raw = clean_num(row['pop-age-std'])
    pooled_n = None
    if mean is None:
        mean, std_raw, pooled_n, issue = parse_subgroup_pooled(row['pop-age-mean'], row['pop-age-std'])
        if mean is not None:
            age_pooled_count += 1
        if issue:
            subgroup_pooling_issues.append({'id': row['id'], 'field': 'age', 'issue': issue,
                                             'mean_raw': row['pop-age-mean'], 'std_raw': row['pop-age-std']})
    if mean is not None:
        age_rows.append({'id': row['id'], 'mean': mean, 'std': std_raw,
                          'std_reported': std_raw is not None, 'pooled_from_subgroups': pooled_n})

bmi_rows = []
bmi_pooled_count = 0
for _, row in studies_u.iterrows():
    mean = clean_num(row['pop-bmi-mean'])
    std_raw = clean_num(row['pop-bmi-std'])
    pooled_n = None
    if mean is None:
        mean, std_raw, pooled_n, issue = parse_subgroup_pooled(row['pop-bmi-mean'], row['pop-bmi-std'])
        if mean is not None:
            bmi_pooled_count += 1
        if issue:
            subgroup_pooling_issues.append({'id': row['id'], 'field': 'bmi', 'issue': issue,
                                             'mean_raw': row['pop-bmi-mean'], 'std_raw': row['pop-bmi-std']})
    if mean is not None:
        bmi_rows.append({'id': row['id'], 'mean': mean, 'std': std_raw,
                          'std_reported': std_raw is not None, 'pooled_from_subgroups': pooled_n})

with open(OUT_DIR / 'fig08_age.json', 'w') as f:
    json.dump({'studies': sorted(age_rows, key=lambda r: r['mean'])}, f, indent=2)
with open(OUT_DIR / 'fig09_bmi.json', 'w') as f:
    json.dump({'studies': sorted(bmi_rows, key=lambda r: r['mean'])}, f, indent=2)
print(f'fig08/09: {len(age_rows)} age ({age_pooled_count} pooled from subgroups), '
      f'{len(bmi_rows)} BMI ({bmi_pooled_count} pooled from subgroups)')
if subgroup_pooling_issues:
    print(f'  \u26a0 {len(subgroup_pooling_issues)} subgroup entries need manual review '
          f'(mean was still pooled where possible; SD was not):')
    for iss in subgroup_pooling_issues:
        print(f'    id={iss["id"]}  [{iss["field"]}]  {iss["issue"]}')
        print(f'      mean={iss["mean_raw"]!r}  std={iss["std_raw"]!r}')

# ── Fig 10 & 11. Sex distribution and sample size ──────────────────────
sex_rows = []
for _, row in studies_u.iterrows():
    m = clean_num(row['pop-male-no'])
    fem = clean_num(row['pop-fem-no'])
    if m is not None and fem is not None and (m + fem) > 0:
        total = m + fem
        sex_rows.append({
            'id': row['id'], 'male': m, 'female': fem,
            'male_pct': round(100 * m / total, 1),
        })
sex_rows.sort(key=lambda r: r['male_pct'])

n_male_gt = sum(1 for r in sex_rows if r['male_pct'] > 55)
n_equal = sum(1 for r in sex_rows if 45 <= r['male_pct'] <= 55)
n_fem_gt = sum(1 for r in sex_rows if r['male_pct'] < 45)

with open(OUT_DIR / 'fig10_sex_distribution.json', 'w') as f:
    json.dump({
        'studies': sex_rows,
        'summary': {'male_gt': n_male_gt, 'equal': n_equal, 'female_gt': n_fem_gt},
    }, f, indent=2)
print(f'fig10_sex_distribution.json: {len(sex_rows)} studies')

n_tot_rows = []
for _, row in studies_u.iterrows():
    n = clean_num(row['pop-no-tot'])
    if n is not None and n > 0:
        n_tot_rows.append({'id': row['id'], 'n': n})
n_tot_rows.sort(key=lambda r: r['n'])
with open(OUT_DIR / 'fig11_sample_size.json', 'w') as f:
    json.dump({'studies': n_tot_rows}, f, indent=2)
print(f'fig11_sample_size.json: {len(n_tot_rows)} studies')

# ── Fig 12. Environmental variable co-occurrence ───────────────────────
# Tier 1 ("was this variable measured at all") -- MNR counts as measured,
# since MNR means "measured, height/detail just not given" (see the
# two-tier completeness note in Methods). Only NR (and NAN/blank) count as
# not measured here. This was previously using the stricter Tier 2
# definition (MNR excluded), which undercounted co-occurrence relative to
# what the manuscript's own Results/Appendix report for these variables.
ENV_VARS = {
    'env-tdb': 'Air temp.', 'env-rh': 'Relative humidity', 'env-v': 'Air velocity',
    'env-tg': 'Globe temp.', 'env-tsurface': 'Surface temp.', 'env-twb': 'Wet bulb temp.',
    'env-co2': 'CO2 concentration', 'env-illuminance': 'Illuminance levels',
    'env-sound-level': 'Sound levels', 'env-tout': 'Outdoor temp.', 'env-rhout': 'Outdoor rel. humidity',
    'env-voc': 'VOC levels', 'env-light-color': 'Light colour', 'env-solar-rad': 'Solar radiation',
}
NOT_MEASURED = {'NR', 'NAN'}
env_reported = pd.DataFrame({
    label: ~studies_u[col].isin(NOT_MEASURED) & studies_u[col].notna()
    for col, label in ENV_VARS.items()
})
labels = list(ENV_VARS.values())
cooc = pd.DataFrame(0, index=labels, columns=labels)
for a in labels:
    for b in labels:
        cooc.loc[a, b] = int((env_reported[a] & env_reported[b]).sum())
totals = {l: int(env_reported[l].sum()) for l in labels}

with open(OUT_DIR / 'fig12_env_cooccurrence.json', 'w') as f:
    json.dump({
        'labels': labels,
        'matrix': cooc.values.tolist(),
        'totals': totals,
    }, f, indent=2)
print('fig12_env_cooccurrence.json written')

# ── Fig 17 & 18. Physiological parameter frequency + co-occurrence ─────
physio_clean = df[['id', 'physio-parameter']].copy()
physio_clean = physio_clean[~physio_clean['physio-parameter'].isin(CODES)]
physio_clean = physio_clean[physio_clean['physio-parameter'].notna()]
physio_clean['physio-parameter'] = physio_clean['physio-parameter'].astype(str).str.strip()
physio_unique = physio_clean.drop_duplicates(subset=['id', 'physio-parameter'])

param_counts = physio_unique['physio-parameter'].value_counts()
fig17 = [{'parameter': p, 'count': int(c)} for p, c in param_counts.items()]
with open(OUT_DIR / 'fig17_physio_params.json', 'w') as f:
    json.dump({'data': fig17}, f, indent=2)
print(f'fig17_physio_params.json: {len(fig17)} parameters')

TOP_PARAMS = param_counts.head(11).index.tolist()
param_presence = pd.DataFrame({
    p: physio_unique['id'].isin(physio_unique[physio_unique['physio-parameter'] == p]['id'])
    for p in TOP_PARAMS
}).drop_duplicates()
ids_with_any = physio_unique['id'].unique()
presence_matrix = pd.DataFrame(False, index=ids_with_any, columns=TOP_PARAMS)
for p in TOP_PARAMS:
    matching_ids = set(physio_unique[physio_unique['physio-parameter'] == p]['id'])
    presence_matrix[p] = presence_matrix.index.isin(matching_ids)

param_cooc = pd.DataFrame(0, index=TOP_PARAMS, columns=TOP_PARAMS)
for a in TOP_PARAMS:
    for b in TOP_PARAMS:
        param_cooc.loc[a, b] = int((presence_matrix[a] & presence_matrix[b]).sum())

with open(OUT_DIR / 'fig18_physio_cooccurrence.json', 'w') as f:
    json.dump({'labels': TOP_PARAMS, 'matrix': param_cooc.values.tolist()}, f, indent=2)
print('fig18_physio_cooccurrence.json written')

# ── Fig 15 & 16. Questionnaire scale heterogeneity ─────────────────────
vas_unplaceable_log = []  # VAS/continuous entries with no extractable numeric range
vas_typo_log = []  # entries recovered despite a data-entry typo, flagged for source cleanup

def _try_numeric_list(s):
    try:
        return [float(x.strip().replace('+', '')) for x in s.split(',')]
    except (ValueError, AttributeError):
        return None

def parse_scale(text, kind):
    """Parse 'points=N; range=(...); scale=(...)' strings into structured scale data.

    Also handles VAS / continuous scales (points=VAS or points=continuous[,
    with break]), which don't have a fixed point count. These sometimes have
    the range=/scale= fields swapped (numeric bounds under 'scale=', verbal
    anchors under 'range=') rather than the usual numeric-range/text-labels
    convention — detected here by checking which field's content actually
    parses as numbers, rather than assuming the field name always means the
    same content type. A handful have NO numeric range at all (just two
    verbal anchors, e.g. "too dry"/"too humid") — these can't be placed on a
    shared numeric axis and are logged to vas_unplaceable_log instead of
    silently dropped or guessed at.
    """
    if text is None or str(text).strip() in CODES:
        return None
    text = str(text)
    pts_m = re.search(r'points\s*=\s*(\d+)', text)
    vas_m = re.search(r'points\s*=\s*(VAS|continuous(?:\s+with\s+break)?)', text, re.I)
    if not pts_m and not vas_m:
        return None
    scale_type = 'discrete' if pts_m else vas_m.group(1).strip().lower()

    range_m = re.search(r'range\s*=\s*\(([^)]*)\)', text)
    scale_m = re.search(r'scale\s*=\s*\(([^)]*)\)', text)
    if not range_m:
        # data-entry typo seen in a few VAS/continuous entries: "range(...)"
        # missing the '=' — tolerate it, but flag for source-file cleanup.
        range_bad_m = re.search(r'\brange\s*\(([^)]*)\)', text)
        if range_bad_m:
            range_m = range_bad_m
            vas_typo_log.append({'raw': text, 'issue': "'range(' missing '='"})
    if not range_m or not scale_m:
        if vas_m:
            vas_unplaceable_log.append({'raw': text, 'issue': 'no range=(...) and/or scale=(...) block found'})
        return None

    if pts_m:
        # Standard discrete scale: range=numbers, scale=text labels (original,
        # unconditional behavior — unchanged for backward compatibility).
        range_vals = _try_numeric_list(range_m.group(1))
        if range_vals is None:
            return None
        labels = [x.strip().strip('"').strip("'") for x in scale_m.group(1).split(',')]
        pts = int(pts_m.group(1))
    else:
        # VAS/continuous: don't assume which field is numeric — some entries
        # have it swapped (numeric bounds under 'scale=', verbal anchors
        # under 'range='). Try both, use whichever actually parses as numbers.
        range_as_num = _try_numeric_list(range_m.group(1))
        scale_as_num = _try_numeric_list(scale_m.group(1))
        if range_as_num is not None:
            range_vals = range_as_num
            labels = [x.strip().strip('"').strip("'") for x in scale_m.group(1).split(',')]
        elif scale_as_num is not None:
            range_vals = scale_as_num
            labels = [x.strip().strip('"').strip("'") for x in range_m.group(1).split(',')]
            vas_typo_log.append({'raw': text, 'issue': "range=/scale= fields swapped (numbers under 'scale=')"})
        else:
            vas_unplaceable_log.append({'raw': text, 'issue': 'neither range= nor scale= contains a numeric list'})
            return None
        pts = None

    if len(range_vals) != len(labels):
        return None
    result = {'points': pts, 'scale_type': scale_type, 'range': range_vals, 'labels': labels}
    result['grid'] = compute_grid(pts, range_vals, labels)
    return result

def compute_grid(pts, range_vals, labels):
    """Reconstruct the full set of response positions a study's scale actually
    offered, and mark which of those carry a verbal label ('anchor') vs which
    are unlabeled intermediate steps ('interpolated').

    Two conventions show up in the source data:
      1. range=/scale= list ONLY the verbal anchors (e.g. the classic 7-point
         ASHRAE wording), while 'points=25' tells us the true scale had finer
         granularity spanning the same low/high bounds in equal steps (e.g.
         25 points = 0.25 steps). We reconstruct that full grid here and
         backfill the unlabeled positions in between.
      2. range=/scale= already enumerate every position, with 'NR' (or blank)
         standing in for the label at unlabeled steps. Here len(range) ==
         points already, so no reconstruction is needed - we just treat 'NR'
         labels as unlabeled.
    """
    low, high = min(range_vals), max(range_vals)
    anchor_map = {}
    for v, l in zip(range_vals, labels):
        ll = (l or '').strip()
        if ll and ll.upper() not in ('NR', 'NAN', 'NC', ''):
            anchor_map[round(v, 4)] = ll

    if isinstance(pts, int) and pts >= 2 and pts != len(range_vals):
        step = (high - low) / (pts - 1)
        full_positions = [round(low + i * step, 4) for i in range(pts)]
    else:
        full_positions = sorted(round(v, 4) for v in set(range_vals))

    grid = []
    for pos in full_positions:
        label = anchor_map.get(pos)
        is_neutral = label is not None and (abs(pos) < 1e-6 or 'neutral' in label.lower())
        grid.append({'value': pos, 'label': label, 'is_anchor': label is not None, 'is_neutral': is_neutral})
    return grid

# IMPORTANT: for TCV specifically, "low number" does NOT reliably mean
# "uncomfortable" — the appendix's own Fig. 16 finding is that polarity
# varies across studies (some put "comfortable" at the negative end, some
# at the positive end). A purely numeric min/max coloring would therefore
# silently misrepresent ~25% of studies. We classify each endpoint by its
# label text instead, so the plotted color always means the same thing.
COMFORT_WORDS = {'comfortable', 'comfort', 'satisfied', 'satisfaction', 'pleasant'}
DISCOMFORT_WORDS = {'uncomfortable', 'discomfort', 'unbearable', 'intolerable', 'unacceptable',
                     'unendurable', 'dissatisfied', 'unpleasant'}

def classify_comfort_pole(label):
    l = label.lower()
    if any(w in l for w in DISCOMFORT_WORDS):
        return 'discomfort'
    if any(w in l for w in COMFORT_WORDS):
        return 'comfort'
    return None  # ambiguous label (e.g. "neutral", "intermediate") — left unclassified

def parse_scale_tcv(text):
    base = parse_scale(text, 'tcv')
    if base is None:
        return None
    pole_low = classify_comfort_pole(base['labels'][0])
    pole_high = classify_comfort_pole(base['labels'][-1])
    # Some scales are U-shaped (discomfort at BOTH ends, comfort in the
    # middle -- e.g. "much too cool" ... "comfortable" ... "much too warm"),
    # so a low/high endpoint check alone wrongly excludes them even though
    # individual points (like "comfortable" itself) are perfectly
    # classifiable. Check every label, not just the two endpoints, before
    # deciding a scale truly can't be colored at all.
    any_classifiable = any(classify_comfort_pole(l) is not None for l in base['labels'])
    if not any_classifiable:
        # Genuinely no comfort/discomfort language anywhere in this scale
        # (e.g. a thermal-sensation-worded scale coded under the TCV field) --
        # exclude, since there is nothing to color from the label text at all.
        return None
    if pole_low is None and pole_high is None:
        # Not a simple low<->high polarity (U-shaped, or the classifiable
        # label(s) sit in the middle) -- leave comfort_pole unset. The
        # frontend already colors each point by its OWN label first and only
        # falls back to comfort_pole for unlabelable points, so this
        # correctly renders "comfortable" in the middle in its own color
        # while leaving genuinely ambiguous endpoints neutral grey, rather
        # than forcing a misleading low/high direction onto the whole scale.
        base['comfort_pole'] = None
    else:
        base['comfort_pole'] = 'high' if pole_high == 'comfort' or pole_low == 'discomfort' else 'low'
    return base

tsv_parsed, tcv_parsed = [], []
for _, row in studies_u.iterrows():
    p = parse_scale(row['ques-thermal-sensation'], 'tsv')
    if p:
        p['id'] = row['id']
        tsv_parsed.append(p)
    p2 = parse_scale_tcv(row['ques-thermal-comfort'])
    if p2:
        p2['id'] = row['id']
        tcv_parsed.append(p2)

tsv_pts_dist = pd.Series([p['points'] for p in tsv_parsed]).value_counts().sort_index()
tcv_pts_dist = pd.Series([p['points'] for p in tcv_parsed]).value_counts().sort_index()

def code_breakdown(col):
    return {
        'mnr': int((col == 'MNR').sum()),
        'nr': int((col == 'NR').sum()),
        'nc': int((col == 'NC').sum()),
    }

with open(OUT_DIR / 'fig15_tsv_scales.json', 'w') as f:
    json.dump({
        'studies': tsv_parsed,
        'points_distribution': [{'points': int(k), 'count': int(v)} for k, v in tsv_pts_dist.items()],
        'n_total': len(tsv_parsed),
        'code_breakdown': code_breakdown(studies_u['ques-thermal-sensation']),
    }, f, indent=2)
tcv_scale_signatures = {(s['points'], tuple(s['range']), tuple(s['labels'])) for s in tcv_parsed}

with open(OUT_DIR / 'fig16_tcv_scales.json', 'w') as f:
    json.dump({
        'studies': tcv_parsed,
        'points_distribution': [{'points': int(k), 'count': int(v)} for k, v in tcv_pts_dist.items()],
        'n_total': len(tcv_parsed),
        'n_distinct_scales': len(tcv_scale_signatures),
        'code_breakdown': code_breakdown(studies_u['ques-thermal-comfort']),
        'vas_unplaceable': vas_unplaceable_log,
    }, f, indent=2)
print(f'fig15/16: {len(tsv_parsed)} TSV scales, {len(tcv_parsed)} TCV scales parsed ({len(tcv_scale_signatures)} distinct structures)')
if vas_typo_log:
    print(f'  \u26a0 {len(vas_typo_log)} VAS/continuous entries recovered despite a source typo (worth cleaning up):')
    for t in vas_typo_log:
        print(f'    [{t["issue"]}]  {t["raw"]!r}')
if vas_unplaceable_log:
    print(f'  \u26a0 {len(vas_unplaceable_log)} VAS/continuous entries have no numeric range and cannot be plotted on the shared axis:')
    for t in vas_unplaceable_log:
        print(f'    [{t["issue"]}]  {t["raw"]!r}')

# ── Fig 14. Questionnaire usage grouped by domain ──────────────────────
# Data-quality note: two publications appear to be double-coded rather than
# genuinely distinct experiments — pub 109 (Marchenko et al. 2020, DOI
# 10.3390/app10207315) has a second entry under id "#N/A" with near-identical
# content (same n, same physio parameters) but a different TSV point-count;
# and pub 76 / pub 229 share DOI 10.1016/j.buildenv.2021.107589 with
# identical n/temp-range/physio rows but a different TSV point-count. Both
# should be checked against the source PDFs and reconciled to one experiment
# each before treating n_experiments as final; the current pipeline
# incidentally drops the "#N/A" row (via studies_u's notna() filter) but has
# no equivalent check for the 76/229 pair, so it is currently double-counted.
QUES_DOMAINS = {
    'Thermal': ['ques-thermal-sensation','ques-thermal-comfort','ques-thermal-prefer','ques-thermal-accept',
                'ques-thermal-satisfaction','ques-thermal-pleasure-pleasantness','ques-local-therm-sensation',
                'ques-local-therm-comfort','ques-local-therm-satisfaction','ques-shivering','ques-sweating-sensation'],
    'Overall': ['ques-overall-comfort','ques-overall-satisfaction'],
    'Air movement': ['ques-airmove-sensation','ques-airmove-comfort','ques-local-airmove-sensation',
                      'ques-airmove-perception','ques-airmove-prefer','ques-airmove-accept','ques-airmove-satisfaction'],
    'Humidity': ['ques-humidity-sensation','ques-humidity-comfort','ques-humidity-prefer',
                 'ques-humidity-accept','ques-humidity-satisfaction'],
    'Light & Visual': ['ques-light-sensation','ques-light-comfort','ques-visual-prefer','ques-light-prefer',
                        'ques-light-accept','ques-light-satisfaction'],
    'IAQ': ['ques-iaq-sensation','ques-iaq-comfort','ques-iaq-prefer','ques-iaq-accept','ques-iaq-satisfaction',
            'ques-odour-intensity','ques-sick-building-syndrome'],
    'Acoustic': ['ques-acoustic-sensation','ques-acoustic-comfort','ques-acoustic-prefer',
                 'ques-acoustic-accept','ques-acoustic-satisfaction'],
}
PRETTY_FIELD = {
    'ques-thermal-sensation':'Thermal sensation','ques-thermal-comfort':'Thermal comfort',
    'ques-thermal-prefer':'Thermal preference','ques-thermal-accept':'Thermal acceptance',
    'ques-thermal-satisfaction':'Thermal satisfaction','ques-thermal-pleasure-pleasantness':'Thermal pleasure',
    'ques-local-therm-sensation':'Local thermal sensation','ques-local-therm-comfort':'Local thermal comfort',
    'ques-local-therm-satisfaction':'Local thermal satisfaction','ques-shivering':'Shivering sensation',
    'ques-sweating-sensation':'Sweating sensation','ques-overall-comfort':'Overall comfort',
    'ques-overall-satisfaction':'Overall satisfaction','ques-airmove-sensation':'Air movement sensation',
    'ques-airmove-comfort':'Air movement comfort','ques-local-airmove-sensation':'Local air movement sensation',
    'ques-airmove-perception':'Air movement perception','ques-airmove-prefer':'Air movement preference',
    'ques-airmove-accept':'Air movement acceptability','ques-airmove-satisfaction':'Air movement satisfaction',
    'ques-humidity-sensation':'Humidity sensation','ques-humidity-comfort':'Humidity comfort',
    'ques-humidity-prefer':'Humidity preference','ques-humidity-accept':'Humidity acceptability',
    'ques-humidity-satisfaction':'Humidity satisfaction','ques-light-sensation':'Light sensation',
    'ques-light-comfort':'Light comfort','ques-visual-prefer':'Visual preference','ques-light-prefer':'Light preference',
    'ques-light-accept':'Light acceptability','ques-light-satisfaction':'Light satisfaction',
    'ques-iaq-sensation':'IAQ sensation','ques-iaq-comfort':'IAQ comfort','ques-iaq-prefer':'IAQ preference',
    'ques-iaq-accept':'IAQ acceptability','ques-iaq-satisfaction':'IAQ satisfaction',
    'ques-odour-intensity':'Odour intensity','ques-sick-building-syndrome':'Sick building syndrome',
    'ques-acoustic-sensation':'Acoustic sensation','ques-acoustic-comfort':'Acoustic comfort',
    'ques-acoustic-prefer':'Acoustic preference','ques-acoustic-accept':'Acoustic acceptability',
    'ques-acoustic-satisfaction':'Acoustic satisfaction',
}
ques_domain_data = {}
n_studies_total = len(studies_u)
for domain, cols in QUES_DOMAINS.items():
    cols_present = [c for c in cols if c in studies_u.columns]
    reported = ~studies_u[cols_present].isin(CODES) & studies_u[cols_present].notna()
    any_in_domain = reported.any(axis=1).sum()
    field_counts = []
    for c in cols_present:
        col = studies_u[c]
        rep = int(reported[c].sum())
        mnr = int((col == 'MNR').sum())
        nr = int((col == 'NR').sum())
        nc = int((col == 'NC').sum())
        # Anything left over (blank/None/"NAN" not-applicable) isn't reported,
        # MNR, NR, or NC, but should still be visible so the four counts plus
        # this remainder sum to n_studies_total.
        other_missing = n_studies_total - rep - mnr - nr - nc
        field_counts.append({
            'field': PRETTY_FIELD.get(c, c),
            'count': rep,
            'mnr': mnr,
            'nr': nr,
            'nc': nc,
            'other_missing': int(other_missing),
        })
    field_counts.sort(key=lambda r: -r['count'])
    ques_domain_data[domain] = {'n_any': int(any_in_domain), 'fields': field_counts}

with open(OUT_DIR / 'fig14_questionnaire_domains.json', 'w') as f:
    json.dump(ques_domain_data, f, indent=2)
print('fig14_questionnaire_domains.json written')

# ── Fig 20, 21, 22. Protocol / participant metadata / selection criteria binary matrices ──
def binary_matrix_block(prefix):
    cols = [c for c in studies_u.columns if c.startswith(prefix)]
    reported = ~studies_u[cols].isin(CODES) & studies_u[cols].notna()
    pct = (reported.mean() * 100).round(1)
    order = pct.sort_values(ascending=False).index.tolist()
    bar = [{'field': pretty_name(c, prefix),
            'pct': float(pct[c]),
            'count': int(reported[c].sum())} for c in order]
    # matrix shape: fields × studies (field_i × study_j) = reported[order].T
    matrix = reported[order].T.astype(int).values.tolist()
    fields = [pretty_name(c, prefix) for c in order]
    return {'bar': bar, 'matrix': matrix, 'fields': fields, 'n_studies': len(studies_u)}

fig20 = binary_matrix_block('protocol-')
with open(OUT_DIR / 'fig20_protocol.json', 'w') as f:
    json.dump(fig20, f, indent=2)
print('fig20_protocol.json written:', len(fig20['bar']), 'fields')

fig21 = binary_matrix_block('part-')
with open(OUT_DIR / 'fig21_participant_metadata.json', 'w') as f:
    json.dump(fig21, f, indent=2)
print('fig21_participant_metadata.json written:', len(fig21['bar']), 'fields')

fig22 = binary_matrix_block('select-')
with open(OUT_DIR / 'fig22_selection_criteria.json', 'w') as f:
    json.dump(fig22, f, indent=2)
print('fig22_selection_criteria.json written:', len(fig22['bar']), 'fields')

print("\nAll appendix figure artifacts built.")


# ── Fig 13. Environmental sensor heights ────────────────────────────────
ENV_HEIGHT_COLS = {
    'env-tdb': 'Air temperature',
    'env-rh': 'Relative humidity',
    'env-v': 'Air velocity',
    'env-tg': 'Globe temperature',
}
def parse_heights(v):
    if v is None or str(v).strip() in CODES or str(v).strip() == '':
        return []
    nums = re.findall(r'\d+\.?\d*', str(v))
    heights = []
    for n in nums:
        h = float(n)
        if 0 < h <= 3.5:  # plausible sensor height in metres
            heights.append(h)
    return heights

height_data = {}
for col, label in ENV_HEIGHT_COLS.items():
    rows = []
    for _, row in studies_u.iterrows():
        hs = parse_heights(row.get(col))
        for h in hs:
            rows.append({'id': row['id'], 'variable': label, 'height': h})
    height_data[label] = rows

all_height_rows = [r for rows in height_data.values() for r in rows]
with open(OUT_DIR / 'fig13_sensor_heights.json', 'w') as f:
    json.dump({'data': all_height_rows, 'variables': list(ENV_HEIGHT_COLS.values())}, f, indent=2)
print(f'fig13_sensor_heights.json: {len(all_height_rows)} height observations')

# ════════════════════════════════════════════════════════════════════════
# ADDITIONAL EVOLUTION & CONCENTRATION FIGURES (top-5 follow-up request)
# ════════════════════════════════════════════════════════════════════════

# ── A1. Signal × sensor composition by period (sensor displacement) ────
# Reuses physio_dedup (already built above, with casing fixed)
TRACK_SIGNALS = ['Skin temperature', 'Heart/Pulse rate', 'Core/Body temperature', 'Skin conductance']
# Total experiments in each period, regardless of signal -- used to normalize
# Fig 25 bars as "% of all experiments run in that period", not just the
# subset measuring the currently-toggled signal.
period_n_all = {k: int(v) for k, v in studies_u.groupby('period')['id'].nunique().to_dict().items()}
signal_sensor_evolution = {}
for sig in TRACK_SIGNALS:
    sub = physio_dedup[physio_dedup['signal'] == sig]
    by_period_sensor = sub.groupby(['period', 'physio-sensing-method']).size().reset_index(name='count')
    period_totals = sub.groupby('period')['id'].nunique().to_dict()
    # keep top 6 sensors for this signal, group rest as 'Other'
    sensor_totals = sub['physio-sensing-method'].value_counts()
    top_sensors = sensor_totals.head(6).index.tolist()
    by_period_sensor['sensor_grp'] = by_period_sensor['physio-sensing-method'].apply(
        lambda s: s if s in top_sensors else 'Other')
    grouped = by_period_sensor.groupby(['period', 'sensor_grp'])['count'].sum().reset_index()
    signal_sensor_evolution[sig] = {
        'data': grouped.to_dict('records'),
        'sensor_order': top_sensors + (['Other'] if len(sensor_totals) > 6 else []),
        'period_totals': {k: int(v) for k, v in period_totals.items()},
        'period_n_all': period_n_all,
        'multi_response': True,
    }

with open(OUT_DIR / 'evo_signal_sensor.json', 'w') as f:
    json.dump({'signals': signal_sensor_evolution, 'periods': [b[2] for b in BINS]}, f, indent=2, default=str)
print('evo_signal_sensor.json written for', list(signal_sensor_evolution.keys()))

# ── A2. (Removed) Protocol rigor over time was previously computed here as
# a second, independent aggregate (`evo_protocol_rigor`) with its own
# hand-picked field subset and its own labels — which is exactly how
# 'Randomisation' and 'Time between sessions' ended up computed twice, with
# two slightly different percentages, in two visually stacked charts. The
# "rigor over time" line chart now draws from `protocol_by_period` below
# instead (see `extra_cols` on that call), so there is exactly one
# computation of protocol-field percentages by period, used everywhere.

# ── A3. Climate class vs tested temperature range ───────────────────────
KOPPEN_GROUP = {
    'Af': 'Tropical', 'Am': 'Tropical', 'Aw': 'Tropical', 'As': 'Tropical',
    'BWh': 'Arid (hot)', 'BWk': 'Arid (cold)', 'BSh': 'Semi-arid (hot)', 'BSk': 'Semi-arid (cold)',
    'Csa': 'Mediterranean', 'Csb': 'Mediterranean',
    'Cwa': 'Humid subtropical', 'Cwb': 'Humid subtropical',
    'Cfa': 'Humid subtropical', 'Cfb': 'Oceanic', 'Cfc': 'Oceanic',
    'Dsa': 'Continental', 'Dsb': 'Continental', 'Dwa': 'Continental', 'Dwb': 'Continental',
    'Dfa': 'Continental', 'Dfb': 'Continental', 'Dfc': 'Subarctic',
    'ET': 'Polar', 'EF': 'Polar',
}
def koppen_group(v):
    if v is None or str(v).strip() in CODES:
        return None
    code = str(v).strip().split('/')[0]  # take first if multiple given (e.g. "Csa/Cfb")
    return KOPPEN_GROUP.get(code, 'Other/Mixed')

studies_u['climate_group'] = studies_u['id-climate-class'].apply(koppen_group)
# Defensive fix: pandas can silently upcast a None-containing object column to
# float64 (turning None into np.nan) on assignment. Re-coerce explicitly so
# downstream `if grp` checks and JSON serialization both behave correctly —
# np.nan is truthy in Python and would otherwise leak as invalid JSON `NaN`.
studies_u['climate_group'] = studies_u['climate_group'].where(studies_u['climate_group'].notna(), None)

climate_temp_rows = []
for _, row in studies_u.iterrows():
    grp = row['climate_group']
    if grp is None or (isinstance(grp, float) and np.isnan(grp)):
        continue
    steps = parse_temp_steps(row['exp-tested-target-temps'])
    if steps:
        climate_temp_rows.append({
            'id': row['id'], 'climate_group': grp,
            'min': min(steps), 'max': max(steps), 'country': row['id-country'],
        })

climate_counts = studies_u['climate_group'].value_counts(dropna=True)
with open(OUT_DIR / 'climate_vs_temp.json', 'w') as f:
    json.dump({
        'studies': climate_temp_rows,
        'climate_counts': {k: int(v) for k, v in climate_counts.items()},
    }, f, indent=2, default=str)
print(f'climate_vs_temp.json: {len(climate_temp_rows)} studies with both climate class and temp range')

# ── A4. Sample size and setting type over time ─────────────────────────
size_evo_rows = []
for _, row in studies_u.iterrows():
    n = clean_num(row['pop-no-tot'])
    if n is not None and n > 0 and row['period'] is not None:
        size_evo_rows.append({'id': row['id'], 'period': row['period'], 'n': n})

setting_evo = studies_u[studies_u['exp-type'].notna() & ~studies_u['exp-type'].isin(CODES) & studies_u['period'].notna()].copy()
setting_evo['exp-type'] = setting_evo['exp-type'].astype(str).str.strip().replace({'Living lab': 'Living Lab'})
setting_counts = setting_evo.groupby(['period', 'exp-type']).size().reset_index(name='count')

with open(OUT_DIR / 'evo_size_setting.json', 'w') as f:
    json.dump({
        'sample_sizes': size_evo_rows,
        'setting_by_period': setting_counts.to_dict('records'),
        'periods': [b[2] for b in BINS],
    }, f, indent=2, default=str)
print(f'evo_size_setting.json: {len(size_evo_rows)} sample-size points, {len(setting_counts)} setting-period pairs')

# ── A5. Sensor brand concentration ──────────────────────────────────────
brand_clean = df[['id', 'physio-parameter', 'physio-sensor-brand']].copy()
brand_clean['physio-sensor-brand'] = brand_clean['physio-sensor-brand'].astype(str).str.strip()
brand_clean = brand_clean[~brand_clean['physio-sensor-brand'].isin(CODES) & (brand_clean['physio-sensor-brand'] != 'nan')]

# Canonicalize casing: group by lowercase, display the most frequent original casing.
# This is a recurring data-entry issue (e.g. 'OMRON' vs 'Omron') and will keep
# happening as new papers are added each year, so we fix it generally rather
# than with a manual lookup table.
brand_casing_counts = brand_clean['physio-sensor-brand'].value_counts()
canonical_label = {}
for lower_key, group in brand_clean.groupby(brand_clean['physio-sensor-brand'].str.lower()):
    variants = group['physio-sensor-brand'].unique()
    if len(variants) > 1:
        best = max(variants, key=lambda v: brand_casing_counts[v])
        for v in variants:
            canonical_label[v] = best
brand_clean['physio-sensor-brand'] = brand_clean['physio-sensor-brand'].apply(
    lambda v: canonical_label.get(v, v))

brand_dedup = brand_clean.drop_duplicates(subset=['id', 'physio-sensor-brand'])
brand_totals = brand_dedup['physio-sensor-brand'].value_counts()

# Also: which brands show up across which signal categories (concentration by domain)
brand_signal = brand_clean.drop_duplicates(subset=['id', 'physio-parameter', 'physio-sensor-brand'])
top_brands = brand_totals.head(15).index.tolist()
brand_signal_top = brand_signal[brand_signal['physio-sensor-brand'].isin(top_brands)]
brand_signal_counts = brand_signal_top.groupby(['physio-sensor-brand', 'physio-parameter']).size().reset_index(name='count')

with open(OUT_DIR / 'sensor_brands.json', 'w') as f:
    json.dump({
        'totals': [{'brand': b, 'count': int(c)} for b, c in brand_totals.items()],
        'n_studies_with_brand': int(brand_dedup['id'].nunique()),
        'by_signal': brand_signal_counts.to_dict('records'),
    }, f, indent=2, default=str)
print(f'sensor_brands.json: {len(brand_totals)} unique brands (casing+whitespace-normalized), {brand_dedup["id"].nunique()} studies reporting a brand')

print("\nAll top-5 follow-up artifacts built.")

# ── A6. Sensor type × brand (third Sankey column) ───────────────────────
# Reuses the same casing/whitespace canonicalization as A5, but keyed by
# sensing method (not just signal) since that's the actual middle node
# the Sankey's third column hangs off of.
sb = brand_instances.rename(columns={'brand':'physio-sensor-brand'}).copy()
sb['physio-sensing-method'] = sb['physio-sensing-method'].astype(str).str.strip()
sb['physio-sensing-method'] = sb['physio-sensing-method'].replace({
    'Digital Sphygmomanometer': 'Digital sphygmomanometer',
    'Laser doppler': 'Laser Doppler',
})
sb['physio-sensor-brand'] = sb['physio-sensor-brand'].astype(str).str.strip()
# NR/NAN/NC kept as their own brand/sensing-method nodes (not dropped) so
# the Sankey's flow totals match the full corpus, matching the section-4 fix.

# Reuse the same canonical-casing map built for sensor_brands so 'iButton '
# and 'iButton' (or 'OMRON'/'Omron') collapse to one brand label here too.
sb['physio-sensor-brand'] = sb['physio-sensor-brand'].apply(lambda v: canonical_label.get(v, v))

sb_dedup = sb.drop_duplicates(subset=['id', 'signal', 'physio-sensing-method', 'physio-sensor-brand'])
sensor_brand_pairs = sb_dedup.groupby(['physio-sensing-method', 'physio-sensor-brand']).size().reset_index(name='count')

with open(OUT_DIR / 'sensor_type_brand.json', 'w') as f:
    json.dump({'data': sensor_brand_pairs.to_dict('records')}, f, indent=2)
print(f'sensor_type_brand.json: {len(sensor_brand_pairs)} sensor-type-brand pairs')

# ── A7. Field-level completeness for chapter completeness strips ──────────
# Unlike the category-level `completeness.json` above, this gives per-field
# percentages for the specific fields each chapter's CompletenessStrip shows.
CHAPTER_FIELD_GROUPS = {
    'context_setting': {
        'id-city': 'City', 'id-country': 'Country', 'id-climate-class': 'Climate class',
        'exp-year-start': 'Experiment year', 'exp-seasons': 'Season of testing',
        'exp-hours': 'Daily start/end time', 'exp-session-length': 'Session length',
        'exp-normalisation-length': 'Normalisation period',
        'data-avail': 'Data availability statement',
    },
    'population': {
        'pop-sample-size-calc': 'Sample size calculation', 'pop-no-tot': 'Total sample size',
        'pop-male-no': 'Male participants', 'pop-fem-no': 'Female participants',
        'pop-age-mean': 'Age mean', 'pop-age-std': 'Age SD',
        'pop-bmi-mean': 'BMI mean', 'pop-bmi-std': 'BMI SD',
        'select-healthy': 'Healthy participant requirement', 'select-thermal-history': 'Thermal history assessed',
        'part-meta-thermal-history-background': 'Thermal history collected', 'part-meta-smoking': 'Smoking behaviour collected',
        'part-meta-mens-timing': 'Menstrual timing collected', 'part-meta-chronotype': 'Chronotype collected',
    },
    'physio_measurement': {
        'physio-sensing-method': 'Sensor type', 'physio-sensor-brand': 'Sensor brand',
        'physio-sensor-model': 'Sensor model', 'physio-body-site': 'Body site',
        'physio-body-site-sagittal': 'Sagittal location', 'physio-body-site-surface': 'Surface location',
        'physio-mst-points': 'Number of MST points', 'physio-mst-formula': 'MST formula used',
        'physio-formulas': 'Full formula text', 'physio-mst-weighting': 'Weighting factors per region',
    },
    'env_measurement': {
        'env-tdb': 'Air temperature', 'env-rh': 'Relative humidity', 'env-v': 'Air velocity',
        'env-tg': 'Globe temperature', 'env-tsurface': 'Surface temperatures', 'env-twb': 'Wet-bulb temperature',
        'env-tout': 'Outdoor temperature', 'env-rhout': 'Outdoor RH',
        'env-co2': 'CO2 concentration', 'env-voc': 'VOC concentration',
        'env-illuminance': 'Illuminance', 'env-light-color': 'Light colour/CCT',
        'env-solar-rad': 'Solar radiation', 'env-sound-level': 'Sound level',
    },
    'questionnaires': {
        'ques-thermal-sensation': 'Thermal sensation', 'ques-thermal-comfort': 'Thermal comfort',
        'ques-thermal-prefer': 'Thermal preference', 'ques-thermal-accept': 'Thermal acceptability',
        'ques-thermal-satisfaction': 'Thermal satisfaction', 'ques-local-therm-sensation': 'Local thermal sensation',
        'ques-airmove-sensation': 'Air movement sensation', 'ques-humidity-sensation': 'Humidity sensation',
        'ques-light-sensation': 'Light sensation', 'ques-iaq-sensation': 'IAQ sensation',
        'ques-acoustic-sensation': 'Acoustic sensation', 'cognitive-test-done': 'Cognitive test applied',
    },
    'protocol': {
        'protocol-fixed-clo': 'Fixed clothing insulation', 'protocol-observed-clo': 'Observed clothing',
        'protocol-defined-activity': 'Defined activity protocol', 'protocol-observed-met': 'Observed metabolic rate',
        'protocol-avoid-stimulant': 'Avoid stimulants', 'protocol-avoid-activity': 'Avoid physical activity',
        'protocol-rest-sleep': 'Pre-experiment rest/sleep', 'protocol-maintain-routine': 'Maintain routine',
        'protocol-circadian': 'Circadian control', 'protocol-mens-timing': 'Menstrual timing control',
        'protocol-time-btw-sessions': 'Time between sessions', 'protocol-instruction-practice': 'Pre-study instruction/practice',
        'protocol-blinded': 'Blinding', 'protocol-random': 'Randomisation', 'protocol-balancing': 'Balanced session order',
        'protocol-subjects-not-allowed-to-discuss': 'Participants not allowed to discuss study',
        'protocol-food': 'Controlled food intake', 'protocol-water': 'Controlled water intake',
        'protocol-prep-body-site': 'Body-site preparation for sensors',
    },
}

chapter_completeness = {}
for group_name, field_map in CHAPTER_FIELD_GROUPS.items():
    cols_present = [c for c in field_map if c in studies_u.columns]
    reported = ~studies_u[cols_present].isin(CODES) & studies_u[cols_present].notna()
    rows = []
    for c in cols_present:
        rows.append({
            'field': field_map[c],
            'count': int(reported[c].sum()),
            'pct': round(100 * reported[c].sum() / len(studies_u), 1),
        })
    chapter_completeness[group_name] = {'fields': rows, 'n_studies': len(studies_u)}

with open(OUT_DIR / 'chapter_completeness.json', 'w') as f:
    json.dump(chapter_completeness, f, indent=2)
print('chapter_completeness.json written for groups:', list(chapter_completeness.keys()))


# ── A7b. Detailed field-level completeness for Chapter 8 ──────────────────
# Rules:
#   • MST-specific fields are evaluated only among studies where MST is measured.
#   • For environment and questionnaire yes/no fields, NR is treated as a
#     legitimate non-use code rather than missingness; only MNR/NAN/blank count
#     as missing.
#   • Participant metadata, selection criteria, and protocol-rigor fields are
#     excluded from this end-to-end completeness view because they are not
#     required across all studies.

def _any_row_bool(col, is_valid):
    """Per-experiment-id boolean: True if ANY row for that id satisfies
    is_valid(value). Needed because several physio-* fields (sensor brand,
    sensor model, body-site, MST detail fields) are recorded per
    physio-parameter row, not once per experiment -- studies_u keeps only
    one arbitrary row per id, so checking that single row silently misses a
    value that was actually reported on a different row of the same
    experiment. Returns a dict {id: bool} to sum/count over.
    """
    def has_it(g):
        return any(is_valid(v) for v in g[col])
    return df.groupby('id', sort=False)[col].apply(lambda g: any(is_valid(v) for v in g)).to_dict()

def _valid_general(col):
    per_id = _any_row_bool(col, lambda v: v is not None and str(v).strip() not in CODES and str(v).strip() != '')
    return studies_u['id'].map(per_id).fillna(False)

def _valid_optional_binary(col):
    # Optional Y/N or free-text fields: NR means the study explicitly did not use/report this item
    # and is excluded from the applicability denominator. MNR/NAN/blank remain missing.
    applicable_per_id = _any_row_bool(col, lambda v: v is not None and str(v).strip() not in ('NR', 'NAN', ''))
    valid_per_id = _any_row_bool(col, lambda v: v is not None and str(v).strip() not in ('NR', 'NAN', 'MNR', ''))
    applicable = studies_u['id'].map(applicable_per_id).fillna(False)
    valid = studies_u['id'].map(valid_per_id).fillna(False)
    return valid, applicable

FULL_COMPLETENESS_GROUPS = {
    'Context & setting': [
        ('id-city', 'City', 'general'), ('id-country', 'Country', 'general'), ('id-climate-class', 'Climate class', 'general'),
        ('exp-year-start', 'Experiment year', 'general'), ('exp-seasons', 'Season of testing', 'general'),
        ('exp-hours', 'Daily start/end time', 'general'), ('exp-session-length', 'Session length', 'general'),
        ('exp-normalisation-length', 'Normalisation period', 'general'), ('data-avail', 'Data availability statement', 'general'),
    ],
    'Population core': [
        ('pop-sample-size-calc', 'Sample size calculation', 'general'), ('pop-no-tot', 'Total sample size', 'general'),
        ('pop-male-no', 'Male participants', 'general'), ('pop-fem-no', 'Female participants', 'general'),
        ('pop-age-mean', 'Age mean', 'general'), ('pop-age-std', 'Age SD', 'general'),
        ('pop-bmi-mean', 'BMI mean', 'general'), ('pop-bmi-std', 'BMI SD', 'general'),
    ],
    'Physiological': [
        ('physio-sensing-method', 'Sensor type', 'general'), ('physio-sensor-brand', 'Sensor brand', 'general'),
        ('physio-sensor-model', 'Sensor model', 'general'), ('physio-body-site', 'Body site', 'general'),
        ('physio-body-site-sagittal', 'Sagittal location', 'general'), ('physio-body-site-surface', 'Surface location', 'general'),
        ('physio-mst-points', 'Number of MST points', 'mst'), ('physio-mst-formula', 'MST formula used', 'mst'),
        ('physio-formulas', 'Full formula text', 'mst'), ('physio-mst-weighting', 'Weighting factors per region', 'mst'),
    ],
    'Environment': [
        ('env-tdb', 'Air temperature', 'optional_binary'), ('env-rh', 'Relative humidity', 'optional_binary'),
        ('env-v', 'Air velocity', 'optional_binary'), ('env-tg', 'Globe temperature', 'optional_binary'),
        ('env-tsurface', 'Surface temperatures', 'optional_binary'), ('env-twb', 'Wet-bulb temperature', 'optional_binary'),
        ('env-tout', 'Outdoor temperature', 'optional_binary'), ('env-rhout', 'Outdoor RH', 'optional_binary'),
        ('env-co2', 'CO₂ concentration', 'optional_binary'), ('env-voc', 'VOC concentration', 'optional_binary'),
        ('env-illuminance', 'Illuminance', 'optional_binary'), ('env-light-color', 'Light colour/CCT', 'optional_binary'),
        ('env-solar-rad', 'Solar radiation', 'optional_binary'), ('env-sound-level', 'Sound level', 'optional_binary'),
    ],
    'Questionnaires': [
        ('ques-thermal-sensation', 'Thermal sensation', 'optional_binary'), ('ques-thermal-comfort', 'Thermal comfort', 'optional_binary'),
        ('ques-thermal-prefer', 'Thermal preference', 'optional_binary'), ('ques-thermal-accept', 'Thermal acceptability', 'optional_binary'),
        ('ques-thermal-satisfaction', 'Thermal satisfaction', 'optional_binary'), ('ques-local-therm-sensation', 'Local thermal sensation', 'optional_binary'),
        ('ques-airmove-sensation', 'Air movement sensation', 'optional_binary'), ('ques-humidity-sensation', 'Humidity sensation', 'optional_binary'),
        ('ques-light-sensation', 'Light sensation', 'optional_binary'), ('ques-iaq-sensation', 'IAQ sensation', 'optional_binary'),
        ('ques-acoustic-sensation', 'Acoustic sensation', 'optional_binary'),
    ],
}

mst_mask_per_id = _any_row_bool('physio-mst-calculated', lambda v: v is not None and str(v).strip() == 'Y')
mst_mask = studies_u['id'].map(mst_mask_per_id).fillna(False)
full_completeness = {}
for group_name, specs in FULL_COMPLETENESS_GROUPS.items():
    rows = []
    for col, label, rule in specs:
        if col not in studies_u.columns:
            continue
        if rule == 'mst':
            denom = int(mst_mask.sum())
            valid = _valid_general(col)[mst_mask]
        elif rule == 'optional_binary':
            valid, applicable = _valid_optional_binary(col)
            denom = int(applicable.sum())
        else:
            denom = len(studies_u)
            valid = _valid_general(col)
        count = int(valid.sum())
        rows.append({
            'field': label,
            'count': count,
            'denominator': int(denom),
            'pct': round(100 * count / denom, 1) if denom else 0,
            'rule': rule,
        })
    full_completeness[group_name] = {'fields': rows}

with open(OUT_DIR / 'field_completeness_detailed.json', 'w') as f:
    json.dump(full_completeness, f, indent=2)
print('field_completeness_detailed.json written for groups:', list(full_completeness.keys()))

# ── A8. Cognitive test harmonization ────────────────────────────────────
# As of the 2026-07 corpus update, the old single free-text
# `cognitive-test-type` column was retired and replaced by two purpose-built
# columns: `cognitive-domain-performance` (objective performance tasks) and
# `cognitive-domain-subjective` (self-report scales, each hand-tagged with
# an explicit measurement domain in parentheses, e.g. 'NASA-TLX (workload)').
# Because the subjective column now states its own domain directly, we use
# that tag rather than DOMAIN_MAP's guess for those rows; DOMAIN_MAP is still
# used for the performance column, where the domain isn't given in the data.
import sys as _sys
_sys.path.insert(0, str(Path(__file__).parent))
from cognitive_taxonomy import split_cognitive_tests, canonicalize_token, split_domain_tag

cog_done = studies_u[studies_u['cognitive-test-done'] == 'Y'].copy()
cog_rows = []
unrecognized_log = []
flagged_for_review = []  # raw tokens the data-enterer themselves flagged (e.g. "verify")

for _, row in cog_done.iterrows():
    seen_in_study = set()
    # Performance tasks: domain comes from DOMAIN_MAP (via canonicalize_token)
    for t in split_cognitive_tests(row['cognitive-domain-performance']):
        if t == 'NAN' or not t:
            continue
        canon, domain, ok = canonicalize_token(t)
        if not ok:
            unrecognized_log.append({'id': row['id'], 'raw': t, 'column': 'performance'})
        if any(w in t.lower() for w in ('verify', 'unclear')):
            flagged_for_review.append({'id': row['id'], 'raw': t, 'column': 'performance'})
        if canon in seen_in_study:
            continue
        seen_in_study.add(canon)
        cog_rows.append({'id': row['id'], 'period': row['period'], 'instrument': canon,
                          'domain': domain, 'raw': t, 'measure_type': 'Performance task'})
    # Subjective scales: domain comes from the explicit trailing tag
    # (workload/mood/stress) hand-coded onto each entry, not from DOMAIN_MAP.
    for t in split_cognitive_tests(row['cognitive-domain-subjective']):
        if t == 'NAN' or not t:
            continue
        base, tag = split_domain_tag(t)
        canon, fallback_domain, ok = canonicalize_token(base)
        if not ok:
            unrecognized_log.append({'id': row['id'], 'raw': t, 'column': 'subjective'})
        if any(w in t.lower() for w in ('verify', 'unclear')):
            flagged_for_review.append({'id': row['id'], 'raw': t, 'column': 'subjective'})
        # TSST is a stress-induction protocol, not a self-report scale, even
        # though it's tagged '(stress)' alongside the rest of this column.
        if canon == 'Trier Social Stress Test (TSST)':
            measure_type, domain = 'Stress induction', 'Stress induction protocol'
        else:
            measure_type = 'Subjective scale'
            domain = f'Subjective scale — {tag}' if tag else fallback_domain
        if canon in seen_in_study:
            continue
        seen_in_study.add(canon)
        cog_rows.append({'id': row['id'], 'period': row['period'], 'instrument': canon,
                          'domain': domain, 'raw': t, 'measure_type': measure_type})

cog_df = pd.DataFrame(cog_rows)
instrument_totals = cog_df.groupby(['instrument', 'domain']).agg(
    count=('id', 'nunique')
).reset_index().sort_values('count', ascending=False)

domain_totals = cog_df.groupby('domain')['id'].nunique().reset_index(name='count').sort_values('count', ascending=False)

# Per-study list (for a study-level browse view)
study_instruments = cog_df.groupby('id')['instrument'].apply(list).reset_index()

# Flow data for Sankey: measure type -> domain -> instrument. Counts are
# unique-study counts, not raw row counts, so a study using the same instrument
# more than once still contributes only once. measure_type is now assigned
# directly per-row above rather than inferred from the domain string.
# Drop the measure-type prefix from the middle column so the Sankey's first and
# second columns are not redundant.
cog_df['domain_short'] = cog_df['domain'].apply(lambda d: str(d).split('—', 1)[1].strip() if '—' in str(d) else str(d))
flow_type_domain = cog_df.groupby(['measure_type', 'domain_short'])['id'].nunique().reset_index(name='count')
flow_domain_instrument = cog_df.groupby(['domain_short', 'instrument'])['id'].nunique().reset_index(name='count')

with open(OUT_DIR / 'cognitive_tests.json', 'w') as f:
    json.dump({
        'instrument_totals': instrument_totals.to_dict('records'),
        'domain_totals': domain_totals.to_dict('records'),
        'study_instruments': study_instruments.to_dict('records'),
        'flow_type_domain': flow_type_domain.to_dict('records'),
        'flow_domain_instrument': flow_domain_instrument.to_dict('records'),
        'n_studies_with_cognitive_test': int(cog_done['id'].nunique()),
        'n_total_studies': len(studies_u),
        'unrecognized_count': len(unrecognized_log),
        'flagged_for_review': flagged_for_review,
    }, f, indent=2, default=str)
print(f'cognitive_tests.json: {len(instrument_totals)} canonical instruments, '
      f'{cog_done["id"].nunique()} studies, {len(unrecognized_log)} unrecognized tokens')
if flagged_for_review:
    print(f'  \u26a0 {len(flagged_for_review)} entries self-flagged for manual verification:')
    for f_ in flagged_for_review:
        print(f'    id={f_["id"]}  ({f_["column"]})  {f_["raw"]!r}')

# ── A9. Country -> world-atlas name crosswalk for choropleth map ──────────
# The corpus's free-text country names don't match world-atlas's polygon
# names 1:1 (e.g. 'USA' vs 'United States of America', 'Republic of Korea'
# vs 'South Korea'). Hong Kong has no separate polygon at this resolution
# and is folded into China's; Great Britain / UK are the same place, written
# two different ways in the raw corpus, and are merged here too.
COUNTRY_TO_ATLAS_NAME = {
    'USA': 'United States of America', 'Republic of Korea': 'South Korea',
    'Great Britain': 'United Kingdom', 'UK': 'United Kingdom',
    'Hong Kong': 'China',
    # everything else (Australia, Brazil, China, Croatia, Denmark, France,
    # Germany, India, Iran, Italy, Japan, Malaysia, Netherlands, Norway,
    # Portugal, Qatar, Singapore, Spain, Switzerland, Taiwan, Turkey)
    # already matches the atlas polygon name as-is.
}

country_counts_raw = studies_u['id-country'].astype(str).str.strip()
country_counts_raw = country_counts_raw[~country_counts_raw.isin(CODES)]
atlas_names = country_counts_raw.map(lambda c: COUNTRY_TO_ATLAS_NAME.get(c, c))
# Keep BOTH the raw corpus label (for display/tooltip) and the atlas-matched
# name (for choropleth lookup), since e.g. Hong Kong studies should still say
# "Hong Kong" in the tooltip even though they render on China's polygon.
country_map_df = pd.DataFrame({'raw_country': country_counts_raw, 'atlas_name': atlas_names})
by_atlas = country_map_df.groupby('atlas_name').agg(
    count=('atlas_name', 'size'),
    raw_labels=('raw_country', lambda s: sorted(s.unique())),
).reset_index()

with open(OUT_DIR / 'geo_choropleth.json', 'w') as f:
    json.dump({'data': by_atlas.to_dict('records')}, f, indent=2, default=str)
print(f'geo_choropleth.json: {len(by_atlas)} atlas-matched countries, '
      f'{country_counts_raw.nunique()} raw country labels')

# ════════════════════════════════════════════════════════════════════════
# NORMALIZED OVERALL + BY-PERIOD PAIRING
# Several metrics only had an "overall" view (signal frequency, sensor
# heights, protocol/participant/selection completeness, geography) while
# others only had a "by-period" view (sensor mix, MST, body sites, rigor).
# This section adds the missing half so every applicable metric can show
# both, using one shared visual grammar on the frontend.
# ════════════════════════════════════════════════════════════════════════

# ── B1. Signal frequency by period (companion to fig17 overall) ───────────
sig_period = physio_dedup.groupby(['signal', 'period'])['id'].nunique().reset_index(name='count')
period_n_studies = studies_u.groupby('period')['id'].nunique().to_dict()
with open(OUT_DIR / 'signal_freq_by_period.json', 'w') as f:
    json.dump({
        'data': sig_period.to_dict('records'),
        'period_n': {k: int(v) for k, v in period_n_studies.items()},
        'periods': [b[2] for b in BINS],
    }, f, indent=2, default=str)
print(f'signal_freq_by_period.json: {len(sig_period)} signal-period rows')

# ── B2. Sensor heights by period (companion to fig13 overall) ─────────────
height_rows_with_period = []
for col, label in ENV_HEIGHT_COLS.items():
    for _, row in studies_u.iterrows():
        hs = parse_heights(row.get(col))
        for h in hs:
            height_rows_with_period.append({'variable': label, 'height': h, 'period': row['period']})
with open(OUT_DIR / 'sensor_heights_by_period.json', 'w') as f:
    json.dump({'data': height_rows_with_period, 'periods': [b[2] for b in BINS]}, f, indent=2)
print(f'sensor_heights_by_period.json: {len(height_rows_with_period)} height observations with period')

# ── B3. Protocol / participant / selection completeness by period ─────────
def binary_matrix_by_period(prefix, top_n=None, extra_cols=None):
    cols = [c for c in studies_u.columns if c.startswith(prefix)]
    reported = ~studies_u[cols].isin(CODES) & studies_u[cols].notna()
    # Use all fields by default so the heatmap is a complete by-period companion
    # to the full overall metadata set. If top_n is provided, it can still be
    # used to make a deliberately restricted view.
    overall_pct = reported.mean().sort_values(ascending=False)
    top_cols = overall_pct.index.tolist() if top_n is None else overall_pct.head(top_n).index.tolist()
    # extra_cols: fields that must appear even if they fall outside the
    # natural top-N by completeness — used so the "has rigor improved"
    # narrative (which specifically discusses blinding, circadian, and
    # menstrual timing control) draws from the exact same numbers as the
    # bar chart and study-by-study matrix, rather than a second, separately
    # computed field set that can silently drift out of sync with this one.
    if extra_cols:
        for c in extra_cols:
            if c not in top_cols:
                top_cols.append(c)
    rows = []
    for period in [b[2] for b in BINS]:
        mask = studies_u['period'] == period
        n = mask.sum()
        if n == 0:
            continue
        for c in top_cols:
            pct = round(100 * reported.loc[mask, c].sum() / n, 1) if n else 0
            rows.append({'period': period, 'field': pretty_name(c, prefix), 'pct': pct, 'count': int(reported.loc[mask, c].sum()), 'n': int(n)})
    return {'data': rows, 'fields': [pretty_name(c, prefix) for c in top_cols], 'periods': [b[2] for b in BINS]}

protocol_by_period = binary_matrix_by_period(
    'protocol-', top_n=None,
    extra_cols=['protocol-blinded', 'protocol-circadian', 'protocol-mens-timing'],
)
with open(OUT_DIR / 'protocol_by_period.json', 'w') as f:
    json.dump(protocol_by_period, f, indent=2)
print(f'protocol_by_period.json: {len(protocol_by_period["data"])} rows')

participant_by_period = binary_matrix_by_period('part-', top_n=None)
with open(OUT_DIR / 'participant_by_period.json', 'w') as f:
    json.dump(participant_by_period, f, indent=2)
print(f'participant_by_period.json: {len(participant_by_period["data"])} rows')

selection_by_period = binary_matrix_by_period('select-', top_n=None)
with open(OUT_DIR / 'selection_by_period.json', 'w') as f:
    json.dump(selection_by_period, f, indent=2)
print(f'selection_by_period.json: {len(selection_by_period["data"])} rows')

# ── B4. Geographic concentration by period (companion to the choropleth) ──
# Bug guard: country_map_df was built from a CODES-filtered subset of
# studies_u (264 rows) while studies_u itself has 270 — a positional
# `.values` assignment would silently misalign rows. Join on id instead.
geo_period = country_map_df.copy()
geo_period['id'] = studies_u.loc[country_map_df.index, 'id'].values
geo_period = geo_period.merge(studies_u[['id', 'period']], on='id', how='left')
geo_by_period = geo_period.groupby(['period', 'atlas_name']).size().reset_index(name='count')
# also compute the share of studies from the single top country, per period,
# as a simple concentration metric
top_country_overall = by_atlas.sort_values('count', ascending=False).iloc[0]['atlas_name']
concentration_by_period = []
for period in [b[2] for b in BINS]:
    sub = geo_by_period[geo_by_period['period'] == period]
    total = sub['count'].sum()
    top_count = sub[sub['atlas_name'] == top_country_overall]['count'].sum()
    if total > 0:
        concentration_by_period.append({
            'period': period, 'top_country': top_country_overall,
            'top_count': int(top_count), 'total': int(total),
            'pct': round(100 * top_count / total, 1),
        })
with open(OUT_DIR / 'geo_concentration_by_period.json', 'w') as f:
    json.dump({'data': concentration_by_period, 'top_country': top_country_overall}, f, indent=2)
print(f'geo_concentration_by_period.json: {len(concentration_by_period)} periods')

print("\nNormalized overall/by-period companions built.")

# ════════════════════════════════════════════════════════════════════════
# DATASET AUDIT FOLLOW-UPS — previously-unused columns worth visualizing
# ════════════════════════════════════════════════════════════════════════

# ── C1. Domain co-manipulation (how many variables are manipulated at once) ──
DOMAIN_FLAG_COLS = {
    'exp-domain-thermal': 'Thermal', 'exp-domain-air-move': 'Air movement',
    'exp-domain-humidity': 'Humidity', 'exp-domain-co2': 'CO2',
    'exp-domain-light': 'Light', 'exp-domain-acoustics': 'Acoustics',
    'exp-domain-behaviour': 'Behaviour', 'exp-domain-iaq': 'IAQ',
}
domain_flags = pd.DataFrame({
    label: (~studies_u[col].astype(str).isin(CODES)) & studies_u[col].notna()
    for col, label in DOMAIN_FLAG_COLS.items()
})
n_domains = domain_flags.sum(axis=1)
# 3 studies have NR across every single domain column — not a real "0
# domains manipulated" finding, just studies the extraction never coded for
# this field. Counting them as "0 domains" would misrepresent missing data
# as a genuine category; excluded from both the distribution and its
# denominator, same as any other field with no usable value.
has_any_domain_data = n_domains > 0
n_excluded_no_domain_data = int((~has_any_domain_data).sum())
domain_count_dist = n_domains[has_any_domain_data].value_counts().sort_index()
domain_totals = {label: int(domain_flags[label].sum()) for label in DOMAIN_FLAG_COLS.values()}

with open(OUT_DIR / 'domain_comanipulation.json', 'w') as f:
    json.dump({
        'n_domains_distribution': [{'n_domains': int(k), 'count': int(v)} for k, v in domain_count_dist.items()],
        'domain_totals': domain_totals,
        'n_studies': int(has_any_domain_data.sum()),
        'n_excluded_no_domain_data': n_excluded_no_domain_data,
    }, f, indent=2)
print(f'domain_comanipulation.json: distribution {dict(domain_count_dist)}, excluded {n_excluded_no_domain_data} with no domain data')

# Pairwise co-occurrence among the 8 domains, for a heatmap view of "which
# domains get manipulated together" — complements the bar chart of
# individual domain totals above.
domain_labels = list(DOMAIN_FLAG_COLS.values())
domain_cooc = pd.DataFrame(0, index=domain_labels, columns=domain_labels)
domain_flags_valid = domain_flags[has_any_domain_data]
for a in domain_labels:
    for b in domain_labels:
        domain_cooc.loc[a, b] = int((domain_flags_valid[a] & domain_flags_valid[b]).sum())
with open(OUT_DIR / 'domain_cooccurrence.json', 'w') as f:
    json.dump({'labels': domain_labels, 'matrix': domain_cooc.values.tolist()}, f, indent=2)
print('domain_cooccurrence.json written')

# ── C1b. Detailed thermal-domain manipulation type (exp-domains) ──────────
# A richer free-text field than the 8 binary domain flags above: it
# distinguishes manipulation PROTOCOL within a domain (e.g. "Air
# temperature" steady-state vs. "Air temperature: Ramp" vs "...: Double
# step change" vs "...: Non-uniform"), and surfaces a few manipulated
# variables not covered by the 8 binary flags at all (Clothing, Adaptive
# behaviour, Airflow direction, Visual access, Acclimation, Odour, PMV).
exp_domains_clean = studies_u['exp-domains'].astype(str).str.strip()
exp_domains_clean = exp_domains_clean[~exp_domains_clean.isin(CODES) & (exp_domains_clean != 'nan') & (exp_domains_clean != 'None')]
domain_detail_rows = []
for idx, val in exp_domains_clean.items():
    study_id = studies_u.loc[idx, 'id']
    for tok in val.split(','):
        tok = tok.strip()
        # Fix the two casing duplicates found in the raw data (otherwise
        # 'Illumination'/'illumination' and 'Radiant temperature'/'radiant
        # temperature' would silently fragment into separate bars).
        tok = {'illumination': 'Illumination', 'radiant temperature': 'Radiant temperature'}.get(tok.lower(), tok)
        if tok:
            domain_detail_rows.append({'id': study_id, 'token': tok})
domain_detail_df = pd.DataFrame(domain_detail_rows).drop_duplicates(subset=['id', 'token'])
domain_detail_totals = domain_detail_df['token'].value_counts()
with open(OUT_DIR / 'domain_detail.json', 'w') as f:
    json.dump({
        'totals': [{'token': t, 'count': int(c)} for t, c in domain_detail_totals.items()],
        'n_studies': int(exp_domains_clean.shape[0]),
    }, f, indent=2)
print(f'domain_detail.json: {len(domain_detail_totals)} distinct manipulation tokens, {exp_domains_clean.shape[0]} studies with detail')

# ── C2. Sex-disaggregated age and BMI (within-study male vs female means) ──
sex_disagg_rows = []
for _, row in studies_u.iterrows():
    am = clean_num(row['pop-age-male-mean'])
    af = clean_num(row['pop-age-fem-mean'])
    bm = clean_num(row['pop-bmi-male-mean'])
    bf = clean_num(row['pop-bmi-fem-mean'])
    if am is not None and af is not None:
        sex_disagg_rows.append({'id': row['id'], 'metric': 'age', 'male': am, 'female': af, 'diff': round(am - af, 2)})
    if bm is not None and bf is not None:
        sex_disagg_rows.append({'id': row['id'], 'metric': 'bmi', 'male': bm, 'female': bf, 'diff': round(bm - bf, 2)})

with open(OUT_DIR / 'sex_disaggregated.json', 'w') as f:
    json.dump({'data': sex_disagg_rows}, f, indent=2)
print(f'sex_disaggregated.json: {len(sex_disagg_rows)} rows')

# ── C3. Open data: who actually shares it, and how ──────────────────────
data_avail_dist = studies_u['data-avail'].value_counts()
real_links = studies_u[~studies_u['data-link'].astype(str).isin(CODES) & studies_u['data-link'].notna()].copy()
# Repair a transcription artifact: at least one URL in the raw corpus has an
# internal space (likely from a line-wrap when the data was originally
# entered), which would otherwise render as a broken link on the site.
real_links['data-link'] = real_links['data-link'].astype(str).str.replace(' ', '', regex=False)
supp_links = studies_u[~studies_u['data-supp-link'].astype(str).isin(CODES) & studies_u['data-supp-link'].notna()]

with open(OUT_DIR / 'open_data.json', 'w') as f:
    json.dump({
        'data_avail_distribution': [{'status': k, 'count': int(v)} for k, v in data_avail_dist.items()],
        'n_with_real_data_link': len(real_links),
        'n_with_supplementary_link': len(supp_links),
        'n_total': len(studies_u),
        'studies_with_link': real_links[['id', 'data-link']].rename(columns={'data-link': 'link'}).to_dict('records'),
    }, f, indent=2)
print(f'open_data.json: {len(real_links)} studies with a real open-data link of {len(studies_u)}')

# ── C3b. Data-availability status by period, for the Fig 12 heatmap ─────
# Reuses period_n_all (total experiments per period, computed above at A1)
# so the matrix is normalized the same way as the other corpus-wide period
# heatmaps (Fig 21 etc.) rather than per-status.
davail_by_period = studies_u.groupby(['period', 'data-avail']).size().reset_index(name='count')
with open(OUT_DIR / 'data_avail_by_period.json', 'w') as f:
    json.dump({
        'data': davail_by_period.rename(columns={'data-avail': 'status'}).to_dict('records'),
        'period_n': period_n_all,
        'periods': [b[2] for b in BINS],
    }, f, indent=2)
print('data_avail_by_period.json written:', dict(data_avail_dist))

# ── C4. Sample size justification type & participant payment ───────────
calc_type_dist = studies_u[~studies_u['pop-sample-size-calc-type'].astype(str).isin(CODES) & studies_u['pop-sample-size-calc-type'].notna()]['pop-sample-size-calc-type'].value_counts()
payment_dist = studies_u['pop-payment'].value_counts()
with open(OUT_DIR / 'sample_justification.json', 'w') as f:
    json.dump({
        'calc_type_distribution': [{'type': k, 'count': int(v)} for k, v in calc_type_dist.items()],
        'payment_distribution': [{'status': k, 'count': int(v)} for k, v in payment_dist.items()],
        'n_total': len(studies_u),
    }, f, indent=2)
print(f'sample_justification.json: calc types {dict(calc_type_dist)}, payment {dict(payment_dist)}')

# ── C4b. Sample-size calc type by period, for the Fig 18 heatmap ────────
# Same filter as calc_type_dist above (excludes NR/NAN/NC/MNR -- studies
# with no stated justification at all aren't a "calculation type"), and the
# same period_n_all denominator as Fig 12's heatmap, so both stay directly
# comparable across periods.
calc_type_valid = studies_u[~studies_u['pop-sample-size-calc-type'].astype(str).isin(CODES) & studies_u['pop-sample-size-calc-type'].notna()]
calc_type_by_period = calc_type_valid.groupby(['period', 'pop-sample-size-calc-type']).size().reset_index(name='count')
with open(OUT_DIR / 'sample_calc_type_by_period.json', 'w') as f:
    json.dump({
        'data': calc_type_by_period.rename(columns={'pop-sample-size-calc-type': 'type'}).to_dict('records'),
        'period_n': period_n_all,
        'periods': [b[2] for b in BINS],
    }, f, indent=2)
print('sample_calc_type_by_period.json written:', dict(calc_type_dist))

print("\nDataset audit follow-up artifacts built.")

# ── D1. City-level map (replaces/supplements the country choropleth) ──────
import sys as _sys2
_sys2.path.insert(0, str(Path(__file__).parent))
from city_coordinates import CITY_COORDS, MULTI_CITY_STUDIES

city_rows = []
for _, row in studies_u.iterrows():
    raw_city = str(row['id-city']).strip() if row['id-city'] is not None else None
    if raw_city is None or raw_city in CODES or raw_city == 'nan':
        continue
    if raw_city in MULTI_CITY_STUDIES:
        for lat, lon, name, region in MULTI_CITY_STUDIES[raw_city]:
            city_rows.append({
                'id': row['id'], 'lat': lat, 'lon': lon, 'city': name, 'region': region,
                'precision': 'multi', 'country': row['id-country'], 'climate_class': row['id-climate-class'],
            })
    elif raw_city in CITY_COORDS:
        lat, lon, name, precision = CITY_COORDS[raw_city]
        city_rows.append({
            'id': row['id'], 'lat': lat, 'lon': lon, 'city': name, 'region': None,
            'precision': precision, 'country': row['id-country'], 'climate_class': row['id-climate-class'],
        })

city_df = pd.DataFrame(city_rows)
# Aggregate by resolved city name + coordinates (not raw string) so e.g.
# 'Naogoya' and any future correctly-spelled 'Nagoya' entries would merge.
city_agg = city_df.groupby(['city', 'lat', 'lon', 'precision', 'country']).agg(
    count=('id', 'nunique'),
    climate_classes=('climate_class', lambda s: sorted(set(s.dropna()) - CODES),
)).reset_index()
# climate_classes is a list per city; take the first (cities are
# climate-consistent in this corpus, verified during construction)
city_agg['climate_class'] = city_agg['climate_classes'].apply(lambda l: l[0] if l else None)
city_agg = city_agg.drop(columns=['climate_classes'])
city_agg['climate_group'] = city_agg['climate_class'].apply(koppen_group)

with open(OUT_DIR / 'geo_cities.json', 'w') as f:
    json.dump({
        'data': city_agg.to_dict('records'),
        'n_cities': len(city_agg),
        'n_studies_mapped': int(city_df['id'].nunique()),
        'n_studies_total': len(studies_u),
        'n_province_level': int((city_agg['precision'] == 'province').sum()),
    }, f, indent=2, default=str)
print(f'geo_cities.json: {len(city_agg)} cities, {city_df["id"].nunique()} of {len(studies_u)} studies mapped')

# ── D2. Sample size by country (cross-chapter: geography × population) ────
# Mean and median can tell very different stories here — e.g. China's mean
# sample size is pulled far above its median by a handful of large field
# studies (one with n=2110), so both are reported, plus the full per-study
# distribution, rather than collapsing to a single misleading summary number.
ss_country = studies_u[['id', 'id-country', 'pop-no-tot']].copy()
ss_country['pop-no-tot'] = ss_country['pop-no-tot'].apply(clean_num)
ss_country = ss_country[~ss_country['id-country'].astype(str).isin(CODES) & ss_country['pop-no-tot'].notna()]

# True corpus-wide total, computed BEFORE the >=3-studies-per-country filter below --
# used client-side for "% of corpus" so that number reflects the whole corpus, not
# just the subset of countries large enough to display individually. (Previously the
# frontend summed only the filtered per-country `studies` array here, which understated
# the denominator and inflated every country's displayed "% of corpus" share -- e.g.
# China showed 74.4% against this partial sum instead of 69.9% against the true total.)
total_corpus_participants = float(ss_country['pop-no-tot'].sum())

country_stats = ss_country.groupby('id-country')['pop-no-tot'].agg(
    count='count', median='median', mean='mean', min='min', max='max'
).reset_index()
# Only show countries with enough studies that a median/mean is meaningful
# rather than a single data point dressed up as a summary statistic.
country_stats = country_stats[country_stats['count'] >= 3].sort_values('count', ascending=False)

country_studies = ss_country[ss_country['id-country'].isin(country_stats['id-country'])][
    ['id', 'id-country', 'pop-no-tot']
].rename(columns={'pop-no-tot': 'n', 'id-country': 'country'})

with open(OUT_DIR / 'sample_size_by_country.json', 'w') as f:
    json.dump({
        'stats': country_stats.rename(columns={'id-country': 'country'}).to_dict('records'),
        'studies': country_studies.to_dict('records'),
        'min_count_threshold': 3,
        'total_sample_size_all_countries': total_corpus_participants,
    }, f, indent=2, default=str)
print(f'sample_size_by_country.json: {len(country_stats)} countries with >=3 studies, '
      f'{total_corpus_participants:.0f} total corpus participants (true denominator)')

# ── D3. Body site by signal: heart rate, skin conductance, sweat indicators ──
# Generalizes the skin-temperature site-prevalence treatment (Ch.3) to three
# more signals where measurement site reflects a real methodological choice
# (sensor modality for heart rate; electrode placement convention for skin
# conductance; whole-body vs. local method for sweat). We only collapse near-
# synonymous anatomical labels (e.g. calf/shin -> lower leg); distinct face
# sub-sites stay distinct so the figure never claims a signal was measured on
# the generic 'face' when the paper actually reported earlobe, temple, etc.
#
# A few raw labels are NOT anatomical locations and can't be placed on a
# body diagram: 'Whole body' (a measurement method, not a site — almost all
# sweat-indicator studies use this), 'Urine' (a sample type), and 'Limbs'
# (too vague to place — could be any of several distinct sites). These are
# kept in site_totals (so the bar-chart/table views still show them
# honestly) but flagged via `non_anatomical` so the body-diagram component
# knows to exclude them from the silhouette and surface them as a separate
# note instead of silently dropping them or mis-plotting them.
NON_ANATOMICAL_SITES = {'Whole body', 'Urine', 'Limbs'}
SITE_SIGNALS = ['Heart/Pulse rate', 'Skin conductance', 'Sweat indicators']
site_by_signal = {}
for sig in SITE_SIGNALS:
    sub = df[df['physio-parameter'] == sig][
        ['id', 'physio-body-site', 'physio-body-site-surface', 'physio-sensing-method']
    ].copy()
    sub['physio-body-site'] = sub['physio-body-site'].astype(str).str.strip()
    sub['physio-sensing-method'] = sub['physio-sensing-method'].astype(str).str.strip().replace({
        'Digital Sphygmomanometer': 'Digital sphygmomanometer',
        'Laser doppler': 'Laser Doppler',
    })
    sub = sub[~sub['physio-body-site'].isin(CODES) & (sub['physio-body-site'] != 'nan')]
    sub = split_hand_foot_surface(sub)
    sub['physio-body-site'] = sub['physio-body-site'].replace(SITE_MERGE)
    sub_dedup = sub.drop_duplicates(subset=['id', 'physio-body-site'])
    totals = sub_dedup['physio-body-site'].value_counts()

    method_rows = sub[
        ~sub['physio-sensing-method'].isin(CODES)
        & (sub['physio-sensing-method'] != 'nan')
    ].drop_duplicates(subset=['id', 'physio-body-site', 'physio-sensing-method'])
    method_counts = (
        method_rows.groupby(['physio-body-site', 'physio-sensing-method'])['id']
        .nunique().reset_index(name='count')
    )
    method_map = {}
    for _, row in method_counts.iterrows():
        method_map.setdefault(row['physio-body-site'], {})[row['physio-sensing-method']] = int(row['count'])

    site_by_signal[sig] = {
        'site_totals': [
            {
                'site': s,
                'count': int(c),
                'non_anatomical': s in NON_ANATOMICAL_SITES,
                'sensingMethods': method_map.get(s, {}),
            }
            for s, c in totals.items()
        ],
        'n_studies_with_site': int(sub_dedup['id'].nunique()),
    }

# Heart rate has enough studies (99) for a meaningful by-period breakdown;
# skin conductance (25) and sweat indicators (32) would average under 5
# studies per two-year bin, too thin to split six ways — shown overall only,
# same reasoning already applied to the environmental co-occurrence matrix.
hr_sub = df[df['physio-parameter'] == 'Heart/Pulse rate'][['id', 'physio-body-site', 'physio-body-site-surface']].copy()
hr_sub['physio-body-site'] = hr_sub['physio-body-site'].astype(str).str.strip()
hr_sub = hr_sub[~hr_sub['physio-body-site'].isin(CODES) & (hr_sub['physio-body-site'] != 'nan')]
hr_sub = split_hand_foot_surface(hr_sub)
hr_sub['physio-body-site'] = hr_sub['physio-body-site'].replace(SITE_MERGE)
hr_sub = hr_sub.merge(studies_u[['id', 'period']], on='id', how='left')
hr_dedup = hr_sub.drop_duplicates(subset=['id', 'physio-body-site'])
hr_by_period = hr_dedup.groupby(['physio-body-site', 'period']).size().reset_index(name='count')
hr_period_n = hr_dedup.groupby('period')['id'].nunique().to_dict()

site_by_signal['Heart/Pulse rate']['by_period'] = {
    'data': hr_by_period.rename(columns={'physio-body-site': 'site'}).to_dict('records'),
    'period_n': {k: int(v) for k, v in hr_period_n.items()},
    'periods': [b[2] for b in BINS],
}

# Combined sudomotor view: deduplicate across both signals at id × site so a
# study measuring skin conductance and sweat at the same site contributes once.
sud = df[df['physio-parameter'].isin(['Skin conductance', 'Sweat indicators'])][
    ['id','physio-parameter','physio-body-site','physio-body-site-surface','physio-sensing-method']
].copy()
sud['physio-body-site'] = sud['physio-body-site'].astype(str).str.strip()
sud['physio-sensing-method'] = sud['physio-sensing-method'].astype(str).str.strip().replace({
    'Digital Sphygmomanometer': 'Digital sphygmomanometer', 'Laser doppler': 'Laser Doppler'})
sud = sud[~sud['physio-body-site'].isin(CODES) & (sud['physio-body-site'] != 'nan')]
sud = split_hand_foot_surface(sud)
sud['site'] = sud['physio-body-site'].replace(SITE_MERGE)
sud_unique = sud.drop_duplicates(subset=['id','site'])
combined_totals = sud_unique['site'].value_counts()
combined_rows = []
for site, count in combined_totals.items():
    site_raw = sud[sud['site'] == site]
    by_signal = (site_raw.drop_duplicates(subset=['id','physio-parameter'])
                 .groupby('physio-parameter')['id'].nunique().to_dict())
    methods = (site_raw[~site_raw['physio-sensing-method'].isin(CODES) & (site_raw['physio-sensing-method'] != 'nan')]
               .drop_duplicates(subset=['id','site','physio-sensing-method'])
               .groupby('physio-sensing-method')['id'].nunique().to_dict())
    combined_rows.append({'site': site, 'count': int(count), 'non_anatomical': site in NON_ANATOMICAL_SITES,
                          'by_signal': {k:int(v) for k,v in by_signal.items()},
                          'sensingMethods': {k:int(v) for k,v in methods.items()}})
site_by_signal['Sudomotor (combined)'] = {
    'site_totals': sorted(combined_rows, key=lambda r: -r['count']),
    'n_studies_with_site': int(sud_unique['id'].nunique()),
}

with open(OUT_DIR / 'site_by_signal.json', 'w') as f:
    json.dump(site_by_signal, f, indent=2, default=str)
print('site_by_signal.json written for:', {k: v['n_studies_with_site'] for k, v in site_by_signal.items()})

# ── D4. Signal × sensing method × body site (agreeability-focused Sankey) ──
# Complements the existing signal → sensor type → brand Sankey (Ch.3) with a
# different cut: which body site a given measurement *method* uses, since
# validation/agreeability concerns track sensing method (ECG vs. OHR/PPG,
# thermocouple vs. infrared) more directly than brand does — two devices
# from the same brand can differ in validation tier, but ECG-vs-PPG is a
# real mechanistic difference that affects what "heart rate" actually means.
sms = df[['id', 'physio-parameter', 'physio-sensing-method', 'physio-body-site']].copy()
for c in ['physio-parameter', 'physio-sensing-method', 'physio-body-site']:
    sms[c] = sms[c].astype(str).str.strip()
sms = sms[~sms['physio-sensing-method'].isin(CODES) & ~sms['physio-body-site'].isin(CODES) & (sms['physio-body-site'] != 'nan')]
sms['physio-sensing-method'] = sms['physio-sensing-method'].replace({
    'Digital Sphygmomanometer': 'Digital sphygmomanometer', 'Laser doppler': 'Laser Doppler',
})
sms['signal'] = sms['physio-parameter']
# Apply the same site-consolidation rules used for the skin-temperature site
# heatmap (Ch.3), but ONLY to skin-temperature rows — these merge rules
# (Lower arm→Forearm, Calf/Shin→Lower leg, facial sub-sites→Face, etc.) were
# built specifically for that signal's 39-label vocabulary and don't apply
# to other signals' site vocabularies.
is_skin_temp = sms['signal'] == 'Skin temperature'
sms.loc[is_skin_temp, 'physio-body-site'] = sms.loc[is_skin_temp, 'physio-body-site'].replace(SITE_MERGE)

sms_dedup = sms.drop_duplicates(subset=['id', 'signal', 'physio-sensing-method', 'physio-body-site'])

sig_sens_site = sms_dedup.groupby(['signal', 'physio-sensing-method', 'physio-body-site'])['id'].nunique().reset_index(name='count')
sig_sens_site = sig_sens_site.rename(columns={'physio-sensing-method': 'sensing_method', 'physio-body-site': 'site'})

with open(OUT_DIR / 'signal_method_site.json', 'w') as f:
    json.dump({'data': sig_sens_site.to_dict('records')}, f, indent=2, default=str)
print(f'signal_method_site.json: {len(sig_sens_site)} signal-method-site triples')

# ── D5. Brand + model reference table (searchable, not a Sankey) ──────────
# Model names are far too dense (237 distinct, vs. 64 brands after
# filtering) for a third Sankey column to stay legible — this is the
# searchable-table alternative for exactly the use case a Sankey can't
# serve: "which specific devices are used for signal X" for an agreeability
# check, where the answer needs to be a scannable list, not a diagram.
bm = df[['id', 'physio-parameter', 'physio-sensing-method', 'physio-sensor-brand', 'physio-sensor-model']].copy()
for c in ['physio-parameter', 'physio-sensing-method', 'physio-sensor-brand', 'physio-sensor-model']:
    bm[c] = bm[c].astype(str).str.strip()
bm = bm[~bm['physio-sensor-model'].isin(CODES) & (bm['physio-sensor-model'] != 'nan')]
bm['physio-sensing-method'] = bm['physio-sensing-method'].replace({
    'Digital Sphygmomanometer': 'Digital sphygmomanometer', 'Laser doppler': 'Laser Doppler',
})
bm['signal'] = bm['physio-parameter']
# Reuse the same brand canonicalization already built for the standalone
# brand chart and the signal->sensor->brand Sankey, so 'iButton '/'iButton'
# and similar casing/whitespace variants collapse here too.
bm['physio-sensor-brand'] = bm['physio-sensor-brand'].apply(
    lambda v: canonical_label.get(v, v) if v not in CODES and v != 'nan' else 'NR')

bm_dedup = bm.drop_duplicates(subset=['id', 'signal', 'physio-sensing-method', 'physio-sensor-brand', 'physio-sensor-model'])
bm_grouped = bm_dedup.groupby(['signal', 'physio-sensing-method', 'physio-sensor-brand', 'physio-sensor-model']).agg(
    count=('id', 'nunique'),
    study_ids=('id', lambda s: sorted(s.unique())),
).reset_index().rename(columns={'physio-sensing-method': 'sensing_method', 'physio-sensor-brand': 'brand', 'physio-sensor-model': 'model'})
bm_grouped = bm_grouped.sort_values(['signal', 'count'], ascending=[True, False])

with open(OUT_DIR / 'brand_model_reference.json', 'w') as f:
    json.dump({'data': bm_grouped.to_dict('records'), 'n_models': bm_grouped['model'].nunique()}, f, indent=2, default=str)
print(f'brand_model_reference.json: {len(bm_grouped)} signal-method-brand-model rows, {bm_grouped["model"].nunique()} distinct models')


# ── D6. Runtime bundle for the React frontend ─────────────────────────────
# The site fetches public/data/bundle.json at runtime rather than fetching each
# generated JSON artifact separately. Therefore every corpus rebuild must end by
# refreshing bundle.json, otherwise the local/generated figure JSON files can be
# current while the deployed site still displays stale values from an older
# bundle.
def _sanitize_for_json(obj):
    """Recursively convert pandas/numpy values and non-finite floats to JSON-safe values."""
    if isinstance(obj, dict):
        return {str(k): _sanitize_for_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_sanitize_for_json(v) for v in obj]
    if isinstance(obj, tuple):
        return [_sanitize_for_json(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        if not np.isfinite(obj):
            return None
        return float(obj)
    if isinstance(obj, float):
        if not np.isfinite(obj):
            return None
        return obj
    if isinstance(obj, (pd.Timestamp,)):
        return obj.isoformat()
    return obj

bundle = {}
for path in sorted(OUT_DIR.glob('*.json')):
    if path.name == 'bundle.json':
        continue
    with open(path, 'r', encoding='utf-8') as f:
        bundle[path.stem] = json.load(f)

with open(OUT_DIR / 'bundle.json', 'w', encoding='utf-8') as f:
    json.dump(_sanitize_for_json(bundle), f, indent=2, ensure_ascii=False)

print(f'bundle.json written with {len(bundle)} datasets')
