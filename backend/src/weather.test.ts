import { afterEach, describe, expect, it, vi } from 'vitest';
import { SingaporeWeatherClient } from './weather.js';

const latitude = 1.35;
const longitude = 103.85;

describe('SingaporeWeatherClient current conditions', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('combines the nearest realtime readings with the two-hour area forecast', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const endpoint = String(input).split('/').pop() ?? '';
      const payloads: Record<string, object> = {
        'two-hr-forecast': {
          data: {
            area_metadata: [
              { name: 'Bishan', label_location: { latitude: 1.35, longitude: 103.85 } },
            ],
            items: [
              {
                update_timestamp: '2026-09-16T10:00:00+08:00',
                forecasts: [{ area: 'Bishan', forecast: 'Partly Cloudy' }],
              },
            ],
          },
        },
        'air-temperature': stationPayload(30.2),
        'relative-humidity': stationPayload(76),
        rainfall: stationPayload(1.4),
        'wind-speed': stationPayload(5.2),
        'wind-direction': stationPayload(180),
        uv: {
          data: {
            records: [
              { updatedTimestamp: '2026-09-16T10:00:00+08:00', index: [{ value: 6 }] },
            ],
          },
        },
        psi: airQualityPayload('psi_twenty_four_hourly', 42),
        pm25: airQualityPayload('pm25_one_hourly', 12),
        'twenty-four-hr-forecast': {
          data: {
            records: [
              {
                general: { temperature: { low: 25, high: 33 } },
                periods: [
                  {
                    timePeriod: { text: '11.00 am to 1.00 pm' },
                    regions: { central: { text: 'Partly Cloudy' } },
                  },
                ],
              },
            ],
          },
        },
        '4-day-weather-forecast': {
          items: [
            {
              forecasts: [
                {
                  date: '2026-09-16',
                  forecast: 'Partly Cloudy',
                  temperature: { low: 25, high: 33 },
                },
              ],
            },
          ],
        },
      };
      return new Response(JSON.stringify(payloads[endpoint]), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const snapshot = await new SingaporeWeatherClient({ baseUrl: 'https://weather.example' })
      .getCurrentWeather(latitude, longitude);

    expect(snapshot).toMatchObject({
      area: 'Bishan',
      condition: 'Partly Cloudy',
      temperature_c: 30.2,
      humidity_percent: 76,
      rainfall_mm: 1.4,
      wind_speed_knots: 5.2,
      wind_direction_degrees: 180,
      uv_index: 6,
      psi_twenty_four_hourly: 42,
      pm25_one_hourly: 12,
      air_quality_region: 'central',
      forecast_low_c: 25,
      forecast_high_c: 33,
    });
    expect(snapshot.forecast_periods).toEqual([
      { label: '11.00 am to 1.00 pm', forecast: 'Partly Cloudy' },
    ]);
    expect(snapshot.daily_forecast).toEqual([
      {
        date: '2026-09-16',
        forecast: 'Partly Cloudy',
        temperature_low_c: 25,
        temperature_high_c: 33,
      },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(11);
  });

  it('keeps forecast data when one realtime condition endpoint fails', async () => {
    const fetchMock = vi.fn(async (input: string | URL) => {
      const endpoint = String(input).split('/').pop() ?? '';
      if (endpoint === 'relative-humidity') return new Response(null, { status: 503 });
      if (endpoint === 'two-hr-forecast') {
        return new Response(
          JSON.stringify({
            data: {
              area_metadata: [],
              items: [{ forecasts: [{ area: 'Singapore', forecast: 'Cloudy' }] }],
            },
          }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify(stationPayload(2)), { status: 200 });
    });
    vi.stubGlobal('fetch', fetchMock);

    const snapshot = await new SingaporeWeatherClient({ baseUrl: 'https://weather.example' })
      .getCurrentWeather(latitude, longitude);

    expect(snapshot.condition).toBe('Cloudy');
    expect(snapshot.humidity_percent).toBeNull();
    expect(snapshot.temperature_c).toBe(2);
    expect(snapshot.rainfall_mm).toBe(2);
  });
});

function stationPayload(value: number) {
  return {
    data: {
      stations: [
        { id: 'nearest', location: { latitude, longitude } },
        { id: 'farther', location: { latitude: 1.49, longitude: 104.09 } },
      ],
      readings: [
        {
          timestamp: '2026-09-16T10:00:00+08:00',
          data: [
            { stationId: 'nearest', value },
            { stationId: 'farther', value: 999 },
          ],
        },
      ],
    },
  };
}

function airQualityPayload(readingName: string, value: number) {
  return {
    data: {
      regionMetadata: [
        { name: 'central', labelLocation: { latitude, longitude } },
        { name: 'west', labelLocation: { latitude: 1.49, longitude: 103.61 } },
      ],
      items: [
        {
          timestamp: '2026-09-16T10:00:00+08:00',
          readings: { [readingName]: { central: value, west: 999 } },
        },
      ],
    },
  };
}
