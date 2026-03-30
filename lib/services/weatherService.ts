import { AppError } from '@/lib/utils/AppError';
import { checkWeatherLimit } from '@/lib/utils/rateLimiter';
import * as cache from '@/lib/utils/cache';

interface GeoResult {
  name: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface WeatherResult {
  city: string;
  country: string;
  temp: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
}

const WMO_CONDITIONS: Record<number, { condition: string; icon: string }> = {
  0: { condition: 'Clear sky', icon: 'light_mode' },
  1: { condition: 'Mainly clear', icon: 'partly_cloudy_day' },
  2: { condition: 'Partly cloudy', icon: 'partly_cloudy_day' },
  3: { condition: 'Overcast', icon: 'cloud' },
  45: { condition: 'Foggy', icon: 'foggy' },
  48: { condition: 'Rime fog', icon: 'foggy' },
  51: { condition: 'Light drizzle', icon: 'rainy' },
  53: { condition: 'Moderate drizzle', icon: 'rainy' },
  55: { condition: 'Dense drizzle', icon: 'rainy' },
  56: { condition: 'Freezing drizzle', icon: 'weather_snowy' },
  57: { condition: 'Heavy freezing drizzle', icon: 'weather_snowy' },
  61: { condition: 'Slight rain', icon: 'rainy' },
  63: { condition: 'Moderate rain', icon: 'rainy' },
  65: { condition: 'Heavy rain', icon: 'rainy' },
  66: { condition: 'Freezing rain', icon: 'weather_snowy' },
  67: { condition: 'Heavy freezing rain', icon: 'weather_snowy' },
  71: { condition: 'Slight snow', icon: 'weather_snowy' },
  73: { condition: 'Moderate snow', icon: 'weather_snowy' },
  75: { condition: 'Heavy snow', icon: 'weather_snowy' },
  77: { condition: 'Snow grains', icon: 'weather_snowy' },
  80: { condition: 'Slight rain showers', icon: 'rainy' },
  81: { condition: 'Moderate rain showers', icon: 'rainy' },
  82: { condition: 'Violent rain showers', icon: 'rainy' },
  85: { condition: 'Slight snow showers', icon: 'weather_snowy' },
  86: { condition: 'Heavy snow showers', icon: 'weather_snowy' },
  95: { condition: 'Thunderstorm', icon: 'thunderstorm' },
  96: { condition: 'Thunderstorm with hail', icon: 'thunderstorm' },
  99: { condition: 'Thunderstorm with heavy hail', icon: 'thunderstorm' },
};

function getCondition(code: number): { condition: string; icon: string } {
  return WMO_CONDITIONS[code] ?? { condition: 'Unknown', icon: 'cloud' };
}

export async function geocodeCity(city: string): Promise<GeoResult> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en`;
  const res = await fetch(url);

  if (!res.ok) {
    throw AppError.externalApiError('Open-Meteo', 'Geocoding request failed');
  }

  const data = await res.json();

  if (!data.results || data.results.length === 0) {
    throw AppError.validation('City not found. Please check the spelling.');
  }

  const result = data.results[0];
  return {
    name: result.name,
    country: result.country ?? '',
    latitude: result.latitude,
    longitude: result.longitude,
  };
}

export async function fetchWeather(
  latitude: number,
  longitude: number,
): Promise<Omit<WeatherResult, 'city' | 'country'>> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code,relative_humidity_2m,wind_speed_10m`;
  const res = await fetch(url);

  if (!res.ok) {
    throw AppError.externalApiError('Open-Meteo', 'Weather forecast request failed');
  }

  const data = await res.json();
  const current = data.current;
  const code = current.weather_code as number;
  const { condition, icon } = getCondition(code);

  return {
    temp: Math.round(current.temperature_2m as number),
    condition,
    icon,
    humidity: current.relative_humidity_2m as number,
    windSpeed: Math.round(current.wind_speed_10m as number),
    weatherCode: code,
  };
}

export async function getWeatherForCity(city: string): Promise<WeatherResult> {
  const cacheKey = `weather:${city.toLowerCase()}`;
  const cached = cache.get<WeatherResult>(cacheKey);
  if (cached) return cached;

  const rateLimit = checkWeatherLimit();
  if (!rateLimit.allowed) {
    throw AppError.rateLimitWeather();
  }

  const geo = await geocodeCity(city);
  const weather = await fetchWeather(geo.latitude, geo.longitude);
  const result: WeatherResult = { ...weather, city: geo.name, country: geo.country };

  cache.set(cacheKey, result, cache.WEATHER_TTL_MS);
  return result;
}

export async function getWeatherByCoords(
  latitude: number,
  longitude: number,
): Promise<WeatherResult> {
  const cacheKey = `weather:${latitude.toFixed(2)},${longitude.toFixed(2)}`;
  const cached = cache.get<WeatherResult>(cacheKey);
  if (cached) return cached;

  const rateLimit = checkWeatherLimit();
  if (!rateLimit.allowed) {
    throw AppError.rateLimitWeather();
  }

  const weather = await fetchWeather(latitude, longitude);

  let city = `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
  let country = '';

  try {
    const reverseUrl = `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&zoom=10`;
    const res = await fetch(reverseUrl, {
      headers: { 'User-Agent': 'YumiVibe/1.0' },
    });
    if (res.ok) {
      const data = await res.json();
      city = data.address?.city ?? data.address?.town ?? data.address?.village ?? city;
      country = data.address?.country ?? '';
    }
  } catch {
    // reverse geocoding is best-effort
  }

  const result: WeatherResult = { ...weather, city, country };
  cache.set(cacheKey, result, cache.WEATHER_TTL_MS);
  return result;
}
