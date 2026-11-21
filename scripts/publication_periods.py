"""Publication-year pairs start in odd years so existing cohorts stay comparable."""


def _start_year(value):
    try:
        year = int(float(value))
    except (TypeError, ValueError, OverflowError):
        return None
    return year if year % 2 else year - 1


def _label(start):
    return f'{start}–{(start + 1) % 100:02d}'


def publication_period(year):
    start = _start_year(year)
    return _label(start) if start is not None else None


def publication_periods(years):
    starts = {start for value in years if (start := _start_year(value)) is not None}
    if not starts:
        return []
    return [_label(start) for start in range(min(starts), max(starts) + 1, 2)]
