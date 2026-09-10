from __future__ import annotations

ACI_211_OFFICIAL_EVIDENCE = {
    "designation": "ACI PRC-211.1-22",
    "publication_year": 2022,
    "publication_month": 7,
    "publisher": "American Concrete Institute",
    "title": "Selecting Proportions for Normal-Density and High-Density Concrete—Guide",
    "official_product_url": "https://www.concrete.org/store/productdetail?ItemID=211122",
    "official_preview_url": "https://www.concrete.org/Portals/0/Files/PDF/Previews/211.1-22_preview.pdf",
    "preview_scope": {
        "document_identity": "verified",
        "supersedes": "ACI 211.1-91(09)",
        "method_scope": "verified",
        "absolute_volume_basis": "verified",
        "workability_strength_durability_consideration": "verified",
        "trial_batch_adjustment": "verified",
        "numerical_lookup_tables": "not_available_in_public_preview",
    },
    "toc_locations": {
        "water_background": "4.4",
        "air_background": "4.6",
        "w_cm_background": "4.7",
        "selection_process": "5.2",
        "batch_weight_estimation": "5.3",
        "trial_batching": "8",
        "sample_computations": "9",
    },
}

NUMERICAL_RULE_EVIDENCE = {
    "ACI211.WATER.SLUMP_NMSA.AIR": {
        "state": "blocked_authorized_exact_edition_source_required",
        "required_evidence": "exact ACI PRC-211.1-22 numerical relationship/cells and applicable notes",
    },
    "ACI211.AIR.ENTRAPPED.NMSA": {
        "state": "blocked_authorized_exact_edition_source_required",
        "required_evidence": "exact ACI PRC-211.1-22 entrapped-air numerical relationship and notes",
    },
    "ACI211.WCM.STRENGTH.PRELIMINARY": {
        "state": "blocked_authorized_exact_edition_source_required",
        "required_evidence": "exact ACI PRC-211.1-22 preliminary strength-w/cm relationship and interpolation policy",
    },
    "ACI211.COARSE_VOLUME.NMSA_FM": {
        "state": "blocked_authorized_exact_edition_source_required",
        "required_evidence": "exact ACI PRC-211.1-22 coarse-aggregate-volume relationship, FM columns, and notes",
    },
}


def numerical_evidence_is_closed(rule_key: str) -> bool:
    entry = NUMERICAL_RULE_EVIDENCE.get(rule_key)
    return bool(entry and entry.get("state") == "verified_exact_edition")
