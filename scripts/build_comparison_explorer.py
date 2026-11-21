"""Coded categories and linked measurement rows for the two-variable explorer."""
import json
import math

if __package__:
    from .publication_periods import publication_period, publication_periods
else:
    from publication_periods import publication_period, publication_periods

CODE_LABELS = {'': 'Not reported', 'NR': 'Not reported', 'NONE': 'Not reported',
               'MNR': 'Measured, detail not reported', 'NC': 'Unclear', 'NAN': 'Not applicable'}
NO_ITEMS = 'No listed item reported'
MEASUREMENT_FIELDS = {'signals': 'physio-parameter', 'methods': 'physio-sensing-method',
                      'sites': 'physio-body-site', 'brands': 'physio-sensor-brand'}
ENVIRONMENT = {
    'env-tdb': 'Air temperature', 'env-rh': 'Relative humidity', 'env-v': 'Air velocity',
    'env-tg': 'Globe temperature', 'env-tsurface': 'Surface temperature',
    'env-twb': 'Wet-bulb temperature', 'env-co2': 'CO₂ concentration',
    'env-illuminance': 'Illuminance', 'env-sound-level': 'Sound level',
    'env-tout': 'Outdoor temperature', 'env-rhout': 'Outdoor relative humidity',
    'env-voc': 'VOCs', 'env-light-color': 'Light colour', 'env-solar-rad': 'Solar radiation',
}
DOMAINS = {'exp-domain-thermal': 'Thermal', 'exp-domain-air-move': 'Air movement',
           'exp-domain-humidity': 'Humidity', 'exp-domain-co2': 'CO₂',
           'exp-domain-light': 'Light', 'exp-domain-acoustics': 'Acoustics',
           'exp-domain-behaviour': 'Behaviour', 'exp-domain-iaq': 'Indoor air quality'}


def text(value):
    if value is None or isinstance(value, float) and not math.isfinite(value):
        return ''
    return str(value).strip()


def category(value):
    value = text(value)
    return CODE_LABELS.get(value.upper(), value)


def measured(value):
    """MNR explicitly establishes measurement; NC does not establish a usable entry."""
    value = text(value)
    return bool(value) and value.upper() not in {'NR', 'NAN', 'NC', 'NONE'}


def composition(row):
    try:
        male, female = float(row.get('pop-male-no', '')), float(row.get('pop-fem-no', ''))
        if not all(math.isfinite(v) and v >= 0 for v in (male, female)):
            return 'Composition unspecified'
        if male > 0 and female == 0:
            return 'Male only'
        if female > 0 and male == 0:
            return 'Female only'
        if male > 0 and female > 0:
            return 'Mixed sex'
    except (TypeError, ValueError):
        pass
    return 'Composition unspecified'


