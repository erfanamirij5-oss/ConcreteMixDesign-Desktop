from __future__ import annotations

from itertools import product


def optimize_aggregate_blend(materials: dict, options: dict | None = None) -> dict:
    """Rank feasible aggregate blend candidates from stored source gradations.

    This is an engineering search/ranking tool, not a packing-density model. It uses only
    explicit source gradations and explicit project constraints. Missing sieve values are
    never interpolated. Candidate scores are comparative and must be verified by trial mix.
    """
    options = options or {}
    aggregates = list(materials.get("aggregates") or [])
    excluded = {str(value) for value in options.get("aggregate_blend_exclude_material_ids", [])}
    active = [item for item in aggregates if str(item.get("id")) not in excluded]
    warnings: list[dict] = []

    if len(active) < 2:
        return _review("BLEND_OPTIMIZER_INSUFFICIENT_SOURCES", "برای بهینه‌سازی Blend حداقل دو منبع سنگدانه فعال لازم است.")

    source_maps: dict[str, dict[float, float]] = {}
    for item in active:
        source_id = str(item.get("id"))
        source_maps[source_id] = {
            _sieve(float(row["sieve_size_mm"])): float(row["percent_passing"])
            for row in list(item.get("gradation_rows") or [])
            if row.get("sieve_size_mm") is not None and row.get("percent_passing") is not None
        }
        if not source_maps[source_id]:
            warnings.append(_warning("BLEND_SOURCE_GRADATION_MISSING", "needs_review", f"برای «{item.get('name') or source_id}» دانه‌بندی ثبت نشده است."))

    common: set[float] | None = None
    for sieve_map in source_maps.values():
        common = set(sieve_map) if common is None else common.intersection(sieve_map)
    common_sieves = sorted(common or set(), reverse=True)
    if len(common_sieves) < 2:
        return _review("BLEND_OPTIMIZER_COMMON_SIEVES_INSUFFICIENT", "برای رتبه‌بندی Blend حداقل دو الک مشترک بین همه منابع لازم است.")

    step = float(options.get("aggregate_blend_optimizer_step_percent") or 5.0)
    if step <= 0 or step > 25:
        raise ValueError("aggregate_blend_optimizer_step_percent must be >0 and <=25")
    units = round(100.0 / step)
    if abs(units * step - 100.0) > 1e-6:
        raise ValueError("blend optimizer step must divide 100 exactly")

    constraints = options.get("aggregate_blend_constraints") or {}
    min_units: list[int] = []
    max_units: list[int] = []
    for item in active:
        source_id = str(item.get("id"))
        row = constraints.get(source_id) or {}
        minimum = max(0.0, float(row.get("min_percent", 0.0)))
        maximum = min(100.0, float(row.get("max_percent", 100.0)))
        if minimum > maximum:
            raise ValueError(f"invalid blend constraint for {source_id}")
        min_units.append(_ceil_units(minimum, step))
        max_units.append(_floor_units(maximum, step))

    limit_rows = options.get("combined_gradation_limits") or []
    combined_limits = {
        _sieve(float(row["sieve_size_mm"])): (float(row["min_percent"]), float(row["max_percent"]))
        for row in limit_rows
        if row.get("sieve_size_mm") is not None and row.get("min_percent") is not None and row.get("max_percent") is not None
    }
    fine_range = options.get("fine_aggregate_share_range") or None

    candidates: list[dict] = []
    ranges = [range(min_units[index], max_units[index] + 1) for index in range(len(active))]
    for vector in product(*ranges):
        if sum(vector) != units:
            continue
        shares = [value * step for value in vector]
        curve = []
        for sieve in common_sieves:
            passing = sum(shares[index] * source_maps[str(active[index].get("id"))][sieve] / 100.0 for index in range(len(active)))
            curve.append({"sieve_size_mm": sieve, "percent_passing": round(passing, 3)})

        envelope_penalty, envelope_failures = _envelope_penalty(curve, combined_limits)
        continuity_penalty, zero_intervals, low_intervals = _continuity_penalty(curve)
        fine_share = sum(shares[index] for index, item in enumerate(active) if item.get("material_type") == "fine_aggregate")
        fine_penalty = _range_penalty(fine_share, fine_range)
        score = max(0.0, 100.0 - envelope_penalty - continuity_penalty - fine_penalty)
        candidates.append({
            "score": round(score, 3),
            "shares": [
                {"material_id": str(item.get("id")), "name": item.get("name"), "share_percent": round(shares[index], 3)}
                for index, item in enumerate(active)
            ],
            "fine_aggregate_share_percent": round(fine_share, 3),
            "coarse_aggregate_share_percent": round(100.0 - fine_share, 3),
            "combined_curve": curve,
            "metrics": {
                "combined_limit_failure_count": envelope_failures,
                "zero_retained_interval_count": zero_intervals,
                "low_retained_interval_count": low_intervals,
                "envelope_penalty": round(envelope_penalty, 3),
                "continuity_penalty": round(continuity_penalty, 3),
                "fine_share_penalty": round(fine_penalty, 3),
            },
        })

    candidates.sort(key=lambda row: (-float(row["score"]), row["metrics"]["combined_limit_failure_count"], row["metrics"]["zero_retained_interval_count"]))
    top_n = int(options.get("aggregate_blend_optimizer_top_n") or 5)
    top_n = max(1, min(top_n, 10))
    ranked = candidates[:top_n]

    if not ranked:
        warnings.append(_warning("BLEND_OPTIMIZER_NO_FEASIBLE_CANDIDATE", "needs_review", "با محدودیت‌های فعلی هیچ ترکیب 100٪ قابل‌قبولی در شبکه جست‌وجو پیدا نشد."))

    if not combined_limits:
        warnings.append(_warning("BLEND_COMBINED_LIMITS_NOT_SUPPLIED", "needs_review", "حدود مستقل منحنی ترکیبی پروژه ثبت نشده است؛ Score فقط برای رتبه‌بندی نسبی پیوستگی Blend استفاده می‌شود."))

    return {
        "status": "pass" if ranked and combined_limits else "needs_review",
        "search_step_percent": step,
        "evaluated_candidate_count": len(candidates),
        "common_sieve_count": len(common_sieves),
        "constraints_applied": bool(constraints),
        "combined_limits_applied": bool(combined_limits),
        "candidates": ranked,
        "warnings": warnings,
        "references": [
            "ASTM C136/C136M-25 - Sieve Analysis of Fine and Coarse Aggregates",
            "ACI PRC-211.1-22 - Selecting Proportions for Normal-Density and High-Density Concrete",
        ],
        "note": "Score یک شاخص مقایسه‌ای برای رتبه‌بندی Blend است و معادل Packing Density، Pumpability acceptance یا تایید تولید نیست؛ Trial Mix الزامی است.",
    }


