"""Experiment-level intersections; never infer unreported controls or poolability."""
from collections import Counter
import json
import math
import re

MISSING = {'', 'NR', 'MNR', 'NAN', 'NC', 'NONE', 'NAN'}
PERIODS = [(2013, 2014, '2013–14'), (2015, 2016, '2015–16'),
           (2017, 2018, '2017–18'), (2019, 2020, '2019–20'),
           (2021, 2022, '2021–22'), (2023, 2024, '2023–24')]


def present(value):
    return value is not None and str(value).strip().upper() not in MISSING


def number(value):
    if not present(value):
        return None
    try:
        result = float(str(value).strip())
        return result if math.isfinite(result) else None
    except (ValueError, TypeError):
        return None


def period(year):
    return next(label for start, end, label in PERIODS if start <= int(year) <= end)


def classify_core(sites):
    sites = {str(s).strip() for s in sites if present(s)}
    sites = {'Oral cavity' if s == 'Mouth' else s for s in sites}
    if sites & {'Rectal', 'Gastrointestinal tract'}:
        return 'Core-reference measurement'
    if sites & {'Tympanic canal', 'Oral cavity', 'Axilla'}:
        return 'Tympanic / oral / axillary estimate'
    return 'Other peripheral measurement' if sites else 'Site unspecified'


def sex_group(row):
    male, female = number(row.get('pop-male-no')), number(row.get('pop-fem-no'))
    if male is None or female is None:
        return 'Composition unspecified'
    if male > 0 and female == 0:
        return 'Male only'
    if female > 0 and male == 0:
        return 'Female only'
    if male > 0 and female > 0:
        return 'Mixed sex'
    return 'Composition unspecified'


