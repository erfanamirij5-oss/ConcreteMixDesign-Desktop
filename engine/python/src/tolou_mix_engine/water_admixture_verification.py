from __future__ import annotations


WATER_ADMIXTURE_ASTM_REFERENCES = {
    "C1602/C1602M-22": {
        "kind": "material_specification",
        "verification_state": "identity_scope_verified_public_metadata",
        "acceptance_state": "evidence_blocked_exact_edition_required",
    },
    "C1603-23": {
        "kind": "test_method",
        "verification_state": "identity_scope_verified_public_metadata",
        "acceptance_state": "method_only_no_standalone_acceptance",
    },
    "C494/C494M-24": {
        "kind": "material_specification",
        "verification_state": "identity_scope_verified_public_metadata",
        "acceptance_state": "evidence_blocked_exact_edition_required",
    },
    "C260/C260M-24": {
        "kind": "material_specification",
        "verification_state": "identity_scope_verified_public_metadata",
        "acceptance_state": "evidence_blocked_exact_edition_required",
    },
}


def water_admixture_verification_envelope() -> dict:
    return {
        "authority": "ASTM International",
        "gate": "G02C",
        "domain": "mixing_water_and_admixtures",
        "references": WATER_ADMIXTURE_ASTM_REFERENCES,
        "astm_compliance_claim_allowed": False,
        "claim": (
            "Public ASTM metadata verifies reference identity and general scope only. "
            "C1603 is a measurement method, while C1602, C494 and C260 are specifications; "
            "numerical qualification limits, frequencies and product acceptance relationships "
            "remain evidence-blocked until authorized exact-edition evidence is traced."
        ),
    }


def water_admixture_acceptance_rule_is_verified(_: str) -> bool:
    return False
