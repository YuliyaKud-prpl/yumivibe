import { vi, describe, it, expect, beforeEach } from 'vitest';
import { AppError } from '@/lib/utils/AppError';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

vi.mock('@/lib/utils/rateLimiter', () => ({
  checkWeatherLimit: vi.fn(),
  resetRateLimits: vi.fn(),
}));

vi.mock('@/lib/utils/cache', () => ({
  get: vi.fn(),
  set: vi.fn(),
  WEATHER_TTL_MS: 15 * 60 * 1000,
}));

import {
  geocodeCity,
  fetchWeather,
  getWeatherForCity,
  getWeatherByCoords,
} from '@/lib/services/weatherService';
import { checkWeatherLimit } from '@/lib/utils/rateLimiter';
import * as cache from '@/lib/utils/cache';

const mockCheckWeatherLimit = vi.mocked(checkWeatherLimit);
const mockCacheGet = vi.mocked(cache.get);
const mockCacheSet = vi.mocked(cache.set);

const makeGeoResponse = (name: string, country: string, lat: number, lon: number) => ({
  ok: true,
  json: () => Promise.resolve({
    results: [{ name, country, latitude: lat, longitude: lon }],
  }),
});

const makeWeatherResponse = (code: number, temp = 20, humidity = 55, windSpeed = 10.4) => ({
  ok: true,
  json: () => Promise.resolve({
    current: {
      temperature_2m: temp,
      weather_code: code,
      relative_humidity_2m: humidity,
      wind_speed_10m: windSpeed,
    },
  }),
});

const makeReverseGeoResponse = (city: string, country: string) => ({
  ok: true,
  json: () => Promise.resolve({
    address: { city, country },
  }),
});

