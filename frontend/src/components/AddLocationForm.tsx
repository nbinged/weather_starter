import { useState } from 'react';
import type { FormEvent } from 'react';
import { useStore } from '../state/store';
import { LocationIcon, PlusIcon } from './icons';

export function AddLocationForm() {
  const { isAdding, setAdding, create, addNearestLocation } = useStore();
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [locationStage, setLocationStage] = useState<'idle' | 'locating' | 'adding'>('idle');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<{
    kind: 'error' | 'success';
    text: string;
  } | null>(null);

  const cancel = () => {
    setLatitude('');
    setLongitude('');
    setSubmitError(null);
    setAdding(false);
  };

  const onUseMyLocation = () => {
    if (locationStage !== 'idle') return;
    setLocationMessage(null);

    if (!navigator.geolocation) {
      setLocationMessage({
        kind: 'error',
        text: 'Your browser does not support location. You can still enter coordinates manually.',
      });
      return;
    }

    setLocationStage('locating');
    let positionRequestFinished = false;
    const positionWatchdog = window.setTimeout(() => {
      if (positionRequestFinished) return;
      positionRequestFinished = true;
      setLocationStage('idle');
      setLocationMessage({
        kind: 'error',
        text: 'Chrome has not returned a position. Check this site’s location permission, then try again.',
      });
    }, 15_000);

    const handlePositionError = (error: GeolocationPositionError) => {
      if (positionRequestFinished) return;
      positionRequestFinished = true;
      window.clearTimeout(positionWatchdog);
      const message =
        error.code === error.PERMISSION_DENIED
          ? 'Location access was denied. Allow it in your browser settings, then try again.'
          : error.code === error.POSITION_UNAVAILABLE
            ? 'Your position is unavailable. Try again or enter coordinates manually.'
            : error.code === error.TIMEOUT
              ? 'The location request timed out. Try again.'
              : 'Could not determine your location. Try again or enter coordinates manually.';
      setLocationMessage({ kind: 'error', text: message });
      setLocationStage('idle');
    };

    try {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (positionRequestFinished) return;
          positionRequestFinished = true;
          window.clearTimeout(positionWatchdog);
          setLocationStage('adding');
          void addNearestLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          })
            .then(({ location, created }) => {
              const area = location.weather.area || 'Nearest forecast area';
              setLocationMessage({
                kind: 'success',
                text: created
                  ? `Added ${area} to your locations.`
                  : `${area} is already on your list. Selected it.`,
              });
            })
            .catch((error: unknown) => {
              setLocationMessage({
                kind: 'error',
                text:
                  error instanceof Error
                    ? error.message
                    : 'Could not add your nearest forecast area. Try again or enter coordinates manually.',
              });
            })
            .finally(() => setLocationStage('idle'));
        },
        handlePositionError,
        { enableHighAccuracy: false, timeout: 10_000, maximumAge: 300_000 },
      );
    } catch {
      if (positionRequestFinished) return;
      positionRequestFinished = true;
      window.clearTimeout(positionWatchdog);
      setLocationStage('idle');
      setLocationMessage({
        kind: 'error',
        text: 'Could not request your location. Check this site’s browser permission, then try again.',
      });
    }
  };

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await create({ latitude: Number(latitude), longitude: Number(longitude) });
      setLatitude('');
      setLongitude('');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Could not add location');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setAdding(true)}
          aria-expanded={isAdding}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-2.5 text-sm font-medium text-white/85 backdrop-blur-xl hover:bg-white/[0.12]"
        >
          <PlusIcon />
          <span>Add Location</span>
        </button>
        <button
          type="button"
          onClick={onUseMyLocation}
          disabled={locationStage !== 'idle'}
          className="flex items-center justify-center gap-2 rounded-2xl border border-white/15 bg-white/[0.07] px-3 py-2.5 text-sm font-medium text-white/85 backdrop-blur-xl hover:bg-white/[0.12] disabled:cursor-wait disabled:opacity-60"
        >
          <LocationIcon className="h-4 w-4" />
          <span>
            {locationStage === 'locating'
              ? 'Locating…'
              : locationStage === 'adding'
                ? 'Adding…'
                : 'Use my location'}
          </span>
        </button>
      </div>

      {isAdding && (
        <form
          onSubmit={onSubmit}
          className="grid gap-2.5 rounded-2xl border border-white/15 bg-white/[0.1] p-3 backdrop-blur-xl"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
            New coordinate
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid min-w-0 gap-1">
              <span className="text-[11px] text-white/60">Latitude</span>
              <input
                type="number"
                step="any"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="1.3508"
                required
                className="w-full min-w-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
              />
            </label>
            <label className="grid min-w-0 gap-1">
              <span className="text-[11px] text-white/60">Longitude</span>
              <input
                type="number"
                step="any"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="103.8390"
                required
                className="w-full min-w-0 rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-sm text-white placeholder:text-white/40"
              />
            </label>
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={cancel}
              className="rounded-md px-2.5 py-1.5 text-xs font-medium text-white/70 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-md bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Adding…' : 'Add'}
            </button>
          </div>
          {submitError && (
            <p
              role="alert"
              className="rounded-md border border-red-300/30 bg-red-500/15 px-2.5 py-1.5 text-xs text-red-100"
            >
              {submitError}
            </p>
          )}
        </form>
      )}

      {locationMessage && (
        <p
          role={locationMessage.kind === 'error' ? 'alert' : 'status'}
          className={`rounded-2xl border px-3 py-2 text-xs ${
            locationMessage.kind === 'error'
              ? 'border-red-300/30 bg-red-500/15 text-red-100'
              : 'border-emerald-300/30 bg-emerald-500/15 text-emerald-100'
          }`}
        >
          {locationMessage.text}
        </p>
      )}
    </div>
  );
}
