# Frontend

Read this for React components, browser state, styles, or client API changes.

- `frontend/src/main.tsx` mounts `App`; `App.tsx` installs `StoreProvider` and
  renders the layout.
- `frontend/src/state/store.tsx` is the central React context for locations,
  selection, loading/error state, creation, and refresh actions.
- `frontend/src/api.ts` is the browser API wrapper. Keep calls relative to
  `/api`.
- `frontend/src/types.ts` mirrors the API payloads used by the UI; update it
  with compatible backend contract changes.
- `frontend/src/components/` contains dashboard, sidebar, form, forecast, and
  formatting components. `index.css` and the Tailwind/Vite files in `frontend/`
  provide styling/build configuration.
