export const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast?latitude=53.525&longitude=-1.628&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Europe%2FLondon&forecast_days=4';

export type WeatherPayload = {
  current: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
};

const LABELS: Record<number, string> = {
  0: 'Clear',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Rime fog',
  51: 'Light drizzle',
  53: 'Drizzle',
  55: 'Dense drizzle',
  61: 'Light rain',
  63: 'Rain',
  65: 'Heavy rain',
  71: 'Light snow',
  73: 'Snow',
  75: 'Heavy snow',
  80: 'Showers',
  81: 'Showers',
  82: 'Heavy showers',
  95: 'Thunder',
  96: 'Thunder',
  99: 'Thunder'
};

export function weatherLabel(code: number): string {
  return LABELS[code] || 'Mixed';
}

export async function loadWeather(signal?: AbortSignal): Promise<WeatherPayload> {
  const res = await fetch(WEATHER_URL, { signal });
  if (!res.ok) throw new Error(`Weather unavailable (${res.status})`);
  return res.json() as Promise<WeatherPayload>;
}
