"""
Regenerates public/author-network.html from the corpus's own
id-authors / id-institutes / id-country columns.

Run this manually after scripts/build_data.py whenever the corpus changes.
It is intentionally a SEPARATE script, not wired into build_data.py's
run, because:
  - it's a full static HTML+embedded-JSON artifact (~200KB), not a small
    aggregate JSON, and doesn't need to be regenerated on every tweak to
    other figures;
  - author-name deduplication is a semi-manual judgment call (see
    NAME_ALIASES below), not a fully automatic transform, so it deserves
    a deliberate "yes, regenerate now" step rather than happening silently
    as a side effect of an unrelated pipeline run.

APPROACH: author identity is resolved directly from the raw `id-authors`
comma-separated name string as it appears in the corpus for each
PUBLICATION (id-pub-id) -- NOT via a live Crossref API lookup. Co-authorship
is a paper-level property, so publications are the unit here, not the
study/experiment rows used elsewhere in the pipeline (one paper can spawn
several experiment rows with the same author list).

KNOWN LIMITATIONS (read before trusting the "country" field for anything
beyond the tooltip):
  - Distinct spellings of the same person (e.g. "David P Wyon" vs
    "David P. Wyon") do NOT automatically merge into one node. Add any you
    spot to NAME_ALIASES below.
  - `id-country` is a single value per STUDY, but a paper can have authors
    from different countries (see id-institutes, which lists one institute
    per author, comma-separated, parallel to id-authors). Building a
    reliable institute -> country lookup for ~700 distinct institutions is
    a separate, much larger undertaking. As a pragmatic simplification,
    every author on a given paper is assigned that paper's single
    `id-country` value. This only affects the display-only country field
    (used for the tooltip and the tour-guide colour-by-country note in the
    caption, NOT for clustering or edges, which are purely name-based) --
    but it will be wrong for the non-corresponding-author's country on
    genuinely multi-country collaborations. Fixing this properly would mean
    building an institute-name -> country dictionary; flag to Bilge if
    country accuracy on multi-country papers starts to matter for a
    specific analysis.
"""
import json
import re
from pathlib import Path
import pandas as pd
import numpy as np

CORPUS = Path(__file__).resolve().parents[1] / 'public' / 'data' / 'corpus_main_dataset.csv'
TEMPLATE = Path(__file__).resolve().parents[1] / 'public' / 'author-network.html'
CODES = {'NR', 'NC', 'MNR', 'NAN', 'Y', 'N'}

# Known same-person spelling variants seen in the corpus so far. Add to this
# as new duplicates are spotted -- there is no reliable automatic way to
# detect these from name strings alone (e.g. "David P Wyon" vs
# "David P. Wyon" differ only by punctuation the corpus doesn't use
# consistently).
NAME_ALIASES = {
    # 'David P Wyon': 'David P. Wyon',
}


def blank(v):
    return v is None or str(v).strip().upper() in CODES or str(v).strip() == ''


def split_names(s):
    return [n.strip() for n in str(s).split(',') if n.strip()]


def main():
    df = pd.read_csv(CORPUS, encoding='utf-8-sig', low_memory=False)
    df = df.replace({np.nan: None})
    pubs = df.drop_duplicates(subset=['id-pub-id'])

    node_studies = {}   # canonical name -> set of pub-ids
    node_country = {}   # canonical name -> country of first pub seen
    edge_counts = {}    # frozenset({a, b}) -> shared pub count

    n_total = len(pubs)
    n_unresolved = 0

    for _, row in pubs.iterrows():
        pub_id = row['id-pub-id']
        if blank(row['id-authors']):
            n_unresolved += 1
            continue
        raw_names = split_names(row['id-authors'])
        country = row['id-country'] if not blank(row['id-country']) else 'NR'
        canon_names = [NAME_ALIASES.get(n, n) for n in raw_names]
        # de-dup within one paper (shouldn't normally happen, but avoid
        # self-edges / double-counting if a name is accidentally repeated)
        seen_this_pub = []
        for n in canon_names:
            if n not in seen_this_pub:
                seen_this_pub.append(n)
            node_studies.setdefault(n, set()).add(pub_id)
            if n not in node_country:
                node_country[n] = country
        for i in range(len(seen_this_pub)):
            for j in range(i + 1, len(seen_this_pub)):
                key = frozenset((seen_this_pub[i], seen_this_pub[j]))
                edge_counts[key] = edge_counts.get(key, 0) + 1

    nodes = [
        {'name': name, 'n_studies': len(studies), 'country': node_country[name]}
        for name, studies in sorted(node_studies.items())
    ]
    edges = [
        {'author_a': sorted(pair)[0], 'author_b': sorted(pair)[1], 'shared_studies': count}
        for pair, count in sorted(edge_counts.items(), key=lambda kv: -kv[1])
    ]

    n_resolved = n_total - n_unresolved
    data = {
        'nodes': nodes,
        'edges': edges,
        'n_studies_resolved': n_resolved,
        'n_studies_total': n_total,
        'n_failed_dois': n_unresolved,
    }

    html = TEMPLATE.read_text(encoding='utf-8')

    # Replace the embedded DATA constant (single line, ends in ';' right
    # before 'const W = ...').
    new_data_line = 'const DATA = ' + json.dumps(data, ensure_ascii=False) + ';'
    html, n_sub = re.subn(r'const DATA = \{.*?\};', new_data_line, html, count=1, flags=re.DOTALL)
    if n_sub != 1:
        raise RuntimeError('Could not find the const DATA = {...}; line to replace -- '
                            'has the template structure changed?')

    # Replace the footer caption's resolved/total/failed/author/pair counts.
    caption_re = re.compile(
        r'\d+ of \d+ studies have a resolved author list \(\d+ DOI strings? failed to resolve\)\. '
        r'\d+ distinct authors and \d+ co-authorship pairs are encoded in the file\.'
    )
    new_caption = (
        f'{n_resolved} of {n_total} studies have a resolved author list '
        f'({n_unresolved} DOI string{"s" if n_unresolved != 1 else ""} failed to resolve). '
        f'{len(nodes)} distinct authors and {len(edges)} co-authorship pairs are encoded in the file.'
    )
    html, n_sub2 = caption_re.subn(new_caption, html, count=1)
    if n_sub2 != 1:
        raise RuntimeError('Could not find the footer caption sentence to replace -- '
                            'has the wording changed?')

    TEMPLATE.write_text(html, encoding='utf-8')
    print(f'author-network.html regenerated: {n_resolved} of {n_total} publications resolved '
          f'({n_unresolved} failed), {len(nodes)} authors, {len(edges)} co-authorship pairs.')


if __name__ == '__main__':
    main()
