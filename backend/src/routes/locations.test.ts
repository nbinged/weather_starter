import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { WeatherProviderError, type ForecastArea, type WeatherSnapshot } from '../weather.js';

const weather: WeatherSnapshot = {
  condition: 'Cloudy',
  observed_at: '2026-05-04T00:00:00Z',
  source: 'test',
  area: 'Bishan',
  valid_period_text: 'Now',
  temperature_c: 29,
  humidity_percent: 80,
  rainfall_mm: 0,
  wind_speed_knots: 4,
  wind_direction_degrees: 180,
  forecast_low_c: 25,
  forecast_high_c: 32,
  uv_index: 7,
  psi_twenty_four_hourly: 42,
  pm25_one_hourly: 9,
  air_quality_region: 'central',
  forecast_periods: [{ label: 'Now', forecast: 'Cloudy' }],
  daily_forecast: [
    { date: '2026-05-04', forecast: 'Cloudy', temperature_low_c: 25, temperature_high_c: 32 },
  ],
};

const defaultNearestArea: ForecastArea = {
  name: 'Serangoon',
  latitude: 1.354,
  longitude: 103.872,
};

let nearestArea = { ...defaultNearestArea };
let nearestAreaFailure: Error | null = null;
let nearestAreaCalls = 0;

describe('locations API', () => {
  let tempDir: string;
  let app: Awaited<ReturnType<typeof import('../server.js').createApp>>;

  beforeAll(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'weather-starter-test-'));
    process.env.DATABASE_PATH = join(tempDir, 'weather.db');
    process.env.LOG_LEVEL = 'silent';

    const { createApp } = await import('../server.js');
    app = await createApp({
      serveFrontend: false,
      enableRequestLogging: false,
      weatherClient: {
        async getNearestForecastArea() {
          nearestAreaCalls += 1;
          if (nearestAreaFailure) throw nearestAreaFailure;
          return nearestArea;
        },
        async getCurrentWeather(latitude, longitude) {
          if (latitude === nearestArea.latitude && longitude === nearestArea.longitude) {
            return { ...weather, area: nearestArea.name };
          }
          return weather;
        },
      },
    });
  });

  afterEach(() => {
    nearestArea = { ...defaultNearestArea };
    nearestAreaFailure = null;
    nearestAreaCalls = 0;
  });

  afterAll(async () => {
    const { closeDatabase } = await import('../db.js');
    closeDatabase();
    await rm(tempDir, { recursive: true, force: true });
  });

  it('refreshes weather when a location is created', async () => {
    const response = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(201);

    expect(response.body).toMatchObject({
      id: 1,
      latitude: 1.35,
      longitude: 103.85,
      weather: {
        condition: 'Cloudy',
        area: 'Bishan',
        temperature_c: 29,
      },
    });

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).toHaveLength(1);
    expect(listResponse.body.locations[0].weather.condition).toBe('Cloudy');
  });

  it("creates and selects the nearest area's representative coordinates", async () => {
    const response = await request(app)
      .post('/api/locations/nearest')
      .send({ latitude: 1.355, longitude: 103.874 })
      .expect(201);

    expect(response.body).toMatchObject({
      latitude: defaultNearestArea.latitude,
      longitude: defaultNearestArea.longitude,
      weather: { area: defaultNearestArea.name, condition: 'Cloudy' },
    });
    expect(response.body.latitude).not.toBe(1.355);
    expect(response.body.longitude).not.toBe(103.874);

    const locations = await request(app).get('/api/locations').expect(200);
    expect(locations.body.locations).toContainEqual(
      expect.objectContaining({ id: response.body.id }),
    );
  });

  it('reuses an existing nearest area for concurrent and repeated requests', async () => {
    nearestArea = { name: 'Queenstown', latitude: 1.294, longitude: 103.806 };
    const payload = { latitude: 1.293, longitude: 103.807 };

    const responses = await Promise.all([
      request(app).post('/api/locations/nearest').send(payload),
      request(app).post('/api/locations/nearest').send(payload),
    ]);

    expect(responses.map((response) => response.status).sort()).toEqual([200, 201]);
    expect(responses[0].body.id).toBe(responses[1].body.id);

    const repeated = await request(app).post('/api/locations/nearest').send(payload).expect(200);
    expect(repeated.body.id).toBe(responses[0].body.id);

    const locations = await request(app).get('/api/locations').expect(200);
    expect(
      locations.body.locations.filter(
        (location: { latitude: number; longitude: number }) =>
          location.latitude === nearestArea.latitude &&
          location.longitude === nearestArea.longitude,
      ),
    ).toHaveLength(1);
  });

  it('rejects out-of-Singapore GPS coordinates before querying the provider', async () => {
    await request(app)
      .post('/api/locations/nearest')
      .send({ latitude: 1.6, longitude: 103.85 })
      .expect(422, {
        detail: 'Coordinates must be within Singapore (lat 1.1-1.5, lon 103.6-104.1)',
      });

    expect(nearestAreaCalls).toBe(0);
  });

  it('does not create a location when the provider cannot resolve an area', async () => {
    nearestAreaFailure = new WeatherProviderError('No Singapore forecast area is available');

    const before = await request(app).get('/api/locations').expect(200);
    await request(app)
      .post('/api/locations/nearest')
      .send({ latitude: 1.31, longitude: 103.82 })
      .expect(502, { detail: 'No Singapore forecast area is available' });
    const after = await request(app).get('/api/locations').expect(200);

    expect(after.body.locations).toHaveLength(before.body.locations.length);
  });

  it('rejects invalid forecast-area coordinates without saving them', async () => {
    nearestArea = { name: 'Invalid area', latitude: 1.6, longitude: 103.85 };
    const before = await request(app).get('/api/locations').expect(200);

    await request(app)
      .post('/api/locations/nearest')
      .send({ latitude: 1.35, longitude: 103.85 })
      .expect(502, { detail: 'Weather provider returned an invalid forecast area' });

    const after = await request(app).get('/api/locations').expect(200);
    expect(after.body.locations).toHaveLength(before.body.locations.length);
  });

  it('deletes a saved location', async () => {
    const created = await request(app)
      .post('/api/locations')
      .send({ latitude: 1.31, longitude: 103.81 })
      .expect(201);

    await request(app).delete(`/api/locations/${created.body.id}`).expect(204);
    await request(app).get(`/api/locations/${created.body.id}`).expect(404);

    const listResponse = await request(app).get('/api/locations').expect(200);
    expect(listResponse.body.locations).not.toContainEqual(
      expect.objectContaining({ id: created.body.id }),
    );
  });

  it('returns 404 when deleting a missing location', async () => {
    await request(app).delete('/api/locations/9999').expect(404);
  });
});