describe('weatherService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCacheGet.mockReturnValue(undefined);
    mockCheckWeatherLimit.mockReturnValue({
      allowed: true,
      remaining: 999,
      resetAt: Date.now() + 86_400_000,
    });
  });

  describe('geocodeCity', () => {
    it('returns geo result for a valid city', async () => {
      mockFetch.mockResolvedValueOnce(
        makeGeoResponse('Tokyo', 'Japan', 35.68, 139.69),
      );

      const result = await geocodeCity('Tokyo');

      expect(result).toEqual({
        name: 'Tokyo',
        country: 'Japan',
        latitude: 35.68,
        longitude: 139.69,
      });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('geocoding-api.open-meteo.com'),
      );
    });

    it('throws validation error when city is not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ results: [] }),
      });

      await expect(geocodeCity('Xyzzyville')).rejects.toThrow(AppError);

      try {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({}),
        });
        await geocodeCity('NoResults');
      } catch (err) {
        expect((err as AppError).code).toBe('VALIDATION_ERROR');
        expect((err as AppError).status).toBe(400);
      }
    });

    it('throws external API error when geocoding request fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(geocodeCity('London')).rejects.toThrow(AppError);

      try {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 502 });
        await geocodeCity('London');
      } catch (err) {
        expect((err as AppError).code).toBe('EXTERNAL_API_ERROR');
        expect((err as AppError).status).toBe(502);
      }
    });
  });

  describe('fetchWeather', () => {
    it('returns weather with WMO code 0 (Clear sky)', async () => {
      mockFetch.mockResolvedValueOnce(makeWeatherResponse(0, 25, 40, 5.2));

      const result = await fetchWeather(35.68, 139.69);

      expect(result).toEqual({
        temp: 25,
        condition: 'Clear sky',
        icon: 'light_mode',
        humidity: 40,
        windSpeed: 5,
        weatherCode: 0,
      });
    });

    it('returns weather with WMO code 63 (Moderate rain)', async () => {
      mockFetch.mockResolvedValueOnce(makeWeatherResponse(63, 12, 80, 15.7));

      const result = await fetchWeather(51.5, -0.12);

      expect(result.condition).toBe('Moderate rain');
      expect(result.icon).toBe('rainy');
      expect(result.temp).toBe(12);
      expect(result.windSpeed).toBe(16);
    });

    it('returns weather with WMO code 73 (Moderate snow)', async () => {
      mockFetch.mockResolvedValueOnce(makeWeatherResponse(73, -5, 90, 20.1));

      const result = await fetchWeather(59.91, 10.75);

      expect(result.condition).toBe('Moderate snow');
      expect(result.icon).toBe('weather_snowy');
      expect(result.weatherCode).toBe(73);
    });

    it('returns weather with WMO code 95 (Thunderstorm)', async () => {
      mockFetch.mockResolvedValueOnce(makeWeatherResponse(95, 28, 75, 30.0));

      const result = await fetchWeather(40.71, -74.01);

      expect(result.condition).toBe('Thunderstorm');
      expect(result.icon).toBe('thunderstorm');
      expect(result.weatherCode).toBe(95);
    });

    it('throws external API error when weather request fails', async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, status: 500 });

      await expect(fetchWeather(0, 0)).rejects.toThrow(AppError);

      try {
        mockFetch.mockResolvedValueOnce({ ok: false, status: 503 });
        await fetchWeather(0, 0);
      } catch (err) {
        expect((err as AppError).code).toBe('EXTERNAL_API_ERROR');
      }
    });
  });

  describe('getWeatherForCity', () => {
    it('returns cached result on second call', async () => {
      const cachedWeather = {
        city: 'Tokyo',
        country: 'Japan',
        temp: 20,
        condition: 'Clear sky',
        icon: 'light_mode',
        humidity: 55,
        windSpeed: 10,
        weatherCode: 0,
      };

      mockCacheGet.mockReturnValueOnce(undefined);
      mockFetch
        .mockResolvedValueOnce(makeGeoResponse('Tokyo', 'Japan', 35.68, 139.69))
        .mockResolvedValueOnce(makeWeatherResponse(0, 20, 55, 10.4));

      const first = await getWeatherForCity('Tokyo');

      expect(first.city).toBe('Tokyo');
      expect(mockCacheSet).toHaveBeenCalledWith(
        'weather:tokyo',
        expect.objectContaining({ city: 'Tokyo' }),
        cache.WEATHER_TTL_MS,
      );

      mockCacheGet.mockReturnValueOnce(cachedWeather);
      const second = await getWeatherForCity('Tokyo');

      expect(second).toEqual(cachedWeather);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('throws rate limit error when limit exceeded', async () => {
      mockCheckWeatherLimit.mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 86_400_000,
      });

      await expect(getWeatherForCity('Paris')).rejects.toThrow(AppError);

      try {
        mockCheckWeatherLimit.mockReturnValueOnce({
          allowed: false,
          remaining: 0,
          resetAt: Date.now() + 86_400_000,
        });
        await getWeatherForCity('Paris');
      } catch (err) {
        expect((err as AppError).code).toBe('RATE_LIMIT_WEATHER');
        expect((err as AppError).status).toBe(429);
      }
    });

    it('performs full flow: geocode, fetch weather, cache result', async () => {
      mockFetch
        .mockResolvedValueOnce(makeGeoResponse('Berlin', 'Germany', 52.52, 13.41))
        .mockResolvedValueOnce(makeWeatherResponse(2, 18, 60, 12.3));

      const result = await getWeatherForCity('Berlin');

      expect(result).toEqual({
        city: 'Berlin',
        country: 'Germany',
        temp: 18,
        condition: 'Partly cloudy',
        icon: 'partly_cloudy_day',
        humidity: 60,
        windSpeed: 12,
        weatherCode: 2,
      });

      expect(mockCheckWeatherLimit).toHaveBeenCalledTimes(1);
      expect(mockCacheSet).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe('getWeatherByCoords', () => {
    it('returns cached result when available', async () => {
      const cachedWeather = {
        city: 'Tokyo',
        country: 'Japan',
        temp: 22,
        condition: 'Mainly clear',
        icon: 'partly_cloudy_day',
        humidity: 50,
        windSpeed: 8,
        weatherCode: 1,
      };

      mockCacheGet.mockReturnValueOnce(cachedWeather);

      const result = await getWeatherByCoords(35.68, 139.69);

      expect(result).toEqual(cachedWeather);
      expect(mockFetch).not.toHaveBeenCalled();
      expect(mockCheckWeatherLimit).not.toHaveBeenCalled();
    });

    it('reverse geocodes and returns city name on success', async () => {
      mockFetch
        .mockResolvedValueOnce(makeWeatherResponse(0, 25, 45, 7.8))
        .mockResolvedValueOnce(makeReverseGeoResponse('Sydney', 'Australia'));

      const result = await getWeatherByCoords(-33.87, 151.21);

      expect(result.city).toBe('Sydney');
      expect(result.country).toBe('Australia');
      expect(result.temp).toBe(25);
      expect(mockCacheSet).toHaveBeenCalledWith(
        'weather:-33.87,151.21',
        expect.objectContaining({ city: 'Sydney' }),
        cache.WEATHER_TTL_MS,
      );
    });

    it('falls back to coordinates when reverse geocoding fails', async () => {
      mockFetch
        .mockResolvedValueOnce(makeWeatherResponse(3, 15, 70, 20.0))
        .mockRejectedValueOnce(new Error('Network error'));

      const result = await getWeatherByCoords(10.50, 20.75);

      expect(result.city).toBe('10.50, 20.75');
      expect(result.country).toBe('');
      expect(result.condition).toBe('Overcast');
    });

    it('falls back to coordinates when reverse geocoding returns non-ok', async () => {
      mockFetch
        .mockResolvedValueOnce(makeWeatherResponse(1, 22, 50, 5.0))
        .mockResolvedValueOnce({ ok: false, status: 500 });

      const result = await getWeatherByCoords(48.86, 2.35);

      expect(result.city).toBe('48.86, 2.35');
      expect(result.country).toBe('');
      expect(result.temp).toBe(22);
    });

    it('throws rate limit error when limit exceeded', async () => {
      mockCheckWeatherLimit.mockReturnValueOnce({
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 86_400_000,
      });

      await expect(getWeatherByCoords(0, 0)).rejects.toThrow(AppError);

      try {
        mockCheckWeatherLimit.mockReturnValueOnce({
          allowed: false,
          remaining: 0,
          resetAt: Date.now() + 86_400_000,
        });
        await getWeatherByCoords(0, 0);
      } catch (err) {
        expect((err as AppError).code).toBe('RATE_LIMIT_WEATHER');
      }
    });
  });
});
