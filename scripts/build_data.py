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
physio = df[['id','period','physio-parameter','physio-sensing-method','physio-body-site']].copy()
physio = physio[~physio['physio-sensing-method'].isin(CODES)]
physio = physio[physio['physio-sensing-method'].notna()]
physio = physio[physio['physio-parameter'].notna()]
physio['physio-sensing-method'] = physio['physio-sensing-method'].astype(str).str.strip()
physio['physio-sensing-method'] = physio['physio-sensing-method'].replace({
    'Digital Sphygmomanometer': 'Digital sphygmomanometer',
    'Laser doppler': 'Laser Doppler',
})
physio['signal'] = physio['physio-parameter'].replace({
    'Body temperature':'Core/Body temperature','Core temperature':'Core/Body temperature',
})
physio_dedup = physio.drop_duplicates(subset=['id','signal','physio-sensing-method'])

signal_sensor_counts = (physio_dedup.groupby(['signal','physio-sensing-method'])
                         .size().reset_index(name='count'))
signal_sensor_period = (physio_dedup.groupby(['signal','physio-sensing-method','period'])
                         .size().reset_index(name='count'))

with open(OUT_DIR / 'physio_signal_sensor.json', 'w') as f:
    json.dump({
        'overall': signal_sensor_counts.to_dict('records'),
        'by_period': signal_sensor_period.to_dict('records'),
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
skin = df[df['physio-parameter']=='Skin temperature'][['id','period','physio-body-site']].copy()
skin = skin[~skin['physio-body-site'].isin(CODES)]
skin = skin[skin['physio-body-site'].notna()]
skin['physio-body-site'] = skin['physio-body-site'].astype(str).str.strip()
skin['site'] = skin['physio-body-site'].replace(SITE_MERGE)
skin_dedup = skin.drop_duplicates(subset=['id','site'])

site_period_counts = skin_dedup.groupby(['site','period']).size().reset_index(name='count')
site_totals = skin_dedup['site'].value_counts().reset_index()
site_totals.columns = ['site','total']
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

# ── 6. MST: calculated Y/N/NR by period, points, formula ──────────────────
studies_mst = df.drop_duplicates(subset=['id'])[
    ['id','period','physio-mst-calculated','physio-mst-points','physio-mst-formula']
].copy()

mst_rate = studies_mst.groupby(['period','physio-mst-calculated']).size().reset_index(name='count')

def parse_pts(val):
    if val is None or str(val).strip() in CODES or str(val).strip()=='':
        return None
    nums = re.findall(r'\d+', str(val))
    return int(nums[0]) if nums else None

def clean_formula(val):
    if val is None or str(val).strip() in CODES or str(val).strip()=='':
        return 'NR'
    val = str(val).strip().replace('Hardy & Dubois','Hardy & DuBois')
    if len(val) > 50 and (',' in val or '+' in val):
        return 'Multiple'
    return val

mst_only = studies_mst[studies_mst['physio-mst-calculated']=='Y'].copy()
mst_only['pts'] = mst_only['physio-mst-points'].apply(parse_pts)
mst_only['formula'] = mst_only['physio-mst-formula'].apply(clean_formula)

TOP_FORMULAS = ['Ramanathan (1964)','Hardy & DuBois (1938)','ISO 9886: 2004',
                'Colin & Houdas (1982)','Ouyang (1985)','McIntyre (1980)']
def formula_group(f):
    # Keep formula labels disaggregated. The atlas view sorts them by count rather
    # than hiding long-tail formulas under an 'Other' bucket.
    return f or 'NR'
mst_only['formula_grp'] = mst_only['formula'].apply(formula_group)

formula_by_period = mst_only.groupby(['period','formula_grp']).size().reset_index(name='count')

def bucket_pt(p):
    if p is None or (isinstance(p, float) and np.isnan(p)):
        return None
    return str(int(p))
mst_only['pt_bucket'] = mst_only['pts'].apply(bucket_pt)
points_by_formula = mst_only.dropna(subset=['pt_bucket']).groupby(['pt_bucket','formula_grp']).size().reset_index(name='count')

with open(OUT_DIR / 'mst.json', 'w') as f:
    json.dump({
        'calc_rate_by_period': mst_rate.to_dict('records'),
        'formula_by_period': formula_by_period.to_dict('records'),
        'points_by_formula': points_by_formula.to_dict('records'),
        'formula_order': sorted(mst_only['formula_grp'].dropna().unique().tolist()),
        'periods': [b[2] for b in BINS],
        'n_mst_studies': int(len(mst_only)),
    }, f, indent=2, default=str)
print(f'mst.json written: {len(mst_only)} studies calculating MST')

# ── 7. Core/Body temperature sensor × site crossmap ────────────────────────
SENSOR_MAP_CBT = {
    'Thermometer':'Thermometer','Mercury thermometer':'Thermometer',
    'Infrared thermometer':'Infrared thermometer','Thermal picker':'Infrared thermometer',
    'Ingestible pill':'Ingestible pill','Thermistor':'Thermistor','Probe':'Probe',
}
KEEP_SITES_CBT = ['Tympanic canal','Gastrointestinal tract','Oral cavity','Rectal','Axilla','Forehead']

cbt = df[df['physio-parameter'].isin(['Body temperature','Core temperature'])][
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
        return None

# ── Fig 1. Publications by year ────────────────────────────────────────
pubs_by_year = df.drop_duplicates(subset=['id-pub-id'])['pub-year'].value_counts().sort_index()
fig1 = [{'year': int(y), 'count': int(c)} for y, c in pubs_by_year.items()]
with open(OUT_DIR / 'fig01_pubs_by_year.json', 'w') as f:
    json.dump({'data': fig1}, f, indent=2)
print('fig01_pubs_by_year.json:', len(fig1), 'years')

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
age_rows = []
for _, row in studies_u.iterrows():
    mean = clean_num(row['pop-age-mean'])
    std_raw = clean_num(row['pop-age-std'])
    if mean is not None:
        age_rows.append({'id': row['id'], 'mean': mean, 'std': std_raw, 'std_reported': std_raw is not None})

bmi_rows = []
for _, row in studies_u.iterrows():
    mean = clean_num(row['pop-bmi-mean'])
    std_raw = clean_num(row['pop-bmi-std'])
    if mean is not None:
        bmi_rows.append({'id': row['id'], 'mean': mean, 'std': std_raw, 'std_reported': std_raw is not None})

with open(OUT_DIR / 'fig08_age.json', 'w') as f:
    json.dump({'studies': sorted(age_rows, key=lambda r: r['mean'])}, f, indent=2)
with open(OUT_DIR / 'fig09_bmi.json', 'w') as f:
    json.dump({'studies': sorted(bmi_rows, key=lambda r: r['mean'])}, f, indent=2)
print(f'fig08/09: {len(age_rows)} age, {len(bmi_rows)} BMI studies')

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
ENV_VARS = {
    'env-tdb': 'Air temp.', 'env-rh': 'Relative humidity', 'env-v': 'Air velocity',
    'env-tg': 'Globe temp.', 'env-tsurface': 'Surface temp.', 'env-twb': 'Wet bulb temp.',
    'env-co2': 'CO2 concentration', 'env-illuminance': 'Illuminance levels',
    'env-sound-level': 'Sound levels', 'env-tout': 'Outdoor temp.', 'env-rhout': 'Outdoor rel. humidity',
    'env-voc': 'VOC levels', 'env-light-color': 'Light colour', 'env-solar-rad': 'Solar radiation',
}
env_reported = pd.DataFrame({
    label: ~studies_u[col].isin(CODES) & studies_u[col].notna()
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
physio_clean['physio-parameter'] = physio_clean['physio-parameter'].replace({
    'Body temperature': 'Core/Body temperature', 'Core temperature': 'Core/Body temperature',
})
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
def parse_scale(text, kind):
    """Parse 'points=N; range=(...); scale=(...)' strings into structured scale data."""
    if text is None or str(text).strip() in CODES:
        return None
    text = str(text)
    pts_m = re.search(r'points=(\d+)', text)
    pts = int(pts_m.group(1)) if pts_m else None
    range_m = re.search(r'range=\(([^)]*)\)', text)
    labels_m = re.search(r'scale=\(([^)]*)\)', text)
    if not range_m or not labels_m:
        return None
    try:
        range_vals = [float(x.strip().replace('+', '')) for x in range_m.group(1).split(',')]
    except ValueError:
        return None
    labels = [x.strip().strip('"').strip("'") for x in labels_m.group(1).split(',')]
    if len(range_vals) != len(labels) or pts is None:
        return None
    return {'points': pts, 'range': range_vals, 'labels': labels}

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
    # Only keep studies where we can confidently identify which end is which;
    # if neither endpoint contains a recognisable comfort/discomfort word,
    # we cannot safely color it and exclude it rather than guess.
    if pole_low is None and pole_high is None:
        return None
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

with open(OUT_DIR / 'fig15_tsv_scales.json', 'w') as f:
    json.dump({
        'studies': tsv_parsed,
        'points_distribution': [{'points': int(k), 'count': int(v)} for k, v in tsv_pts_dist.items()],
        'n_total': len(tsv_parsed),
    }, f, indent=2)
with open(OUT_DIR / 'fig16_tcv_scales.json', 'w') as f:
    json.dump({
        'studies': tcv_parsed,
        'points_distribution': [{'points': int(k), 'count': int(v)} for k, v in tcv_pts_dist.items()],
        'n_total': len(tcv_parsed),
    }, f, indent=2)
print(f'fig15/16: {len(tsv_parsed)} TSV scales, {len(tcv_parsed)} TCV scales parsed')

# ── Fig 14. Questionnaire usage grouped by domain ──────────────────────
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
for domain, cols in QUES_DOMAINS.items():
    cols_present = [c for c in cols if c in studies_u.columns]
    reported = ~studies_u[cols_present].isin(CODES) & studies_u[cols_present].notna()
    any_in_domain = reported.any(axis=1).sum()
    field_counts = [{'field': PRETTY_FIELD.get(c, c), 'count': int(reported[c].sum())} for c in cols_present]
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
sb = df[['id', 'physio-sensing-method', 'physio-sensor-brand']].copy()
sb['physio-sensing-method'] = sb['physio-sensing-method'].astype(str).str.strip()
sb['physio-sensing-method'] = sb['physio-sensing-method'].replace({
    'Digital Sphygmomanometer': 'Digital sphygmomanometer',
    'Laser doppler': 'Laser Doppler',
})
sb['physio-sensor-brand'] = sb['physio-sensor-brand'].astype(str).str.strip()
sb = sb[~sb['physio-sensing-method'].isin(CODES) & sb['physio-sensing-method'].notna()]
sb = sb[~sb['physio-sensor-brand'].isin(CODES) & (sb['physio-sensor-brand'] != 'nan')]

# Reuse the same canonical-casing map built for sensor_brands so 'iButton '
# and 'iButton' (or 'OMRON'/'Omron') collapse to one brand label here too.
sb['physio-sensor-brand'] = sb['physio-sensor-brand'].apply(lambda v: canonical_label.get(v, v))

sb_dedup = sb.drop_duplicates(subset=['id', 'physio-sensing-method', 'physio-sensor-brand'])
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

def _valid_general(s):
    return s.notna() & ~s.isin(CODES)

def _valid_optional_binary(s):
    # Optional Y/N or free-text fields: NR means the study explicitly did not use/report this item
    # and is excluded from the applicability denominator. MNR/NAN/blank remain missing.
    st = s.astype(str).str.strip()
    applicable = s.notna() & ~st.isin({'NR', 'NAN', ''})
    valid = applicable & ~st.isin({'MNR'})
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

mst_mask = studies_u['physio-mst-calculated'].astype(str).str.strip() == 'Y'
full_completeness = {}
for group_name, specs in FULL_COMPLETENESS_GROUPS.items():
    rows = []
    for col, label, rule in specs:
        if col not in studies_u.columns:
            continue
        if rule == 'mst':
            sub = studies_u.loc[mst_mask, col]
            denom = int(mst_mask.sum())
            valid = _valid_general(sub)
        elif rule == 'optional_binary':
            sub = studies_u[col]
            valid, applicable = _valid_optional_binary(sub)
            denom = int(applicable.sum())
        else:
            sub = studies_u[col]
            denom = len(studies_u)
            valid = _valid_general(sub)
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
import sys as _sys
_sys.path.insert(0, str(Path(__file__).parent))
from cognitive_taxonomy import split_cognitive_tests, canonicalize_token

cog_done = studies_u[studies_u['cognitive-test-done'] == 'Y'].copy()
cog_rows = []
unrecognized_log = []
for _, row in cog_done.iterrows():
    tokens = split_cognitive_tests(row['cognitive-test-type'])
    seen_in_study = set()
    for t in tokens:
        canon, domain, ok = canonicalize_token(t)
        if not ok:
            unrecognized_log.append({'id': row['id'], 'raw': t})
        if canon in seen_in_study:
            continue  # avoid double-counting the same instrument within one study
        seen_in_study.add(canon)
        cog_rows.append({'id': row['id'], 'period': row['period'], 'instrument': canon, 'domain': domain, 'raw': t})

cog_df = pd.DataFrame(cog_rows)
instrument_totals = cog_df.groupby(['instrument', 'domain']).agg(
    count=('id', 'nunique')
).reset_index().sort_values('count', ascending=False)

domain_totals = cog_df.groupby('domain')['id'].nunique().reset_index(name='count').sort_values('count', ascending=False)

# Per-study list (for a study-level browse view)
study_instruments = cog_df.groupby('id')['instrument'].apply(list).reset_index()

# Flow data for Sankey: measure type -> domain -> instrument. Counts are
# unique-study counts, not raw row counts, so a study using the same instrument
# more than once still contributes only once.
cog_df['measure_type'] = cog_df['domain'].apply(
    lambda d: 'Performance task' if str(d).startswith('Performance task') else ('Subjective scale' if str(d).startswith('Subjective scale') else 'Stress induction')
)
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
    }, f, indent=2, default=str)
print(f'cognitive_tests.json: {len(instrument_totals)} canonical instruments, '
      f'{cog_done["id"].nunique()} studies, {len(unrecognized_log)} unrecognized tokens')

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
    }, f, indent=2, default=str)
print(f'sample_size_by_country.json: {len(country_stats)} countries with >=3 studies')

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
    sub = df[df['physio-parameter'] == sig][['id', 'physio-body-site']].copy()
    sub['physio-body-site'] = sub['physio-body-site'].astype(str).str.strip()
    sub = sub[~sub['physio-body-site'].isin(CODES) & (sub['physio-body-site'] != 'nan')]
    sub['physio-body-site'] = sub['physio-body-site'].replace(SITE_MERGE)
    sub_dedup = sub.drop_duplicates(subset=['id', 'physio-body-site'])
    totals = sub_dedup['physio-body-site'].value_counts()
    site_by_signal[sig] = {
        'site_totals': [
            {'site': s, 'count': int(c), 'non_anatomical': s in NON_ANATOMICAL_SITES}
            for s, c in totals.items()
        ],
        'n_studies_with_site': int(sub_dedup['id'].nunique()),
    }

# Heart rate has enough studies (99) for a meaningful by-period breakdown;
# skin conductance (25) and sweat indicators (32) would average under 5
# studies per two-year bin, too thin to split six ways — shown overall only,
# same reasoning already applied to the environmental co-occurrence matrix.
hr_sub = df[df['physio-parameter'] == 'Heart/Pulse rate'][['id', 'physio-body-site']].copy()
hr_sub['physio-body-site'] = hr_sub['physio-body-site'].astype(str).str.strip()
hr_sub = hr_sub[~hr_sub['physio-body-site'].isin(CODES) & (hr_sub['physio-body-site'] != 'nan')]
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

# Skin conductance and sweat indicators are closely related sudomotor
# measures (per the appendix's own domain grouping); combine their site
# totals into one shared view as requested, alongside each signal's own
# breakdown, summed at the (signal, site) level so the combined totals
# don't conflate which signal contributed what.
sudomotor_combined = {}
for sig in ['Skin conductance', 'Sweat indicators']:
    for row in site_by_signal[sig]['site_totals']:
        key = row['site']
        if key not in sudomotor_combined:
            sudomotor_combined[key] = {'site': key, 'count': 0, 'non_anatomical': row['non_anatomical'], 'by_signal': {}}
        sudomotor_combined[key]['count'] += row['count']
        sudomotor_combined[key]['by_signal'][sig] = row['count']
site_by_signal['Sudomotor (combined)'] = {
    'site_totals': sorted(sudomotor_combined.values(), key=lambda r: -r['count']),
    'n_studies_with_site': len(set(
        s for sig in ['Skin conductance', 'Sweat indicators']
        for s in df[(df['physio-parameter'] == sig) & (~df['physio-body-site'].isin(CODES)) & df['physio-body-site'].notna()]['id']
    )),
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
sms['signal'] = sms['physio-parameter'].replace({'Body temperature': 'Core/Body temperature', 'Core temperature': 'Core/Body temperature'})
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
bm['signal'] = bm['physio-parameter'].replace({'Body temperature': 'Core/Body temperature', 'Core temperature': 'Core/Body temperature'})
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
