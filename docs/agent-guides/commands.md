# Commands and verification

Run commands from the repository root.

```bash
npm install                 # Install workspace dependencies
npm run dev                 # Run Express + Vite through Portless
npm run build               # Type-check/build frontend and compile backend
npm test                    # Run backend API tests once
npm run test:watch          # Run backend API tests in watch mode
npm run doctor              # Check the running app's health and locations endpoints
npm run start               # Serve a production build (build first)
```

Use these for database changes:

```bash
npm run db:generate         # Generate Drizzle migrations after schema changes
npm run db:migrate          # Apply migrations to backend/weather.db
npm run reset               # Reset the local SQLite data store
```

```bash
npm run build -w frontend   # Type-check and build the Vite app
npm run dev -w frontend     # Run the Vite app alone
npm run build -w backend    # Compile the Express server
npm run dev -w backend      # Watch/run the Express server alone
```

No lint script or ESLint configuration currently exists. `npm run build`
performs TypeScript checking.

## Required checks by change type

- Backend, API, or persistence: `npm test` and `npm run build`.
- Frontend: `npm run build`; manually exercise changed UI flows with `npm run dev`.
- Schema: generate and inspect the migration, then run affected API tests.
