import { describe, expect, it } from "vitest";
import {
  clampMapView,
  countryMatchesMapFilters,
  pinchMapView,
  type MapFilters,
} from "../src/client/WorldMap.js";

const filters: MapFilters = {
  continent: "",
  search: "",
  visitedCountries: true,
  wishlistCountries: true,
  otherCountries: true,
  visitedCities: true,
  wishlistCities: true,
};

describe("interactive map", () => {
  it("clamps zoom and pan so the world cannot be lost", () => {
    expect(clampMapView({ zoom: 0.2, x: 200, y: -200 })).toEqual({
      zoom: 1,
      x: 0,
      y: 0,
    });
    expect(clampMapView({ zoom: 8, x: -99999, y: 99999 })).toEqual({
      zoom: 6,
      x: -4800,
      y: 0,
    });
  });

  it("zooms around the live two-pointer midpoint", () => {
    const next = pinchMapView(
      { zoom: 1, x: 0, y: 0 },
      { x: 300, y: 250 },
      { x: 500, y: 250 },
      { x: 200, y: 250 },
      { x: 600, y: 250 },
    );
    expect(next.zoom).toBe(2);
    expect(next.x).toBe(-400);
    expect(next.y).toBe(-250);
  });

  it("combines status, continent and text country filters", () => {
    const canada = {
      code: "CA",
      name: "Canada",
      continentCode: "NA",
      visited: false,
      wishlisted: true,
    };
    expect(countryMatchesMapFilters(canada, filters)).toBe(true);
    expect(
      countryMatchesMapFilters(canada, {
        ...filters,
        search: "can",
        continent: "NA",
        wishlistCountries: true,
      }),
    ).toBe(true);
    expect(
      countryMatchesMapFilters(canada, {
        ...filters,
        wishlistCountries: false,
      }),
    ).toBe(false);
    expect(
      countryMatchesMapFilters(canada, { ...filters, continent: "EU" }),
    ).toBe(false);
  });
});
