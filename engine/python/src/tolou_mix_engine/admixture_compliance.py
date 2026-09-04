from __future__ import annotations


def evaluate_admixture_compliance(
    admixture_system: dict,
    raw_materials: list[dict],
    cementitious_kg_m3: float,
    durability: dict,
    prestressed_concrete: bool,
) -> dict:
    """Check admixture standard designation and quantify its chloride contribution.

    This module intentionally reports chloride from chemical admixtures only. Final mixture
    chloride acceptance is performed by chloride_compliance after all active sources are known.
    """
    warnings: list[dict] = []
    checks: list[dict] = []
    materials_by_id = {str(item.get("id")): item for item in raw_materials if item.get("id")}

    chloride_kg_m3 = 0.0
    chloride_data_complete = True
    for row in list(admixture_system.get("analysis") or []):
        material = materials_by_id.get(str(row.get("material_id")), {})
        subtype = str(row.get("material_subtype") or material.get("material_subtype") or "")
        designation = str(row.get("standard_designation") or material.get("standard_designation") or "").strip()
        standard_check = _check_standard_designation(subtype, designation, row.get("name"))
        checks.append(standard_check)
        if standard_check["status"] != "pass":
            warnings.append(standard_check["warning"])

        mass = float(row.get("mass_kg_m3") or 0.0)
        chloride_percent = material.get("chloride_percent")
        if mass <= 0:
            continue
        if chloride_percent is None:
            chloride_data_complete = False
            warnings.append(
                {
                    "code": "ADMIXTURE_CHLORIDE_DATA_MISSING",
                    "severity": "needs_review",
                    "message": f"درصد کلراید افزودنی «{row.get('name') or 'بدون نام'}» ثبت نشده است.",
                    "reference": "Manufacturer certificate / chloride-ion test data",
                }
            )
            continue
        chloride = float(chloride_percent)
        if chloride < 0:
            warnings.append(
                {
                    "code": "ADMIXTURE_CHLORIDE_INVALID",
                    "severity": "fail",
                    "message": f"درصد کلراید افزودنی «{row.get('name') or 'بدون نام'}» نمی‌تواند منفی باشد.",
                    "reference": "Engineering input validation",
                }
            )
            continue
        chloride_kg_m3 += mass * chloride / 100.0

    exposure = durability.get("exposure_classes", {}) if isinstance(durability, dict) else {}
    corrosion_class = str(exposure.get("corrosion") or "C0")
    governing = durability.get("governing_requirements", {}) if isinstance(durability, dict) else {}
    limits = governing.get("chloride_limit_percent") or {}
    limit_percent = limits.get("prestressed_percent" if prestressed_concrete else "nonprestressed_percent")

    admixture_chloride_percent_binder = (
        chloride_kg_m3 / cementitious_kg_m3 * 100.0 if cementitious_kg_m3 > 0 else None
    )
    chloride_status = "needs_review"
    if limit_percent is not None and admixture_chloride_percent_binder is not None:
        if admixture_chloride_percent_binder > float(limit_percent) + 1e-12:
            chloride_status = "fail"
            warnings.append(
                {
                    "code": "ADMIXTURE_CHLORIDE_ALONE_EXCEEDS_ACI_LIMIT",
                    "severity": "fail",
                    "message": (
                        f"کلراید محاسبه‌شده فقط از افزودنی‌ها معادل {admixture_chloride_percent_binder:.4f}% "
                        f"جرم مواد سیمانی است و از حد {float(limit_percent):.3f}% برای {corrosion_class} بیشتر است."
                    ),
                    "reference": "ACI CODE-318-25 chloride-ion limit",
                }
            )
        else:
            chloride_status = "partial_pass" if chloride_data_complete else "needs_review"

    return {
        "status": "fail" if any(item.get("severity") == "fail" for item in warnings) else "needs_review",
        "standard_checks": checks,
        "chloride": {
            "corrosion_exposure_class": corrosion_class,
            "prestressed_concrete": prestressed_concrete,
            "aci_limit_percent_by_mass_cementitious": limit_percent,
            "admixture_chloride_kg_m3": round(chloride_kg_m3, 6),
            "admixture_chloride_percent_by_mass_cementitious": (
                round(admixture_chloride_percent_binder, 6)
                if admixture_chloride_percent_binder is not None
                else None
            ),
            "admixture_chloride_data_complete": chloride_data_complete,
            "scope": "chemical_admixtures_only",
            "status": chloride_status,
        },
        "warnings": warnings,
        "references": [
            "ASTM C494/C494M - Chemical Admixtures for Concrete",
            "ASTM C260/C260M - Air-Entraining Admixtures for Concrete",
            "ACI CODE-318-25 - Exposure and chloride-ion requirements",
        ],
    }


def _check_standard_designation(subtype: str, designation: str, name: object) -> dict:
    normalized = designation.upper().replace(" ", "")
    product_name = str(name or "بدون نام")
    if subtype == "air_entrainer":
        valid = "C260" in normalized
        expected = "ASTM C260/C260M"
    elif subtype in {"water_reducer", "high_range_water_reducer", "retarder", "accelerator", "calcium_chloride_accelerator"}:
        valid = "C494" in normalized
        expected = "ASTM C494/C494M"
    else:
        return {
            "material_subtype": subtype,
            "product_name": product_name,
            "standard_designation": designation or None,
            "expected_standard": "manufacturer / applicable project specification",
            "status": "needs_review",
            "warning": {
                "code": "ADMIXTURE_STANDARD_PROJECT_SPEC_REVIEW",
                "severity": "needs_review",
                "message": f"برای افزودنی «{product_name}» با نوع {subtype or 'نامشخص'} استاندارد عملکرد باید از مشخصات پروژه/سازنده تأیید شود.",
                "reference": "Project specification / manufacturer qualification data",
            },
        }

    if valid:
        return {
            "material_subtype": subtype,
            "product_name": product_name,
            "standard_designation": designation,
            "expected_standard": expected,
            "status": "pass",
        }
    return {
        "material_subtype": subtype,
        "product_name": product_name,
        "standard_designation": designation or None,
        "expected_standard": expected,
        "status": "needs_review",
        "warning": {
            "code": "ADMIXTURE_STANDARD_DESIGNATION_MISSING_OR_MISMATCHED",
            "severity": "needs_review",
            "message": f"افزودنی «{product_name}» باید انطباق قابل ردیابی با {expected} داشته باشد.",
            "reference": expected,
        },
    }
