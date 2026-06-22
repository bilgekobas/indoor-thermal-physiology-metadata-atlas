"""
Canonicalization map for the free-text `cognitive-test-type` field.

The raw field is a comma-separated list, but written inconsistently across
studies: casing varies, the same task is named with or without "test"/"task"
suffixes, and a few entries are full prose descriptions of a battery (with
nested parenthetical sub-components) rather than a single instrument name.

This module provides:
  - split_cognitive_tests(text): a parenthesis-aware splitter (a naive
    comma-split corrupts entries like "d2 test (sustained concentration,
    visual scanning ability, sustained attention)" by breaking mid-parenthesis)
  - CANONICAL_MAP: raw token (lowercased, trailing period stripped) -> canonical instrument name
  - DOMAIN_MAP: canonical instrument name -> cognitive domain category

Tokens not found in CANONICAL_MAP are passed through with title-casing as a
fallback, and flagged separately so they can be reviewed rather than silently
miscategorized.
"""
import re

def split_cognitive_tests(text):
    """Split on commas/semicolons, but not inside parentheses."""
    if text is None:
        return []
    text = str(text).replace('\n', ' ')
    parts, current, depth = [], [], 0
    for ch in text:
        if ch == '(':
            depth += 1
            current.append(ch)
        elif ch == ')':
            depth -= 1
            current.append(ch)
        elif ch in ',;' and depth == 0:
            parts.append(''.join(current).strip())
            current = []
        else:
            current.append(ch)
    if current:
        parts.append(''.join(current).strip())
    return [p for p in parts if p]


