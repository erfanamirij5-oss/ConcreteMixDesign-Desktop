from __future__ import annotations

PSI_TO_MPA = 0.006894757293168361
STANDARD_VERSION = "ACI_CODE_318_25"

EXPOSURE_REQUIREMENTS = {
    "F0": {"max_w_cm": None, "min_strength_psi": 2500},
    "F1": {"max_w_cm": 0.55, "min_strength_psi": 3500},
    "F2": {"max_w_cm": 0.45, "min_strength_psi": 4500},
    "S0": {"max_w_cm": None, "min_strength_psi": 2500},
    "S1": {"max_w_cm": 0.50, "min_strength_psi": 4000},
    "S2": {"max_w_cm": 0.45, "min_strength_psi": 4500},
    "S3": {"max_w_cm": 0.45, "min_strength_psi": 5000},
    "W0": {"max_w_cm": None, "min_strength_psi": 2500},
    "W1": {"max_w_cm": None, "min_strength_psi": 2500},
    "W2": {"max_w_cm": 0.50, "min_strength_psi": 4000},
    "C0": {"max_w_cm": None, "min_strength_psi": 2500},
    "C1": {"max_w_cm": None, "min_strength_psi": 2500},
    "C2": {"max_w_cm": 0.40, "min_strength_psi": 5000},
}

CHLORIDE_LIMITS = {
    "C0": {"nonprestressed_percent": 1.00, "prestressed_percent": 0.06},
    "C1": {"nonprestressed_percent": 0.30, "prestressed_percent": 0.06},
    "C2": {"nonprestressed_percent": 0.15, "prestressed_percent": 0.06},
}

AIR_CONTENT_PERCENT = {
    9.5: {"F1": 6.0, "F2": 7.5},
    12.5: {"F1": 5.5, "F2": 7.0},
    19.0: {"F1": 5.0, "F2": 6.0},
    25.0: {"F1": 4.5, "F2": 6.0},
    37.5: {"F1": 4.5, "F2": 5.5},
    50.0: {"F1": 4.0, "F2": 5.0},
    75.0: {"F1": 3.5, "F2": 4.5},
}


def evaluate_durability(payload: dict) -> dict:
    conditions = payload.get("conditions", {}) if isinstance(payload, dict) else {}
    nmsa_mm = float(payload.get("max_aggregate_size_mm", 19) or 19)
    classes = {
        "freeze_thaw": classify_freeze_thaw(conditions),
        "sulfate": classify_sulfate(conditions),
        "water": classify_water(conditions),
        "corrosion": classify_corrosion(conditions),
    }

    class_codes = list(classes.values())
    requirements = [EXPOSURE_REQUIREMENTS[code] for code in class_codes]
    w_cm_values = [item["max_w_cm"] for item in requirements if item["max_w_cm"] is not None]
    min_strength_psi = max(int(item["min_strength_psi"]) for item in requirements)
    governing_max_w_cm = min(w_cm_values) if w_cm_values else None

    freeze_class = classes["freeze_thaw"]
    target_air = air_requirement(freeze_class, nmsa_mm)
    corrosion_class = classes["corrosion"]

    checks = []
    for category, code in classes.items():
        req = EXPOSURE_REQUIREMENTS[code]
        checks.append(
            {
                "category": category,
                "exposure_class": code,
                "max_w_cm": req["max_w_cm"],
                "min_strength_psi": req["min_strength_psi"],
                "min_strength_mpa": round(req["min_strength_psi"] * PSI_TO_MPA, 1),
                "reference": "ACI CODE-318-25 Table 19.3.2.1",
            }
        )

    warnings = build_warnings(classes, conditions, nmsa_mm, target_air)

    return {
        "status": "warning" if warnings else "pass",
        "standard": STANDARD_VERSION,
        "exposure_classes": classes,
        "governing_requirements": {
            "max_w_cm": governing_max_w_cm,
            "min_strength_psi": min_strength_psi,
            "min_strength_mpa": round(min_strength_psi * PSI_TO_MPA, 1),
            "target_air_percent": target_air,
            "chloride_limit_percent": CHLORIDE_LIMITS[corrosion_class],
        },
        "checks": checks,
        "warnings": warnings,
        "sulfate_requirements": sulfate_requirements(classes["sulfate"]),
        "traceability": {
            "exposure_categories": "ACI CODE-318-25 Table 19.3.1.1",
            "mixture_requirements": "ACI CODE-318-25 Table 19.3.2.1",
            "air_content": "ACI CODE-318-25 Table 19.3.3.1",
            "soil_sulfate_test": "ASTM C1580",
            "water_sulfate_test": "ASTM D516",
            "chloride_test": "ASTM C1218/C1218M",
        },
    }


