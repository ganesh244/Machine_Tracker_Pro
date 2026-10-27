# Machine Tracker local demo

Set `VITE_LOCAL_DEMO=true` in `.env.local`, run `npm install`, then `npm run dev`. Open the URL printed by Vite, select an account and click **Demo login**. No password or Firebase account is needed. The flag also enables demo mode in production builds.

All data and photos are saved in this browser. Reloading keeps them. Clearing site storage removes them. Tabs on the same origin share data; other devices and browser profiles have separate workspaces. The account switcher is available on every page.

## Roles

| Role | Default workflow |
| --- | --- |
| Admin | QR operations, team administration, global operational visibility, exports, and repair coordination after final approval |
| Farm Mechanization Team | Global oversight across states and all field data; final maintenance approval and repair evidence review |
| State Manager | Own state reporting branch, district oversight, reports, team management and state maintenance approval |
| District Manager | District reporting branch, downstream users and transfers, district approval |
| Area Manager | Area branch; machine/farmer onboarding, usage, seasonal inspections and maintenance escalation/review |
| Community Facilitator | Own and downstream machines, operator transfers, readings, requests, reports |
| Operator | Assigned machines, accept/reject transfers, readings, requests and repair details |

Admin can change role permissions in **Team & settings**. Role switching is intentional for demonstrations and does not provide production access control.

## Workflows

- **Fleet:** register, search, filter, sort, select, open details, edit specifications/location, transfer and display/print QR codes.
- **Assignments:** Admin/State transfers apply immediately. Other transfers require recipient acceptance. The sample Operator has a pending transfer.
- **Readings:** open a machine and choose **Update Reading**. Enter an increasing counter reading and optional photo/fuel/notes. Activity, reports and analytics use the shared feed.
- **Maintenance:** requests move through Area → District → State → Farm Mechanization Team (final). Final approval alerts responsible CF/JCF. They submit technician/service team, actual repairs and parts, service date, cost, photos and tested-workable confirmation. Completion restores idle/workable status and notifies their reporting managers, State, Farm Mechanization and Admin. Admin can coordinate service and assist with reporting. **Log service** records technician work for approval. **Schedule service** creates and renews preventive schedules.
- **Photos:** **Upload photos** saves local images under 2 MB each. Total browser storage is limited; export backups regularly.
- **Messages/notifications:** switch accounts to exchange local messages and follow approvals/transfers.
- **Team:** create accounts with a role and reporting manager. New accounts appear immediately in the switcher. Edit/remove users in the organization tree.
- **Backups:** **Export backup** downloads the raw workspace. Team settings exports full JSON and CSV datasets. **Reset demo** restores samples after confirmation.
- **Maps/GPS:** map tiles, address lookup and device location need internet/device permissions. Camera scanning needs camera permission. QR links use the current app origin; other devices need access to the server and have separate local data.

The demo does not write records to Firebase, Sheets, Drive or Cloudinary. External map/address services still require connectivity.

## Checks

```sh
npm run lint
npm run test:demo
npm run build
```

Demo tests cover six roles, CRUD/persistence, query filtering/ordering, nested collections, merge, field transforms, subscriptions and atomic batch rollback.

## Firebase mode

Set `VITE_LOCAL_DEMO=false` and disable/remove the legacy `VITE_SKIP_LOCAL_LOGIN` flag. Configure `VITE_FIREBASE_*` and create Firebase Authentication accounts with matching user profiles. Production authorization and integrations require separate configuration/deployment; this local demo is not a production deployment.

## QR-first field operations

The main demo opens the field workspace. Existing sample machines and administrative tools remain available through **Team, reports & other tools**. The field workspace lists machines onboarded through the new QR process, preserving older records separately.

**QR inventory opens on batch cards.** Click a batch to display only its labels; use **All batches** to return. Printing, selection and distribution stay within the opened batch.

