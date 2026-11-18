import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  listLocations,
  createLocation,
  createNearestLocation,
  deleteLocation,
  refreshLocation,
  logInteraction,
} from '../api';
import type { CreateLocationPayload, Location, ProviderProps, StoreValue } from '../types';

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: ProviderProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshingId, setRefreshingId] = useState<number | null>(null);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async (): Promise<Location[]> => {
    try {
      const data = await listLocations();
      setLocations(data.locations);
      setError(null);
      return data.locations;
    } catch (err) {
      setError(err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- load-on-mount syncs API → React state
    load().then((next) => {
      if (next.length > 0) setSelectedId((current) => current ?? next[0].id);
    });
  }, [load]);

  const effectiveSelectedId = (() => {
    if (locations.length === 0) return null;
    return locations.some((l) => l.id === selectedId) ? selectedId : locations[0].id;
  })();

  const create = useCallback(
    async (payload: CreateLocationPayload) => {
      setError(null);
      logInteraction('location_create_submitted', payload);
      try {
        const created = await createLocation(payload);
        const next = await load();
        const targetId = created?.id ?? next[next.length - 1]?.id;
        if (targetId) setSelectedId(targetId);
        setIsAdding(false);
        logInteraction('location_created', {
          locationId: targetId,
          latitude: created.latitude,
          longitude: created.longitude,
        });
      } catch (err) {
        setError(err);
        logInteraction('location_create_failed', {
          latitude: payload.latitude,
          longitude: payload.longitude,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
        throw err;
      }
    },
    [load],
  );

  const addNearestLocation = useCallback(async (payload: CreateLocationPayload) => {
    setError(null);
    logInteraction('location_nearest_submitted');
    try {
      const result = await createNearestLocation(payload);
      setLocations((current) => {
        const alreadyLoaded = current.some((location) => location.id === result.location.id);
        if (alreadyLoaded) {
          return current.map((location) =>
            location.id === result.location.id ? result.location : location,
          );
        }
        return result.created ? [result.location, ...current] : [...current, result.location];
      });
      setSelectedId(result.location.id);
      setIsAdding(false);
      logInteraction('location_nearest_resolved', {
        locationId: result.location.id,
        created: result.created,
      });
      return result;
    } catch (err) {
      setError(err);
      logInteraction('location_nearest_failed', {
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  }, []);

  const refresh = useCallback(
    async (id: number) => {
      setRefreshingId(id);
      setError(null);
      logInteraction('location_refresh_clicked', { locationId: id });
      try {
        await refreshLocation(id);
        await load();
        logInteraction('location_refreshed', { locationId: id });
      } catch (err) {
        setError(err);
        logInteraction('location_refresh_failed', {
          locationId: id,
          error: err instanceof Error ? err.message : 'Unknown error',
        });
      } finally {
        setRefreshingId(null);
      }
    },
    [load],
  );

  const remove = useCallback(async (id: number) => {
    setError(null);
    logInteraction('location_delete_clicked', { locationId: id });
    try {
      await deleteLocation(id);
      setLocations((current) => current.filter((location) => location.id !== id));
      setSelectedId((current) => (current === id ? null : current));
      logInteraction('location_deleted', { locationId: id });
    } catch (err) {
      setError(err);
      logInteraction('location_delete_failed', {
        locationId: id,
        error: err instanceof Error ? err.message : 'Unknown error',
      });
      throw err;
    }
  }, []);

  const value: StoreValue = {
    locations,
    selectedId: effectiveSelectedId,
    isAdding,
    isLoading,
    refreshingId,
    error,
    select: setSelectedId,
    setAdding: (nextIsAdding) => {
      setIsAdding(nextIsAdding);
      if (nextIsAdding) logInteraction('location_form_opened');
    },
    create,
    addNearestLocation,
    remove,
    refresh,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}

export function useSelectedLocation(): Location | null {
  const { locations, selectedId } = useStore();
  return locations.find((l) => l.id === selectedId) ?? null;
}