def build_explorer(df, pretty_names=None):
    pretty_names = pretty_names or {}
    dimensions = [
        ('signals', 'Signals', 'Measurements', 'measurement', 'Distinct coded physiological signals.'),
        ('methods', 'Sensing methods', 'Measurements', 'measurement', 'Sensing methods on the coded physiological measurement rows.'),
        ('sites', 'Body sites', 'Measurements', 'measurement', 'Recorded anatomical sites; distinct coded labels are retained.'),
        ('brands', 'Device brands', 'Measurements', 'measurement', 'Recorded brand labels, including missing-code categories.'),
        ('setting', 'Experimental setting', 'Experiment', 'experiment', 'One recorded setting per experiment; mixed settings remain separate.'),
        ('typology', 'Spatial typology', 'Experiment', 'experiment', 'The recorded room or activity-space typology.'),
        ('domains', 'Manipulated domains', 'Experiment', 'experiment', 'Domains explicitly coded as manipulated; an experiment can have several.'),
        ('environment', 'Environmental measurements', 'Experiment', 'experiment', 'Variables coded as measured, including MNR entries with unspecified placement details.'),
        ('questionnaires', 'Questionnaires', 'Experiment', 'experiment', 'Questionnaire types with substantive scale entries or an explicit MNR code; unclear entries are excluded.'),
        ('protocol', 'Protocol controls', 'Experiment', 'experiment', 'Protocol fields explicitly flagged Y; reporting does not establish adherence.'),
        ('metadata', 'Participant metadata', 'Participants', 'experiment', 'Participant characteristics explicitly flagged as documented.'),
        ('eligibility', 'Recruitment criteria', 'Participants', 'experiment', 'Eligibility fields explicitly flagged Y; the direction of a criterion requires checking the source.'),
        ('sex', 'Sex composition', 'Participants', 'experiment', 'Composition from usable numeric male/female counts; unresolved counts remain separate.'),
        ('period', 'Publication period', 'Publication and location', 'experiment', 'Two-year periods based on publication year, not experiment dates.'),
        ('country', 'Country', 'Publication and location', 'experiment', 'Country labels as recorded; map-specific geographic harmonisation is not applied.'),
        ('climate', 'Host climate', 'Publication and location', 'experiment', 'Recorded Köppen classifications, retaining multiple classifications as written.'),
        ('availability', 'Data availability', 'Publication and location', 'experiment', 'Coded data-availability status; a statement does not establish usable data access.'),
    ]
    dimensions = [dict(zip(('key', 'label', 'group', 'kind', 'description'), row)) for row in dimensions]
    next(d for d in dimensions if d['key'] == 'setting')['order'] = ['Lab', 'Field', 'Living Lab', 'Mixed', 'Not reported']
    next(d for d in dimensions if d['key'] == 'period')['order'] = publication_periods(df.get('pub-year', []))

    def name(column, prefix):
        return pretty_names.get(column, column.removeprefix(prefix).replace('-', ' ').capitalize())

    flag_fields = {key: [c for c in df.columns if c.startswith(prefix)] for key, prefix in
                   [('protocol', 'protocol-'), ('metadata', 'part-meta-'), ('eligibility', 'select-')]}
    if 'part-recent-chrono-change' in df.columns:
        flag_fields['metadata'].append('part-recent-chrono-change')
    questionnaires = [c for c in df.columns if c.startswith('ques-')]
    records = []
    for ident, group in df.groupby('id', sort=False):
        row = group.iloc[0].to_dict()
        tuples = {tuple(category(r.get(column)) for column in MEASUREMENT_FIELDS.values())
                  for r in group.to_dict('records')}
        measurements = [dict(zip(MEASUREMENT_FIELDS, values)) for values in sorted(tuples)]
        values = {key: sorted({m[key] for m in measurements}) for key in MEASUREMENT_FIELDS}
        setting = category(row.get('exp-type'))
        if setting.lower() == 'living lab':
            setting = 'Living Lab'
        values.update({
            'setting': [setting], 'typology': [category(row.get('exp-spatial-typology'))],
            'domains': [label for column, label in DOMAINS.items() if text(row.get(column)) in {'1', '1.0', 'Y'}],
            'environment': [label for column, label in ENVIRONMENT.items() if measured(row.get(column))],
            'questionnaires': [name(c, 'ques-') for c in questionnaires if measured(row.get(c))],
            'sex': [composition(row)], 'period': [publication_period(row.get('pub-year')) or 'Not reported'],
            'country': [category(row.get('id-country'))], 'climate': [category(row.get('id-climate-class'))],
            'availability': [category(row.get('data-avail'))],
        })
        for key, prefix in [('protocol', 'protocol-'), ('metadata', 'part-meta-'), ('eligibility', 'select-')]:
            values[key] = [name(c, prefix) for c in flag_fields[key] if text(row.get(c)).upper() == 'Y']
        values = {key: sorted(set(items)) if items else [NO_ITEMS] for key, items in values.items()}
        records.append({'id': str(ident), 'values': values, 'measurements': measurements})
    return {'n': len(records), 'dimensions': dimensions, 'records': records}


def write_explorer(df, output_directory, pretty_names):
    result = build_explorer(df, pretty_names)
    with open(output_directory / 'comparison_explorer.json', 'w', encoding='utf-8') as stream:
        json.dump(result, stream, indent=2, ensure_ascii=False)
    print(f"comparison_explorer.json: {result['n']} experiments, {len(result['dimensions'])} dimensions")
