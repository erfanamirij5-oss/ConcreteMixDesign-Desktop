from __future__ import annotations


def evaluate_combined_aggregate_system(materials: dict, mix_result: dict, concrete_type: str | None = None) -> dict:
    """Evaluate the blended aggregate skeleton using only explicitly shared sieve sizes."""
    aggregates = list(materials.get("aggregates") or [])
    warnings: list[dict] = []
    shares, share_basis, share_warnings = _resolve_shares(materials, mix_result, aggregates)
    warnings.extend(share_warnings)
    active = [item for item in aggregates if shares.get(str(item.get("id")), 0.0) > 0]

    if not active:
        return _review_result(
            "COMBINED_AGGREGATE_SOURCES_MISSING",
            "برای تحلیل اسکلت ترکیبی سنگدانه، منبع فعال و سهم معتبر در دسترس نیست.",
            warnings,
        )

    total_share = sum(shares.get(str(item.get("id")), 0.0) for item in active)
    if abs(total_share - 100.0) > 0.05:
        warnings.append(_warning(
            "COMBINED_AGGREGATE_SHARE_TOTAL_INVALID", "needs_review",
            f"جمع سهم سنگدانه‌های فعال {total_share:.2f}% است و باید 100% باشد.",
            "ACI PRC-211.1-22 / stored project blend",
        ))

    source_sieves: dict[str, dict[float, float]] = {}
    invalid_gradation = False
    for item in active:
        source_id = str(item.get("id"))
        sieve_map: dict[float, float] = {}
        for row in list(item.get("gradation_rows") or []):
            if row.get("sieve_size_mm") is None or row.get("percent_passing") is None:
                continue
            try:
                sieve = _round_sieve(float(row["sieve_size_mm"]))
                passing = float(row["percent_passing"])
            except (TypeError, ValueError):
                invalid_gradation = True
                warnings.append(_warning(
                    "AGGREGATE_GRADATION_VALUE_INVALID", "fail",
                    f"داده دانه‌بندی منبع {item.get('name') or source_id} عددی نیست و از منحنی ترکیبی حذف شد.",
                    "ASTM C136/C136M-25",
                ))
                continue
            if sieve <= 0 or not 0.0 <= passing <= 100.0:
                invalid_gradation = True
                warnings.append(_warning(
                    "AGGREGATE_PERCENT_PASSING_OUT_OF_RANGE", "fail",
                    f"عبوری منبع {item.get('name') or source_id} روی الک {sieve:g} mm برابر {passing:g}% است؛ عبوری باید بین 0 و 100% باشد.",
                    "ASTM C136/C136M-25",
                ))
                continue
            sieve_map[sieve] = passing
        source_sieves[source_id] = sieve_map

    common_sieves: set[float] | None = None
    for sieve_map in source_sieves.values():
        common_sieves = set(sieve_map) if common_sieves is None else common_sieves.intersection(sieve_map)
    common = sorted(common_sieves or set(), reverse=True)

    combined_curve: list[dict] = []
    for sieve in common:
        passing = sum(shares[source_id] * source_sieves[source_id][sieve] / 100.0 for source_id in source_sieves)
        combined_curve.append({"sieve_size_mm": sieve, "percent_passing": round(passing, 3)})

    if len(combined_curve) < 2:
        warnings.append(_warning(
            "COMBINED_GRADATION_COMMON_SIEVES_INSUFFICIENT", "needs_review",
            "برای تشکیل منحنی ترکیبی قابل اتکا، حداقل دو الک مشترک بین همه منابع فعال لازم است.",
            "ASTM C136/C136M-25",
        ))

    interval_retentions: list[dict] = []
    zero_intervals = 0
    nonmonotonic_intervals = 0
    for index in range(1, len(combined_curve)):
        upper = combined_curve[index - 1]
        lower = combined_curve[index]
        raw_retained = float(upper["percent_passing"]) - float(lower["percent_passing"])
        if raw_retained < -0.01:
            nonmonotonic_intervals += 1
        elif raw_retained <= 0.01:
            zero_intervals += 1
        interval_retentions.append({
            "upper_sieve_mm": upper["sieve_size_mm"],
            "lower_sieve_mm": lower["sieve_size_mm"],
            "retained_percent": round(raw_retained, 3),
        })

    if nonmonotonic_intervals:
        warnings.append(_warning(
            "COMBINED_GRADATION_NON_MONOTONIC", "fail",
            f"در منحنی ترکیبی {nonmonotonic_intervals} بازه نامعتبر دیده شد که عبوری با کوچک‌شدن الک افزایش یافته است؛ داده‌های دانه‌بندی باید اصلاح شوند.",
            "ASTM C136/C136M-25",
        ))
    if zero_intervals:
        warnings.append(_warning(
            "COMBINED_GRADATION_ZERO_RETAINED_INTERVAL", "needs_review",
            f"در منحنی ترکیبی {zero_intervals} بازه الکی با نگهداشت تقریباً صفر دیده شد؛ پیوستگی دانه‌بندی و خطر Gap Grading باید بررسی شود.",
            "ASTM C136/C136M-25 + engineering review",
        ))

    fine_share = sum(shares[str(item.get("id"))] for item in active if item.get("material_type") == "fine_aggregate")
    coarse_share = sum(shares[str(item.get("id"))] for item in active if item.get("material_type") == "coarse_aggregate")
    passing_4_75 = _curve_value(combined_curve, 4.75)
    passing_2_36 = _curve_value(combined_curve, 2.36)
    passing_0_60 = _curve_value(combined_curve, 0.6)
    passing_0_30 = _curve_value(combined_curve, 0.3)

    shape_rows = []
    shape_review = False
    for item in active:
        source_id = str(item.get("id"))
        d4791 = _optional_number(item.get("astm_d4791_flat_elongated_percent"))
        d4791_limit = _optional_number(item.get("flat_elongated_limit_percent"))
        d5821 = _optional_number(item.get("astm_d5821_fractured_particles_percent"))
        d5821_min = _optional_number(item.get("fractured_particles_min_percent"))
        if item.get("material_type") == "coarse_aggregate" and (d4791 is None or d5821 is None):
            shape_review = True
        shape_rows.append({
            "material_id": source_id, "name": item.get("name"), "share_percent": round(shares[source_id], 3),
            "flat_elongated_percent": d4791, "flat_elongated_limit_percent": d4791_limit,
            "fractured_particles_percent": d5821, "fractured_particles_min_percent": d5821_min,
        })

    pumped = str(concrete_type or "").lower() == "pumped"
    pump_status = "needs_review" if pumped and (
        len(combined_curve) < 2 or shape_review or zero_intervals > 0 or nonmonotonic_intervals > 0 or invalid_gradation
    ) else "advisory"
    pump_messages = [
        "ارزیابی پمپاژ از منحنی ترکیبی واقعی، سهم Fine/Coarse و داده شکل ذرات استفاده می‌کند؛ حد عددی عمومی برای پذیرش پمپاژ در این موتور فرض نشده است."
    ]
    if pumped:
        if shape_review:
            pump_messages.append("برای بتن پمپی، داده D4791/D5821 یک یا چند منبع درشت ناقص است.")
        if zero_intervals:
            pump_messages.append("وجود بازه بدون نگهداشت در منحنی ترکیبی باید با Trial Mix کنترل شود.")
        if nonmonotonic_intervals or invalid_gradation:
            pump_messages.append("منحنی دانه‌بندی شامل داده نامعتبر است و تا اصلاح داده برای ارزیابی پمپاژ قابل اتکا نیست.")
        if passing_4_75 is None:
            pump_messages.append("عبوری ترکیبی الک 4.75 mm قابل محاسبه نیست؛ نسبت ملات/سنگدانه درشت برای پمپاژ کامل ارزیابی نشده است.")

    if pumped and pump_status == "needs_review":
        warnings.append(_warning(
            "PUMPABILITY_AGGREGATE_SYSTEM_REVIEW_REQUIRED", "needs_review",
            "برای بتن پمپی، اسکلت ترکیبی سنگدانه هنوز نیازمند تکمیل داده یا بررسی Trial Mix است.",
            "ACI PRC-211.1-22 + project pumpability verification",
        ))

    severity = {"needs_review": 1, "warning": 2, "fail": 3}
    max_severity = max((severity.get(str(w.get("severity")), 0) for w in warnings), default=0)
    status = "fail" if max_severity >= 3 else "needs_review" if max_severity >= 1 else "pass"
    return {
        "status": status,
        "share_basis": share_basis,
        "share_total_percent": round(total_share, 3),
        "fine_aggregate_share_percent": round(fine_share, 3),
        "coarse_aggregate_share_percent": round(coarse_share, 3),
        "source_shares": [
            {"material_id": str(item.get("id")), "name": item.get("name"), "share_percent": round(shares[str(item.get("id"))], 3)}
            for item in active
        ],
        "combined_curve": combined_curve,
        "common_sieve_count": len(combined_curve),
        "continuity": {
            "zero_retained_interval_count": zero_intervals,
            "nonmonotonic_interval_count": nonmonotonic_intervals,
            "interval_retentions": interval_retentions,
        },
        "key_passing": {"4_75_mm": passing_4_75, "2_36_mm": passing_2_36, "0_60_mm": passing_0_60, "0_30_mm": passing_0_30},
        "shape_texture": shape_rows,
        "packing": {"status": "advisory", "note": "از منحنی ترکیبی برای ارزیابی توزیع اندازه استفاده شده است؛ Packing Density واقعی بدون آزمون/Calibration مخلوط سنگدانه محاسبه نشده است."},
        "pumpability": {"status": pump_status, "pumped_concrete": pumped, "messages": pump_messages},
        "warnings": warnings,
        "references": [
            "ASTM C136/C136M-25 - Sieve Analysis of Fine and Coarse Aggregates",
            "ASTM D4791 - Flat Particles, Elongated Particles, or Flat and Elongated Particles",
            "ASTM D5821-13(2025) - Percentage of Fractured Particles in Coarse Aggregate",
            "ACI PRC-211.1-22 - Selecting Proportions for Normal-Density and High-Density Concrete",
        ],
    }


