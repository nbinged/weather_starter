import { useEffect, useRef, useState } from 'react';
import { logInteraction } from '../api';
import { useStore } from '../state/store';
import { CloseIcon, LocationIcon } from './icons';
import { WeatherMap } from './WeatherMap';

function ExpandIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5" />
      <path d="m3 8 6-6M21 8l-6-6M3 16l6 6M21 16l-6 6" />
    </svg>
  );
}

export function WeatherMapCard() {
  const { locations, selectedId, select } = useStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const expandButton = useRef<HTMLButtonElement>(null);

  const open = () => {
    setIsExpanded(true);
    logInteraction('weather_map_opened');
  };

  const close = () => {
    setIsExpanded(false);
    logInteraction('weather_map_closed');
    window.requestAnimationFrame(() => expandButton.current?.focus());
  };

  useEffect(() => {
    if (!isExpanded) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isExpanded]);

  const onSelect = (id: number) => {
    select(id);
    logInteraction('weather_map_pin_selected', { locationId: id });
  };

  return (
    <>
      <section
        onClick={open}
        className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] shadow-lg shadow-black/10 backdrop-blur-xl"
        aria-label="Saved locations weather map"
      >
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
              <LocationIcon className="h-3.5 w-3.5" />
              <span>Locations map</span>
            </div>
            <p className="mt-1 text-sm text-white/85">Weather across your saved places</p>
          </div>
          <button
            ref={expandButton}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              open();
            }}
            aria-label="Expand weather map"
            className="rounded-full border border-white/15 bg-white/[0.1] p-2 text-white/85 hover:bg-white/[0.18]"
          >
            <ExpandIcon />
          </button>
        </header>
        <div className="h-64 border-t border-white/10" onClick={(event) => event.stopPropagation()}>
          <WeatherMap locations={locations} selectedId={selectedId} onSelect={onSelect} />
        </div>
      </section>

      {isExpanded && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Expanded saved locations weather map"
          className="fixed inset-0 z-50 bg-slate-950"
        >
          <div className="absolute inset-x-0 top-0 z-[1000] flex items-center justify-between gap-4 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-xl sm:px-6">
            <div>
              <div className="text-base font-medium text-white">Saved Locations</div>
              <p className="text-xs text-white/65">Select a pin to view that location on the dashboard.</p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close full-screen weather map"
              className="rounded-full border border-white/15 bg-white/[0.1] p-2 text-white/90 hover:bg-white/[0.18]"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
          <WeatherMap locations={locations} selectedId={selectedId} onSelect={onSelect} expanded />
        </div>
      )}
    </>
  );
}
