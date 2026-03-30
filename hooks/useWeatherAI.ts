import { useCallback, useState } from 'react';

interface WeatherData {
  city: string;
  temp: number;
  condition: string;
}

interface UseWeatherAIReturn {
  suggestion: string | null;
  loading: boolean;
  error: string | null;
  fetchSuggestion: (weather: WeatherData) => void;
}

const GREETINGS = [
  'Here\'s what I\'d suggest for',
  'For your day in',
  'Dressing tip for',
  'Style advice for',
  'My recommendation for',
  'What to wear in',
];

const FREEZING_TIPS = [
  'Bundle up with heavy winter gear — think insulated coat, thermal layers, gloves, and a warm hat.',
  'Go full winter mode: puffy jacket, scarf, thermal base layers, and insulated boots.',
  'Layer up heavily — a down coat, wool sweater, fleece-lined pants, and warm accessories are your best friends.',
  'Time for serious cold-weather armor: insulated parka, hand warmers, and thick wool socks.',
];

const COLD_TIPS = [
  'Warm layers are key — a cozy coat over a sweater with a scarf should do the trick.',
  'Dress in warm layers: a sturdy jacket, knit sweater, and maybe a light beanie.',
  'A reliable coat with layered clothing underneath will keep you comfortable.',
  'Go with a warm jacket, long sleeves, and don\'t skip the scarf.',
];

const MILD_TIPS = [
  'A light jacket or sweater is perfect — easy to take off if it warms up.',
  'Layer with a light cardigan or hoodie over a tee — versatile and comfy.',
  'A pullover or light denim jacket pairs well with this kind of weather.',
  'Keep it flexible: a sweater you can tie around your waist if it gets warmer.',
];

const WARM_TIPS = [
  'Light and casual is the way to go — a tee with shorts or a breezy dress.',
  'Keep it cool and comfy: cotton tee, light pants or a skirt.',
  'Perfect weather for a relaxed outfit — breathable fabrics and light colors.',
  'A simple t-shirt and comfortable bottoms will keep you feeling great.',
];

const HOT_TIPS = [
  'Go minimal and breathable — linen, cotton, and open shoes are your go-to.',
  'Stay cool with the lightest fabrics you own — tank tops, shorts, and sandals.',
  'Dress as light as possible: airy fabrics, light colors, and don\'t forget sunscreen.',
  'Beat the heat with ultra-light clothing — think flowy, breathable, and UV-friendly.',
];

const RAIN_ADDITIONS = [
  'Don\'t forget an umbrella and waterproof shoes!',
  'Grab a rain jacket and water-resistant footwear.',
  'An umbrella is a must — consider a waterproof outer layer too.',
  'Pack an umbrella and maybe waterproof boots just in case.',
];

const WIND_ADDITIONS = [
  'Add a windbreaker to shield against the gusts.',
  'A wind-resistant jacket will keep you comfortable out there.',
  'Consider a windproof layer — it\'ll make a big difference.',
  'Throw on a windbreaker to stay cozy in the breeze.',
];

const SNOW_ADDITIONS = [
  'Waterproof boots and a warm hat are essential in the snow.',
  'Snow-ready gear: waterproof boots, insulated gloves, and a cozy beanie.',
  'Make sure your footwear is waterproof and your extremities are covered.',
  'Bundle up with snow-proof boots and an extra warm layer on top.',
];

const SUNNY_ADDITIONS = [
  'Sunglasses and sunscreen are a great idea today.',
  'Don\'t forget your shades and some SPF!',
  'Protect yourself with sunglasses and a hat for the sun.',
  'It\'s bright out — sunglasses and sunscreen recommended.',
];

function pickRandom(arr: ReadonlyArray<string>): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getBaseTip(temp: number): string {
  if (temp < 0) return pickRandom(FREEZING_TIPS);
  if (temp < 10) return pickRandom(COLD_TIPS);
  if (temp < 20) return pickRandom(MILD_TIPS);
  if (temp < 28) return pickRandom(WARM_TIPS);
  return pickRandom(HOT_TIPS);
}

function getConditionAddition(condition: string): string | null {
  const lower = condition.toLowerCase();

  if (lower.includes('rain') || lower.includes('drizzle') || lower.includes('shower')) {
    return pickRandom(RAIN_ADDITIONS);
  }
  if (lower.includes('wind') || lower.includes('gust') || lower.includes('breeze')) {
    return pickRandom(WIND_ADDITIONS);
  }
  if (lower.includes('snow') || lower.includes('blizzard') || lower.includes('sleet')) {
    return pickRandom(SNOW_ADDITIONS);
  }
  if (lower.includes('sun') || lower.includes('clear') || lower.includes('bright')) {
    return pickRandom(SUNNY_ADDITIONS);
  }
  if (lower.includes('storm') || lower.includes('thunder')) {
    return `${pickRandom(RAIN_ADDITIONS)} Stay safe out there with the storms!`;
  }
  if (lower.includes('fog') || lower.includes('mist') || lower.includes('haze')) {
    return 'Visibility might be low — wear something visible and drive carefully.';
  }

  return null;
}

function buildLocalSuggestion(weather: WeatherData): string {
  const greeting = pickRandom(GREETINGS);
  const base = getBaseTip(weather.temp);
  const conditionExtra = getConditionAddition(weather.condition);

  const tempLabel = `${Math.round(weather.temp)}°C`;
  const parts = [
    `${greeting} ${weather.city} (${tempLabel}, ${weather.condition}): ${base}`,
  ];

  if (conditionExtra) {
    parts.push(conditionExtra);
  }

  return parts.join(' ');
}

export function useWeatherAI(): UseWeatherAIReturn {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSuggestion = useCallback((weather: WeatherData) => {
    setLoading(true);
    setError(null);
    setSuggestion(null);

    const params = new URLSearchParams({
      city: weather.city,
      temp: String(weather.temp),
      condition: weather.condition,
    });

    fetch(`/api/ai/clothing?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`API responded with status ${res.status}`);
        }
        return res.json() as Promise<{ data: { suggestion: string } }>;
      })
      .then((json) => {
        setSuggestion(json.data.suggestion);
        setLoading(false);
      })
      .catch(() => {
        const localSuggestion = buildLocalSuggestion(weather);
        setSuggestion(localSuggestion);
        setError(null);
        setLoading(false);
      });
  }, []);

  return { suggestion, loading, error, fetchSuggestion };
}
