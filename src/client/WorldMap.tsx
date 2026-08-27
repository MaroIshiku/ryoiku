import React, { useEffect, useMemo, useRef, useState } from "react";
import { geoEqualEarth, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { FeatureCollection, Geometry } from "geojson";
import world from "world-atlas/countries-110m.json";

const MAP_WIDTH = 960;
const MAP_HEIGHT = 500;
const MIN_ZOOM = 1;
const MAX_ZOOM = 6;

type Point = { x: number; y: number };
export type MapView = Point & { zoom: number };
export type MapFilters = {
  continent: string;
  search: string;
  visitedCountries: boolean;
  wishlistCountries: boolean;
  otherCountries: boolean;
  visitedCities: boolean;
  wishlistCities: boolean;
};

type Country = {
  code: string;
  numericCode: string | null;
  name: string;
  continentCode: string;
  visited: boolean;
  wishlisted: boolean;
  visitCount: number;
  cityCount: number;
  lastVisit: string | null;
};
type City = {
  id: string;
  name: string;
  countryCode: string;
  countryName: string;
  latitude: number;
  longitude: number;
  visited: boolean;
  wishlisted: boolean;
  visitCount: number;
};
type Props = {
  countries: Country[];
  cities: City[];
  layer: string;
  filters: MapFilters;
  showCities: boolean;
  onCountry: (code: string) => void;
  onCity: (id: string) => void;
};
type MapTarget = { kind: "country" | "city"; id: string };
type Gesture = {
  startView: MapView;
  startPoints: Map<number, Point>;
  moved: boolean;
  pinching: boolean;
  target: MapTarget | null;
};

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.max(minimum, Math.min(maximum, value));

export function clampMapView(view: MapView): MapView {
  const zoom = clamp(view.zoom, MIN_ZOOM, MAX_ZOOM);
  return {
    zoom,
    x: clamp(view.x, MAP_WIDTH * (1 - zoom), 0),
    y: clamp(view.y, MAP_HEIGHT * (1 - zoom), 0),
  };
}

export function pinchMapView(
  startView: MapView,
  startA: Point,
  startB: Point,
  currentA: Point,
  currentB: Point,
): MapView {
  const startDistance = Math.hypot(startB.x - startA.x, startB.y - startA.y);
  const currentDistance = Math.hypot(
    currentB.x - currentA.x,
    currentB.y - currentA.y,
  );
  if (startDistance === 0) return startView;
  const startMidpoint = {
    x: (startA.x + startB.x) / 2,
    y: (startA.y + startB.y) / 2,
  };
  const currentMidpoint = {
    x: (currentA.x + currentB.x) / 2,
    y: (currentA.y + currentB.y) / 2,
  };
  const zoom = clamp(
    startView.zoom * (currentDistance / startDistance),
    MIN_ZOOM,
    MAX_ZOOM,
  );
  const contentPoint = {
    x: (startMidpoint.x - startView.x) / startView.zoom,
    y: (startMidpoint.y - startView.y) / startView.zoom,
  };
  return clampMapView({
    zoom,
    x: currentMidpoint.x - contentPoint.x * zoom,
    y: currentMidpoint.y - contentPoint.y * zoom,
  });
}

export function countryMatchesMapFilters(
  country: Pick<Country, "name" | "code" | "continentCode" | "visited" | "wishlisted">,
  filters: MapFilters,
) {
  const search = filters.search.trim().toLocaleLowerCase("en");
  const matchesSearch =
    !search ||
    country.name.toLocaleLowerCase("en").includes(search) ||
    country.code.toLocaleLowerCase("en").startsWith(search);
  const matchesContinent =
    !filters.continent || country.continentCode === filters.continent;
  const matchesStatus =
    (country.visited && filters.visitedCountries) ||
    (country.wishlisted && filters.wishlistCountries) ||
    (!country.visited && !country.wishlisted && filters.otherCountries);
  return matchesSearch && matchesContinent && matchesStatus;
}

export function cityMatchesMapFilters(
  city: Pick<City, "visited" | "wishlisted">,
  country: Country | undefined,
  filters: MapFilters,
) {
  return Boolean(
    country &&
      countryMatchesMapFilters(country, filters) &&
      ((city.visited && filters.visitedCities) ||
        (city.wishlisted && filters.wishlistCities)),
  );
}

export function WorldMap({
  countries,
  cities,
  layer,
  filters,
  showCities,
  onCountry,
  onCity,
}: Props) {
  const [view, setView] = useState<MapView>({ zoom: 1, x: 0, y: 0 });
  const viewRef = useRef(view);
  const svgRef = useRef<SVGSVGElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const gesture = useRef<Gesture | null>(null);
  useEffect(() => {
    viewRef.current = view;
  }, [view]);
  const projection = useMemo(
    () => geoEqualEarth().fitExtent([[20, 16], [940, 484]], { type: "Sphere" }),
    [],
  );
  const path = useMemo(() => geoPath(projection), [projection]);
  const features = useMemo(
    () =>
      (
        feature(
          world as never,
          (world as unknown as { objects: { countries: never } }).objects
            .countries,
        ) as unknown as FeatureCollection<Geometry>
      ).features,
    [],
  );
  const byNumeric = useMemo(
    () =>
      new Map(
        countries
          .filter((country) => country.numericCode)
          .map((country) => [
            String(country.numericCode).padStart(3, "0"),
            country,
          ]),
      ),
    [countries],
  );
  const byCode = useMemo(
    () => new Map(countries.map((country) => [country.code, country])),
    [countries],
  );
  const visibleCityCount = cities.filter((city) =>
    cityMatchesMapFilters(city, byCode.get(city.countryCode), filters),
  ).length;
  const fill = (country: Country | undefined) => {
    if (!country?.visited)
      return country?.wishlisted
        ? "var(--color-secondary-container)"
        : "color-mix(in srgb,var(--color-surface-soft) 78%,var(--color-primary))";
    if (layer === "visited") return "var(--color-primary-container)";
    if (layer === "recency") {
      if (!country.lastVisit) return "var(--color-primary-container)";
      const ageInYears =
        (Date.now() - new Date(country.lastVisit).getTime()) /
        (365.25 * 24 * 60 * 60 * 1000);
      return ageInYears < 2
        ? "var(--color-primary)"
        : ageInYears < 5
          ? "color-mix(in srgb,var(--color-primary) 72%,var(--color-primary-container))"
          : "color-mix(in srgb,var(--color-primary) 44%,var(--color-primary-container))";
    }
    const value =
      layer === "city_count"
        ? Number(country.cityCount)
        : Number(country.visitCount);
    return value >= 6
      ? "var(--color-primary)"
      : value >= 3
        ? "color-mix(in srgb,var(--color-primary) 72%,var(--color-primary-container))"
        : "var(--color-primary-container)";
  };
  const commitView = (next: MapView) => {
    const clamped = clampMapView(next);
    viewRef.current = clamped;
    setView(clamped);
  };
  const pointFromClient = (clientX: number, clientY: number) => {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds || !bounds.width || !bounds.height) return { x: 0, y: 0 };
    return {
      x: ((clientX - bounds.left) / bounds.width) * MAP_WIDTH,
      y: ((clientY - bounds.top) / bounds.height) * MAP_HEIGHT,
    };
  };
  const zoomAt = (point: Point, requestedZoom: number) => {
    const current = viewRef.current;
    const zoom = clamp(requestedZoom, MIN_ZOOM, MAX_ZOOM);
    const contentPoint = {
      x: (point.x - current.x) / current.zoom,
      y: (point.y - current.y) / current.zoom,
    };
    commitView({
      zoom,
      x: point.x - contentPoint.x * zoom,
      y: point.y - contentPoint.y * zoom,
    });
  };
  const targetFromElement = (element: EventTarget | null): MapTarget | null => {
    const target =
      element instanceof Element
        ? (element.closest("[data-country-code],[data-city-id]") as
            | SVGElement
            | null)
        : null;
    if (target?.dataset.countryCode)
      return { kind: "country", id: target.dataset.countryCode };
    if (target?.dataset.cityId)
      return { kind: "city", id: target.dataset.cityId };
    return null;
  };
  const restartGesture = (pinching: boolean, target: MapTarget | null = null) => {
    gesture.current = {
      startView: viewRef.current,
      startPoints: new Map(pointers.current),
      moved: pinching,
      pinching,
      target,
    };
  };
  const pointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    event.preventDefault();
    pointers.current.set(
      event.pointerId,
      pointFromClient(event.clientX, event.clientY),
    );
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic test pointers and older WebKit may not expose capture.
    }
    restartGesture(
      pointers.current.size > 1,
      pointers.current.size === 1 ? targetFromElement(event.target) : null,
    );
  };
  const pointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.has(event.pointerId) || !gesture.current) return;
    event.preventDefault();
    pointers.current.set(
      event.pointerId,
      pointFromClient(event.clientX, event.clientY),
    );
    const active = [...pointers.current.entries()];
    const started = [...gesture.current.startPoints.entries()];
    if (active.length >= 2 && started.length >= 2) {
      const startA = started[0]![1];
      const startB = started[1]![1];
      const currentA = active.find(([id]) => id === started[0]![0])?.[1];
      const currentB = active.find(([id]) => id === started[1]![0])?.[1];
      if (currentA && currentB) {
        gesture.current.moved = true;
        gesture.current.pinching = true;
        commitView(
          pinchMapView(
            gesture.current.startView,
            startA,
            startB,
            currentA,
            currentB,
          ),
        );
      }
      return;
    }
    if (active.length === 1 && started.length === 1) {
      const current = active[0]![1];
      const start = started[0]![1];
      const delta = { x: current.x - start.x, y: current.y - start.y };
      if (Math.hypot(delta.x, delta.y) > 4) gesture.current.moved = true;
      commitView({
        ...gesture.current.startView,
        x: gesture.current.startView.x + delta.x,
        y: gesture.current.startView.y + delta.y,
      });
    }
  };
  const pointerEnd = (event: React.PointerEvent<SVGSVGElement>) => {
    const tap =
      pointers.current.size === 1 &&
      gesture.current &&
      !gesture.current.moved &&
      !gesture.current.pinching
        ? gesture.current.target
        : null;
    pointers.current.delete(event.pointerId);
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already have been released by the browser.
    }
    if (pointers.current.size === 1) restartGesture(false);
    else gesture.current = null;
    if (tap?.kind === "country") onCountry(tap.id);
    if (tap?.kind === "city") onCity(tap.id);
  };
  const cancelPointers = (event: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(event.pointerId);
    gesture.current = null;
  };
  const transform = `translate(${view.x} ${view.y}) scale(${view.zoom})`;

  return (
    <div className="map-frame" aria-label="Interactive travel map">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
        role="img"
        aria-labelledby="map-title map-desc"
        data-zoom={view.zoom.toFixed(2)}
        onWheel={(event) => {
          event.preventDefault();
          event.stopPropagation();
          zoomAt(
            pointFromClient(event.clientX, event.clientY),
            viewRef.current.zoom * (event.deltaY < 0 ? 1.18 : 0.85),
          );
        }}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerEnd}
        onPointerCancel={cancelPointers}
      >
        <title id="map-title">Visited places on an Equal Earth map</title>
        <desc id="map-desc">
          Drag to move, pinch or scroll to zoom, and tap a country or city to
          open it. The synchronized list below is the keyboard-accessible
          alternative.
        </desc>
        <defs>
          <pattern id="wish" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect
              width="8"
              height="8"
              fill="var(--color-secondary-container)"
            />
            <path
              d="M0 8L8 0"
              stroke="var(--color-secondary)"
              strokeWidth="1"
            />
          </pattern>
        </defs>
        <g transform={transform}>
          <path d={path({ type: "Sphere" }) ?? ""} className="map-ocean" />
          {features.map((shape) => {
            const id = String(shape.id).padStart(3, "0");
            const country = byNumeric.get(id);
            const visible = Boolean(
              country && countryMatchesMapFilters(country, filters),
            );
            return (
              <path
                key={id}
                d={path(shape) ?? ""}
                data-country-code={visible ? country?.code : undefined}
                className={`map-country ${country?.visited ? "is-visited" : ""} ${country?.wishlisted ? "is-wishlisted" : ""} ${visible ? "is-interactive" : "is-hidden"}`}
                fill={
                  country?.wishlisted && !country.visited
                    ? "url(#wish)"
                    : fill(country)
                }
              >
                <title>
                  {country
                    ? `${country.name}: ${country.visitCount} visits${country.wishlisted ? ", wishlist" : ""}`
                    : "Map area"}
                </title>
              </path>
            );
          })}
          {showCities &&
            cities.map((city) => {
              const country = byCode.get(city.countryCode);
              if (!cityMatchesMapFilters(city, country, filters)) return null;
              const point = projection([city.longitude, city.latitude]);
              return point ? (
                <g
                  key={city.id}
                  transform={`translate(${point[0]} ${point[1]}) scale(${1 / view.zoom})`}
                  data-city-id={city.id}
                  className={`city-marker ${city.visited ? "is-visited" : ""} ${city.wishlisted ? "is-wishlisted" : ""}`}
                >
                  <circle className="city-marker-hit" r="12" />
                  {city.visited && <circle className="city-marker-dot" r="5" />}
                  {city.wishlisted && (
                    <path className="city-marker-wish" d="M0-7 7 0 0 7-7 0Z" />
                  )}
                  {city.visited && city.wishlisted && (
                    <circle className="city-marker-center" r="2.5" />
                  )}
                  <title>
                    {city.name}, {city.countryName}: {city.visitCount} visits
                    {city.wishlisted ? ", wishlist" : ""}
                  </title>
                </g>
              ) : null;
            })}
        </g>
      </svg>
      <div className="map-controls" aria-label="Map controls">
        <button
          className="icon-button"
          aria-label="Zoom in"
          onClick={() =>
            zoomAt({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }, view.zoom * 1.4)
          }
        >
          ＋
        </button>
        <output className="map-zoom-readout" aria-live="polite">
          {Math.round(view.zoom * 100)}%
        </output>
        <button
          className="icon-button"
          aria-label="Zoom out"
          onClick={() =>
            zoomAt({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }, view.zoom / 1.4)
          }
        >
          −
        </button>
        <button
          className="icon-button"
          aria-label="Reset map"
          onClick={() => commitView({ zoom: 1, x: 0, y: 0 })}
        >
          ↺
        </button>
      </div>
      <p className="map-gesture-hint">
        Drag · pinch or scroll to zoom · tap to open
      </p>
      <span className="sr-only" aria-live="polite">
        {visibleCityCount} city markers visible.
      </span>
    </div>
  );
}
