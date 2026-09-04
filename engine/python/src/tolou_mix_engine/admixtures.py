from __future__ import annotations

WATER_DENSITY_KG_M3 = 1000.0


def apply_admixtures(result: dict, materials: list[dict], cementitious_kg_m3: float, proportioning_mode: str) -> dict:
    """Apply admixture dosage, carrier-water and absolute-volume corrections to a mix result."""
    rows = [item for item in materials if str(item.get("material_type")) == "admixture"]
    analysis: list[dict] = []
    warnings: list[dict] = []
    total_mass = 0.0
    carrier_water = 0.0
    nonwater_volume = 0.0

    for item in rows:
        calculated = calculate_admixture(item, cementitious_kg_m3)
        analysis.append(calculated["analysis"])
        warnings.extend(calculated["warnings"])
        total_mass += calculated["mass_kg_m3"]
        carrier_water += calculated["carrier_water_kg_m3"]
        nonwater_volume += calculated["nonwater_absolute_volume_m3"]

    if nonwater_volume > 0:
        warnings.extend(_correct_aggregate_volume(result, nonwater_volume, proportioning_mode))

    mix = result.setdefault("mix_proportions", {})
    aggregate_water_adjustment = float(mix.get("batch_water_adjustment_kg_m3") or 0.0)
    design_water = float(mix.get("water_kg_m3") or 0.0)
    water_to_add = design_water - aggregate_water_adjustment - carrier_water
    mix["admixture_mass_kg_m3"] = round(total_mass, 3)
    mix["admixture_carrier_water_kg_m3"] = round(carrier_water, 3)
    mix["admixture_nonwater_absolute_volume_m3"] = round(nonwater_volume, 6)
    mix["water_to_add_kg_m3"] = round(water_to_add, 1)

    if water_to_add < -1e-9:
        warnings.append(
            {
                "code": "NEGATIVE_BATCH_WATER_AFTER_ADMIXTURE",
                "severity": "fail",
                "message": "پس از احتساب رطوبت سنگدانه و آب حامل افزودنی، آب قابل افزودن به بچ منفی شده است.",
                "reference": "Batch water mass balance",
            }
        )

    return {
        "analysis": analysis,
        "totals": {
            "mass_kg_m3": round(total_mass, 3),
            "carrier_water_kg_m3": round(carrier_water, 3),
            "nonwater_absolute_volume_m3": round(nonwater_volume, 6),
        },
        "warnings": warnings,
    }


def calculate_admixture(item: dict, cementitious_kg_m3: float) -> dict:
    warnings: list[dict] = []
    value = item.get("dosage_value")
    unit = str(item.get("dosage_unit") or "").strip().lower()
    density = _positive_optional(item.get("density_kg_m3"))
    solids = _percent_optional(item.get("solids_percent"))

    if value is None:
        mass = 0.0
        warnings.append(
            {
                "code": "ADMIXTURE_DOSAGE_MISSING",
                "severity": "needs_review",
                "message": f"دوز افزودنی «{item.get('name') or 'بدون نام'}» وارد نشده است.",
                "reference": "Manufacturer dosage / ASTM C494/C260 as applicable",
            }
        )
    else:
        dosage = float(value)
        if dosage < 0:
            raise ValueError("admixture dosage cannot be negative")
        mass = _dosage_to_mass(dosage, unit, density, cementitious_kg_m3, warnings, item)

    if solids is None:
        carrier = 0.0
        if mass > 0:
            warnings.append(
                {
                    "code": "ADMIXTURE_SOLIDS_MISSING",
                    "severity": "needs_review",
                    "message": f"درصد جامد افزودنی «{item.get('name') or 'بدون نام'}» ثبت نشده؛ آب حامل از آب بچ کم نشده است.",
                    "reference": "Manufacturer technical data sheet",
                }
            )
    else:
        carrier = mass * (1.0 - solids / 100.0)

    if mass > 0 and density is None:
        solution_volume = 0.0
        warnings.append(
            {
                "code": "ADMIXTURE_DENSITY_MISSING",
                "severity": "needs_review",
                "message": f"چگالی افزودنی «{item.get('name') or 'بدون نام'}» ثبت نشده؛ اصلاح حجم مطلق انجام نشد.",
                "reference": "Manufacturer technical data sheet / absolute volume mass balance",
            }
        )
    else:
        solution_volume = mass / density if density else 0.0

    nonwater_volume = max(0.0, solution_volume - carrier / WATER_DENSITY_KG_M3)
    return {
        "mass_kg_m3": mass,
        "carrier_water_kg_m3": carrier,
        "nonwater_absolute_volume_m3": nonwater_volume,
        "warnings": warnings,
        "analysis": {
            "material_id": item.get("id"),
            "name": item.get("name"),
            "material_subtype": item.get("material_subtype"),
            "standard_designation": item.get("standard_designation"),
            "manufacturer": item.get("manufacturer"),
            "product_code": item.get("product_code"),
            "dosage_value": value,
            "dosage_unit": item.get("dosage_unit"),
            "mass_kg_m3": round(mass, 3),
            "density_kg_m3": density,
            "solids_percent": solids,
            "carrier_water_kg_m3": round(carrier, 3),
            "nonwater_absolute_volume_m3": round(nonwater_volume, 6),
        },
    }


