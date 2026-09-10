from tolou_mix_engine.chloride_compliance import evaluate_full_chloride_compliance


def _durability(corrosion="C2", sulfate="S0", limit=0.15):
    return {
        "exposure_classes": {"corrosion": corrosion, "sulfate": sulfate},
        "governing_requirements": {
            "chloride_limit_percent": {"nonprestressed_percent": limit, "prestressed_percent": 0.06}
        },
    }


def _base():
    result = {
        "mix_proportions": {"cementitious_kg_m3": 400.0, "water_to_add_kg_m3": 150.0},
        "aggregate_analysis": [
            {"material_id": "sand", "material_name": "Sand", "ssd_mass_kg_m3": 800.0},
            {"material_id": "stone", "material_name": "Stone", "ssd_mass_kg_m3": 1000.0},
        ],
    }
    binder = {"components": [{"material_id": "cement", "name": "Cement", "mass_kg_m3": 400.0}]}
    admixture = {"chloride": {"admixture_chloride_kg_m3": 0.002, "admixture_chloride_data_complete": True}}
    materials = {
        "cementitious": [{
            "id": "cement", "chloride_percent": 0.01,
            "chloride_test_method": "LAB-METHOD-CEM",
            "chloride_test_edition": "2026",
            "chloride_evidence_ref": "CEM-CL-001",
        }],
        "aggregates": [
            {
                "id": "sand", "chloride_percent": 0.001,
                "chloride_test_method": "LAB-METHOD-AGG",
                "chloride_test_edition": "2025",
                "chloride_evidence_ref": "SAND-CL-001",
            },
            {
                "id": "stone", "chloride_percent": 0.001,
                "chloride_test_method": "LAB-METHOD-AGG",
                "chloride_test_edition": "2025",
                "chloride_evidence_ref": "STONE-CL-001",
            },
        ],
        "admixtures": [
            {
                "id": "adm", "material_type": "admixture", "name": "HRWR",
                "chloride_percent": 0.02,
                "chloride_test_method": "SUPPLIER-COA",
                "chloride_test_edition": "2026-01",
                "chloride_evidence_ref": "ADM-CL-001",
            },
            {
                "id": "water", "material_type": "water", "name": "Mains", "chloride_mg_l": 100.0,
                "chloride_test_method": "LAB-METHOD-WATER",
                "chloride_test_edition": "2026",
                "chloride_evidence_ref": "WATER-CL-001",
            },
        ],
    }
    return result, binder, admixture, materials


def test_full_chloride_passes_when_all_sources_complete_and_below_limit():
    result, binder, admixture, materials = _base()
    checked = evaluate_full_chloride_compliance(result, binder, admixture, materials, _durability(), {})
    assert checked["status"] == "pass"
    assert checked["data_complete"] is True
    assert checked["total_chloride_percent_by_mass_cementitious"] < 0.15
    assert len(checked["source_breakdown"]) == 5


def test_chloride_source_breakdown_preserves_provenance_without_inference():
    result, binder, admixture, materials = _base()
    checked = evaluate_full_chloride_compliance(result, binder, admixture, materials, _durability(), {})

    binder_row = next(row for row in checked["source_breakdown"] if row["source_category"] == "binder")
    assert binder_row["chloride_provenance"] == {
        "material_id": "cement",
        "test_method": "LAB-METHOD-CEM",
        "test_edition": "2026",
        "evidence_ref": "CEM-CL-001",
    }

    sand_row = next(row for row in checked["source_breakdown"] if row.get("material_id") == "sand")
    assert sand_row["chloride_provenance"]["evidence_ref"] == "SAND-CL-001"

    water_row = next(row for row in checked["source_breakdown"] if row["source_category"] == "water")
    assert water_row["chloride_provenance"]["test_method"] == "LAB-METHOD-WATER"
    assert water_row["chloride_provenance"]["test_edition"] == "2026"

    admixture_row = next(row for row in checked["source_breakdown"] if row["source_category"] == "admixture")
    assert admixture_row["provenance_sources"] == [{
        "material_id": "adm",
        "test_method": "SUPPLIER-COA",
        "test_edition": "2026-01",
        "evidence_ref": "ADM-CL-001",
    }]


def test_missing_active_source_chloride_prevents_full_pass():
    result, binder, admixture, materials = _base()
    materials["aggregates"][0]["chloride_percent"] = None
    checked = evaluate_full_chloride_compliance(result, binder, admixture, materials, _durability(), {})
    assert checked["status"] == "needs_review"
    assert checked["data_complete"] is False
    assert any(item["code"] == "AGGREGATE_CHLORIDE_DATA_MISSING" for item in checked["warnings"])


def test_total_chloride_above_aci_limit_fails():
    result, binder, admixture, materials = _base()
    materials["aggregates"][1]["chloride_percent"] = 0.10
    checked = evaluate_full_chloride_compliance(result, binder, admixture, materials, _durability(limit=0.15), {})
    assert checked["status"] == "fail"
    assert any(item["code"] == "TOTAL_CHLORIDE_EXCEEDS_ACI_LIMIT" for item in checked["warnings"])


def test_multiple_water_sources_require_shares():
    result, binder, admixture, materials = _base()
    materials["admixtures"].append({"id": "recycle", "material_type": "water", "name": "Recycle", "chloride_mg_l": 200.0})
    checked = evaluate_full_chloride_compliance(result, binder, admixture, materials, _durability(), {})
    assert checked["status"] == "needs_review"
    assert any(item["code"] == "WATER_SOURCE_SHARE_MISSING" for item in checked["warnings"])


def test_calcium_chloride_is_rejected_for_s2():
    result, binder, admixture, materials = _base()
    materials["admixtures"].append({"id": "cacl2", "material_type": "admixture", "material_subtype": "calcium_chloride_accelerator", "name": "CaCl2 accelerator"})
    checked = evaluate_full_chloride_compliance(result, binder, admixture, materials, _durability(sulfate="S2"), {})
    assert checked["status"] == "fail"
    assert checked["calcium_chloride_detected"] is True
    assert any(item["code"] == "CALCIUM_CHLORIDE_NOT_PERMITTED" for item in checked["warnings"])


def test_calcium_chloride_is_rejected_for_prestressed_concrete():
    result, binder, admixture, materials = _base()
    materials["admixtures"].append({"id": "cacl2", "material_type": "admixture", "name": "Calcium Chloride"})
    checked = evaluate_full_chloride_compliance(result, binder, admixture, materials, _durability(), {"prestressed_concrete": True})
    assert checked["status"] == "fail"
