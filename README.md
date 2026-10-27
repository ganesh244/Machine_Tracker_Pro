# FarmMech

QR-first farm machinery operations: sticker batches, distribution, machine
onboarding, lead-farmer handover, usage evidence, maintenance approvals, seasonal
checks, scoped analytics and A4 acknowledgements in English, Telugu and Hindi.

## Accounts and database

Production uses MongoDB Atlas and Admin-created usernames/passwords. There is no
Firebase or Google/Gmail sign-in in the application. Email is optional contact
information. The MongoDB connection and password hashes are server-only.

See [MIGRATION.md](MIGRATION.md) for the isolated FarmMech Atlas project, secure
first-Admin setup, environment variables and rollback procedure. Do not use AWD
project credentials. Production pins the allowed cluster hostname.

Roles: Admin, Farm Mechanization Team, State Manager, District Manager, Area
Manager, CF and JCF. Reporting lines may skip vacant Area or District positions.
Admin creates accounts and resets passwords. Users can change their own password;
password changes invalidate existing sessions. Farm Mechanization gives final
maintenance approval; field staff submit the service report and restore usability.

## Run locally

```
npm install
# Copy .env.example to .env.local and privately configure the MongoDB values.
npm run backend:dev
# In another terminal:
npm run dev -- --port 3001
```

The frontend proxies `/api` to the backend on localhost:8788. To use the offline
browser demo instead, set `VITE_LOCAL_DEMO=true`. Demo data stays in that browser;
it is never silently uploaded to MongoDB.

## Verify

```
npm run lint
npm run build
npm run test:backend
```

The backend test uses a disposable local MongoDB replica set, not Atlas. Existing
`test:*` scripts cover role boundaries, QR decoding/distribution, machine and
farmer onboarding, usage, maintenance, seasons, analytics and printing.

## Deployment

Vercel builds the Vite frontend and `/api/gateway` Node function. Configure secrets
in Vercel's environment settings; never put a MongoDB URI in a `VITE_*` variable.
Use the separate FarmMech database/cluster described in MIGRATION.md. A production
cutover needs `VITE_LOCAL_DEMO=false` and a verified database connection.
