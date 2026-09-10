# ACI PRC-211.1-22 — Source Evidence Record

## Authority
American Concrete Institute (ACI), Committee 211.

## Edition identity
- Designation: ACI PRC-211.1-22
- Publication: July 2022
- Title: *Selecting Proportions for Normal-Density and High-Density Concrete—Guide*
- ISBN shown by ACI: 978-1-64195-186-9
- Supersedes: ACI 211.1-91(09)

## Official public sources used by G02A
- ACI product record: https://www.concrete.org/store/productdetail?ItemID=211122
- ACI official preview: https://www.concrete.org/Portals/0/Files/PDF/Previews/211.1-22_preview.pdf
- ACI errata portal: https://www.concrete.org/publications/documenterrata.aspx

## Authoritative public evidence captured for Gate 02A
ACI's official product/preview metadata establishes that:
- the guide applies to normal-density concrete, with or without chemical admixtures and supplementary cementitious materials;
- the procedure is based on absolute volumes occupied by mixture constituents;
- aggregate gradation, workability, strength, and durability are considered;
- trial-batch adjustment is part of the procedure;
- Chapter 4 contains background on water, air, and w/cm;
- Chapter 5 contains the proportion-selection procedure and estimation of batch weights;
- Chapter 8 covers trial batching;
- Chapter 9 contains sample computations;
- Appendix B addresses high-density concrete.

## Numerical evidence boundary
The public ACI preview establishes document identity, scope, and procedure structure, but the numerical lookup relationships needed for cell-by-cell verification are not available in the public preview used by G02A. Therefore the following rules remain blocked from VERIFIED status until checked against an authorized exact-edition copy:
- ACI211.WATER.SLUMP_NMSA.AIR
- ACI211.AIR.ENTRAPPED.NMSA
- ACI211.WCM.STRENGTH.PRELIMINARY
- ACI211.COARSE_VOLUME.NMSA_FM

## Verification policy
For each numerical rule, closure requires all of the following:
1. authorized exact-edition source evidence;
2. clause/table/figure locator sufficient for audit without copying the publication into the repository;
3. exact-node/cell golden tests;
4. interpolation/boundary tests where interpolation is actually authorized;
5. explicit review of table notes, exceptions, and applicability;
6. rule state changed to `verified` only after the machine-readable evidence record is `verified_exact_edition`.

## Copyright handling
Tolou stores designation, edition, rule keys, source locators, verification state, and engineering test evidence. It does not reproduce the copyrighted ACI publication wholesale in the repository.

## Engineering consequence
G02A can harden domain guards, provenance, and verification enforcement without altering or certifying existing numerical lookup values. Promotion of a numerical rule to `verified` is fail-closed until the exact-edition evidence contract is satisfied.
