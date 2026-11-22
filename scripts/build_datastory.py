"""Generate the landing story's chart inputs from the Atlas build."""
from collections import Counter, defaultdict
from hashlib import sha256
import json
from math import asin, cos, radians, sin, sqrt
from pathlib import Path
from urllib.parse import urlsplit

import numpy as np

CLIMATE_GROUPS = [
    'Humid subtropical', 'Continental', 'Cold semi-arid', 'Oceanic',
    'Mediterranean', 'Tropical', 'Subarctic', 'Hot arid', 'Other / mixed', 'Unclassified',
]
CLIMATE_LABELS = {
    'Semi-arid (cold)': 'Cold semi-arid', 'Arid (hot)': 'Hot arid',
    'Other/Mixed': 'Other / mixed', None: 'Unclassified',
}
CRITERIA = {
    'select-healthy': 'Generally healthy',
    'select-thermal-history': 'Thermal history',
    'select-no-ongoing-treatment-medication-use': 'Medication / treatment',
    'select-healthy-cv-bp-disease': 'Cardiovascular / blood-pressure disease',
    'select-smoking': 'Smoking status',
}
REPORTING = {
    'part-meta-sex': 'Sex', 'part-meta-age': 'Age', 'part-meta-bmi': 'BMI',
    'part-meta-weight': 'Weight', 'part-meta-height': 'Height',
    'part-meta-health-status': 'General health', 'part-meta-education-profession': 'Education / profession',
    'part-meta-thermal-history-background': 'Thermal history',
    'part-meta-chronotype': 'Chronotype', 'part-meta-reg-sleep-time': 'Sleep timing',
    'part-meta-bmr-rmr': 'Basal/resting metabolic rate', 'part-meta-reg-work time': 'Work time',
    'part-recent-chrono-change': 'Recent chronotype shifts', 'part-meta-ponderal-index': 'Ponderal index',
}
SIGNALS = {
    'Skin temperature': 'Skin temperature', 'Heart/Pulse rate': 'Heart/pulse rate',
    'Core/Body temperature': 'Core/body temperature',
}
CASE_FIELDS = [
    'exp-type', 'exp-tested-target-temps', 'exp-session-length', 'exp-normalisation-length',
    'protocol-defined-activity', 'protocol-fixed-clo', 'pub-doi',
]


def project_site(lon, lat):
    # Equal Earth, at the scale and translation of the story's static basemap.
    theta = asin(sqrt(3) / 2 * sin(radians(lat)))
    a1, a2, a3, a4 = 1.340264, -0.081106, 0.000893, 0.003796
    x = 2 * sqrt(3) * radians(lon) * cos(theta) / (3 * (a1 + 3*a2*theta**2 + 7*a3*theta**6 + 9*a4*theta**8))
    y = theta * (a1 + a2*theta**2 + a3*theta**6 + a4*theta**8)
    return round(410 + 150*x, 5), round(210 - 150*y, 5)


def summary(values):
    if not values:
        return {'count': 0, 'q1': None, 'median': None, 'q3': None}
    q1, median, q3 = np.quantile(values, [.25, .5, .75]).tolist()
    return {'count': len(values), 'q1': q1, 'median': median, 'q3': q3}


def public_web_url(value):
    if isinstance(value, str) and value.startswith(('https://', 'http://')) and urlsplit(value).hostname:
        return value
    return None


