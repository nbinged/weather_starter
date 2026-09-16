import { useStore } from '../state/store';
import { CloseIcon, CloudIcon, DropletIcon, HomeIcon } from './icons';
import { formatTemperature, formatTime } from './format';
import type { MouseEvent } from 'react';
import type { Location } from '../types';

interface SidebarCardProps {
  location: Location;
  isHome: boolean;
}

export function SidebarCard({ location, isHome }: SidebarCardProps) {
  const { selectedId, select, remove } = useStore();
  const isSelected = selectedId === location.id;
  const observed = formatTime(location.weather.observed_at);
  const area =
    location.weather.area || `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`;
  const condition = location.weather.condition || '-';
  const temperature = formatTemperature(location.weather.temperature_c);
  const high = formatTemperature(location.weather.forecast_high_c);
  const low = formatTemperature(location.weather.forecast_low_c);
  const humidity = location.weather.humidity_percent;
  const rainfall = location.weather.rainfall_mm;
  const hasHumidity = typeof humidity === 'number' && Number.isFinite(humidity);
  const hasRainfall = typeof rainfall === 'number' && Number.isFinite(rainfall);

  const onSelect = () => select(location.id);
  const onDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    await remove(location.id);
  };

  return (
    <div
      className={`relative w-full cursor-pointer overflow-hidden rounded-2xl border text-left backdrop-blur-xl transition ${
        isSelected
          ? 'border-white/30 bg-white/20 shadow-lg shadow-black/20'
          : 'border-white/10 bg-white/[0.07] hover:bg-white/[0.12]'
      }`}
    >
      <button type="button" onClick={onSelect} aria-pressed={isSelected} className="block w-full text-left">
        <div className="flex items-start justify-between gap-3 px-4 pb-0 pt-3 pr-11">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold leading-tight text-white">{area}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/70">
              {isHome ? (
                <>
                  <span>My Location</span>
                  <span className="text-white/40">·</span>
                  <HomeIcon className="h-3 w-3" />
                  <span>Home</span>
                </>
              ) : observed ? (
                <span>{observed}</span>
              ) : (
                <span className="text-white/50">Not refreshed</span>
              )}
            </div>
          </div>
          <div className="text-3xl font-light tabular-nums text-white/90">{temperature}</div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-white/80">
            <CloudIcon className="h-4 w-4 text-white/70" />
            <span>{condition}</span>
          </div>
          <div className="text-white/60 tabular-nums">
            H:{high} L:{low}
          </div>
        </div>
        {(hasHumidity || hasRainfall) && (
          <div className="flex gap-3 border-t border-white/10 px-4 py-2 text-[11px] tabular-nums text-white/65">
            {hasHumidity && <span>Humidity {Math.round(humidity)}%</span>}
            {hasRainfall && (
              <span className="flex items-center gap-1">
                <DropletIcon className="h-3 w-3" />
                {rainfall.toFixed(1)} mm
              </span>
            )}
          </div>
        )}
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={`Delete ${area}`}
        className="absolute right-2 top-2 rounded-full p-1.5 text-white/60 transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/70"
      >
        <CloseIcon className="h-4 w-4" />
      </button>
    </div>
  );
}
