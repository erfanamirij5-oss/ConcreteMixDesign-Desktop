# G02B — Sulfate Test-Method Provenance Boundary

## Purpose
Record the authoritative public metadata that can safely identify sulfate source-test methods without promoting any ACI 318-25 exposure threshold or acceptance rule to VERIFIED.

## Soil sulfate measurement
- ASTM C1580-20 is the current active ASTM test method identified by ASTM for water-soluble sulfate in soil.
- ASTM public scope states that the method determines water-soluble sulfate in soils and was developed for 0.02 to 3.33 % sulfate by mass.
- Tolou field under audit: `soil_water_soluble_sulfate_percent`.
- Provenance state: `method_identity_supported_public_metadata`.
- Classification threshold mapping to ACI CODE-318-25: `blocked_authorized_exact_edition_source_required`.

## Water sulfate measurement
- ASTM D516-22 is the current active ASTM test method identified by ASTM for sulfate ion in water.
- ASTM public scope identifies it as a turbidimetric sulfate-ion test method for water and states a direct method range of 5 to 40 mg/L; ASTM also points to D4327 as an alternative method.
- Tolou field under audit: `water_dissolved_sulfate_ppm`.
- Important engineering boundary: a raw environmental result above the direct analytical range stated in public D516 metadata cannot, by public metadata alone, prove how the laboratory obtained or validated that result (for example dilution or another method). Tolou must therefore record the actual laboratory method/evidence rather than infer D516 solely from the numeric value.
- Provenance state: `method_identity_supported_public_metadata`.
- Classification threshold mapping to ACI CODE-318-25: `blocked_authorized_exact_edition_source_required`.

## Sulfate-resistance performance evidence
- ASTM C1012/C1012M-24a is the current active ASTM test method identified by ASTM for length change of hydraulic-cement mortars exposed to a sulfate solution.
- ASTM public metadata supports method identity and general sulfate-resistance assessment scope.
- Tolou may recognize C1012 evidence metadata, but no ACI acceptance relationship, expansion limit, age criterion, exception, or pass/fail threshold is certified from public metadata alone.
- Provenance state: `method_identity_supported_public_metadata_acceptance_blocked`.

## Required production evidence model
Future verified sulfate assessment should retain, where applicable:
- source medium: soil / water / seawater;
- measured sulfate value and unit;
- laboratory test method designation and exact edition;
- laboratory report/evidence reference;
- sampling/source reference when available;
- ACI CODE-318-25 exact-edition locator for the classification relationship;
- applicability notes/exceptions;
- independent boundary tests around every classification node.

## Current G02B rule
Existing numerical S0/S1/S2/S3 classifier thresholds remain `existing_unverified`. No threshold is changed or promoted by this provenance record. Public ASTM pages establish method identity/scope only; authorized exact-edition ACI evidence is still required to close the classification relationship.
