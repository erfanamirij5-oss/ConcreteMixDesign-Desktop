# G01 — Universal Concrete Family Architecture

## Change Impact Report

- Gate: `G01`
- Feature: Universal concrete family registry and engine routing boundary
- Engineering Goal: Make Tolou extensible to multiple concrete families without routing unsupported families through the normal-weight engine.
- Why: The existing product had hard-coded `normal_weight` / `pumped` assumptions in UI and engine scope guards. Future SCC, lightweight, UHPC, FRC and other families require independent strategies and must not be implemented as a giant conditional algorithm.
- Affected Modules: Python engineering engine registry and CLI routing.
- Database Impact: None.
- Python Engine Impact: Adds a concrete-family catalog, canonical IDs, aliases, strategy identifiers, implementation status and explicit command capabilities.
- UI Impact: None in G01. Planned families are not exposed as selectable production options yet.
- IPC Impact: None in G01.
- Security Impact: None.
- Licensing Impact: None.
- Packaging Impact: Bundled Python engine contains the new registry and command; existing executable contract remains compatible.
- Regression Risk: Low to medium. The active `calculate-normal-mix` path remains limited to `normal_weight` and `pumped`; unsupported families fail before proportioning.
- Standards Required: None for the registry itself. G02/G03 will define family-specific scientific matrices and standard rule packs. Strategy names in G01 are architecture identifiers, not claims of implemented standard compliance.
- Tests Required: Registry uniqueness, alias resolution, active/planned capability separation, unsupported-family blocking, existing full Python and desktop regressions, Windows package gate.
- Windows Verification Required: Automated packaging evidence; no new user-visible Windows workflow is claimed by G01.

## Architecture contract

`ConcreteFamilyDefinition` is the stable family descriptor. Each family has:

- canonical `id`
- Persian and English display names
- engineering category
- `design_strategy` identifier
- `implementation_status`
- explicit `supported_commands`
- optional aliases

A family is allowed to enter a calculation command only when both conditions are true:

1. `implementation_status == active`
2. the requested command is explicitly listed in `supported_commands`

Being present in the catalog does **not** mean a mix-design algorithm exists.

## Current active scope

The existing verified engine behavior is preserved:

- `normal_weight` → `calculate-normal-mix`
- `pumped` → `calculate-normal-mix` using the existing normal-weight path and current pumpability-related advisory checks

No other family is activated in G01.

## Registered next-generation families

The architecture now reserves stable identities for:

- Normal-weight
- High-strength
- High-performance
- Self-consolidating
- Pumpable
- Structural lightweight
- Heavyweight
- Fiber-reinforced
- Shotcrete
- Roller-compacted
- Pervious
- Mass concrete
- Underwater/special placement
- Recycled-aggregate
- Low-carbon
- UHPC
- UHPFRC
- Alkali-activated/geopolymer
- Custom/research

These planned entries are capability declarations only. Their scientific input matrices, standards, algorithms, verification cases and acceptance criteria are defined in later gates.

## Anti-loop / anti-rewrite rule

Future concrete engines must attach to the family registry through an explicit strategy/command capability. They must not expand a single universal `calculateMix()` function with family-specific conditional branches.

## G01 acceptance criteria

1. Family IDs and aliases are deterministic and unique.
2. Unsupported/planned families cannot enter an active production calculation command.
3. Existing normal-weight and pumped behavior remains available.
4. The engine can expose its family catalog through `list-concrete-families` for future product layers.
5. Adding a future family does not require changing the normal-weight algorithm.
6. No database migration, licensing change or Golden Baseline mutation is introduced.
7. Full regression and packaging gates pass before G01 is marked automated-verified.
