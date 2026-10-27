# MongoDB account migration

FarmMech's active frontend and backend no longer use Firebase or Google sign-in.
The previous Firebase frontend/configuration is recoverable in Git history at
`35253a3`; no Firebase cloud project or cloud data has been deleted.

## Isolated production target

Use a separate **FarmMech** Atlas project and cluster. Do not use AWD project
credentials. Configure server-only production environment variables:

- `MONGODB_URI`: FarmMech database-user connection string, database `farmmech`.
- `MONGODB_CLUSTER_HOST`: the new FarmMech cluster hostname. Production refuses
  to connect if it is absent or does not match the URI.
- `MONGODB_DATABASE=farmmech`.
- `APP_ORIGIN=https://farmmech-machine-tracker.vercel.app`.
- `ADMIN_SETUP_TOKEN`: a long random one-time setup code.
- `VITE_LOCAL_DEMO=false`: enable real accounts only after the new database is ready.

Keep `VITE_LOCAL_DEMO=true` until the MongoDB connection is verified. This switch
also permits rollback to the browser demo without deleting MongoDB data.

## Accounts and persistence

Open the site, enter the private setup code, and choose the first Admin username
and password. Remove `ADMIN_SETUP_TOKEN` after setup. Additional accounts are
created through **Users & roles**. Email is optional contact information; it is
not an authentication provider. Passwords must have at least 12 characters.

The backend uses scrypt password hashes, opaque 12-hour HttpOnly/SameSite cookies,
server-side session revocation, rate limits, origin checks and server-side role
checks. Clients cannot directly write database records or select another account.
All workflow writes, audits and related notifications commit in one MongoDB
transaction. Use an Atlas replica set (including the Free cluster) for transactions.
Photos are stored with the records; the API rejects requests above 4 MB. Existing
image resize in the capture form keeps field photographs small.

Browser demo records remain in their original browser storage, untouched. They
are not silently uploaded to MongoDB. Export the original browser workspace before
any separately reviewed data migration; usernames/passwords must be provisioned
for existing people rather than copying demo impersonation sessions.

## Local verification

`npm run test:backend` starts a disposable local replica set and tests actual
MongoDB persistence, atomic rollback, login/logout, scoped reads, forged roles,
QR distribution and machine/farmer onboarding. It never connects to Atlas.

For local real-account use: configure `.env.local`, run `npm run backend:dev` and
`npm run dev -- --port 3001`. Vite proxies `/api` to localhost:8788.

Record reads refresh every 15 seconds and immediately after local writes. Season
alerts catch up when the workspace is open; no background delivery is claimed.
