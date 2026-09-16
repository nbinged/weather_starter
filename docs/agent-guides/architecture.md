# System architecture

```text
Browser
  -> Portless (weather-starter.localhost:1355 in development)
  -> Express application (backend/src/server.ts)
       -> /api routes (backend/src/routes/locations.ts)
       -> data layer (backend/src/db.ts) -> SQLite (backend/weather.db)
       -> weather client (backend/src/weather.ts) -> api-open.data.gov.sg
       -> Vite middleware in development / frontend static build in production
  -> React application (frontend/src)
       -> API client (api.ts) -> relative /api requests
       -> Context state (state/store.tsx) -> layout and components
```

Development runs the API and Vite middleware in one Node process. Production
serves the built frontend from Express. Browser API requests must remain
relative to `/api` so neither environment needs a separate backend URL.
