# Farm Mechanization leadership check

29 October 2026. Isolated synthetic data; production records and AWD were not changed by the checks.

**Result: the tested leadership controls passed. One season-comparison defect was found, fixed and verified in the real Analytics component.**

| Leadership perspective | Verification |
|---|---|
| Organization visibility | FM with no assigned state/district and no field staff under its own hierarchy can see Telangana and AP machines, farmers, visit logs, inspections, counter records, maintenance and transfers. Field CF access remains limited to its own branch. |
| Privacy and account boundaries | FM cannot read account credentials, Admin setup secrets or another user's personal notification list. Its own alerts and the shared MCP calibration value are visible. |
| Seasonal planning | FM can target state/district, machine type or selected machines; can edit/archive/restore district-owned plans. Focused FM alert tests passed for state separation, vacant District Manager, MCP-only inclusion, retargeting and read-state preservation. |
| Final maintenance review | In each of two state branches, FM was blocked before Area/District/State reviews. The final approval action appeared in leadership priority alerts. Approval, rejection and duplicate-decision rejection passed. |
| Actual workspace controls | Opened the real FM demo workspace. Overview showed organization-wide oversight and three final-review actions. “Review approvals” opened the matching three requests, each with final approve/reject controls and decision history. |
| Role separation | FM cannot generate Admin QR batches, edit Admin calibration, or submit field acreage/inspection forms. Cross-state FM transfer was verified in the immediately preceding transfer-level audit. |
| Performance totals | Real Analytics UI fixture: 1,050 acres across both states/all seasons; Telangana 1,000 and AP 50. State/district filters matched the expected data. |
| Crop/type/CF comparisons | Filtered comparison now applies identical filters to current and previous reports. MCP and its CF: 100 → 200 = +100%; drum CF: 300 → 400 = +33.33%; unfiltered: 400 → 600 = +50%. |
| Export | Downloaded the seasonal CSV from the real component. Five expected crop-report rows, both states, MCP and drum records present. |
| Transfer history and original attribution | Reused the passing all-level transfer and two-season audits: FM can view the full record while original season reports retain their original CF/geography/rate. |

## Defect fixed

`SeasonalAnalytics` passed all reports to the prior-season calculation even when current reports were filtered by machine type or CF. For MCP, the UI compared 200 current acres to 400 previous acres across all types, showing **−50%** instead of **+100%**. The prior-season calculation now receives `filteredReports` too.

Browser regression verified machine type, CF and unfiltered comparisons. This is a display/aggregation fix; saved acreage and MongoDB reports are unchanged.

## Reproduction and proof

- `npm run test:fm-leadership`: visibility, role boundaries, campaign management and final approve/reject checks.
- `npm run test:fm-alerts`: geographic/type-targeted reminders and scoped inspection behavior.
- `node scripts/test-overview-alerts.mjs`: leadership-specific approval priority and seasonal due-task behavior.
- `npm run test:analytics`, `npm run test:two-seasons`, `npm run lint`, `npm run build`: passed.
- `http://localhost:3001/audit/fm-leadership.html`: isolated UI fixture using the real component. Expected values are defined in `audit/FmLeadershipFixture.tsx`.
- `audit/fm-browser-results.json`: browser comparison/filter/export observations.
- `/private/tmp/farmmech-fm-comparison-fixed.png`: corrected filtered comparison screenshot.

The browser fixture tests the component with synthetic props, not authentication. Global server scope behavior and final maintenance decisions were checked separately through service tests; the preceding authenticated MongoDB API audit remains applicable because this fix changes only the Analytics comparison. No new live FM account or production report was created.
