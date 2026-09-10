from __future__ import annotations


def evaluate_full_chloride_compliance(
    result: dict,
    binder_system: dict,
    admixture_compliance: dict,
    materials: dict,
    durability: dict,
    durability_conditions: dict,
) -> dict:
    """Account for chloride from water, binders, aggregates and chemical admixtures.

    Material chloride percentages are interpreted as chloride ion by mass of that material.
    Mixing-water chloride is entered in mg/L. Full pass is only possible when every active
    source has chloride data and the total is within the governing ACI limit.
    """
    warnings: list[dict] = []
    source_rows: list[dict] = []
    complete = True

    mix = result.get("mix_proportions", {}) if isinstance(result, dict) else {}
    cementitious_mass = float(mix.get("cementitious_kg_m3") or 0.0)
    water_to_add = max(0.0, float(mix.get("water_to_add_kg_m3") or 0.0))

    raw_binders = {str(item.get("id")): item for item in list(materials.get("cementitious") or []) if item.get("id")}
    raw_aggregates = {str(item.get("id")): item for item in list(materials.get("aggregates") or []) if item.get("id")}
    raw_misc = list(materials.get("admixtures") or [])

    binder_chloride, binder_complete, binder_rows, binder_warnings = _percent_mass_sources(
        list(binder_system.get("components") or []), raw_binders, "mass_kg_m3", "binder"
    )
    source_rows.extend(binder_rows)
    warnings.extend(binder_warnings)
    complete = complete and binder_complete

    aggregate_chloride, aggregate_complete, aggregate_rows, aggregate_warnings = _percent_mass_sources(
        list(result.get("aggregate_analysis") or []), raw_aggregates, "ssd_mass_kg_m3", "aggregate"
    )
    source_rows.extend(aggregate_rows)
    warnings.extend(aggregate_warnings)
    complete = complete and aggregate_complete

    admixture_data = admixture_compliance.get("chloride", {}) if isinstance(admixture_compliance, dict) else {}
    admixture_chloride = float(admixture_data.get("admixture_chloride_kg_m3") or 0.0)
    admixture_complete = bool(admixture_data.get("admixture_chloride_data_complete", False))
    admixture_sources = [item for item in raw_misc if str(item.get("material_type")) == "admixture"]
    source_rows.append({
        "source_category": "admixture",
        "name": "chemical admixtures total",
        "chloride_kg_m3": round(admixture_chloride, 6),
        "data_complete": admixture_complete,
        "provenance_sources": [_chloride_provenance(item) for item in admixture_sources],
    })
    complete = complete and admixture_complete

    water_sources = [item for item in raw_misc if str(item.get("material_type")) == "water"]
    water_chloride, water_complete, water_rows, water_warnings = _water_chloride(water_sources, water_to_add)
    source_rows.extend(water_rows)
    warnings.extend(water_warnings)
    complete = complete and water_complete

    total_chloride = binder_chloride + aggregate_chloride + admixture_chloride + water_chloride
    total_percent = total_chloride / cementitious_mass * 100.0 if cementitious_mass > 0 else None

    exposure = durability.get("exposure_classes", {}) if isinstance(durability, dict) else {}
    corrosion_class = str(exposure.get("corrosion") or "C0")
    prestressed = bool(durability_conditions.get("prestressed_concrete", False))
    governing = durability.get("governing_requirements", {}) if isinstance(durability, dict) else {}
    limits = governing.get("chloride_limit_percent") or {}
    limit = limits.get("prestressed_percent" if prestressed else "nonprestressed_percent")

    calcium_chloride = _find_calcium_chloride(raw_misc)
    sulfate_class = str(exposure.get("sulfate") or "S0")
    calcium_chloride_prohibited = bool(prestressed or sulfate_class in {"S2", "S3"})
    if calcium_chloride and calcium_chloride_prohibited:
        reasons = []
        if prestressed:
            reasons.append("بتن پیش‌تنیده")
        if sulfate_class in {"S2", "S3"}:
            reasons.append(f"مواجهه {sulfate_class}")
        warnings.append({
            "code": "CALCIUM_CHLORIDE_NOT_PERMITTED",
            "severity": "fail",
            "message": f"افزودنی حاوی/معرفی‌شده به‌عنوان CaCl₂ برای {' و '.join(reasons)} مجاز نیست.",
            "reference": "ACI CODE-318-25 durability requirements / project material restrictions",
        })

    status = "needs_review"
    if total_percent is not None and limit is not None:
        if total_percent > float(limit) + 1e-12:
            status = "fail"
            warnings.append({
                "code": "TOTAL_CHLORIDE_EXCEEDS_ACI_LIMIT",
                "severity": "fail",
                "message": (
                    f"کل کلراید محاسبه‌شده {total_percent:.4f}% جرم مواد سیمانی است و از حد "
                    f"{float(limit):.3f}% برای {corrosion_class} بیشتر است."
                ),
                "reference": "ACI CODE-318-25 chloride-ion limit / ASTM C1218/C1218M",
            })
        elif complete:
            status = "pass"
        else:
            warnings.append({
                "code": "FULL_CHLORIDE_DATA_INCOMPLETE",
                "severity": "needs_review",
                "message": "جمع کلراید محاسبه شده ولی حداقل یک منبع فعال فاقد داده کلراید معتبر است؛ تأیید نهایی مجاز نیست.",
                "reference": "Material traceability / chloride test data",
            })

    if any(item.get("severity") == "fail" for item in warnings):
        status = "fail"

    return {
        "status": status,
        "corrosion_exposure_class": corrosion_class,
        "prestressed_concrete": prestressed,
        "aci_limit_percent_by_mass_cementitious": limit,
        "total_chloride_kg_m3": round(total_chloride, 6),
        "total_chloride_percent_by_mass_cementitious": round(total_percent, 6) if total_percent is not None else None,
        "data_complete": complete,
        "source_breakdown": source_rows,
        "calcium_chloride_detected": calcium_chloride,
        "calcium_chloride_prohibited": calcium_chloride_prohibited,
        "warnings": warnings,
        "references": [
            "ACI CODE-318-25 - chloride-ion requirements",
            "ASTM C1218/C1218M - Water-Soluble Chloride in Mortar and Concrete",
            "ASTM C1602/C1602M - Mixing Water Used in Hydraulic Cement Concrete",
        ],
    }