def write_datastory(source, output, studies, city_rows, physiology, clean_num, is_missing):
    def load(name):
        return json.loads((output / f'{name}.json').read_text(encoding='utf-8'))

    ids = studies['id'].tolist()
    total = len(ids)
    ages_and_bmi = {
        metric: [[r['id'], r['mean'], r['std']] for r in load(file)['studies']]
        for metric, file in [('age', 'fig08_age'), ('bmi', 'fig09_bmi')]
    }
    means = {metric: {r[0]: r[1] for r in rows} for metric, rows in ages_and_bmi.items()}
    signals = {
        signal: set(physiology.loc[physiology['signal'] == signal, 'id'])
        for signal in SIGNALS
    }

    def membership(field, label, member_ids):
        return {'field': field, 'label': label, 'count': len(member_ids), 'experimentIds': member_ids}

    def field_membership(fields):
        return [
            membership(field, label, studies.loc[~studies[field].map(is_missing), 'id'].tolist())
            for field, label in fields.items()
        ]

    criteria = field_membership(CRITERIA)
    reporting = field_membership(REPORTING)
    prevalence = [membership(key, label, [i for i in ids if i in signals[key]]) for key, label in SIGNALS.items()]

    context, cases, experiments, ranges = {}, {}, [], []
    countries = defaultdict(lambda: {'count': 0, 'samples': 0})
    for row in studies.to_dict('records'):
        experiment = row['id']
        size = clean_num(row['pop-no-tot'])
        group = CLIMATE_LABELS.get(row['climate_group'], row['climate_group'])
        zone = CLIMATE_GROUPS.index(group if group in CLIMATE_GROUPS else 'Other / mixed')
        country = row['id-country']
        country = {'Great Britain': 'UK', 'Republic of Korea': 'South Korea'}.get(country, country)
        if not is_missing(country):
            countries[country]['count'] += 1
            countries[country]['samples'] += size or 0
        setting = str(row['exp-type']).strip()
        context[experiment] = {
            'setting': 'Living Lab' if setting.lower() == 'living lab' else setting,
            'typology': row['exp-spatial-typology'], 'country': country,
        }
        if experiment in {'1210_1', '1232_1', '1003_1'}:
            cases[experiment] = {key: row[key] for key in CASE_FIELDS}
        experiments.append([experiment, int(row['pub-year']), size, zone,
                            means['age'].get(experiment), means['bmi'].get(experiment),
                            int(experiment in signals['Skin temperature'])])
        low, high = (clean_num(row[f'exp-tested-t-{bound}']) for bound in ('min', 'max'))
        if low is not None and high is not None and low <= high:
            ranges.append({'id': experiment, 'low': low, 'high': high})

    grouped = defaultdict(set)
    for row in city_rows:
        key = (row['city'], row['country'], row['precision'], row['lat'], row['lon'])
        grouped[key].add(row['id'])
    sizes = {r[0]: r[2] for r in experiments}
    sites, mapped = [], set()
    for (city, country, precision, lat, lon), members in sorted(grouped.items(), key=lambda item: str(item[0])):
        x, y = project_site(lon, lat)
        sites.append({'city': city, 'country': country, 'precision': precision, 'lat': lat,
                      'lon': lon, 'x': x, 'y': y, 'ids': sorted(members),
                      'sampleSum': sum(sizes[i] or 0 for i in members)})
        mapped.update(members)

    access_data = load('open_data')
    audit = json.loads(Path(__file__).with_name('datastory_access_audit.json').read_text(encoding='utf-8'))
    links = {r['id']: r for r in access_data['studies_with_link']}
    access_records = []
    for row in studies.loc[studies['data-avail'] == 'Available'].to_dict('records'):
        experiment = row['id']
        link = links.get(experiment, {})
        reported_url = public_web_url(link.get('link'))
        annotation = audit['records'].get(experiment, {})
        # A changed URL needs a fresh manual check. Never inherit verification by ID alone.
        record = {'id': experiment, 'publicationDoi': public_web_url(row['pub-doi']),
                  'title': row['id-title'], 'label': link.get('resource_type', 'Publication'),
                  'url': None, 'reportedUrl': reported_url}
        if reported_url and reported_url == annotation.get('codedLink'):
            record.update({k: v for k, v in annotation.items() if k != 'codedLink'})
        access_records.append(record)

    sankey = load('physio_signal_sensor')
    years = Counter(r[1] for r in experiments)
    settings = Counter(r['setting'] for r in context.values())
    types = Counter(r['typology'] for r in context.values())
    climate = [r for r in experiments if r[3] == 0]
    sample_sizes = [r[2] for r in experiments if r[2] is not None]
    stats = {
        'total': total, 'years': dict(years), 'sample': summary(sample_sizes),
        'sampleSum': sum(sample_sizes), 'countries': len(countries),
        'cities': len({r['city'] for r in sites if r['precision'] in {'city', 'multi'}}),
        'mapped': len(mapped), 'china': countries.get('China', {}).get('count', 0),
        'climateGroups': len({r[3] for r in experiments if r[3] < 8}),
        'humid': len(climate), 'humidSampleSum': sum(r[2] or 0 for r in climate),
        'age': summary([r[1] for r in ages_and_bmi['age']]),
        'bmi': summary([r[1] for r in ages_and_bmi['bmi']]),
        'settings': dict(settings), 'types': {k: v for k, v in types.items() if k is not None},
        'bothDescriptors': sum(r['setting'] in {'Lab', 'Living Lab', 'Field', 'Mixed'}
                               and r['typology'] in {'Office/Workstations', 'Desk&Chair', 'Seating',
                                                    'Classroom/Study room', 'Residential', 'Free-living'}
                               for r in context.values()),
        'officeLab': sum(r['setting'] == 'Lab' and r['typology'] == 'Office/Workstations' for r in context.values()),
        'low': summary([r['low'] for r in ranges]), 'high': summary([r['high'] for r in ranges]),
    }
    globals_to_write = {
        'atlasStory': {'groups': CLIMATE_GROUPS, 'experiments': experiments, 'context': context, 'caseContext': cases},
        'atlasGeography': {'sites': sites, 'countryCounts': dict(countries), 'unmappedIds': sorted(set(ids) - mapped)},
        'atlasAudit': {'criteria': criteria, 'access': {'records': access_records}, 'auditDate': audit['checkedOn']},
        'atlasNarrative': {'sourceSha256': sha256(source.read_bytes()).hexdigest(), 'temperatureRanges': ranges,
                           'temperatureSummary': {'missing': total - len(ranges)}, 'prevalence': prevalence,
                           'reporting': reporting},
        'atlasParticipantIntervals': ages_and_bmi,
        'atlasSankeyData': {key: sankey[key] for key in ('overall', 'signal_totals', 'signal_instance_totals', 'signal_method_brand')},
        'atlasStoryStats': stats,
    }
    destination = output.parent / 'datastory' / 'corpus.generated.js'
    with destination.open('w', encoding='utf-8') as stream:
        stream.write('// Generated by scripts/build_data.py from the Atlas corpus.\n')
        for name, value in globals_to_write.items():
            stream.write(f'window.{name} = {json.dumps(value, separators=(",", ":"), allow_nan=False)};\n')
