from __future__ import annotations


def evaluate_combined_aggregate_system(materials: dict, mix_result: dict, concrete_type: str | None = None) -> dict:
    """Evaluate the aggregate skeleton as one blended system without inventing acceptance limits.

    The combined curve is calculated only at sieve sizes that are explicitly available for
    every active aggregate source. No hidden interpolation is performed. Blend shares come
    from an explicit 100% manual blend when available; otherwise they are derived from the
    calculated SSD aggregate masses.
    """
    aggregates = list(materials.get("aggregates") or [])
    warnings: list[dict] = []
    shares, share_basis = _resolve_shares(materials, mix_result, aggregates)
    active = [item for item in aggregates if shares.get(str(item.get("id")), 0.0) > 0]

    if not active:
        return _review_result(
            "COMBINED_AGGREGATE_SOURCES_MISSING",
            "برای تحلیل اسکلت ترکیبی سنگدانه، منبع فعال و سهم معتبر در دسترس نیست.",
        )

    total_share = sum(shares.get(str(item.get("id")), 0.0) for item in active)
    if abs(total_share - 100.0) > 0.05:
        warnings.append(_warning(
            "COMBINED_AGGREGATE_SHARE_TOTAL_INVALID",
            "needs_review",
            f"جمع سهم سنگدانه‌های فعال {total_share:.2f}% است و باید 100% باشد.",
            "ACI PRC-211.1-22 / stored project blend",
        ))

    source_sieves: dict[str, dict[float, float]] = {}
    for item in active:
        source_id = str(item.get("id"))
        rows = list(item.get("gradation_rows") or [])
        source_sieves[source_id] = {
            _round_sieve(float(row["sieve_size_mm"])): float(row["percent_passing"])
            for row in rows
            if row.get("sieve_size_mm") is not None and row.get("percent_passing") is not None
        }

    common_sieves: set[float] | None = None
    for sieve_map in source_sieves.values():
        common_sieves = set(sieve_map) if common_sieves is None else common_sieves.intersection(sieve_map)
    common = sorted(common_sieves or set(), reverse=True)

    combined_curve: list[dict] = []
    for sieve in common:
        passing = sum(
            shares[source_id] * source_sieves[source_id][sieve] / 100.0
            for source_id in source_sieves
        )
        combined_curve.append({"sieve_size_mm": sieve, "percent_passing": round(passing, 3)})

    if len(combined_curve) < 2:
        warnings.append(_warning(
            "COMBINED_GRADATION_COMMON_SIEVES_INSUFFICIENT",
            "needs_review",
            "برای تشکیل منحنی ترکیبی قابل اتکا، حداقل دو الک مشترک بین همه منابع فعال لازم است.",
            "ASTM C136/C136M-25",
        ))

    interval_retentions: list[dict] = []
    zero_intervals = 0
    for index in range(1, len(combined_curve)):
        upper = combined_curve[index - 1]
        lower = combined_curve[index]
        retained = max(0.0, float(upper["percent_passing"]) - float(lower["percent_passing"]))
        if retained <= 0.01:
            zero_intervals += 1
        interval_retentions.append({
            "upper_sieve_mm": upper["sieve_size_mm"],
            "lower_sieve_mm": lower["sieve_size_mm"],
            "retained_percent": round(retained, 3),
        })

    if zero_intervals:
        warnings.append(_warning(
            "COMBINED_GRADATION_ZERO_RETAINED_INTERVAL",
            "needs_review",
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
            "material_id": source_id,
            "name": item.get("name"),
            "share_percent": round(shares[source_id], 3),
            "flat_elongated_percent": d4791,
            "flat_elongated_limit_percent": d4791_limit,
            "fractured_particles_percent": d5821,
            "fractured_particles_min_percent": d5821_min,
        })

    pumped = str(concrete_type or "").lower() == "pumped"
    pump_status = "needs_review" if pumped and (len(combined_curve) < 2 or shape_review or zero_intervals > 0) else "advisory"
    pump_messages = [
        "ارزیابی پمپاژ از منحنی ترکیبی واقعی، سهم Fine/Coarse و داده شکل ذرات استفاده می‌کند؛ حد عددی عمومی برای پذیرش پمپاژ در این موتور فرض نشده است.",
    ]
    if pumped:
        if shape_review:
            pump_messages.append("برای بتن پمپی، داده D4791/D5821 یک یا چند منبع درشت ناقص است.")
        if zero_intervals:
            pump_messages.append("وجود بازه بدون نگهداشت در منحنی ترکیبی می‌تواند نشانه گسستگی اسکلت سنگدانه باشد و باید با Trial Mix کنترل شود.")
        if passing_4_75 is None:
            pump_messages.append("عبوری ترکیبی الک 4.75 mm قابل محاسبه نیست؛ نسبت ملات/سنگدانه درشت برای پمپاژ کامل ارزیابی نشده است.")

    if pumped and pump_status == "needs_review":
        warnings.append(_warning(
            "PUMPABILITY_AGGREGATE_SYSTEM_REVIEW_REQUIRED",
            "needs_review",
            "برای بتن پمپی، اسکلت ترکیبی سنگدانه هنوز نیازمند تکمیل داده یا بررسی Trial Mix است.",
            "ACI PRC-211.1-22 + project pumpability verification",
        ))

    status = "needs_review" if any(w["severity"] == "needs_review" for w in warnings) else "pass"
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
            "interval_retentions": interval_retentions,
        },
        "key_passing": {
            "4_75_mm": passing_4_75,
            "2_36_mm": passing_2_36,
            "0_60_mm": passing_0_60,
            "0_30_mm": passing_0_30,
        },
        "shape_texture": shape_rows,
        "packing": {
            "status": "advisory",
            "note": "از منحنی ترکیبی برای ارزیابی توزیع اندازه استفاده شده است؛ Packing Density واقعی بدون آزمون/Calibration مخلوط سنگدانه محاسبه نشده است.",
        },
        "pumpability": {
            "status": pump_status,
            "pumped_concrete": pumped,
            "messages": pump_messages,
        },
        "warnings": warnings,
        "references": [
            "ASTM C136/C136M-25 - Sieve Analysis of Fine and Coarse Aggregates",
            "ASTM D4791 - Flat Particles, Elongated Particles, or Flat and Elongated Particles",
            "ASTM D5821-13(2025) - Percentage of Fractured Particles in Coarse Aggregate",
            "ACI PRC-211.1-22 - Selecting Proportions for Normal-Density and High-Density Concrete",
        ],
    }