1. **Admin:** Generate a general QR batch (100 by default, up to 200), preview and print blank A4 sticker sheets. Generating labels does not create machine records or choose machine types.
2. **Admin → District Manager → Area Manager:** Select a quantity of unused labels and confirm the physical handover to the next manager. The inventory records the holder and distribution trail. Attached labels cannot be redistributed.
3. **Area Manager, or District Manager for a directly reporting CF:** Stick a label on a machine, scan it (or enter the printed ID), choose MCP / Drum seeder / Laser land leveller / Other, enter asset details, location and GPS, then select the responsible CF. The label becomes permanently bound to that machine.
4. **CF / JCF:** Scan the same machine QR and onboard its village lead farmer: name, mobile number, land size, photos and GPS. The CF retains responsibility; the lead farmer retains village custody.
5. **CF / JCF:** Scan again to record a lead or fellow farmer’s usage visit: farmer name, crop, acres worked, date, photos, GPS and notes. Each visit stays in that machine’s history. Fellow farmer usage does not replace the lead farmer or CF.

Photos are resized before local storage. Every farmer handover and usage visit requires photo proof. GPS supports device capture and manual coordinates. No photo or location permission is requested until the user chooses the corresponding action. The demo-photo button is explicitly for local testing.

Use the role switcher to test the entire chain in one browser. QR links use the current origin; separate devices still have separate browser storage in this local demo.

Run `npm run test:workflow` for the full 100-label lifecycle, QR parsing, duplicate protection, role restrictions, reporting branch restrictions, photo requirements, and custody preservation checks.

## Role audit and maintenance approval policy

The Farm Mechanization Team is a separate oversight role, not an alias for State Manager. Saved demos gain this account without resetting existing records. State/District/Area scopes follow reporting branches; CF/JCF see their assigned CF team. Admin and the Farm Mechanization Team have global data visibility and full-workspace backup access. Other roles export scoped usage data only.

The primary Maintenance page is available to every role. CF/JCF and Area/District Managers raise requests with issue photos. Approval is Area → District → State → Farm Mechanization Team. Admin cannot approve a request or start work early. After final approval, responsible CF/JCF record service completion with technician/team, parts, date, cost, work notes, photos and workable confirmation. Admin can assist; the completed report is shared across the reporting team. Stopped machines reject usage until repair completion. Decisions and repair steps retain actor, time and notes.

Historical pending records are normalized to the separated State/Farm Team stages. Historical approved/in-progress requests require Farm Team final review before further execution under this policy; old records are not silently marked approved by the new role.

Run `npm run test:roles` for the seven-role, two-state-scope and maintenance lifecycle audit. See `ROLE-AUDIT.md` for verified responsibilities and test evidence.


Demo sample scenarios and verified browser steps: see [DEMO-TEST-REPORT.md](DEMO-TEST-REPORT.md). Samples install additively in local demo mode; use the on-screen Demo playground to try QR scanning, onboarding, farmer registration, usage and maintenance.


Analytics is available to all seven roles. Fleet counts use current saved status for QR-onboarded machines; acreage, crop and location rankings use field usage filtered by date. Repeat visits count towards acres worked. CF/JCF default to villages, Area Managers to areas/mandals, District and State Managers to districts, and Admin/Farm Mechanization to states. Users can change the location grouping within their existing reporting scope. `npm run test:analytics` checks totals, status counts, rankings, date filters and branch isolation.


Admin can create local demo accounts in Users & roles → Add user. Supported assignments: State Manager, District Manager, Area Manager, CF and JCF. Each account requires an email, name and an eligible reporting manager. Area Managers may report directly to State; CFs may report to Area, District or State when manager posts are vacant. Accounts appear on the sign-in screen and account selector. Duplicate emails and non-Admin creation are rejected. Run `npm run test:team` for hierarchy and access checks.


Vacant manager levels: maintenance follows the assigned reporting ancestry, skipping vacant Area/District stages while retaining State and final Farm Mechanization approval. Admin can allocate QR labels directly to an Area Manager without a District Manager. Existing pending requests at a vacant level are routed to the next applicable review. `npm run test:reporting` verifies the Sangareddy example and standard-chain compatibility.


