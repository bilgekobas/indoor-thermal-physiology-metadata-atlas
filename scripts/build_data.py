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

SRC = '/mnt/user-data/uploads/corpus_main_dataset.csv'
OUT_DIR = Path('/home/claude/corpus-site/public/data')
OUT_DIR.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(SRC, encoding='utf-8-sig', low_memory=False)
df = df.replace({np.nan: None})

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

# ── 5. Skin temperature body sites (merged) — prevalence by period ────────
SITE_MERGE = {
    'Lower arm':'Forearm','Calf':'Lower leg','Shin':'Lower leg','Arm':'Upper arm',
    'Leg':'Thigh','Lumbar':'Lower back','Lower back':'Lower back','Scapula':'Back',
    'Cheek':'Face','Nose':'Face','Chin':'Face','Mouth':'Face','Temple':'Face',
    'Ear':'Face','Head':'Face','Eye':'Face','Earlobe':'Face',
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
        'period_n': period_study_n.to_dict('records'),
        'periods': [b[2] for b in BINS],
    }, f, indent=2, default=str)
print(f'skintemp_sites.json written: {len(site_totals)} merged sites')

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
    if f in TOP_FORMULAS: return f
    if f == 'NR': return 'NR'
    return 'Other/Multiple'
mst_only['formula_grp'] = mst_only['formula'].apply(formula_group)

formula_by_period = mst_only.groupby(['period','formula_grp']).size().reset_index(name='count')

def bucket_pt(p):
    if p is None or (isinstance(p, float) and np.isnan(p)):
        return None
    if p >= 12: return '≥12'
    return str(int(p))
mst_only['pt_bucket'] = mst_only['pts'].apply(bucket_pt)
points_by_formula = mst_only.dropna(subset=['pt_bucket']).groupby(['pt_bucket','formula_grp']).size().reset_index(name='count')

with open(OUT_DIR / 'mst.json', 'w') as f:
    json.dump({
        'calc_rate_by_period': mst_rate.to_dict('records'),
        'formula_by_period': formula_by_period.to_dict('records'),
        'points_by_formula': points_by_formula.to_dict('records'),
        'formula_order': TOP_FORMULAS + ['Other/Multiple','NR'],
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
studies_u = df.drop_duplicates(subset=['id']).copy()

def clean_num(v):
    if v is None: return None
    try:
        return float(v)
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
    for start, end in row['time_ranges']:
        time_rows.append({'id': row['id'], 'start': start, 'end': end})

with open(OUT_DIR / 'fig05_time_of_day.json', 'w') as f:
    json.dump({'sessions': time_rows, 'n_reporting': len(set(r['id'] for r in time_rows))}, f, indent=2)
print(f'fig05_time_of_day.json: {len(time_rows)} session time blocks')

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
    nums = re.findall(r'-?\d+\.?\d*', str(v))
    return [float(n) for n in nums]

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

tsv_parsed, tcv_parsed = [], []
for _, row in studies_u.iterrows():
    p = parse_scale(row['ques-thermal-sensation'], 'tsv')
    if p:
        p['id'] = row['id']
        tsv_parsed.append(p)
    p2 = parse_scale(row['ques-thermal-comfort'], 'tcv')
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
def binary_matrix_block(prefix, pretty_map=None):
    cols = [c for c in studies_u.columns if c.startswith(prefix)]
    reported = ~studies_u[cols].isin(CODES) & studies_u[cols].notna()
    pct = (reported.mean() * 100).round(1)
    order = pct.sort_values(ascending=False).index.tolist()
    pretty = pretty_map or {}
    bar = [{'field': pretty.get(c, c.replace(prefix,'').replace('-',' ')),
            'pct': float(pct[c]),
            'count': int(reported[c].sum())} for c in order]
    # matrix shape: fields × studies (field_i × study_j) = reported[order].T
    matrix = reported[order].T.astype(int).values.tolist()
    fields = [pretty.get(c, c.replace(prefix,'').replace('-',' ')) for c in order]
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