def build_views(df):
    experiments = df.drop_duplicates('id').to_dict('records')
    rows_by_id = {str(ident): group.to_dict('records') for ident, group in df.groupby('id', sort=False)}
    by_id = {str(row['id']): row for row in experiments}
    all_ids = list(by_id)
    signals = {ident: sorted({str(row['physio-parameter']).strip() for row in rows
                             if present(row.get('physio-parameter'))})
               for ident, rows in rows_by_id.items()}

    bundles = {}
    for ident, values in signals.items():
        bundles.setdefault(tuple(values), []).append(ident)
    exact = [{'signals': list(key), 'count': len(ids), 'ids': ids} for key, ids in bundles.items()]
    exact.sort(key=lambda item: (-item['count'], item['signals']))

    core_ids = [ident for ident in all_ids if 'Core/Body temperature' in signals[ident]]
    classes = ['Core-reference measurement', 'Tympanic / oral / axillary estimate', 'Other peripheral measurement']
    core = {'n': len(core_ids), 'classes': [], 'by_period': [], 'sites': [], 'site_by_period': [],
            'periods': [p[2] for p in PERIODS], 'period_n': {p[2]: 0 for p in PERIODS}}
    class_ids, site_ids = {}, {}
    for ident in core_ids:
        rows = [r for r in rows_by_id[ident] if r['physio-parameter'] == 'Core/Body temperature']
        category = classify_core(r.get('physio-body-site') for r in rows)
        class_ids.setdefault(category, []).append(ident)
        core['period_n'][period(by_id[ident]['pub-year'])] += 1
        sites = {'Oral cavity' if str(r.get('physio-body-site')).strip() == 'Mouth' else str(r.get('physio-body-site')).strip()
                 for r in rows if present(r.get('physio-body-site'))}
        for site in sites:
            site_ids.setdefault(site, []).append(ident)
    if 'Site unspecified' in class_ids:
        classes.append('Site unspecified')
    for category in classes:
        ids = class_ids.get(category, [])
        core['classes'].append({'label': category, 'count': len(ids), 'ids': ids})
        for p in core['periods']:
            core['by_period'].append({'label': category, 'period': p,
                                      'count': sum(period(by_id[i]['pub-year']) == p for i in ids)})
    for site, ids in sorted(site_ids.items(), key=lambda x: (-len(x[1]), x[0])):
        core['sites'].append({'label': site, 'count': len(ids), 'ids': ids})
        for p in core['periods']:
            core['site_by_period'].append({'label': site, 'period': p,
                                           'count': sum(period(by_id[i]['pub-year']) == p for i in ids)})

    sex_fields = [
        ('single-sex', 'Single-sex sample reported', 'Sample composition', None),
        ('select-sex', 'Sex-based recruitment criterion', 'Eligibility', 'select-sex'),
        ('select-contraceptive-type', 'Contraceptive-method criterion', 'Eligibility', 'select-contraceptive-type'),
        ('select-pregnancy', 'Pregnancy / breastfeeding criterion', 'Eligibility', 'select-pregnancy'),
        ('select-hormone-therapy', 'Hormone-therapy criterion', 'Eligibility', 'select-hormone-therapy'),
        ('select-menopause', 'Menopausal-status criterion', 'Eligibility', 'select-menopause'),
        ('part-meta-mens-timing', 'Menstrual-timing metadata', 'Participant metadata', 'part-meta-mens-timing'),
        ('part-meta-contraceptive-type', 'Contraceptive-method metadata', 'Participant metadata', 'part-meta-contraceptive-type'),
        ('protocol-mens-timing', 'Menstrual-timing protocol control', 'Protocol', 'protocol-mens-timing'),
    ]
    sex_records = []
    for row in experiments:
        group = sex_group(row)
        flags = {key: (group in ('Male only', 'Female only') if column is None else str(row.get(column)).strip() == 'Y')
                 for key, _, _, column in sex_fields}
        sex_records.append({'id': str(row['id']), 'group': group, 'flags': flags})

    env_columns = [('env-tdb', 'Air temperature measured'), ('env-rh', 'Relative humidity measured'),
                   ('env-v', 'Air velocity measured'), ('env-tg', 'Globe temperature measured')]
    joint_env = []
    for row in experiments:
        flags = {col: present(row.get(col)) or str(row.get(col)).strip() == 'MNR' for col, _ in env_columns}
        flags['all-heights'] = all(present(row.get(col)) and re.search(r'\d', str(row.get(col))) is not None
                                   for col, _ in env_columns)
        joint_env.append({'id': str(row['id']), 'flags': flags})
    joint_presets = [{'key': 'environment', 'label': 'Environmental context', 'n': len(all_ids),
                      'fields': [{'key': c, 'label': label} for c, label in env_columns] +
                                [{'key': 'all-heights', 'label': 'Numeric heights for all four variables'}],
                      'defaults': [c for c, _ in env_columns], 'records': joint_env}]
    for signal, key in [('Skin temperature', 'skin'), ('Heart/Pulse rate', 'heart')]:
        records = []
        for ident, values in signals.items():
            if signal not in values:
                continue
            rows = [r for r in rows_by_id[ident] if r['physio-parameter'] == signal]
            flags = {field: all(present(r.get(column)) for r in rows) for field, column in
                     [('method', 'physio-sensing-method'), ('site', 'physio-body-site'),
                      ('brand', 'physio-sensor-brand'), ('model', 'physio-sensor-model')]}
            flags['activity'] = str(by_id[ident].get('protocol-defined-activity')).strip() == 'Y'
            records.append({'id': ident, 'flags': flags})
        joint_presets.append({'key': key, 'label': signal, 'n': len(records), 'defaults': ['method', 'site'],
                              'fields': [{'key': k, 'label': label} for k, label in
                                         [('method', 'Method coded for every measurement row'),
                                          ('site', 'Body site coded for every measurement row'),
                                          ('brand', 'Brand coded for every measurement row'),
                                          ('model', 'Model coded for every measurement row'),
                                          ('activity', 'Defined activity protocol reported')]], 'records': records})

    settings = ['Lab', 'Field', 'Living Lab', 'Mixed', 'Setting unspecified']
    setting_ids = {label: [] for label in settings}
    for row in experiments:
        setting = str(row.get('exp-type')).strip().replace('Living lab', 'Living Lab')
        setting_ids[setting if setting in settings else 'Setting unspecified'].append(str(row['id']))
    signal_counts = Counter(s for values in signals.values() for s in values)
    setting_rows = []
    for signal, count in sorted(signal_counts.items(), key=lambda x: (-x[1], x[0])):
        cells = []
        for setting in settings:
            ids = [i for i in setting_ids[setting] if signal in signals[i]]
            cells.append({'setting': setting, 'count': len(ids), 'ids': ids})
        setting_rows.append({'label': signal, 'count': count, 'cells': cells})

    return {'n': len(all_ids), 'core': core, 'signal_bundles': exact,
            'battery_sizes': [{'size': size, 'count': count} for size, count in sorted(Counter(map(len, signals.values())).items())],
            'sex_context': {'fields': [{'key': key, 'label': label, 'domain': domain}
                                       for key, label, domain, _ in sex_fields], 'records': sex_records},
            'joint_reporting': joint_presets,
            'signal_setting': {'settings': [{'label': label, 'n': len(ids)} for label, ids in setting_ids.items()],
                               'rows': setting_rows}}


def write_views(df, output_directory):
    views = build_views(df)
    with open(output_directory / 'combination_views.json', 'w', encoding='utf-8') as stream:
        json.dump(views, stream, indent=2, ensure_ascii=False)
    print('combination_views.json: experiment-level sets and conditional counts written')
