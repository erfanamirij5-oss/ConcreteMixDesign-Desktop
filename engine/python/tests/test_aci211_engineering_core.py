from __future__ import annotations

import pytest

from tolou_mix_engine.mix_design.normal_weight import WATER_DENSITY_KG_M3


def test_absolute_volume_remainder_independent_golden_case() -> None:
    # Pure engineering-core arithmetic; no standards lookup values are asserted here.
    water_kg_m3 = 180.0
    cementitious_kg_m3 = 360.0
    cementitious_sg = 3.0
    air_percent = 2.0
    coarse_ssd_kg_m3 = 1000.0
    coarse_sg = 2.5

    occupied = (
        water_kg_m3 / WATER_DENSITY_KG_M3
        + cementitious_kg_m3 / (cementitious_sg * WATER_DENSITY_KG_M3)
        + air_percent / 100.0
        + coarse_ssd_kg_m3 / (coarse_sg * WATER_DENSITY_KG_M3)
    )
    fine_volume = 1.0 - occupied

    assert occupied == pytest.approx(0.72)
    assert fine_volume == pytest.approx(0.28)
