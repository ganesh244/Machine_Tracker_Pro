# Complete role flow and transfer-level check

Checked 29 October 2026. New scenarios ran in an isolated browser-demo service store and temporary MongoDB replica set. No test users, QR batches or reports were added to production Atlas; AWD was not touched.

**Result: all tested role, seasonal and transfer workflows passed. One additional maintenance service-date defect was reproduced, corrected and verified.**

## Start-to-end flow

| Step | Role | Result |
|---|---|---|
| Generate QR batch and print data | Admin | Passed; other six roles cannot generate QR labels. Prior print tests verify 16 stickers per A4 sheet and QR decoding. |
| Distribute blank labels | Admin → District → Area | Passed; onboarding requires the label to be held by the onboarding user. Vacant-manager routing is covered by the reporting tests. |
| Onboard MCP, drum seeder and laser land leveller | Area Manager | Passed; machine type, CF, village, GPS and proof persist. |
| Onboard lead farmer | CF / JCF / Area Manager | Passed; duplicate current handover prevented; delinking permits a fresh record while keeping history. |
| Plan and send seasonal alerts | Admin / District / FM | Passed; geography and machine type restrictions, pre/post windows, deduplication and read-state retention verified. Late onboarded CF/JCF accounts receive existing matching campaigns. |
| Start season | CF / JCF / Area Manager | Passed; QR identification, pre-season evidence and opening MCP counter saved. Premature final acreage rejected. |
| Report seasonal usage | CF / JCF / Area Manager | Passed for two seasons; meter conversion and crop totals reconcile, revisions do not double count, optional visits remain separate. |
| End season and store machine | Field team | Passed; post-season cleaning/lubrication/covering/secure/shaded-storage checklist and evidence saved. |
| Raise maintenance | CF / JCF / Area / District | Passed; failed checks escalate, stopped machines pause usage, open duplicates rejected. |
| Approve maintenance | Area → District → State → FM | Passed; out-of-order reviewers denied, absent managers skipped, FM final approval retained. |
| Coordinate repair | Admin | Passed only after final approval. |
| Complete repair | Responsible CF / JCF | Passed; repair details, parts, cost, evidence and workable confirmation; status restored and all reporting levels notified. |

## Transfer matrix exercised on the same permanent QR

| Transfer | Actor tested | Positive result | Restrictions / history |
|---|---|---|---|
| New village, same CF | Area Manager | Passed | Current handover closes; next farmer can be registered. |
| Between CFs within one area | Area Manager | Passed | CF/JCF cannot transfer the asset themselves. |
| Between areas in one district | District Manager | Passed | An Area Manager cannot move the machine outside their own branch. |
| Between districts in one state | State Manager | Passed | District/Area/field roles cannot cross their branch boundary. |
| Between states | Farm Mechanization Team | Passed | Source State Manager and lower roles cannot transfer across states. |
| Return transfer between states | Admin | Passed | Same QR, photos and original acreage preserved. |
| Delink farmer without transferring machine | JCF | Passed | Old farmer becomes released; Area Manager can onboard the next farmer. |
| Cross-state transfer while maintenance is pending | FM | Passed | Machine remains stopped. Receiving Area/District/State/FM approve; old managers are rejected; receiving JCF completes the repair. |

Each transfer checked source/destination CF, village/state/district, current-farmer closure, next-farmer registration, stale form rejection, unchanged QR and original photo data, old season report preservation, outgoing transfer receipts, receiving-team access and seasonal reminder routing. Source CFs lose access to the current asset while retaining their applicable movement/history records.

The new transfer test passed **10 workflow groups** and rejected **47 invalid/unauthorized actions**. Result file: `audit/transfer-level-results.json`. Re-run: `npm run test:transfer-levels`.

## Two-season evidence

The continuous service scenario again passed **11 workflow groups**: three machines, six seasonal production reports, twelve inspections, **500 + 400 = 900 acres**. Crop totals: Soybean 150, Maize 360, Paddy 390. The original reporting branch retains its historical 650 acres; the receiving branch sees its own 250; Admin/FM/State see the complete 900; unrelated AP users see zero.

The separate authenticated MongoDB API scenario also passed, including two-season records, protected media, user sessions, scope checks, report corrections, four maintenance approval stages, repair completion and notification read ownership.

## Additional issue found and fixed

Repair completion accepted a service date such as `2026-02-30`, despite the earlier calendar fix covering seasonal schedules. A shared exact calendar-date validator now protects both seasonal schedules and maintenance reports. India timezone is used to decide whether the service date is in the future.

Regression checks reject 30 February, a non-leap-year 29 February, 31 April and future service dates; a valid completion still restores the machine. The MongoDB API rejects invalid completion without changing the request from `in_progress`.

## Validation and limits

New/affected checks passed: `test:transfer-levels`, `test:two-seasons`, `test:backend`, `test:roles`, `test:seasons`, `test:season-management`, `test:season-production`, `test:movements`, `lint`, `build`.

The other unchanged workflows reuse the immediately preceding 19-suite audit and 42 browser page checks; they are not presented as newly rerun UI tests. This pass did not physically operate a camera, confirm GPS accuracy or print labels. It verifies service/API workflows and data behavior, not every possible input combination or production concurrency/load condition.
