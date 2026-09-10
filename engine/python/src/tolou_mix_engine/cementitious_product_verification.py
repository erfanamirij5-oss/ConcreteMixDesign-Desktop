from __future__ import annotations

CEMENTITIOUS_PRODUCT_STANDARDS = {
    "portland_cement": ("C150",),
    "blended_cement": ("C595", "C1157"),
    "cement": ("C150", "C595", "C1157"),
    "slag_cement": ("C989",),
    "fly_ash": ("C618",),
    "natural_pozzolan": ("C618",),
    "silica_fume": ("C1240",),
}


def classify_cementitious_product_designation(item: dict) -> dict:
    """Classify product-standard designation evidence without asserting compliance.

    A designation token can establish that a material record claims an ASTM product
    standard identity. It cannot, by itself, prove that the supplied product satisfies
    the specification's acceptance requirements or that the recorded edition is the
    one reviewed by Tolou.
    """
    subtype = str(item.get("material_subtype") or item.get("material_type") or "")
    designation = str(item.get("standard_designation") or "").strip()
    normalized = _normalize(designation)
    expected = CEMENTITIOUS_PRODUCT_STANDARDS.get(subtype)

    base = {
        "material_id": item.get("id"),
        "name": item.get("name"),
        "material_subtype": subtype,
        "standard_designation": designation or None,
        "expected_standard_tokens": list(expected or ()),
    }

    if not expected:
        return {
            **base,
            "identity_state": "project_review_required",
            "verification_state": "not_verified",
            "compliance_claim_allowed": False,
            "reason": "No ASTM product-standard family is deterministically assigned for this subtype.",
        }

    matched = next((token for token in expected if token in normalized), None)
    if matched is None:
        return {
            **base,
            "identity_state": "missing_or_mismatched",
            "verification_state": "not_verified",
            "compliance_claim_allowed": False,
            "reason": "The stored designation does not match the expected ASTM product-standard family.",
        }

    return {
        **base,
        "identity_state": "designation_recognized",
        "matched_standard_token": matched,
        "verification_state": "identity_only_unverified_acceptance",
        "compliance_claim_allowed": False,
        "reason": (
            "Designation recognition proves record identity only; exact-edition acceptance evidence "
            "and product qualification are required before an ASTM compliance claim is allowed."
        ),
    }


def _normalize(value: str) -> str:
    return value.upper().replace(" ", "").replace("-", "").replace("/", "")