def _chloride_provenance(raw: dict) -> dict:
    return {
        "material_id": raw.get("id"),
        "test_method": raw.get("chloride_test_method"),
        "test_edition": raw.get("chloride_test_edition"),
        "evidence_ref": raw.get("chloride_evidence_ref"),
    }


def _percent_mass_sources(analysis_rows: list[dict], raw_by_id: dict[str, dict], mass_key: str, category: str):
    total = 0.0
    complete = True
    rows: list[dict] = []
    warnings: list[dict] = []
    for row in analysis_rows:
        material_id = str(row.get("material_id") or "")
        raw = raw_by_id.get(material_id, {})
        mass = float(row.get(mass_key) or 0.0)
        if mass <= 0:
            continue
        chloride = raw.get("chloride_percent")
        provenance = _chloride_provenance(raw)
        if chloride is None:
            complete = False
            warnings.append({
                "code": f"{category.upper()}_CHLORIDE_DATA_MISSING",
                "severity": "needs_review",
                "message": f"کلراید منبع «{row.get('name') or row.get('material_name') or material_id or category}» ثبت نشده است.",
                "reference": "Material certificate / chloride test data",
            })
            rows.append({"source_category": category, "material_id": material_id, "name": row.get("name") or row.get("material_name"), "mass_kg_m3": round(mass, 3), "chloride_percent": None, "chloride_kg_m3": None, "data_complete": False, "chloride_provenance": provenance})
            continue
        chloride_percent = float(chloride)
        if chloride_percent < 0:
            complete = False
            warnings.append({"code": f"{category.upper()}_CHLORIDE_INVALID", "severity": "fail", "message": "درصد کلراید نمی‌تواند منفی باشد.", "reference": "Engineering input validation"})
            continue
        contribution = mass * chloride_percent / 100.0
        total += contribution
        rows.append({"source_category": category, "material_id": material_id, "name": row.get("name") or row.get("material_name"), "mass_kg_m3": round(mass, 3), "chloride_percent": chloride_percent, "chloride_kg_m3": round(contribution, 6), "data_complete": True, "chloride_provenance": provenance})
    return total, complete, rows, warnings


