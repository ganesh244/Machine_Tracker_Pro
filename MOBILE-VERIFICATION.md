# Mobile layout verification - 28 October 2026

- Five fixed bottom actions: Home, Machines, Scan, Alerts, More.
- More exposes the full role-scoped navigation and account controls.
- Machine, QR-label and team tables become labelled cards on phones.
- Forms stack into one column, with 16px inputs and larger touch targets.
- Dialogs scroll within the available viewport; their close controls stay visible.
- A4 QR preview scales to the screen; print CSS restores physical A4 size.
- PDF generator and camera scanner load on demand. Main JS gzip dropped from
  approximately 321 kB to 127 kB in the production build.

Browser viewport checks: 320x640, 390x844, 430x932, 768x1024, 1024x768 and
1440x900. All primary sections checked at 390px: overview, analytics, machines,
QR inventory, maintenance, season checks, lead farmers, usage and team accounts.
No document-level horizontal overflow found. Operational tables on larger
screens retain their desktop layout and internal horizontal scrolling.

Admin navigation and QR preview, Area machine onboarding, CF scoped navigation
and usage-entry forms were exercised with browser-local demo records. The
scanner module opened without requesting camera permission; the deferred PDF
module successfully downloaded an English acknowledgement. Physical device
camera/keyboard behaviour was not exercised.

TypeScript, production build and A4/QR print regression checks pass.
