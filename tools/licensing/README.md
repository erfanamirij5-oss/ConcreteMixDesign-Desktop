# Tolou offline license issuing

The installed application contains only the Ed25519 public verification key. The matching private signing key must be stored outside this repository and outside the Windows installer.

## Issue a license

1. Ask the customer to open the Licensing screen and send the 64-character machine code shown there.
2. Keep the private signing key in an offline or otherwise access-controlled location.
3. Run the issuer CLI with Node.js 20+.

Example for a one-year commercial license:

```powershell
node tools/licensing/sign-license.mjs `
  --private-key C:\secure\tolou-license-signing-private-key.pem `
  --machine <CUSTOMER_MACHINE_CODE> `
  --license-id TOLOU-2026-0001 `
  --customer "Customer Name" `
  --edition professional `
  --type commercial `
  --expires 2027-09-05T00:00:00.000Z `
  --features engineering,reports,trial-mix `
  --output TOLOU-2026-0001.license.json
```

For a perpetual commercial license, replace `--expires ...` with `--perpetual`.

Trial and grace licenses must be time-limited and use `--type trial` or `--type grace`.

## Security rules

- Never commit, email indiscriminately, or package the private signing key.
- Do not generate customer licenses inside the customer application.
- The machine code is a SHA-256-derived binding value; raw hardware identifiers are not required for license issuance.
- Generate a unique license id for every entitlement.
- Keep a separate business record of issued license id, customer, machine code, edition and expiry.
- If the private signing key is lost, existing licenses continue to verify but new licenses cannot be issued with the embedded public key. If it is compromised, rotate the signing key in a future application release.
