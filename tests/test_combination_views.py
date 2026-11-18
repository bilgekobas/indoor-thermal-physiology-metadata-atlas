"""Checks for experiment-level units, anatomical hierarchy and eligibility flags."""
import importlib.util
from pathlib import Path
import unittest

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location('views', ROOT / 'scripts/build_combination_views.py')
views = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(views)


class InterpretationTests(unittest.TestCase):
    def test_core_reference_takes_priority_over_estimate(self):
        self.assertEqual(views.classify_core(['Rectal', 'Tympanic canal']), 'Core-reference measurement')
        self.assertEqual(views.classify_core(['Mouth', 'Forehead']), 'Tympanic / oral / axillary estimate')
        self.assertEqual(views.classify_core(['Abdomen']), 'Other peripheral measurement')
        self.assertEqual(views.classify_core(['NR', None]), 'Site unspecified')

    def test_sex_composition_requires_resolved_counts(self):
        self.assertEqual(views.sex_group({'pop-male-no': '12', 'pop-fem-no': '0'}), 'Male only')
        self.assertEqual(views.sex_group({'pop-male-no': '0', 'pop-fem-no': '12'}), 'Female only')
        self.assertEqual(views.sex_group({'pop-male-no': 'NR', 'pop-fem-no': 'NR'}), 'Composition unspecified')

    def test_repeated_measurement_rows_do_not_inflate_batteries(self):
        rows = [dict(id='a', **{'pub-year': '2024', 'physio-parameter': 'Skin temperature', 'physio-body-site': site})
                for site in ['Chest', 'Forehead', 'Chest']]
        rows.append(dict(id='b', **{'pub-year': '2024', 'physio-parameter': 'Biomarkers: Estradiol',
                                   'select-contraceptive-type': 'Y'}))
        result = views.build_views(pd.DataFrame(rows).where(pd.notnull(pd.DataFrame(rows)), None))
        self.assertEqual(result['battery_sizes'], [{'size': 1, 'count': 2}])
        self.assertEqual(sum(r['count'] for r in result['signal_bundles']), 2)
        records = {r['id']: r for r in result['sex_context']['records']}
        self.assertFalse(any(records['a']['flags'].values()))
        self.assertTrue(records['b']['flags']['select-contraceptive-type'])
        self.assertEqual(records['b']['group'], 'Composition unspecified')

    def test_hormone_assay_does_not_imply_eligibility_criterion(self):
        rows = pd.DataFrame([{'id': 'a', 'pub-year': 2024, 'physio-parameter': 'Biomarkers: Testosterone'}])
        record = views.build_views(rows)['sex_context']['records'][0]
        self.assertFalse(any(record['flags'].values()))


class CurrentCorpusTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.df = pd.read_csv(ROOT / 'public/data/corpus_main_dataset.csv', encoding='utf-8-sig', dtype=str, keep_default_na=False)
        cls.result = views.build_views(cls.df)

    def test_exhaustive_exclusive_partitions(self):
        n = self.df.id.nunique()
        self.assertEqual(sum(r['count'] for r in self.result['signal_bundles']), n)
        self.assertEqual(sum(r['count'] for r in self.result['battery_sizes']), n)
        self.assertEqual(sum(r['n'] for r in self.result['signal_setting']['settings']), n)
        core = self.result['core']
        self.assertEqual(sum(r['count'] for r in core['classes']), core['n'])
        self.assertEqual(sum(core['period_n'].values()), core['n'])
        for row in self.result['signal_setting']['rows']:
            self.assertEqual(sum(c['count'] for c in row['cells']), row['count'])
            for cell in row['cells']:
                self.assertEqual(cell['count'], len(set(cell['ids'])))

    def test_established_corpus_counts(self):
        self.assertEqual({r['label']: r['count'] for r in self.result['core']['classes']}, {
            'Core-reference measurement': 15, 'Tympanic / oral / axillary estimate': 29,
            'Other peripheral measurement': 4})
        env = self.result['joint_reporting'][0]
        measured = [r for r in env['records'] if all(r['flags'][k] for k in env['defaults'])]
        self.assertEqual(len(measured), 130)
        self.assertEqual(sum(r['flags']['all-heights'] for r in measured), 69)
        records = self.result['sex_context']['records']
        self.assertEqual(sum(r['flags']['single-sex'] for r in records), 43)
        self.assertEqual(sum(r['flags']['select-sex'] for r in records), 31)
        self.assertEqual(sum(r['flags']['protocol-mens-timing'] for r in records), 22)


if __name__ == '__main__':
    unittest.main()