Operational analytics includes actionable machine attention, days since last recorded use, six-month/eight-week trends, current maintenance stage age, per-request reported downtime, completed repair costs, CF/JCF recorder activity, village gaps, location productivity, visible QR rollout, machine-type/crop coverage and data-quality checks. Expand each section in Analytics. Dates affect usage and completion-based cost totals; lifetime attention/current fleet and open queues remain visible. No unique-farmer claim is made without a stable fellow-farmer ID. Downtime is based on stopped-machine reports, not telemetry. Run `npm run test:insights` for calculation and isolation proof.


Analytics charts include a current-status doughnut, stacked machine-type fleet counts, switchable monthly/weekly acreage or visit trends, and acreage bars for machine types, top crops, top locations and CF/JCF recorders. Charts share the scoped analytics calculations and date filters; the status/fleet charts remain current snapshots. Accessible descriptions and underlying detailed tables remain available. Charts load on demand.


QR print format: A4 portrait with 10 mm margins, 16 sticker positions per page (4 × 4), 30 mm QR codes with quiet zones, batch/date header, label range and Page X of Y footer. Partial last sheets leave unused positions blank. Select A4, 100% / Actual size and disable browser headers/footers when printing. Both field-batch and legacy machine printing share the layout. `npm run test:print` verifies pagination and print-sized QR decoding.


## Seasonal care and service reports

District Managers and the Farm Mechanization Team use **Season checks → Schedule season alerts** to enter season start/end and pre/post alert dates. One- and two-month-before-start presets are available. CF/JCF, Area/District Managers and oversight teams receive in-app bell alerts when due. The local app checks on startup, focus and every minute; missed dates catch up on next use. It does not send push/SMS/email or run while closed. Repeated checks preserve existing alerts and read state.

Scan a machine, open **Pre / post-season inspection**, choose a season/phase, answer every check and attach photos. Pre-season checks cover mechanism, guards/fasteners, trial run and readiness. Post-season checks cover cleaning, lubrication/regular service, covering and secure shaded storage. Failed checks require notes, create/link maintenance and block usage; passing checks never clears an existing maintenance lock. Reports are visible to the machine’s responsible team and leadership. A manager who raises a request cannot approve it; their own review stage is skipped.

District Managers can onboard and assign machines directly to CFs whose parent is that District Manager; CFs under an Area Manager remain managed through that Area. Area Managers can onboard lead farmers and record lead/fellow usage within their own branch.

Run `npm run test:seasons` for service-report, notification, direct assignment and seasonal scheduling/checklist/escalation verification.


Farm Mechanization seasonal campaigns require state and district selection from the team/machine directory. They target that location across reporting branches, including areas without District Managers. CF/JCF, Area and District Managers in the selected location receive actionable reminders; responsible State Managers, Admin and Farm Mechanization receive oversight alerts. State plus district matching prevents same-named districts in other states receiving the campaign. District-created schedules retain their reporting-branch scope, with alerts expanded to field staff and oversight ancestors. Existing schedules and read states are preserved. `npm run test:fm-alerts` covers geographic audience isolation, missing-manager branches, JCF inspection and pre/post reminder timing/deduplication.


Seasonal field visits are scan-first: open the alert or season, scan the machine sticker, then complete the form fixed to that QR. There is no machine picker in the inspection form. Actor-scoped session context preserves season and pre/post phase through scanner redirects; switching accounts/signing out clears it. Saving validates the scanned QR against the machine and stores it on the report. Users can scan a different machine for the next visit. `npm run test:scan-visit` verifies context persistence/isolation; `test:seasons` rejects mismatched QR IDs. Browser proof used an actual QR PNG upload, automatic machine-form routing and CF report submission with photo evidence.


Seasonal Checks UI separates **Season plans** (campaign cards with pre/post dates, scoped progress and scan actions) from **Inspection reports** (season/phase/result filters and expandable photo evidence). Planning opens a focused three-section form. QR visits open a dedicated machine-fixed checklist using Yes/Needs attention controls, immediate maintenance feedback, required photos and completion status. Mobile controls stack without widening the page.
