# Gate 07 — Report Center

Commercial v1.0 report scope:

- Mix Design Report
- Engineering Calculation Report
- Material Summary
- Durability Compliance
- Gradation / Blend Report
- Revision Identity
- Production Sheet
- PDF export and Print
- controlled Persian/English presentation
- laboratory/logo/revision/date/standard/signature identity
- Excel export only where materially useful

## Architectural rules

1. Reports are generated from persisted SQLite data, not transient React state.
2. Every engineering report preserves calculation method, standards, assumptions, warnings, limitations and revision identity where available.
3. Historical reports must remain traceable to the mix-design revision used at generation time.
4. PDF and Print share the same canonical report model and renderer.
5. No report may silently invent missing engineering values; unavailable values are rendered explicitly as unavailable/not recorded.
