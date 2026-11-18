# Plan: Use my location to add a Singapore forecast area

> Source PRD: “Use my location to add a Singapore forecast area” from the current conversation.

## Architectural decisions

- **Routes**: Add `POST /api/locations/nearest`. It accepts a browser position as transient latitude and longitude and returns the resolved saved `Location`. Return `201` when a new location is created and `200` when an existing location is reused.
- **Schema**: Keep the current SQLite schema. Persist only the forecast area's representative coordinates and its existing `WeatherSnapshot`; do not persist the browser's exact coordinates.
- **Key models**: Reuse `Location` and `WeatherSnapshot`. Treat the browser position and resolved forecast area as request-time data.
- **Forecast-area source**: Resolve against `area_metadata[].label_location` from data.gov.sg's two-hour forecast response. Use the same nearest-area distance behavior as the existing weather lookup.
- **Location validation**: Apply the existing Singapore coordinate bounds on the server before resolving an area.
- **Browser location**: Use the browser Geolocation API only after an explicit click. Localhost HTTP remains supported.
- **Privacy**: Do not persist or log the raw browser coordinates.
- **Authentication**: Keep the existing app's authentication behavior; this feature adds no authentication layer.

---

## Phase 1: Locate and add my forecast area

**User stories**: 1–6, 12–14

### What to build

Deliver the complete successful path from the visible sidebar action through browser geolocation, nearest forecast-area resolution, persistence, and selection. Keep manual coordinate entry available. Add API integration coverage and a browser interaction test harness as part of this slice.

### Acceptance criteria

- [x] **Use my location** is visible beside **Add Location**, including while the manual coordinate form is collapsed.
- [x] Clicking the action requests the browser position and shows a progress state; localhost development works without HTTPS.
- [x] The server resolves a valid Singapore position to the nearest forecast area's representative coordinates using data.gov.sg metadata.
- [x] A new location is saved at those representative coordinates with its weather snapshot, then selected in the UI.
- [x] The existing manual coordinate flow continues to work.
- [x] An API integration test verifies the resolved coordinates and persisted response using a mocked weather provider.
- [x] A browser interaction test verifies the successful click-to-selected-location flow with controlled geolocation and API responses.

---

## Phase 2: Handle location and lookup failures

**User stories**: 7–10

### What to build

Complete the failure paths across the browser, API, provider lookup, and UI. Give the user clear inline feedback and a way to retry or use manual entry, while ensuring failed resolution never creates a location.

### Acceptance criteria

- [x] The server rejects positions outside the existing Singapore coordinate bounds without creating a location.
- [x] Permission denial, unsupported geolocation, unavailable position, and timeout each produce useful inline feedback and allow retry.
- [x] A failed provider lookup or missing usable forecast-area metadata returns an error and creates no location.
- [x] Manual coordinate entry remains available after a geolocation or lookup failure.
- [x] API integration tests verify outside-bounds and failed-resolution behavior, including that no location is persisted.
- [x] Browser interaction tests verify the geolocation error states and their retry or manual-entry paths.

---

## Phase 3: Reuse saved areas safely

**User stories**: 11, 15

### What to build

Make nearest-area addition safe to repeat. When the resolved area already exists, select it and explain that it is already saved. Ensure the request-time browser position never becomes stored location or interaction-log data.

### Acceptance criteria

- [x] The nearest-area endpoint returns the existing location when its representative coordinates are already saved, rather than surfacing a duplicate error.
- [x] The frontend selects the existing location and tells the user it is already on the list.
- [x] Concurrent requests resolving to the same forecast area do not create duplicate saved rows; a conflict is reconciled to the existing location.
- [x] Only representative forecast-area coordinates are persisted, and raw browser coordinates are excluded from interaction logs.
- [x] API integration and browser interaction tests verify duplicate reuse, selection, messaging, and the privacy behavior.

