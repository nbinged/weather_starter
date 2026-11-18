import { expect, test } from '@playwright/test';
import type { Page, Route } from '@playwright/test';

const gpsPosition = { latitude: 1.352, longitude: 103.853 };
const forecastArea = { latitude: 1.35, longitude: 103.85 };

type SavedLocation = {
  id: number;
  latitude: number;
  longitude: number;
  created_at: string;
  weather: {
    condition: string;
    observed_at: string;
    source: string;
    area: string;
    valid_period_text: string | null;
    temperature_c: number | null;
    humidity_percent: number | null;
    rainfall_mm: number | null;
    wind_speed_knots: number | null;
    wind_direction_degrees: number | null;
    forecast_low_c: number | null;
    forecast_high_c: number | null;
    uv_index: number | null;
    psi_twenty_four_hourly: number | null;
    pm25_one_hourly: number | null;
    air_quality_region: string | null;
    forecast_periods: Array<{ label: string; forecast: string }>;
    daily_forecast: Array<{
      date: string;
      forecast: string;
      temperature_low_c: number | null;
      temperature_high_c: number | null;
    }>;
  };
};

function makeLocation(id = 42): SavedLocation {
  return {
    id,
    latitude: forecastArea.latitude,
    longitude: forecastArea.longitude,
    created_at: '2026-11-18T00:00:00',
    weather: {
      condition: 'Partly Cloudy',
      observed_at: '2026-11-18T10:00:00+08:00',
      source: 'test',
      area: 'Bishan',
      valid_period_text: 'Now',
      temperature_c: 30,
      humidity_percent: 75,
      rainfall_mm: 0,
      wind_speed_knots: 3,
      wind_direction_degrees: 180,
      forecast_low_c: 25,
      forecast_high_c: 32,
      uv_index: 5,
      psi_twenty_four_hourly: 35,
      pm25_one_hourly: 8,
      air_quality_region: 'central',
      forecast_periods: [],
      daily_forecast: [],
    },
  };
}

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function mockApi(page: Page, initialLocations: SavedLocation[] = []) {
  const locations = [...initialLocations];
  const logs: Array<{ event: string; metadata?: Record<string, unknown> }> = [];
  let nearestRequestBody: unknown;

  await page.route('**/api/logs', async (route) => {
    logs.push(route.request().postDataJSON());
    await route.fulfill({ status: 204 });
  });

  await page.route('**/api/locations/nearest', async (route) => {
    nearestRequestBody = route.request().postDataJSON();
    const existing = locations.find(
      (location) =>
        location.latitude === forecastArea.latitude &&
        location.longitude === forecastArea.longitude,
    );
    if (existing) {
      await fulfillJson(route, 200, existing);
      return;
    }

    const created = makeLocation(
      locations.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
    );
    locations.push(created);
    await fulfillJson(route, 201, created);
  });

  await page.route('**/api/locations', async (route) => {
    if (route.request().method() === 'GET') {
      await fulfillJson(route, 200, { locations });
      return;
    }
    const coordinates = route.request().postDataJSON() as {
      latitude: number;
      longitude: number;
    };
    const created = makeLocation(
      locations.reduce((maxId, item) => Math.max(maxId, item.id), 0) + 1,
    );
    created.latitude = coordinates.latitude;
    created.longitude = coordinates.longitude;
    created.weather.area = 'Manual coordinates';
    locations.push(created);
    await fulfillJson(route, 201, created);
  });

  return { locations, logs, getNearestRequestBody: () => nearestRequestBody };
}

async function replaceGeolocationWithError(page: Page, code: number) {
  await page.addInitScript((errorCode) => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(_success: unknown, onError: (error: unknown) => void) {
          window.setTimeout(
            () =>
              onError({
                code: errorCode,
                PERMISSION_DENIED: 1,
                POSITION_UNAVAILABLE: 2,
                TIMEOUT: 3,
              }),
            0,
          );
        },
      },
    });
  }, code);
}

test('adds and selects the nearest area without logging the raw browser coordinates', async ({
  page,
  context,
}) => {
  await context.setGeolocation(gpsPosition);
  const api = await mockApi(page);
  await page.goto('/');

  await expect(page.getByRole('button', { name: 'Use my location' })).toBeVisible();
  await page.getByRole('button', { name: 'Use my location' }).click();

  await expect(page.getByRole('status')).toContainText('Added Bishan to your locations.');
  await expect(page.locator('button[aria-pressed="true"]')).toContainText('Bishan');
  expect(api.getNearestRequestBody()).toEqual(gpsPosition);
  expect(api.locations[0]).toMatchObject(forecastArea);
  await expect(page.getByRole('button', { name: 'Add Location' })).toBeVisible();
  await page.getByRole('button', { name: 'Add Location' }).click();
  await expect(page.getByLabel('Latitude')).toBeVisible();
  await page.getByLabel('Latitude').fill('1.32');
  await page.getByLabel('Longitude').fill('103.82');
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(page.locator('button[aria-pressed="true"]')).toContainText('Manual coordinates');

  await expect.poll(() => api.logs.length).toBeGreaterThan(0);
  expect(JSON.stringify(api.logs)).not.toContain(String(gpsPosition.latitude));
  expect(JSON.stringify(api.logs)).not.toContain(String(gpsPosition.longitude));
});

