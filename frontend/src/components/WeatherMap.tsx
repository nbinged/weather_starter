import { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import type { Location } from '../types';
import { formatTemperature } from './format';

const SINGAPORE_CENTER: [number, number] = [1.3521, 103.8198];
const SINGAPORE_ZOOM = 11;

interface WeatherMapProps {
  locations: Location[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  expanded?: boolean;
}

function hasCoordinates(location: Location): boolean {
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
}

function locationName(location: Location): string {
  return location.weather.area || `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`;
}

function Viewport({ locations, expanded }: Pick<WeatherMapProps, 'locations' | 'expanded'>) {
  const map = useMap();
  const coordinateLocations = useMemo(() => locations.filter(hasCoordinates), [locations]);
  const coordinateKey = coordinateLocations
    .map((location) => `${location.id}:${location.latitude}:${location.longitude}`)
    .join('|');

  useEffect(() => {
    const resizeFrame = window.requestAnimationFrame(() => map.invalidateSize());

    if (coordinateLocations.length === 0) {
      map.setView(SINGAPORE_CENTER, SINGAPORE_ZOOM, { animate: false });
    } else if (coordinateLocations.length === 1) {
      const location = coordinateLocations[0];
      map.setView([location.latitude, location.longitude], 12, { animate: false });
    } else {
      map.fitBounds(
        coordinateLocations.map((location) => [location.latitude, location.longitude] as [number, number]),
        { padding: expanded ? [72, 72] : [36, 36], maxZoom: 12, animate: false },
      );
    }

    return () => window.cancelAnimationFrame(resizeFrame);
  }, [coordinateKey, coordinateLocations, expanded, map]);

  return null;
}

function pinIcon(selected: boolean) {
  return L.divIcon({
    className: `weather-map-pin${selected ? ' weather-map-pin--selected' : ''}`,
    html: '<span aria-hidden="true"></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

export function WeatherMap({ locations, selectedId, onSelect, expanded = false }: WeatherMapProps) {
  const coordinateLocations = locations.filter(hasCoordinates);

  return (
    <MapContainer
      center={SINGAPORE_CENTER}
      zoom={SINGAPORE_ZOOM}
      className="h-full w-full"
      zoomControl={expanded}
      scrollWheelZoom={expanded}
      attributionControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      />
      <Viewport locations={locations} expanded={expanded} />
      {coordinateLocations.map((location) => {
        const selected = location.id === selectedId;
        return (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={pinIcon(selected)}
            eventHandlers={{ click: () => onSelect(location.id) }}
          >
            <Tooltip
              permanent
              direction="top"
              offset={[0, -11]}
              opacity={1}
              interactive={false}
              className={`weather-map-label${selected ? ' weather-map-label--selected' : ''}`}
            >
              <span className="weather-map-label__name">
                {formatTemperature(location.weather.temperature_c)}
              </span>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