def _resolve_shares(materials: dict, mix_result: dict, aggregates: list[dict]) -> tuple[dict[str, float], str, list[dict]]:
    warnings: list[dict] = []
    valid_ids = {str(item.get("id")) for item in aggregates if item.get("id")}
    manual = list(materials.get("aggregate_blend_shares") or [])
    manual_map: dict[str, float] = {}
    seen: set[str] = set()
    for row in manual:
        source_id = str(row.get("material_id") or "")
        if not source_id:
            continue
        if source_id not in valid_ids:
            warnings.append(_warning(
                "AGGREGATE_BLEND_ORPHAN_MATERIAL", "needs_review",
                f"سهم دستی برای شناسه ناشناخته {source_id} ثبت شده و در ترکیب استفاده نشد.",
                "Material traceability requirement",
            ))
            continue
        if source_id in seen:
            warnings.append(_warning(
                "AGGREGATE_BLEND_DUPLICATE_MATERIAL", "needs_review",
                f"برای سنگدانه {source_id} بیش از یک ردیف سهم دستی ثبت شده است؛ سهم‌ها به‌صورت قطعی با هم جمع شدند.",
                "Stored project blend validation",
            ))
        seen.add(source_id)
        try:
            share = float(row.get("share_percent") or 0)
        except (TypeError, ValueError):
            warnings.append(_warning(
                "AGGREGATE_BLEND_SHARE_INVALID", "needs_review",
                f"سهم دستی سنگدانه {source_id} عددی نیست و معتبر تلقی نشد.",
                "Stored project blend validation",
            ))
            continue
        manual_map[source_id] = manual_map.get(source_id, 0.0) + share
    if manual_map and abs(sum(manual_map.values()) - 100.0) <= 0.05:
        return manual_map, "stored_manual_blend", warnings

    analysis = list(mix_result.get("aggregate_analysis") or [])
    masses: dict[str, float] = {}
    for row in analysis:
        source_id = str(row.get("material_id") or "")
        mass = _optional_number(row.get("ssd_mass_kg_m3"))
        if source_id in valid_ids and mass is not None and mass > 0:
            masses[source_id] = masses.get(source_id, 0.0) + mass
    total = sum(masses.values())
    if total > 0:
        return {key: value / total * 100.0 for key, value in masses.items()}, "calculated_ssd_mass", warnings

    equal = 100.0 / len(aggregates) if aggregates else 0.0
    warnings.append(_warning(
        "COMBINED_AGGREGATE_EQUAL_SHARE_FALLBACK", "needs_review",
        "سهم معتبر دستی یا جرم SSD محاسبه‌شده در دسترس نبود؛ سهم مساوی فقط به‌عنوان Placeholder تحلیلی استفاده شد و برای تأیید طرح قابل اتکا نیست.",
        "ACI PRC-211.1-22 + engineering review",
    ))
    return {str(item.get("id")): equal for item in aggregates}, "equal_share_fallback_needs_review", warnings


