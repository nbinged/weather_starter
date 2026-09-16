# Backend, API, and persistence

Read this for route, service, database, schema, migration, or external weather
provider changes.

## Boundaries

- `backend/src/server.ts` creates the Express app, provides `/health` and
  `/api/logs`, mounts API routes, and serves the frontend.
- `backend/src/routes/locations.ts` validates requests and handles location
  list, create, get, and refresh endpoints.
- `backend/src/weather.ts` owns data.gov.sg calls and translates provider data
  to `WeatherSnapshot`.
- `backend/src/schema.ts` defines the Drizzle SQLite schema; `backend/src/db.ts`
  owns migrations at startup and location/snapshot persistence helpers.
- Migration SQL belongs in `backend/drizzle/`; schema changes require a newly
  generated, reviewed, committed migration.

## Conventions and invariants

- Use ESM imports with explicit `.js` extensions for backend TypeScript modules.
- Inject `WeatherClient` through `createLocationsRouter` in API tests; do not
  make real provider calls in tests.
- Keep the backend snapshot contract synchronized with `frontend/src/types.ts`.
- Locations store only the latest weather snapshot. Listing locations reads
  SQLite and must not fetch the provider; creation and refresh fetch/persist a
  new snapshot.
- Keep the Singapore coordinate validation unless the product scope changes.
- Use `DATABASE_PATH` to isolate local/test databases. `WEATHER_API_KEY` is
  optional provider configuration.
- Do not commit `backend/weather.db` or SQLite sidecar files; commit migrations.
