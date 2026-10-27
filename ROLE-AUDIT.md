# Role and maintenance audit — 27 October 2026

This audit covers the persistent local demo. The account switcher intentionally simulates different users; it is not production authentication or a review of deployed Firebase security rules.

## Responsibilities verified

| Role | Visible data | Operational responsibility | Maintenance |
| --- | --- | --- | --- |
| CF | Own CF reporting team and machines | Lead farmer onboarding, photo/GPS evidence, farmer usage | Raise requests, track decisions and repairs; cannot approve; submits approved service completion with workable confirmation |
| JCF | Machines belonging to the assigned CF | Field visits and farmer usage with evidence | Raise issues and follow progress; cannot approve or complete repairs |
| Area Manager | Own area reporting branch | Receive QR labels, onboard machines and farmers, assign CF, record usage and seasonal checks | Area approval; may raise maintenance, with own review stage skipped |
| District Manager | Own district and downstream areas | Receive/distribute labels, onboard/assign directly reporting CFs, schedule seasonal alerts and perform checks | District approval where applicable; own review stage skipped for manager-raised issues |
| State Manager | Own state reporting branch | State/team oversight and reports | State approval after District approval; no visibility into another state's branch |
| Admin | All operational teams | Generate/print/distribute QR batches, team administration, global backups | Coordinate repairs only after final approval; record technician, actual cost, repair notes and photos |
| Farm Mechanization Team | Organization-wide field data, team hierarchy, QR inventory, farmers, usage, service logs and maintenance | Top-level oversight, global data and backups | Final authorization; review all decision and repair evidence; cannot act as Admin repair executor |

## Confirmed approval policy

CF/JCF request → Area Manager → District Manager → State Manager → **Farm Mechanization Team final approval** → CF/JCF alerted → service team repairs → CF/JCF completion report with evidence and workable confirmation → machine ready for usage; managers, State, Farm Team and Admin notified. Admin can coordinate and assist.

- Only the reviewer owning the current stage can decide, within the machine's reporting branch.
- Rejections require a reason. Requests retain an actor/time/note trail.
- A stopped machine cannot receive usage logs until its approved repair is completed.
- Duplicate open requests, repeated decisions, early starts, duplicate completion, and missing completion photos are rejected.
- Service logs use the same Area/District/State/Farm Team review order.
- Historical State/Farm Mech status naming is normalized without resetting records. Historical approved/in-progress requests require final Farm Team review before continuation under the new policy.

## Evidence

- Automated scope checks cover seven roles and two independent state branches.
- Automated negative cases cover unauthorized role actions, other-branch reviewers, skipped/repeated stages, missing proof, stopped-machine usage and historical approval compatibility.
- Automated saved-data upgrade is idempotent and preserves existing machine records.
- Browser checks exercised CF request → Area approval → District approval → State approval → Farm Team final approval → Admin start/completion with technician, ₹2,200 actual cost and demo photo evidence.
- Browser checks verified that JCF usage becomes available again after repair completion.
- Browser checks verified no global backup control for CF/JCF/Area/District/State; Admin and Farm Team have it.
- Browser checks verified a separate State Manager cannot see the field machine in another reporting branch.
- Existing QR generation/distribution/onboarding and local-store tests continue to pass.

## Re-run

```sh
npm run lint
npm run test:demo
npm run test:workflow
npm run test:roles
npm run build
```

Latest browser checks also verified District seasonal schedules and Area due alerts, QR-linked pre-season report, post-season checklist and photos, Farm Team approval → JCF repair report → Admin completion alert, District→direct CF machine onboarding, and Area lead farmer onboarding. `test:seasons` covers the updated policy and reminder deduplication.