def _envelope_penalty(curve: list[dict], limits: dict[float, tuple[float, float]]) -> tuple[float, int]:
    penalty = 0.0
    failures = 0
    for row in curve:
        sieve = _sieve(float(row["sieve_size_mm"]))
        if sieve not in limits:
            continue
        minimum, maximum = limits[sieve]
        passing = float(row["percent_passing"])
        if passing < minimum:
            failures += 1
            penalty += 8.0 + (minimum - passing) * 0.5
        elif passing > maximum:
            failures += 1
            penalty += 8.0 + (passing - maximum) * 0.5
    return penalty, failures


def _continuity_penalty(curve: list[dict]) -> tuple[float, int, int]:
    penalty = 0.0
    zero_intervals = 0
    low_intervals = 0
    for index in range(1, len(curve)):
        retained = max(0.0, float(curve[index - 1]["percent_passing"]) - float(curve[index]["percent_passing"]))
        if retained <= 0.01:
            zero_intervals += 1
            penalty += 10.0
        elif retained < 2.0:
            low_intervals += 1
            penalty += 3.0
    return penalty, zero_intervals, low_intervals


def _range_penalty(value: float, range_value: object) -> float:
    if not isinstance(range_value, (list, tuple)) or len(range_value) != 2:
        return 0.0
    minimum = float(range_value[0])
    maximum = float(range_value[1])
    if value < minimum:
        return 5.0 + (minimum - value) * 0.5
    if value > maximum:
        return 5.0 + (value - maximum) * 0.5
    return 0.0


def _ceil_units(percent: float, step: float) -> int:
    value = percent / step
    integer = int(value)
    return integer if abs(value - integer) < 1e-9 else integer + 1


def _floor_units(percent: float, step: float) -> int:
    return int(percent / step + 1e-9)


def _sieve(value: float) -> float:
    return round(value, 3)


def _warning(code: str, severity: str, message: str) -> dict:
    return {"code": code, "severity": severity, "message": message, "reference": "ASTM C136/C136M-25 + project specification"}


def _review(code: str, message: str) -> dict:
    return {
        "status": "needs_review",
        "search_step_percent": None,
        "evaluated_candidate_count": 0,
        "common_sieve_count": 0,
        "constraints_applied": False,
        "combined_limits_applied": False,
        "candidates": [],
        "warnings": [_warning(code, "needs_review", message)],
        "references": ["ASTM C136/C136M-25"],
        "note": "Blend optimizer اجرا نشد.",
    }