def _curve_value(curve: list[dict], sieve: float) -> float | None:
    target = _round_sieve(sieve)
    for row in curve:
        if _round_sieve(float(row["sieve_size_mm"])) == target:
            return float(row["percent_passing"])
    return None


def _optional_number(value: object) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _round_sieve(value: float) -> float:
    return round(value, 3)


def _warning(code: str, severity: str, message: str, reference: str) -> dict:
    return {"code": code, "severity": severity, "message": message, "reference": reference}


def _review_result(code: str, message: str, prior_warnings: list[dict] | None = None) -> dict:
    warnings = list(prior_warnings or [])
    warnings.append(_warning(code, "needs_review", message, "ASTM C136/C136M-25"))
    return {
        "status": "fail" if any(w.get("severity") == "fail" for w in warnings) else "needs_review",
        "share_basis": None, "share_total_percent": 0.0,
        "fine_aggregate_share_percent": 0.0, "coarse_aggregate_share_percent": 0.0,
        "source_shares": [], "combined_curve": [], "common_sieve_count": 0,
        "continuity": {"zero_retained_interval_count": 0, "nonmonotonic_interval_count": 0, "interval_retentions": []},
        "key_passing": {}, "shape_texture": [], "packing": {"status": "not_evaluated"},
        "pumpability": {"status": "needs_review", "pumped_concrete": False, "messages": [message]},
        "warnings": warnings, "references": ["ASTM C136/C136M-25"],
    }