test('selects an already-saved nearest area and explains the result', async ({ page, context }) => {
  await context.setGeolocation(gpsPosition);
  const existing = makeLocation();
  await mockApi(page, [existing]);
  await page.goto('/');

  await page.getByRole('button', { name: 'Use my location' }).click();

  await expect(page.getByRole('status')).toContainText(
    'Bishan is already on your list. Selected it.',
  );
  await expect(page.locator('button[aria-pressed="true"]')).toContainText('Bishan');
});

for (const [name, code, message] of [
  ['permission denial', 1, 'Location access was denied'],
  ['unavailable position', 2, 'Your position is unavailable'],
  ['timeout', 3, 'The location request timed out'],
] as const) {
  test(`shows recoverable feedback for ${name}`, async ({ page }) => {
    await replaceGeolocationWithError(page, code);
    await mockApi(page);
    await page.goto('/');

    await page.getByRole('button', { name: 'Use my location' }).click();
    await expect(page.getByRole('alert')).toContainText(message);
    await expect(page.getByRole('button', { name: 'Add Location' })).toBeVisible();
    await page.getByRole('button', { name: 'Add Location' }).click();
    await expect(page.getByLabel('Latitude')).toBeVisible();
  });
}

test('explains when geolocation is unsupported and keeps manual entry available', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
  });
  await mockApi(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Use my location' }).click();

  await expect(page.getByRole('alert')).toContainText('Your browser does not support location');
  await page.getByRole('button', { name: 'Add Location' }).click();
  await expect(page.getByLabel('Latitude')).toBeVisible();
});

test('shows the server rejection when the browser position is outside Singapore', async ({
  page,
  context,
}) => {
  await context.setGeolocation({ latitude: 1.6, longitude: 103.85 });
  await mockApi(page);
  await page.route('**/api/locations/nearest', async (route) => {
    await fulfillJson(route, 422, {
      detail: 'Coordinates must be within Singapore (lat 1.1-1.5, lon 103.6-104.1)',
    });
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Use my location' }).click();

  await expect(page.getByRole('alert')).toContainText('Coordinates must be within Singapore');
});

test('explains when the running server does not have the nearest-area route', async ({
  page,
  context,
}) => {
  await context.setGeolocation(gpsPosition);
  await mockApi(page);
  await page.route('**/api/locations/nearest', async (route) => {
    await route.fulfill({ status: 404, body: 'Not Found' });
  });
  await page.goto('/');

  await page.getByRole('button', { name: 'Use my location' }).click();

  await expect(page.getByRole('alert')).toContainText(
    'The app server needs a restart to load this feature',
  );
});

test('ends the locating state if the browser never returns a position', async ({ page }) => {
  await page.clock.install();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition() {} },
    });
  });
  await mockApi(page);
  await page.goto('/');

  await page.getByRole('button', { name: 'Use my location' }).click();
  await expect(page.getByRole('button', { name: 'Locating…' })).toBeDisabled();
  await page.clock.fastForward(16_000);

  await expect(page.getByRole('alert')).toContainText('Chrome has not returned a position');
  await expect(page.getByRole('button', { name: 'Use my location' })).toBeEnabled();
});

test('shows progress and keeps the location action disabled during lookup', async ({
  page,
  context,
}) => {
  await context.setGeolocation(gpsPosition);
  await mockApi(page);

  let releaseRequest!: () => void;
  const requestPause = new Promise<void>((resolve) => {
    releaseRequest = resolve;
  });
  let nearestRequests = 0;
  await page.route('**/api/locations/nearest', async (route) => {
    nearestRequests += 1;
    await requestPause;
    await fulfillJson(route, 201, makeLocation());
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Use my location' }).click();

  const addingButton = page.getByRole('button', { name: 'Adding…' });
  await expect(addingButton).toBeDisabled();
  await expect.poll(() => nearestRequests).toBe(1);
  releaseRequest();

  await expect(page.getByRole('status')).toContainText('Added Bishan');
  expect(nearestRequests).toBe(1);
});