# Canonical instrument name for each raw lowercase token (period-stripped).
# Grouping principle: variants of the same named task/instrument collapse to
# one canonical label, regardless of "test"/"task" suffix or minor wording.
CANONICAL_MAP = {
    # Stroop task variants
    'stroop': 'Stroop task', 'stroop test': 'Stroop task', 'stroop tests': 'Stroop task',
    'stroop with feedback': 'Stroop task (with feedback)',
    'a stroop test and visual reaction time': 'Stroop task',
    # N-back
    'n-back': 'N-back task', 'n-back tasks': 'N-back task',
    # Go/no-go
    'go/no-go': 'Go/no-go task', 'go/no-go test': 'Go/no-go task',
    # Digit span family
    'digit span': 'Digit span task', 'digit span test': 'Digit span task',
    'digit span memory': 'Digit span task', 'digital span task': 'Digit span task',
    'forward digit span': 'Digit span task (forward)',
    # Redirection / mental redirection (a specific task name used in Chinese ergonomics literature)
    'redirection': 'Redirection task', 're-direction': 'Redirection task',
    'mental redirection': 'Redirection task',
    # Overlapping (paired with redirection in the same battery)
    'overlapping': 'Overlapping task',
    # Visual learning
    'visual learning': 'Visual learning task', 'visual learning memory': 'Visual learning task',
    # Visual reaction time
    'visual reaction': 'Visual reaction time', 'visual reaction time': 'Visual reaction time',
    'choice reaction': 'Choice reaction time',
    # Visual search
    'visual search': 'Visual search task', 'visual search test': 'Visual search task',
    'digit search': 'Visual search task (digit)', 'letter search': 'Visual search task (letter)',
    # Arithmetic / calculation family
    'addition': 'Mental arithmetic', 'addition task': 'Mental arithmetic',
    'addition with feedback': 'Mental arithmetic (with feedback)',
    'multiplication': 'Mental arithmetic', 'one digit multiplication': 'Mental arithmetic',
    'calculation': 'Mental arithmetic', 'calculations': 'Mental arithmetic',
    'mental arithmetic': 'Mental arithmetic', 'mental arithmetical test': 'Mental arithmetic',
    'arithmetic': 'Mental arithmetic', 'math': 'Mental arithmetic',
    'number addition': 'Mental arithmetic', 'number calculation': 'Mental arithmetic',
    'numerical calculationwith feedback': 'Mental arithmetic (with feedback)',
    'two-digit addition without feedback': 'Mental arithmetic',
    'number calculation (one digit addition & subtraction)': 'Mental arithmetic',
    # Reasoning battery (BPR-5 and generic reasoning subtests)
    'bpr-5': 'BPR-5 reasoning battery', 'bpr5: verbal reasoning': 'BPR-5 reasoning battery',
    'abstract reasoning': 'Reasoning task (abstract)', 'mechanical reasoning': 'Reasoning task (mechanical)',
    'numeric reasoning': 'Reasoning task (numeric)', 'spatial reasoning': 'Reasoning task (spatial)',
    'grammatical reasoning': 'Reasoning task (grammatical)', 'grammatical reasoning task': 'Reasoning task (grammatical)',
    'grammatical/deductive/sequential reasoning': 'Reasoning task (grammatical/deductive/sequential)',
    'spatial rotation task': 'Mental rotation task', 'mental rotation': 'Mental rotation task',
    'spatial working memory': 'Spatial working memory task',
    'operation span task': 'Operation span task',
    # Sustained attention / vigilance
    'vigilance test': 'Vigilance/PVT', 'pvt': 'Vigilance/PVT',
    'cpt': 'Continuous Performance Test (CPT)',
    'oddball task': 'Oddball task',
    # Named standardized instruments
    'cbs': 'Cambridge Brain Sciences (CBS) battery',
    'flanker': 'Flanker task',
    'trailmaking': 'Trail Making Test',
    'hampshire tree task': 'Hampshire Tree Task',
    'tsai-partington': 'Tsai-Partington test', 'tsai-partington test': 'Tsai-Partington test',
    'd2': 'd2 Test of Attention', 'd2 test': 'd2 Test of Attention',
    'paper-based performance tests such as the d2 test': 'd2 Test of Attention',
    'uchida–kraepelin test': 'Uchida-Kraepelin test',
    'corsi blocks and rapid visual information processing (rvip)': 'Corsi Block-Tapping Task + RVIP',
    'alternative uses task (aut)': 'Alternative Uses Task (AUT, creativity)',
    'fast-counting': 'Fast-counting task', 'fast-counting test': 'Fast-counting task',
    'non-feedback stepuru test': 'Stepuru task',
    'typing': 'Typing task', 'typing test': 'Typing task', 'typing with feedback': 'Typing task (with feedback)',
    # Subjective workload / mood / alertness scales (NOT performance tasks —
    # kept in CANONICAL_MAP but tagged with a different domain below)
    'nasa-tlx': 'NASA-TLX', 'nasa task load index (tlx)': 'NASA-TLX',
    'kss': 'Karolinska Sleepiness Scale (KSS)', 'alertness (kss)': 'Karolinska Sleepiness Scale (KSS)',
    'panas': 'PANAS (mood)', 'pms': 'Profile of Mood States (POMS)',
    'pasat': 'PASAT', 'tsst': 'Trier Social Stress Test (TSST)',
    'alertness': 'Self-rated alertness', 'arousal level': 'Self-rated arousal',
    'fatigue': 'Self-rated fatigue', 'degree of fatigue': 'Self-rated fatigue',
    'sleepiness': 'Self-rated sleepiness', 'degree of distraction': 'Self-rated distraction',
    'efficiency': 'Self-rated efficiency', 'learning performance': 'Self-rated learning performance',
    'attention ability': 'Self-rated attention',
    'self estimated work performance': 'Self-rated work performance',
    'self-rated performance': 'Self-rated work performance',
    'work performance': 'Self-rated work performance', 'work willingness': 'Self-rated work willingness',
    'self-assessed work motivation': 'Self-rated work motivation',
    'overall score': 'Composite/overall score (unspecified battery)',
    'perception (visual trace)': 'Visual trace perception task',
    'short term memory (pair recall, word recall)': 'Short-term memory (pair/word recall)',
    'schulte grid': 'Schulte grid test',
    # Compound battery descriptions that could not be safely decomposed further
    # without guessing — kept intact and flagged via DOMAIN_MAP as 'Battery (mixed)'
    'battery of neurobehavioral tests (visual reaction time, a stroop test, re\u2010direction, overlapping, addition, multiplication, visual learning)':
        'Neurobehavioral battery (visual RT, Stroop, redirection, overlapping, arithmetic, visual learning)',
    'd2 test (sustained concentration, visual scanning ability, sustained attention)': 'd2 Test of Attention',
    'different versions of the tsai\u2010partington test (cue\u2010utilization capacity)': 'Tsai-Partington test',
}

