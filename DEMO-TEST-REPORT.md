# Demo workflow verification

Verified 27 October 2026 against the local demo at http://localhost:3001/.

## Added sample data

The additive `demo-field-rollout-v2` dataset installs once. Existing records and later edits are preserved. All names, contacts and illustrated evidence are marked DEMO.

- 100 QR labels in one batch, with Admin → District → Area transfer records.
- 12 machines covering MCP, Drum seeder and Laser land leveller.
- 11 lead farmers with location, land size and illustrated handover proof.
- 15 lead/fellow farmer visits with crop, acres, date, recorder, coordinates and illustrated evidence.
- Eight maintenance examples: Area review, District review, State review, Farm Mechanization final review, approved, in progress, completed with costs/proof, and rejected with a reason.

## Try it

Switch accounts using Current account. Area Manager: scan `DEMO-QR-002` to onboard a machine. CF/JCF: scan `DEMO-QR-011` to register a lead farmer or `DEMO-QR-012` to record usage. The on-screen Demo playground provides a downloadable QR PNG. Each approval role has a maintenance example at its own stage; Admin has approved and in-progress repairs.

## Browser proof

Uploaded a real generated QR PNG: decoder returned `DEMO-QR-001`, navigated to its blank label, then Area Manager onboarded a Drum seeder and assigned Chandra. CF registered DEMO Browser Lead Farmer with five acres, photo and coordinates. JCF recorded DEMO Browser Fellow Farmer: Paddy, 2.5 acres, photo and separate field coordinates. The machine retained the same lead custodian and responsible CF. Reload preserved all data. A blank PNG displayed a readable error without navigation.

## Automated verification

Passed: `test:demo`, `test:workflow`, `test:roles`, `test:scenarios`, `test:qr`, TypeScript and production build. QR tests decode original, rotated and inverted pixels and reject blank pixels. Workflow tests cover duplicate registration, missing proof, invalid dates/area, out-of-branch access and role restrictions. Role tests include four sequential approvals, repair completion, scoped notifications and usage blocking/resumption during maintenance.

## Limits

Live physical-camera capture and device GPS acquisition were not exercised. Browser image upload and manually entered coordinates were verified. Physical printing was not performed. The build retains the existing large-bundle warning.
