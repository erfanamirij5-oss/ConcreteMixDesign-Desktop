from __future__ import annotations

DEFAULT_SG = {"cement": 3.15, "slag_cement": 2.90, "fly_ash": 2.35, "silica_fume": 2.20, "natural_pozzolan": 2.40, "calcined_clay": 2.60, "limestone_filler": 2.70}


def allocate_cementitious(materials: list[dict], total_kg_m3: float) -> dict:
    """Allocate total cementitious mass across independently traced binder sources."""
    rows = [item for item in materials if str(item.get("material_type")) in {"cement", "scm"}]
    if not rows:
        return {"components": [], "weighted_specific_gravity": 3.15, "warnings": [{"code": "NO_BINDER_RECORDS", "severity": "needs_review", "message": "هیچ سیمان/SCM ثبت نشده است؛ وزن مخصوص پیش‌فرض سیمان 3.15 استفاده شد.", "reference": "ACI PRC-211.1-22"}]}

    explicit = [float(item.get("binder_share_percent")) for item in rows if item.get("binder_share_percent") is not None]
    warnings: list[dict] = []
    if len(explicit) != len(rows):
        if len(rows) == 1:
            shares = [100.0]
        else:
            warnings.append({"code": "INCOMPLETE_BINDER_SHARES", "severity": "fail", "message": "برای سیستم سیمانی چندجزئی، سهم جرمی تمام سیمان‌ها و SCMها باید مشخص باشد.", "reference": "ACI 211.1 absolute-volume proportioning"})
            shares = [float(item.get("binder_share_percent") or 0) for item in rows]
    else:
        shares = explicit

    total_share = sum(shares)
    if abs(total_share - 100.0) > 0.01:
        warnings.append({"code": "BINDER_SHARES_NOT_100", "severity": "fail", "message": f"جمع سهم مواد سیمانی {total_share:.2f}٪ است؛ باید دقیقاً 100٪ باشد.", "reference": "Mass balance"})

    components = []
    absolute_volume = 0.0
    for item, share in zip(rows, shares):
        subtype = str(item.get("material_subtype") or item.get("material_type") or "cement")
        sg = float(item.get("specific_gravity") or DEFAULT_SG.get(subtype, 3.0))
        mass = total_kg_m3 * share / 100.0
        absolute_volume += mass / (sg * 1000.0)
        components.append({"material_id": item.get("id"), "name": item.get("name"), "material_type": item.get("material_type"), "material_subtype": subtype, "standard_designation": item.get("standard_designation"), "share_percent": round(share, 3), "mass_kg_m3": round(mass, 1), "specific_gravity": round(sg, 3), "replacement_percent": item.get("replacement_percent")})

    weighted_sg = total_kg_m3 / (absolute_volume * 1000.0) if absolute_volume > 0 else 3.15
    return {"components": components, "weighted_specific_gravity": round(weighted_sg, 4), "absolute_volume_m3": round(absolute_volume, 6), "warnings": warnings}