# Cognitive domain for each canonical instrument — used to color/group the
# chart. "Subjective scale" is kept distinct from "Performance task" because
# self-rated alertness and an actual Stroop task measure fundamentally
# different things, even though the raw column lumps them together.
DOMAIN_MAP = {
    'Stroop task': 'Performance task — inhibition/attention',
    'Stroop task (with feedback)': 'Performance task — inhibition/attention',
    'N-back task': 'Performance task — working memory',
    'Go/no-go task': 'Performance task — inhibition/attention',
    'Digit span task': 'Performance task — working memory',
    'Digit span task (forward)': 'Performance task — working memory',
    'Redirection task': 'Performance task — attention',
    'Overlapping task': 'Performance task — attention',
    'Visual learning task': 'Performance task — memory',
    'Visual reaction time': 'Performance task — psychomotor speed',
    'Choice reaction time': 'Performance task — psychomotor speed',
    'Visual search task': 'Performance task — attention',
    'Visual search task (digit)': 'Performance task — attention',
    'Visual search task (letter)': 'Performance task — attention',
    'Mental arithmetic': 'Performance task — arithmetic',
    'Mental arithmetic (with feedback)': 'Performance task — arithmetic',
    'BPR-5 reasoning battery': 'Performance task — reasoning',
    'Reasoning task (abstract)': 'Performance task — reasoning',
    'Reasoning task (mechanical)': 'Performance task — reasoning',
    'Reasoning task (numeric)': 'Performance task — reasoning',
    'Reasoning task (spatial)': 'Performance task — reasoning',
    'Reasoning task (grammatical)': 'Performance task — reasoning',
    'Reasoning task (grammatical/deductive/sequential)': 'Performance task — reasoning',
    'Mental rotation task': 'Performance task — reasoning',
    'Spatial working memory task': 'Performance task — working memory',
    'Operation span task': 'Performance task — working memory',
    'Vigilance/PVT': 'Performance task — sustained attention',
    'Continuous Performance Test (CPT)': 'Performance task — sustained attention',
    'Oddball task': 'Performance task — sustained attention',
    'Cambridge Brain Sciences (CBS) battery': 'Performance task — multi-domain battery',
    'Flanker task': 'Performance task — inhibition/attention',
    'Trail Making Test': 'Performance task — executive function',
    'Hampshire Tree Task': 'Performance task — planning',
    'Tsai-Partington test': 'Performance task — cue utilization/attention',
    'd2 Test of Attention': 'Performance task — sustained attention',
    'Uchida-Kraepelin test': 'Performance task — sustained attention',
    'Corsi Block-Tapping Task + RVIP': 'Performance task — multi-domain battery',
    'Alternative Uses Task (AUT, creativity)': 'Performance task — creativity',
    'Fast-counting task': 'Performance task — arithmetic',
    'Stepuru task': 'Performance task — psychomotor speed',
    'Typing task': 'Performance task — psychomotor speed',
    'Typing task (with feedback)': 'Performance task — psychomotor speed',
    'Short-term memory (pair/word recall)': 'Performance task — memory',
    'Schulte grid test': 'Performance task — sustained attention',
    'Visual trace perception task': 'Performance task — perception',
    'Composite/overall score (unspecified battery)': 'Performance task — multi-domain battery',
    'Neurobehavioral battery (visual RT, Stroop, redirection, overlapping, arithmetic, visual learning)':
        'Performance task — multi-domain battery',

    'NASA-TLX': 'Subjective scale — workload',
    'Karolinska Sleepiness Scale (KSS)': 'Subjective scale — sleepiness/alertness',
    'PANAS (mood)': 'Subjective scale — mood',
    'Profile of Mood States (POMS)': 'Subjective scale — mood',
    'PASAT': 'Performance task — working memory',  # PASAT is a timed arithmetic/attention task, not a self-report scale
    'Trier Social Stress Test (TSST)': 'Stress induction protocol',
    'Self-rated alertness': 'Subjective scale — sleepiness/alertness',
    'Self-rated arousal': 'Subjective scale — sleepiness/alertness',
    'Self-rated fatigue': 'Subjective scale — fatigue',
    'Self-rated sleepiness': 'Subjective scale — sleepiness/alertness',
    'Self-rated distraction': 'Subjective scale — attention',
    'Self-rated efficiency': 'Subjective scale — work performance',
    'Self-rated learning performance': 'Subjective scale — work performance',
    'Self-rated attention': 'Subjective scale — attention',
    'Self-rated work performance': 'Subjective scale — work performance',
    'Self-rated work willingness': 'Subjective scale — work performance',
    'Self-rated work motivation': 'Subjective scale — work performance',
}


def canonicalize_token(token):
    """Returns (canonical_name, domain, was_recognized)."""
    key = token.strip().lower().rstrip('.')
    if key in CANONICAL_MAP:
        canon = CANONICAL_MAP[key]
        domain = DOMAIN_MAP.get(canon, 'Unclassified')
        return canon, domain, True
    # Unrecognized: fall back to title-cased raw text, flagged for review
    return token.strip(), 'Unclassified (not in taxonomy)', False