def classify_freeze_thaw(conditions: dict) -> str:
    if not bool(conditions.get("freeze_thaw_exposure", False)):
        return "F0"
    water_exposure = str(conditions.get("freeze_water_exposure") or "limited").lower()
    return "F2" if water_exposure == "frequent" else "F1"


def classify_sulfate(conditions: dict) -> str:
    if bool(conditions.get("seawater_exposure", False)):
        return "S1"
    soil = optional_float(conditions.get("soil_water_soluble_sulfate_percent"))
    water = optional_float(conditions.get("water_dissolved_sulfate_ppm"))
    severity = 0
    if soil is not None:
        severity = max(severity, 3 if soil > 2.0 else 2 if soil >= 0.20 else 1 if soil >= 0.10 else 0)
    if water is not None:
        severity = max(severity, 3 if water > 10000 else 2 if water >= 1500 else 1 if water >= 150 else 0)
    return ("S0", "S1", "S2", "S3")[severity]


def classify_water(conditions: dict) -> str:
    if not bool(conditions.get("water_contact", False)):
        return "W0"
    if bool(conditions.get("low_permeability_required", False)):
        return "W2"
    return "W1"


def classify_corrosion(conditions: dict) -> str:
    if not bool(conditions.get("moisture_exposure", False)):
        return "C0"
    if bool(conditions.get("external_chloride_exposure", False)):
        return "C2"
    return "C1"


def air_requirement(freeze_class: str, nmsa_mm: float) -> float | None:
    if freeze_class == "F0":
        return None
    selected = min(AIR_CONTENT_PERCENT, key=lambda item: abs(item - nmsa_mm))
    return AIR_CONTENT_PERCENT[selected][freeze_class]


def sulfate_requirements(exposure_class: str) -> dict:
    if exposure_class == "S0":
        return {"cementitious_material_restriction": "none", "calcium_chloride": "permitted"}
    if exposure_class == "S1":
        return {
            "cementitious_material_restriction": "ASTM C150 Type II, ASTM C595 MS, ASTM C1157 MS or qualified alternative",
            "calcium_chloride": "permitted",
        }
    if exposure_class == "S2":
        return {
            "cementitious_material_restriction": "ASTM C150 Type V, ASTM C595 HS, ASTM C1157 HS or qualified alternative",
            "calcium_chloride": "not_permitted",
        }
    return {
        "cementitious_material_restriction": "ACI 318-25 S3 Option 1 or Option 2; sulfate-resistant system required",
        "calcium_chloride": "not_permitted",
        "astm_c1012_verification": "required where alternative combinations are used",
    }


def build_warnings(classes: dict, conditions: dict, nmsa_mm: float, target_air: float | None) -> list[dict]:
    warnings: list[dict] = []
    if classes["sulfate"] == "S3":
        warnings.append(
            {
                "code": "S3_OPTION_SELECTION_REQUIRED",
                "severity": "needs_review",
                "message": "برای S3 باید گزینه سیستم سیمانی مقاوم به سولفات و مدارک ASTM C1012/سابقه عملکرد توسط مهندس انتخاب و ثبت شود.",
                "reference": "ACI CODE-318-25 Table 19.3.2.1 and 26.4.2.2(c)",
            }
        )
    if classes["corrosion"] == "C2" and not bool(conditions.get("reinforced_or_embedded_metal", True)):
        warnings.append(
            {
                "code": "C2_PLAIN_CONCRETE_REVIEW",
                "severity": "needs_review",
                "message": "C2 برای بتن ساده ممکن است طبق ضوابط عضو و جزئیات مدفون‌شده نیازمند بازبینی مهندس باشد.",
                "reference": "ACI CODE-318-25 R19.3.2",
            }
        )
    if target_air is not None and nmsa_mm not in AIR_CONTENT_PERCENT:
        warnings.append(
            {
                "code": "AIR_TABLE_NMSA_SNAPPED",
                "severity": "needs_review",
                "message": "اندازه اسمی سنگدانه برای جدول هوا به نزدیک‌ترین NMSA استاندارد نگاشت شد.",
                "reference": "ACI CODE-318-25 Table 19.3.3.1",
            }
        )
    return warnings


def optional_float(value: object) -> float | None:
    if value is None or value == "":
        return None
    return float(value)
