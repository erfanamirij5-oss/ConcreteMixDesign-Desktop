# G02A Exit Status

Current status: PARTIAL — production safety, traceability, and evidence-gating foundation complete; numerical certification intentionally blocked pending authorized exact-edition evidence.

Closed:
- authoritative ACI PRC-211.1-22 document identity and public scope evidence recorded;
- executable normal-weight rule inventory established;
- machine-readable verification states established;
- existing strength–w/cm extrapolation refusal locked by regression tests;
- independent absolute-volume arithmetic golden case added;
- fail-closed slump policy outside implemented 25–175 mm lookup domain;
- fail-closed NMSA policy prevents nearest-value snapping for non-tabulated production input;
- air-entrained production path no longer accepts a generic exposure placeholder; explicit air content or a valid Freeze/Thaw durability basis is required;
- versioned Standard Profile and ACI 211 rule registry are attached to production output and persisted engineering traceability;
- official exact-edition evidence manifest added with source identity, public-preview scope, and rule-level evidence state;
- runtime/test guard prevents any numerical ACI 211 rule from being promoted to VERIFIED unless its authorized exact-edition evidence state is closed;
- no existing numerical lookup silently promoted to VERIFIED.

Open before G02A can be CLOSED:
- authorized exact-edition numerical evidence for the water/slump/NMSA/air relationship;
- authorized exact-edition numerical evidence for entrapped-air versus NMSA;
- authorized exact-edition numerical evidence for the preliminary strength–w/cm relationship and interpolation policy;
- authorized exact-edition numerical evidence for coarse-aggregate bulk-volume versus NMSA/fine-aggregate FM;
- exact-cell/node and interpolation golden tests backed by those authorized sources.

Exit rule:
G02A must remain PARTIAL while any numerical rule above is `existing_unverified` or its evidence record is `blocked_authorized_exact_edition_source_required`. The software may use existing values only under the current conservative traceability label and fail-closed domain guards; it must not present them as ACI 211.1-22 VERIFIED values.
