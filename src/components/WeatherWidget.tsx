import { useEffect, useState } from 'react';
import { CloudSun } from 'lucide-react';
import { loadWeather, weatherLabel, type WeatherPayload } from '../lib/weather';

export function WeatherWidget() {
  const [data, setData] = useState<WeatherPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    loadWeather(ctrl.signal)
      .then(setData)
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Weather is temporarily unavailable.');
      });
    return () => ctrl.abort();
  }, []);

  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <CloudSun className="h-5 w-5 text-clay" aria-hidden />
        <h2 className="font-display text-xl text-moss">Penistone weather</h2>
      </div>
      <p className="mt-1 text-sm text-ink/60">Open-Meteo forecast for the town centre. Useful when judging wet roads and dark evenings.</p>

      {!data && !error && <p className="mt-4 text-sm text-ink/55">Fetching the latest reading…</p>}
      {error && <p className="mt-4 text-sm text-[#8b3a3a]">{error}</p>}
      {data && (
        <>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="font-display text-4xl text-ink">{Math.round(data.current.temperature_2m)}°</p>
              <p className="text-sm text-ink/70">{weatherLabel(data.current.weather_code)}</p>
            </div>
            <div className="text-right text-sm text-ink/65">
              <p>Wind {Math.round(data.current.wind_speed_10m)} km/h</p>
              <p>Humidity {Math.round(data.current.relative_humidity_2m)}%</p>
            </div>
          </div>
          <ul className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
            {data.daily.time.map((day, i) => (
              <li key={day} className="rounded-xl bg-stone/70 px-1 py-2">
                <p className="font-semibold text-ink/70">
                  {new Date(`${day}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })}
                </p>
                <p className="mt-1 text-ink">{Math.round(data.daily.temperature_2m_max[i])}° / {Math.round(data.daily.temperature_2m_min[i])}°</p>
                <p className="text-ink/55">{data.daily.precipitation_probability_max[i]}% rain</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
