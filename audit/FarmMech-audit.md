# FarmMech two-season and role audit

Audit date: 29 October 2026. Source revision: `f8f4f1a`.

**Update: all three confirmed audit findings are fixed and regression-tested. The two-season journey and all 19 original test suites pass. Physical-device checks remain outside this result.**

Remediation: newly onboarded CF/JCF accounts are added to matching campaigns immediately; regular dispatch backfills older saved recipient lists while preserving read state. Calendar dates must round-trip exactly on create and edit, including leap years. Selected Analytics tabs now keep white text on dark green while hovered or keyboard-focused. Browser verification at desktop and 390px widths passed.

All new scenario writes used an isolated in-memory demo store or a temporary MongoDB replica set. This audit did not add test users, machines, schedules or reports to production Atlas, and did not touch AWD. The earlier 100-acre production DEMO report is a separate record and was not changed by this audit.

## Original findings (all resolved)

| Severity | Finding | Effect | Reproduction / recommended correction |
|---|---|---|---|
| High | Newly onboarded machine / new CF misses an existing machine-type campaign | An MCP matches the plan geographically and by type, but its new CF cannot see the season, receive its alerts or submit its report. | Create an MCP-type plan; create another CF in that district; onboard an MCP under them; dispatch alerts. The CF remains outside stored `recipientIds`. Confirmed in both the browser-demo service and authenticated MongoDB API. Refresh matching campaign recipients after onboarding (and after later assignment/team changes); backfill existing campaigns. |
| Low | Server accepts impossible calendar dates | An API caller can save `2026-02-30`; normal browser date inputs generally prevent this. | `validDate` uses `Date.parse`, which normalizes the date. Require exact date round-trip validation for create and edit. |
| Medium | Active Analytics source button becomes almost unreadable on hover | “Season reports · primary” keeps white text while the generic secondary hover style makes its background almost white. Observed during the mobile check. | Selected button computed styles: white text on `rgb(240,245,238)` with `:hover=true`. Give the pressed hover state an explicit accessible background/text pair. |

The original validation-only audit documented these findings without changing production. The follow-up fix changes campaign refresh, calendar validation and Analytics tab contrast, and adds regression coverage.

## Two-season continuous demonstration

Simulated dates exercise the actual service functions through each season, rather than merely inserting completed reports.

| Record | Season 1: Kharif 2025 | Season 2: Rabi 2025–26 |
|---|---:|---:|
| MCP acres | 300 | 250 |
| Drum seeder acres | 200 | 120 |
| Laser land leveller acres | 0, with explanation | 30 |
| Total | **500** | **400** |
| MCP opening → closing | 1,000 → 600,100 | 600,100 → 1,100,100 |
| MCP calibration | 1,997 rev/acre | 2,000 rev/acre |
| Pre-season inspections | 3 | 3 |
| Post-season inspections | 3 | 3 |

Combined acreage: **900 acres**. Soybean **150**, Maize **360**, Paddy **390**. Six machine-season reports and twelve inspections. A separate two-acre optional visit was excluded from the season totals, preventing double counting.

The Admin generated 100 QR labels, passed them through District and Area Managers, and extended the batch to 150 after onboarding. Three machine types and lead farmers were onboarded by CF, JCF and Area roles. Before season two, the State Manager transferred the MCP from Nizamabad to Sangareddy, closing the original farmer handover and allowing the receiving Area Manager to register a new farmer. The QR, original photos, earlier reports and old calibration remained intact.

The original branch retained **650 historical acres**; the receiving branch saw its own **250 acres**. Admin, FM and State saw the full **900**. An unrelated Andhra Pradesh branch saw **0**. The receiving branch has no District Manager: its maintenance request correctly skipped that vacant stage while retaining State and final FM approval.

## Role results

| Role | Verified behavior |
|---|---|
| Admin | User creation, unique login rules, QR batch generation/extension/distribution, calibration, seasonal planning, final-approved repair coordination, global visibility |
| Farm Mechanization Team | Location/type-targeted season plans, global data visibility, final maintenance approval, no required assigned geography |
| State Manager | Own-branch visibility, State maintenance review, transfer between own districts, oversight across two seasons |
| District Manager | QR distribution, seasonal scheduling, District maintenance review, own-branch reporting; direct-to-CF path when Area Manager is absent |
| Area Manager | Machine onboarding, farmer onboarding, inspections, crop-wise reporting, Area maintenance review, scoped transfers |
| CF | Farmer registration/handover closure, pre/post evidence, MCP readings, crop-wise seasonal usage, maintenance requests and final repair reports |
| JCF | Parent-CF machine access, farmer onboarding, optional usage, inspections, seasonal production and repair completion |

Unauthorized actions, cross-branch reads/writes, forged actors, duplicate registration, missing photo evidence, wrong QR, crop-total mismatch, negative/reset/fractional meter values, premature final acreage and starting repairs before final approval were rejected in focused tests.

## UI checks

Six main pages (Season acreage, Analytics, Machines, Maintenance, Season checks and Lead farmers) were opened under each of the seven demo roles: **42 page views**, no blank page or visible backend error.

At a 390 × 844 viewport, Home, Acreage, Analytics, Machines, Maintenance, Season checks and Lead farmers had no horizontal document overflow. The selected Analytics source button contrast issue was found here and verified fixed in the follow-up. These checks establish navigation/rendering and width, not a full accessibility audit.

QR pixel tests decoded generated, rotated, inverted and print-sized QR images and rejected a blank image. A4 tests verified 16 labels per sheet, seven sheets for 100 labels, and no omissions/duplicates. Physical camera focus, permission prompts, GPS accuracy and a real printer were not exercised in this audit. The previously verified English/Telugu/Hindi acknowledgement generator was unchanged; PDFs were not regenerated in this run.

## MongoDB/API proof

The authenticated test harness used a temporary MongoDB replica set and real HTTP gateway requests. It checked setup/login/logout/password revocation, user creation and duplicate rollback, scoped metadata/media, immediate committed changes, protected photo retrieval, saved photo preservation, QR → machine → farmer, transfers and old/new branch access.

Its second-season scenario independently verified **600 + 200 acres**, separate calibration rates, two-season report visibility, farmer history, pre/post evidence, four authenticated maintenance approval stages, Admin repair start, field completion and ownership of “mark as read.” This is a separate API fixture from the 900-acre service demonstration.

## Re-run commands and results

All 19 existing npm test suites passed: `demo`, `workflow`, `roles`, `scenarios`, `qr`, `analytics`, `team`, `reporting`, `insights`, `print`, `seasons`, `fm-alerts`, `scan-visit`, `season-management`, `batch-extension`, `backend`, `locations`, `season-production`, `movements`.

Additional scripts passed: `test-read-batching.mjs`, `test-machine-directory.mjs`, `test-overview-alerts.mjs`. The new continuous journey is `npm run test:two-seasons`. Its JSON output now reports 11 passing workflow groups and no unresolved service/API findings. The extended backend suite verifies that the campaign-gap reproducer now succeeds, checks older-campaign backfill and rejects invalid create/edit dates.

`npm run lint` and `npm run build` passed. The build reports the existing main-JavaScript chunk warning (about 524 kB before gzip); this is not a measured production latency result.

New evidence: `scripts/test-two-season-audit.mjs`, extended `scripts/test-mongo-backend.ts`, `audit/two-season-results.json`, `audit/browser-results.json`.

## Limits of the result

Passing isolated tests does not establish production Atlas uptime, performance under many simultaneous users, every possible field combination, or physical-device camera/GPS/print operation. The three identified findings are resolved; untested device and load conditions still limit any wider release sign-off.