def _dosage_to_mass(dosage: float, unit: str, density: float | None, binder: float, warnings: list[dict], item: dict) -> float:
    if unit in {"kg/m3", "kg_m3", "kg_per_m3"}:
        return dosage
    if unit in {"%binder", "percent_binder", "%_binder", "kg/100kg", "kg_per_100kg_binder"}:
        return binder * dosage / 100.0
    if unit in {"l/m3", "l_m3", "liter_per_m3"}:
        if density is None:
            warnings.append(_density_required(item, unit))
            return 0.0
        return dosage * density / 1000.0
    if unit in {"l/100kg", "l_per_100kg_binder"}:
        if density is None:
            warnings.append(_density_required(item, unit))
            return 0.0
        liters = dosage * binder / 100.0
        return liters * density / 1000.0
    if unit in {"ml/100kg", "ml_per_100kg_binder"}:
        if density is None:
            warnings.append(_density_required(item, unit))
            return 0.0
        liters = dosage * binder / 100.0 / 1000.0
        return liters * density / 1000.0
    warnings.append(
        {
            "code": "ADMIXTURE_DOSAGE_UNIT_UNSUPPORTED",
            "severity": "fail",
            "message": f"واحد دوز «{unit or 'خالی'}» برای افزودنی «{item.get('name') or 'بدون نام'}» پشتیبانی نمی‌شود.",
            "reference": "Admixture dosage input validation",
        }
    )
    return 0.0


def _correct_aggregate_volume(result: dict, extra_volume: float, mode: str) -> list[dict]:
    warnings: list[dict] = []
    rows = list(result.get("aggregate_analysis") or [])
    if not rows:
        return warnings
    adjustable = rows if mode != "aci_coarse_volume" else [row for row in rows if row.get("material_type") == "fine_aggregate"]
    if not adjustable:
        warnings.append({"code": "ADMIXTURE_VOLUME_NO_ADJUSTABLE_AGGREGATE", "severity": "needs_review", "message": "حجم افزودنی قابل محاسبه است اما سنگدانه قابل تنظیم برای موازنه حجم پیدا نشد.", "reference": "Absolute volume balance"})
        return warnings

    current_volume = sum(_row_absolute_volume(row) for row in adjustable)
    if current_volume <= 0 or extra_volume >= current_volume:
        warnings.append({"code": "ADMIXTURE_VOLUME_CORRECTION_FAILED", "severity": "fail", "message": "حجم غیرآبی افزودنی با حجم سنگدانه قابل تنظیم سازگار نیست.", "reference": "Absolute volume balance"})
        return warnings
    scale = (current_volume - extra_volume) / current_volume
    for row in adjustable:
        for key in ("ssd_mass_kg_m3", "batch_mass_kg_m3", "water_adjustment_kg_m3"):
            if row.get(key) is not None:
                row[key] = round(float(row[key]) * scale, 3)

    fine = sum(float(row.get("ssd_mass_kg_m3") or 0) for row in rows if row.get("material_type") == "fine_aggregate")
    coarse = sum(float(row.get("ssd_mass_kg_m3") or 0) for row in rows if row.get("material_type") == "coarse_aggregate")
    batch = sum(float(row.get("batch_mass_kg_m3") or 0) for row in rows)
    water_adj = sum(float(row.get("water_adjustment_kg_m3") or 0) for row in rows)
    mix = result.setdefault("mix_proportions", {})
    mix["fine_aggregate_kg_m3"] = round(fine, 1)
    mix["coarse_aggregate_kg_m3"] = round(coarse, 1)
    mix["aggregate_ssd_kg_m3"] = round(fine + coarse, 1)
    mix["aggregate_batch_kg_m3"] = round(batch, 1)
    mix["batch_water_adjustment_kg_m3"] = round(water_adj, 1)
    return warnings


def _row_absolute_volume(row: dict) -> float:
    mass = float(row.get("ssd_mass_kg_m3") or 0.0)
    sg = float(row.get("specific_gravity_ssd") or 0.0)
    return mass / (sg * WATER_DENSITY_KG_M3) if sg > 0 else 0.0


def _density_required(item: dict, unit: str) -> dict:
    return {"code": "ADMIXTURE_DENSITY_REQUIRED_FOR_VOLUME_DOSAGE", "severity": "fail", "message": f"برای تبدیل واحد {unit} افزودنی «{item.get('name') or 'بدون نام'}» به جرم، چگالی الزامی است.", "reference": "Manufacturer technical data sheet"}


def _positive_optional(value: object) -> float | None:
    if value is None or value == "": return None
    number = float(value)
    return number if number > 0 else None


def _percent_optional(value: object) -> float | None:
    if value is None or value == "": return None
    number = float(value)
    if not 0 <= number <= 100: raise ValueError("solids_percent must be between 0 and 100")
    return number
