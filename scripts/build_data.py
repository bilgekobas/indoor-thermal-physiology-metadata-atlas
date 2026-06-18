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