def _water_chloride(water_sources: list[dict], water_to_add_kg_m3: float):
    warnings: list[dict] = []
    rows: list[dict] = []
    if water_to_add_kg_m3 <= 0:
        return 0.0, True, rows, warnings
    if not water_sources:
        warnings.append({"code": "MIXING_WATER_SOURCE_MISSING", "severity": "needs_review", "message": "منبع آب اختلاط برای کنترل کلراید ثبت نشده است.", "reference": "ASTM C1602/C1602M"})
        return 0.0, False, rows, warnings

    if len(water_sources) == 1:
        shares = [100.0]
    else:
        shares = []
        for item in water_sources:
            if item.get("water_share_percent") is None:
                warnings.append({"code": "WATER_SOURCE_SHARE_MISSING", "severity": "needs_review", "message": "برای استفاده همزمان از چند منبع آب، سهم هر منبع باید ثبت شود.", "reference": "Water source mass balance"})
                return 0.0, False, rows, warnings
            shares.append(float(item.get("water_share_percent")))
        if abs(sum(shares) - 100.0) > 0.01:
            warnings.append({"code": "WATER_SOURCE_SHARES_NOT_100", "severity": "fail", "message": f"جمع سهم منابع آب {sum(shares):.2f}% است و باید 100% باشد.", "reference": "Water source mass balance"})
            return 0.0, False, rows, warnings

    total = 0.0
    complete = True
    for item, share in zip(water_sources, shares):
        chloride_mg_l = item.get("chloride_mg_l")
        source_water_mass = water_to_add_kg_m3 * share / 100.0
        provenance = _chloride_provenance(item)
        if chloride_mg_l is None:
            complete = False
            warnings.append({"code": "WATER_CHLORIDE_DATA_MISSING", "severity": "needs_review", "message": f"کلراید آب «{item.get('name') or 'بدون نام'}» بر حسب mg/L ثبت نشده است.", "reference": "ASTM C1602/C1602M / water analysis"})
            rows.append({"source_category": "water", "material_id": item.get("id"), "name": item.get("name"), "share_percent": share, "water_kg_m3": round(source_water_mass, 3), "chloride_mg_l": None, "chloride_kg_m3": None, "data_complete": False, "chloride_provenance": provenance})
            continue
        value = float(chloride_mg_l)
        if value < 0:
            complete = False
            warnings.append({"code": "WATER_CHLORIDE_INVALID", "severity": "fail", "message": "کلراید آب نمی‌تواند منفی باشد.", "reference": "Engineering input validation"})
            continue
        contribution = source_water_mass * value / 1_000_000.0
        total += contribution
        rows.append({"source_category": "water", "material_id": item.get("id"), "name": item.get("name"), "share_percent": share, "water_kg_m3": round(source_water_mass, 3), "chloride_mg_l": value, "chloride_kg_m3": round(contribution, 6), "data_complete": True, "chloride_provenance": provenance})
    return total, complete, rows, warnings


def _find_calcium_chloride(materials: list[dict]) -> bool:
    for item in materials:
        if str(item.get("material_type")) != "admixture":
            continue
        text = " ".join(str(item.get(key) or "") for key in ("material_subtype", "name", "product_code", "notes")).lower().replace("₂", "2")
        if "calcium_chloride_accelerator" in text or "calcium chloride" in text or "cacl2" in text:
            return True
    return False
