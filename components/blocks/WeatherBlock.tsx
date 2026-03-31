'use client';

import { useState, useCallback, useEffect } from 'react';
import { Block } from '@/types/dashboard';
import { useDashboardContext } from '@/context/DashboardContext';
import { useWeatherAI } from '@/hooks/useWeatherAI';

interface BlockProps {
  block: Block;
  onUpdate: (content: Record<string, unknown>) => void;
}

interface WeatherData {
  city: string;
  country: string;
  temp: number;
  condition: string;
  icon: string;
  humidity: number;
  windSpeed: number;
}

export function WeatherBlock({ block, onUpdate }: BlockProps) {
  const { dashboard } = useDashboardContext();
  const accent = dashboard.accentColor ?? '#237227';
  const savedCity = (block.content.city as string) ?? '';
  const [cityInput, setCityInput] = useState(savedCity);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { suggestion: aiSuggestion, loading: aiLoading, fetchSuggestion } = useWeatherAI();

  const fetchByCity = useCallback(async (city: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to fetch weather');
        return;
      }
      setWeather(json.data);
      onUpdate({ ...block.content, city });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [block.content, onUpdate]);

  const fetchByCoords = useCallback(async (lat: number, lon: number) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/weather?latitude=${lat}&longitude=${lon}`);
      const json = await res.json();
      if (!res.ok) {
        setError(json.error?.message ?? 'Failed to fetch weather');
        return;
      }
      setWeather(json.data);
      setCityInput(json.data.city);
      onUpdate({ ...block.content, city: json.data.city });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [block.content, onUpdate]);

  useEffect(() => {
    if (savedCity) {
      fetchByCity(savedCity);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchByCoords(pos.coords.latitude, pos.coords.longitude),
        () => { /* user denied geolocation, show input */ },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSearch = useCallback(() => {
    const city = cityInput.trim();
    if (!city) {
      setError('Please enter a city name');
      return;
    }
    fetchByCity(city);
  }, [cityInput, fetchByCity]);

  const showSuggestion = useCallback(() => {
    if (!weather) return;
    fetchSuggestion({ city: weather.city, temp: weather.temp, condition: weather.condition });
  }, [weather, fetchSuggestion]);

  return (
    <div className="px-8 pb-8 pt-10 h-full flex flex-col rounded-2xl border" style={{ borderColor: accent + '15' }}>
      {!weather && !loading && (
        <div className="flex gap-2 mb-4">
          <div className="flex-1 flex items-center gap-2 border border-outline-variant/30 rounded-xl px-3 py-2 bg-surface-container-lowest focus-within:border-outline-variant focus-within:ring-1 focus-within:ring-outline-variant">
            <span className="material-symbols-outlined text-on-surface-variant text-lg">search</span>
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Enter city..."
              className="flex-1 bg-transparent text-sm text-on-surface outline-none placeholder:text-on-surface-variant/50"
            />
          </div>
        </div>
      )}

      {error && <p className="text-error text-xs mb-2">{error}</p>}

      {loading && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-on-surface-variant/50">
          <span className="material-symbols-outlined text-4xl animate-spin">progress_activity</span>
          <span className="text-sm">Loading weather...</span>
        </div>
      )}

      {weather && !loading && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-start justify-between shrink-0">
            <div>
              <p className="font-bold text-on-surface-variant tracking-widest uppercase mb-1 text-xs">
                {weather.city}{weather.country ? `, ${weather.country}` : ''}
              </p>
              <h4 className="text-4xl font-bold text-on-surface">{weather.temp}&deg;C</h4>
              <p className="text-on-surface-variant font-medium">{weather.condition}</p>
              <div className="flex gap-3 mt-1 text-xs text-on-surface-variant/70">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">humidity_percentage</span>
                  {weather.humidity}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">air</span>
                  {weather.windSpeed} km/h
                </span>
              </div>
            </div>
            <span
              className="material-symbols-outlined text-amber-500 text-5xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              {weather.icon}
            </span>
          </div>

          {aiSuggestion && (
            <p className="mt-3 text-xs text-on-surface-variant leading-relaxed">
              {aiSuggestion}
            </p>
          )}

          <div className="shrink-0 pt-3 mt-auto">
            {!aiSuggestion && (
              <button
                onClick={showSuggestion}
                className="w-full text-white py-2.5 rounded-xl font-bold transition-all active:scale-[0.98] hover:opacity-90 cursor-pointer text-sm"
                style={{ backgroundColor: accent }}
              >
                {aiLoading ? 'Thinking...' : 'What to wear?'}
              </button>
            )}
            <button
              onClick={() => { setWeather(null); setCityInput(''); }}
              className="w-full mt-1.5 text-xs text-on-surface-variant/50 hover:text-on-surface-variant transition-colors text-center cursor-pointer"
            >
              Change city
            </button>
          </div>
        </div>
      )}

      {!weather && !loading && !error && (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-on-surface-variant/50">
          <span className="material-symbols-outlined text-4xl">cloud</span>
          <span className="text-sm">Enter a city to see weather</span>
        </div>
      )}
    </div>
  );
}