def _resolve_shares(materials: dict, mix_result: dict, aggregates: list[dict]) -> tuple[dict[str, float], str]:
    manual = list(materials.get("aggregate_blend_shares") or [])
    manual_map = {str(row.get("material_id")): float(row.get("share_percent") or 0) for row in manual if row.get("material_id")}
    if manual_map and abs(sum(manual_map.values()) - 100.0) <= 0.05:
        return manual_map, "stored_manual_blend"

    analysis = list(mix_result.get("aggregate_analysis") or [])
    masses: dict[str, float] = {}
    for row in analysis:
        source_id = str(row.get("material_id") or "")
        mass = _optional_number(row.get("ssd_mass_kg_m3"))
        if source_id and mass is not None and mass > 0:
            masses[source_id] = mass
    total = sum(masses.values())
    if total > 0:
        return {key: value / total * 100.0 for key, value in masses.items()}, "calculated_ssd_mass"

    equal = 100.0 / len(aggregates) if aggregates else 0.0
    return {str(item.get("id")): equal for item in aggregates}, "equal_share_fallback_needs_review"


def _curve_value(curve: list[dict], sieve: float) -> float | None:
    target = _round_sieve(sieve)
    for row in curve:
        if _round_sieve(float(row["sieve_size_mm"])) == target:
            return float(row["percent_passing"])
    return None


def _optional_number(value: object) -> float | None:
    if value is None or value == "":
        return None
    return float(value)


def _round_sieve(value: float) -> float:
    return round(value, 3)


def _warning(code: str, severity: str, message: str, reference: str) -> dict:
    return {"code": code, "severity": severity, "message": message, "reference": reference}


def _review_result(code: str, message: str) -> dict:
    warning = _warning(code, "needs_review", message, "ASTM C136/C136M-25")
    return {
        "status": "needs_review",
        "share_basis": None,
        "share_total_percent": 0.0,
        "fine_aggregate_share_percent": 0.0,
        "coarse_aggregate_share_percent": 0.0,
        "source_shares": [],
        "combined_curve": [],
        "common_sieve_count": 0,
        "continuity": {"zero_retained_interval_count": 0, "interval_retentions": []},
        "key_passing": {},
        "shape_texture": [],
        "packing": {"status": "not_evaluated"},
        "pumpability": {"status": "needs_review", "pumped_concrete": False, "messages": [message]},
        "warnings": [warning],
        "references": ["ASTM C136/C136M-25"],
    }
