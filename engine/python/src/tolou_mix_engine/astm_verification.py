from __future__ import annotations

"""Machine-readable G02C verification boundary for ASTM references.

This registry deliberately separates public identity/scope evidence from
standards-derived acceptance criteria. A designation appearing here never
promotes an executable numerical rule to verified by itself.
"""

ASTM_VERIFICATION_REGISTRY: dict[str, dict[str, str]] = {
    "C33/C33M-24a": {"kind": "material_specification", "state": "identity_scope_verified_public_metadata"},
    "C117-23": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C127-25": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C128-25": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C136/C136M-25": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C29/C29M-23": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C88/C88M-24": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C142/C142M-17(2023)": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C123/C123M-23": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C1260-23": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C1293/C1293M-23ae1": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C1567-25": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C1778-25": {"kind": "guide", "state": "identity_scope_verified_public_metadata"},
    "C150/C150M-24": {"kind": "material_specification", "state": "identity_scope_verified_public_metadata"},
    "C1157/C1157M-25": {"kind": "material_specification", "state": "identity_scope_verified_public_metadata"},
    "C494/C494M-24": {"kind": "material_specification", "state": "identity_scope_verified_public_metadata"},
    "C260/C260M-24": {"kind": "material_specification", "state": "identity_scope_verified_public_metadata"},
    "C1602/C1602M-22": {"kind": "material_specification", "state": "identity_scope_verified_public_metadata"},
    "C1603-23": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C1218/C1218M-20": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
    "C1580-20": {"kind": "test_method", "state": "identity_scope_verified_public_metadata"},
}

STANDARDS_ACCEPTANCE_STATE = "evidence_blocked_exact_edition_required"


def astm_verification_envelope() -> dict:
    return {
        "authority": "ASTM International",
        "gate": "G02C",
        "references": ASTM_VERIFICATION_REGISTRY,
        "acceptance_rule_state": STANDARDS_ACCEPTANCE_STATE,
        "claim": (
            "Public ASTM metadata may verify designation identity and general scope only; "
            "numerical acceptance limits and qualification relationships require exact-edition evidence."
        ),
    }


def acceptance_rule_is_verified(_: str) -> bool:
    """Fail closed until a specific acceptance rule has authorized exact-edition evidence."""
    return False
