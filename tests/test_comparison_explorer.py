"""Check explorer extraction units and the distinction between reporting and absence."""
from pathlib import Path
import unittest

import pandas as pd

from scripts import build_comparison_explorer as explorer

ROOT = Path(__file__).resolve().parents[1]


class ExplorerExtractionTests(unittest.TestCase):
    def test_period_order_tracks_observed_years_and_preserves_missing_years(self):
        df = pd.DataFrame([{'id': str(year), 'pub-year': year} for year in (2024, 2025, None)])
        result = explorer.build_explorer(df)
        periods = next(d for d in result['dimensions'] if d['key'] == 'period')
        self.assertEqual(periods['order'], ['2023–24', '2025–26'])
        self.assertEqual([row['values']['period'][0] for row in result['records']],
                         ['2023–24', '2025–26', 'Not reported'])

    def test_measurement_rows_keep_associations_and_remove_repetitions(self):
        skin = {'id': 'a', 'physio-parameter': 'Skin temperature', 'physio-sensing-method': 'Thermocouple',
                'physio-body-site': 'Chest', 'physio-sensor-brand': 'NR'}
        core = {'id': 'a', 'physio-parameter': 'Core/Body temperature', 'physio-sensing-method': 'Ingestible pill',
                'physio-body-site': 'Gastrointestinal tract', 'physio-sensor-brand': 'NAN'}
        record = explorer.build_explorer(pd.DataFrame([skin, skin, core]))['records'][0]
        self.assertEqual(len(record['measurements']), 2)
        self.assertEqual(record['values']['signals'], ['Core/Body temperature', 'Skin temperature'])
        self.assertEqual(record['values']['brands'], ['Not applicable', 'Not reported'])
        self.assertTrue(any(m['signals'] == 'Skin temperature' and m['methods'] == 'Thermocouple'
                            for m in record['measurements']))

    def test_measured_but_unspecified_does_not_become_complete_or_a_control(self):
        row = {'id': 'a', 'env-tdb': 'MNR', 'env-rh': 'NC', 'ques-thermal-sensation': 'MNR',
               'ques-thermal-comfort': 'NC', 'protocol-mens-timing': 'MNR', 'select-sex': 'Y',
               'part-meta-mens-timing': 'NR'}
        values = explorer.build_explorer(pd.DataFrame([row]))['records'][0]['values']
        self.assertEqual(values['environment'], ['Air temperature'])
        self.assertEqual(values['questionnaires'], ['Thermal sensation'])
        self.assertEqual(values['protocol'], ['No listed item reported'])
        self.assertEqual(values['metadata'], ['No listed item reported'])
        self.assertEqual(values['eligibility'], ['Sex'])
        self.assertEqual(values['sex'], ['Composition unspecified'])

    def test_corpus_counts_and_complete_dimension_coverage(self):
        df = pd.read_csv(ROOT / 'public/data/corpus_main_dataset.csv', dtype=str, keep_default_na=False)
        result = explorer.build_explorer(df)
        self.assertEqual(result['n'], 295)
        self.assertEqual(len({r['id'] for r in result['records']}), 295)
        for record in result['records']:
            for dimension in result['dimensions']:
                self.assertTrue(record['values'][dimension['key']])
        for signal, n in [('Skin temperature', 239), ('Heart/Pulse rate', 148), ('Core/Body temperature', 48)]:
            self.assertEqual(sum(signal in r['values']['signals'] for r in result['records']), n)
        self.assertEqual(sum(r['values']['setting'] == ['Lab'] for r in result['records']), 216)


if __name__ == '__main__':
    unittest.main()
