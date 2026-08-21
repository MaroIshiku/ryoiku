import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { api, download, setCsrf, type ApiError } from "./api.js";
import { WorldMap } from "./WorldMap.js";
import "./styles.css";
import "./world-overview.css";

type User = {
  id: string;
  username: string;
  displayName: string | null;
  role: string;
};
type Country = {
  code: string;
  alpha3: string;
  numericCode: string | null;
  name: string;
  continent: string;
  continentCode: string;
  kind: string;
  visited: boolean;
  wishlisted: boolean;
  visitCount: number;
  cityCount: number;
  firstVisit: string | null;
  lastVisit: string | null;
};
type City = {
  id: string;
  countryCode: string;
  countryName: string;
  name: string;
  admin1: string | null;
  latitude: number | null;
  longitude: number | null;
  visited: boolean;
  wishlisted: boolean;
  visitCount: number;
  firstVisit: string | null;
  lastVisit: string | null;
};
type Trip = {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  datePrecision: string;
  notes: string | null;
  visitCount: number;
  countryCount: number;
  cityCount: number;
};
type Visit = {
  id: string;
  countryCode: string;
  countryName: string;
  cityId: string | null;
  cityName: string | null;
  tripId: string | null;
  tripName: string | null;
  startDate: string | null;
  endDate: string | null;
  datePrecision: string;
  notes: string | null;
};
type PlaceResult = {
  id: string;
  source: "saved" | "geonames";
  cityId?: string;
  placeId?: string;
  name: string;
  countryCode: string;
  countryName: string;
  admin1: string | null;
  latitude: number | null;
  longitude: number | null;
};
type Summary = {
  visitCount: number;
  countryCount: number;
  countryTotal: number;
  countryCountingMode: "un195" | "iso3166" | "custom";
  cityCount: number;
  tripCount: number;
  wishlistCount: number;
  recent: Visit[];
};
type Modal = "visit" | "city" | "trip" | null;

const paths: Record<string, string> = {
  map: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm6.9 6h-3.1a15 15 0 0 0-1.2-3.1A8.1 8.1 0 0 1 18.9 8ZM12 4c.9 1.1 1.6 2.4 1.9 4h-3.8c.3-1.6 1-2.9 1.9-4ZM9.4 4.9A15 15 0 0 0 8.2 8H5.1a8.1 8.1 0 0 1 4.3-3.1ZM4.3 10h3.5a15 15 0 0 0 0 4H4.3a8 8 0 0 1 0-4Zm.8 6h3.1a15 15 0 0 0 1.2 3.1A8.1 8.1 0 0 1 5.1 16Zm6.9 4c-.9-1.1-1.6-2.4-1.9-4h3.8c-.3 1.6-1 2.9-1.9 4Zm2.3-6H9.7a13 13 0 0 1 0-4h4.6a13 13 0 0 1 0 4Zm.3 5.1a15 15 0 0 0 1.2-3.1h3.1a8.1 8.1 0 0 1-4.3 3.1Zm1.6-5.1a15 15 0 0 0 0-4h3.5a8 8 0 0 1 0 4h-3.5Z",
  countries: "M4 4h16v4H4V4Zm0 6h16v10H4V10Zm3 2v2h3v-2H7Zm0 4v2h6v-2H7Z",
  cities:
    "M4 21V9l6-4v4l6-4v6h4v10H4Zm3-2h2v-3H7v3Zm0-5h2v-2H7v2Zm5 5h2v-3h-2v3Zm0-5h2v-2h-2v2Zm5 5h1v-6h-1v6Z",
  trips:
    "M9 4V2h6v2h3a2 2 0 0 1 2 2v13H4V6a2 2 0 0 1 2-2h3Zm2 0h2V3h-2v1Zm-5 6v7h12v-7h-4v2h-4v-2H6Z",
  plus: "M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6V5Z",
  menu: "M5 7h14v2H5V7Zm0 4h14v2H5v-2Zm0 4h14v2H5v-2Z",
  insights:
    "M4 19h16v2H2V3h2v16Zm3-2H5v-6h2v6Zm4 0H9V7h2v10Zm4 0h-2V9h2v8Zm4 0h-2V5h2v12Z",
  close:
    "M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12 19 17.6 17.6 19 12 13.4 6.4 19 5 17.6 10.6 12 5 6.4 6.4 5Z",
};
function Icon({ name }: { name: keyof typeof paths }) {
  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}
function go(path: string) {
  history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
function readableDate(value: string | null, precision = "day") {
  if (!value || precision === "unknown") return "Unknown date";
  if (precision === "year") return value.slice(0, 4);
  if (precision === "month")
    return new Intl.DateTimeFormat("en", {
      year: "numeric",
      month: "short",
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}
function useResource<T>(path: string, revision = 0) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    setError("");
    api<T>(path)
      .then((v) => live && setData(v))
      .catch((e: ApiError) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, [path, revision]);
  return { data, error };
}
function ErrorState({
  message,
  retry,
}: {
  message: string;
  retry?: () => void;
}) {
  return (
    <div className="state-view" role="alert">
      <div className="state-symbol">!</div>
      <h2>Could not load this view</h2>
      <p>{message}</p>
      {retry && (
        <button className="button tonal" onClick={retry}>
          Retry
        </button>
      )}
    </div>
  );
}
function Empty({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="state-view">
      <div className="state-symbol">○</div>
      <h2>{title}</h2>
      <p>{message}</p>
      {action}
    </div>
  );
}
function Loading() {
  return (
    <div className="skeleton-grid" aria-label="Loading">
      <span />
      <span />
      <span />
    </div>
  );
}

function PlaceCombobox({
  onSelect,
}: {
  onSelect: (place: PlaceResult | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [selected, setSelected] = useState<PlaceResult | null>(null);
  const [active, setActive] = useState(-1);
  const [status, setStatus] = useState("");
  const listId = "visit-place-results";

  useEffect(() => {
    if (selected || query.trim().length < 2) {
      setResults([]);
      setActive(-1);
      setStatus(query.trim().length === 1 ? "Type one more character to search." : "");
      return;
    }
    const controller = new AbortController();
    setStatus("Searching local places…");
    const timer = window.setTimeout(() => {
      api<{ results: PlaceResult[] }>("/api/v1/places/search", {
        method: "POST",
        body: JSON.stringify({ query }),
        signal: controller.signal,
      })
        .then((response) => {
          setResults(response.results);
          setActive(response.results.length ? 0 : -1);
          setStatus(
            response.results.length
              ? `${response.results.length} local places found.`
              : "No matching places found. You can still save a country-only visit.",
          );
        })
        .catch((error: ApiError | DOMException) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            setResults([]);
            setActive(-1);
            setStatus((error as ApiError).message ?? "Place search is unavailable.");
          }
        });
    }, 200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  const choose = (place: PlaceResult) => {
    setSelected(place);
    setQuery(place.name);
    setResults([]);
    setActive(-1);
    setStatus(`${place.name}, ${place.countryName} selected.`);
    onSelect(place);
  };
  const clear = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setStatus("");
    onSelect(null);
  };
  return (
    <div className="place-combobox">
      <label htmlFor="visit-place-search">City or place (optional)</label>
      <div className="place-input-wrap">
        <input
          id="visit-place-search"
          name="placeSearch"
          value={query}
          placeholder="Search for Prien, Kyoto, or another place"
          maxLength={80}
          autoFocus
          autoComplete="off"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
          onChange={(event) => {
            if (selected) {
              setSelected(null);
              onSelect(null);
            }
            setQuery(event.target.value);
          }}
          onKeyDown={(event) => {
            if (!results.length) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((value) => (value + 1) % results.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((value) => (value <= 0 ? results.length - 1 : value - 1));
            } else if (event.key === "Enter" && active >= 0) {
              event.preventDefault();
              choose(results[active]!);
            } else if (event.key === "Escape") {
              event.preventDefault();
              setResults([]);
              setActive(-1);
              setStatus("Suggestions closed.");
            }
          }}
        />
        {query && (
          <button type="button" className="clear-place" onClick={clear} aria-label="Clear place search">
            ×
          </button>
        )}
      </div>
      {results.length > 0 && (
        <div className="place-results" id={listId} role="listbox" aria-label="Place suggestions">
          {results.map((place, index) => (
            <div
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === active}
              className={index === active ? "place-option active" : "place-option"}
              key={place.id}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => choose(place)}
            >
              <span className="place-option-mark">{place.countryCode}</span>
              <span>
                <strong>{place.name}</strong>
                <small>{[place.admin1, place.countryName].filter(Boolean).join(" · ")}</small>
              </span>
              {place.source === "saved" && <span className="saved-badge">Saved</span>}
            </div>
          ))}
          <small className="place-attribution">Place data: GeoNames · CC BY 4.0</small>
        </div>
      )}
      {selected && (
        <div className="selected-place" aria-label="Selected place">
          <span className="place-option-mark">{selected.countryCode}</span>
          <span>
            <strong>{selected.name}</strong>
            <small>
              {[selected.admin1, selected.countryName].filter(Boolean).join(" · ")}
              {selected.latitude != null && selected.longitude != null
                ? ` · ${selected.latitude.toFixed(5)}, ${selected.longitude.toFixed(5)}`
                : ""}
            </small>
          </span>
        </div>
      )}
      <p className="field-help" aria-live="polite">{status || "Search stays on this server. Leave empty for a country-only visit."}</p>
    </div>
  );
}

function Access() {
  const [view, setView] = useState<"loading" | "setup" | "login" | "app">(
      "loading",
    ),
    [user, setUser] = useState<User | null>(null),
    [message, setMessage] = useState(""),
    [setupSecretRequired, setSetupSecretRequired] = useState(false);
  useEffect(() => {
    api<{ required: boolean; setupSecretRequired: boolean }>(
      "/api/v1/setup/status",
    ).then(async (status) => {
      setSetupSecretRequired(status.setupSecretRequired);
      if (status.required) return setView("setup");
      try {
        const session = await api<{ csrf: string; user: User }>(
          "/api/v1/auth/me",
        );
        setCsrf(session.csrf);
        setUser(session.user);
        setView("app");
      } catch {
        setView("login");
      }
    });
  }, []);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage("");
    const f = new FormData(e.currentTarget),
      username = String(f.get("username")),
      password = String(f.get("password"));
    try {
      if (view === "setup")
        await api("/api/v1/setup", {
          method: "POST",
          body: JSON.stringify({
            username,
            displayName: String(f.get("displayName") || ""),
            password,
            setupSecret: String(f.get("setupSecret") || ""),
          }),
        });
      const result = await api<{ csrf: string; user: User }>(
        "/api/v1/auth/login",
        { method: "POST", body: JSON.stringify({ username, password }) },
      );
      setCsrf(result.csrf);
      setUser(result.user);
      setView("app");
    } catch (error) {
      setMessage((error as ApiError).message);
    }
  };
  if (view === "loading")
    return (
      <main className="access">
        <Loading />
      </main>
    );
  if (view === "app" && user)
    return (
      <App
        user={user}
        onLogout={() => {
          setUser(null);
          setView("login");
        }}
      />
    );
  const setup = view === "setup";
  return (
    <main className="access">
      <section className="access-card">
        <img src="/ryoiku-icon.png" alt="" />
        <div>
          <span className="eyebrow">Ryoiku</span>
          <h1>{setup ? "Create your administrator" : "Welcome back"}</h1>
          <p>
            {setup
              ? "Your travel history stays on this server. Start with the local account that will own it."
              : "Sign in to explore your travel history."}
          </p>
        </div>
        <form onSubmit={submit}>
          {setup && setupSecretRequired && (
            <label>
              Setup secret
              <input
                name="setupSecret"
                type="password"
                autoComplete="one-time-code"
                required
                minLength={32}
              />
            </label>
          )}
          {setup && (
            <label>
              Display name
              <input name="displayName" autoComplete="name" maxLength={120} />
            </label>
          )}
          <label>
            Username
            <input
              name="username"
              autoComplete="username"
              required
              minLength={3}
              maxLength={64}
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete={setup ? "new-password" : "current-password"}
              required
              minLength={12}
            />
          </label>
          {setup && (
            <p className="field-help">
              Use at least 12 characters. Setup closes after this account is
              created.
            </p>
          )}
          {message && (
            <p className="form-error" role="alert">
              {message}
            </p>
          )}
          <button className="button filled" type="submit">
            {setup ? "Create account" : "Sign in"}
          </button>
        </form>
      </section>
    </main>
  );
}

function App({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [path, setPath] = useState(location.pathname),
    [revision, setRevision] = useState(0),
    [modal, setModal] = useState<Modal>(null),
    [settings, setSettings] = useState(false),
    [toast, setToast] = useState("");
  useEffect(() => {
    const change = () => setPath(location.pathname);
    addEventListener("popstate", change);
    return () => removeEventListener("popstate", change);
  }, []);
  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(""), 3500);
  };
  const changed = (text: string) => {
    setRevision((v) => v + 1);
    setModal(null);
    notify(text);
  };
  const logout = async () => {
    await api("/api/v1/auth/logout", { method: "POST" });
    setCsrf("");
    onLogout();
  };
  const nav = [
    ["/", "Map", "map"],
    ["/countries", "Countries", "countries"],
    ["/cities", "Cities", "cities"],
    ["/trips", "Trips", "trips"],
  ] as const;
  let page: React.ReactNode;
  if (path === "/") page = <MapPage revision={revision} />;
  else if (path === "/countries") page = <CountriesPage revision={revision} />;
  else if (path.match(/^\/countries\/[A-Z]{2}$/i))
    page = (
      <CountryDetail
        code={path.split("/")[2]!}
        revision={revision}
        onChanged={changed}
      />
    );
  else if (path === "/cities")
    page = <CitiesPage revision={revision} onAdd={() => setModal("city")} />;
  else if (path.match(/^\/cities\/[0-9a-f-]+$/i))
    page = (
      <CityDetail
        id={path.split("/")[2]!}
        revision={revision}
        onChanged={changed}
      />
    );
  else if (path === "/trips")
    page = <TripsPage revision={revision} onAdd={() => setModal("trip")} />;
  else if (path.match(/^\/trips\/[0-9a-f-]+$/i))
    page = (
      <TripDetail
        id={path.split("/")[2]!}
        revision={revision}
        onChanged={changed}
      />
    );
  else if (path === "/insights") page = <Insights revision={revision} />;
  else if (path === "/import" || path === "/export")
    page = <DataPage onChanged={changed} />;
  else
    page = (
      <Empty
        title="Page not found"
        message="This route does not exist."
        action={
          <button className="button tonal" onClick={() => go("/")}>
            Return to map
          </button>
        }
      />
    );
  return (
    <div className="app-shell">
      <header className="app-header">
        <button className="brand" onClick={() => go("/")} aria-label="Open map">
          <img src="/ryoiku-icon.png" alt="" />
          <span>
            <strong>Ryoiku</strong>
            <small>Visited places</small>
          </span>
        </button>
        <div className="header-actions">
          <button
            className="icon-button"
            aria-label="Open insights"
            onClick={() => go("/insights")}
          >
            <Icon name="insights" />
          </button>
          <button
            className="profile-button"
            aria-label="Open profile and settings"
            onClick={() => setSettings(true)}
          >
            {(user.displayName || user.username).slice(0, 2).toUpperCase()}
          </button>
        </div>
      </header>
      <div className="body-shell">
        <nav className="nav-rail" aria-label="Primary navigation">
          {nav.map(([href, label, icon]) => (
            <button
              key={href}
              className={
                path === href || (href !== "/" && path.startsWith(href))
                  ? "active"
                  : ""
              }
              aria-current={path === href ? "page" : undefined}
              onClick={() => go(href)}
            >
              <Icon name={icon} />
              <span>{label}</span>
            </button>
          ))}
          <span className="rail-spacer" />
          <button
            onClick={() => go("/insights")}
            className={path === "/insights" ? "active" : ""}
          >
            <Icon name="insights" />
            <span>Insights</span>
          </button>
        </nav>
        <main className="page">{page}</main>
      </div>
      <nav className="bottom-nav" aria-label="Primary navigation">
        {nav.map(([href, label, icon]) => (
          <button
            key={href}
            className={
              path === href || (href !== "/" && path.startsWith(href))
                ? "active"
                : ""
            }
            aria-current={path === href ? "page" : undefined}
            onClick={() => go(href)}
          >
            <Icon name={icon} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {["/", "/countries", "/cities", "/trips"].some((p) => path === p) && (
        <button
          className="fab"
          aria-label="Add visit"
          onClick={() => setModal("visit")}
        >
          <Icon name="plus" />
          <span>Add visit</span>
        </button>
      )}
      {modal && (
        <Editor
          kind={modal}
          revision={revision}
          close={() => setModal(null)}
          onChanged={changed}
        />
      )}{" "}
      {settings && (
        <Settings
          user={user}
          close={() => setSettings(false)}
          logout={logout}
          notify={notify}
        />
      )}
      <div className="toast" aria-live="polite">
        {toast}
      </div>
    </div>
  );
}

function PageHead({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="page-head">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </div>
  );
}
function Metric({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
}) {
  return (
    <article className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{hint}</small>
    </article>
  );
}
function VisitRow({
  visit,
  onDelete,
}: {
  visit: Visit;
  onDelete?: () => void;
}) {
  return (
    <article className="list-row">
      <div className="place-mark">{visit.countryCode}</div>
      <button
        className="row-main"
        onClick={() =>
          go(
            visit.cityId
              ? `/cities/${visit.cityId}`
              : `/countries/${visit.countryCode}`,
          )
        }
      >
        <strong>{visit.cityName || visit.countryName}</strong>
        <span>
          {visit.cityName && `${visit.countryName} · `}
          {readableDate(visit.startDate, visit.datePrecision)}
          {visit.tripName && ` · ${visit.tripName}`}
        </span>
      </button>
      {onDelete && (
        <button
          className="icon-button danger"
          aria-label={`Delete visit to ${visit.cityName || visit.countryName}`}
          onClick={onDelete}
        >
          ×
        </button>
      )}
    </article>
  );
}

function MapPage({ revision }: { revision: number }) {
  const countries = useResource<Country[]>("/api/v1/map/summary", revision),
    cities = useResource<City[]>("/api/v1/map/cities", revision),
    summary = useResource<Summary>("/api/v1/stats/summary", revision),
    continents = useResource<
      { code: string; name: string; visitedCountries: number; visits: number }[]
    >("/api/v1/stats/continents", revision);
  const [layer, setLayer] = useState("visited");
  if (countries.error) return <ErrorState message={countries.error} />;
  if (!countries.data || !cities.data || !summary.data || !continents.data)
    return (
      <>
        <PageHead
          eyebrow="Overview"
          title="Your world"
          description="Every visit, from the big picture to the details."
        />
        <Loading />
      </>
    );
  const coverage = summary.data.countryTotal
    ? Math.min(
        100,
        summary.data.countryCount
          ? Math.max(
              1,
              Math.round(
                (summary.data.countryCount / summary.data.countryTotal) * 100,
              ),
            )
          : 0,
      )
    : 0;
  const layers = [
    { value: "visited", label: "Visited" },
    { value: "visit_count", label: "Visits" },
    { value: "city_count", label: "Cities" },
    { value: "recency", label: "Recent" },
  ];
  return (
    <>
      <PageHead
        eyebrow="Overview"
        title="Your world"
        description="Every visit, from the big picture to the details."
        actions={
          <button className="button tonal" onClick={() => go("/insights")}>
            <Icon name="insights" />
            View insights
          </button>
        }
      />
      <section className="map-card world-card">
        <div className="world-card-head">
          <div>
            <span className="world-kicker">Personal atlas</span>
            <h2>World at a glance</h2>
            <p>Explore every recorded place on your private, local map.</p>
          </div>
          <div
            className="map-layer-switcher"
            role="radiogroup"
            aria-label="Map layer"
          >
            {layers.map((item) => (
              <button
                type="button"
                role="radio"
                aria-checked={layer === item.value}
                className={layer === item.value ? "active" : ""}
                key={item.value}
                onClick={() => setLayer(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div className="world-map-stage">
          <WorldMap
            countries={countries.data}
            cities={
              cities.data.filter(
                (c) => c.latitude != null && c.longitude != null,
              ) as (City & { latitude: number; longitude: number })[]
            }
            layer={layer}
            showCities
            onCountry={(code) => go(`/countries/${code}`)}
            onCity={(id) => go(`/cities/${id}`)}
          />
          <aside className="coverage-card" aria-label="Travel coverage">
            <div className="coverage-ring" aria-hidden="true">
              <svg viewBox="0 0 48 48">
                <circle className="coverage-track" cx="24" cy="24" r="19" />
                <circle
                  className="coverage-progress"
                  cx="24"
                  cy="24"
                  r="19"
                  pathLength="100"
                  strokeDasharray={`${coverage} 100`}
                />
              </svg>
              <strong>{coverage}%</strong>
            </div>
            <div>
              <span>World coverage</span>
              <strong>
                {summary.data.countryCount} of {summary.data.countryTotal} countries
              </strong>
              <small>Your map grows with every recorded visit.</small>
            </div>
          </aside>
        </div>
        <div className="world-card-footer">
          <p className="map-legend" aria-label="Map legend">
            <span className="legend-item">
              <span className="swatch visited" /> Visited
            </span>
            <span className="legend-item">
              <span className="swatch wishlist" /> Wishlist
            </span>
            <span className="legend-item">
              <span className="swatch unvisited" /> Not visited
            </span>
          </p>
          <p className="map-note">Equal Earth · local geometry</p>
        </div>
      </section>
      <section className="metrics">
        <Metric
          label="Countries"
          value={summary.data.countryCount}
          hint={`of ${summary.data.countryTotal} · ${summary.data.countryCountingMode}`}
        />
        <Metric
          label="Cities"
          value={summary.data.cityCount}
          hint="visited places"
        />
        <Metric
          label="Visits"
          value={summary.data.visitCount}
          hint="all recorded stays"
        />
        <Metric
          label="Wishlist"
          value={summary.data.wishlistCount}
          hint="future destinations"
        />
      </section>
      <div className="dashboard-grid">
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Recent visits</h2>
              <p>Your latest known travel dates</p>
            </div>
          </div>
          {summary.data.recent.length ? (
            summary.data.recent.map((v) => <VisitRow key={v.id} visit={v} />)
          ) : (
            <Empty
              title="No places visited yet"
              message="Add your first country or city to begin."
            />
          )}
        </section>
        <section className="card">
          <div className="card-head">
            <div>
              <h2>Continents</h2>
              <p>A calm view of your coverage</p>
            </div>
          </div>
          {continents.data
            .filter((c) => c.visitedCountries)
            .map((c) => (
              <div className="progress-row" key={c.code}>
                <span>
                  <strong>{c.name}</strong>
                  <small>{c.visits} visits</small>
                </span>
                <b>{c.visitedCountries}</b>
              </div>
            ))}
          {!continents.data.some((c) => c.visitedCountries) && (
            <Empty
              title="No continent data yet"
              message="Your summary appears after the first visit."
            />
          )}
        </section>
      </div>
      <section className="card accessible-map-list">
        <div className="card-head">
          <div>
            <h2>Map country list</h2>
            <p>Keyboard-accessible equivalent of every visited map area</p>
          </div>
        </div>
        {countries.data
          .filter((c) => c.visited)
          .slice(0, 20)
          .map((c) => (
            <button
              className="country-chip"
              key={c.code}
              onClick={() => go(`/countries/${c.code}`)}
            >
              <span>{c.code}</span>
              {c.name}
              <b>{c.visitCount}</b>
            </button>
          ))}
      </section>
    </>
  );
}

function CountriesPage({ revision }: { revision: number }) {
  const [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const resource = useResource<Country[]>(
    `/api/v1/countries?search=${encodeURIComponent(search)}&visited=${filter}`,
    revision,
  );
  return (
    <>
      <PageHead
        eyebrow="Places"
        title="Countries"
        description="Search, filter and open every country without using the map."
      />
      <div className="toolbar">
        <label className="search-field">
          <span>Search countries</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or code"
          />
        </label>
        <label className="compact-field">
          Show
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All countries</option>
            <option value="visited">Visited</option>
            <option value="unvisited">Not visited</option>
            <option value="wishlist">Wishlist</option>
          </select>
        </label>
      </div>
      {resource.error ? (
        <ErrorState message={resource.error} />
      ) : !resource.data ? (
        <Loading />
      ) : (
        <section className="data-list" aria-label="Countries">
          {resource.data.map((country) => (
            <button
              className="country-row"
              key={country.code}
              onClick={() => go(`/countries/${country.code}`)}
            >
              <span className="country-code">{country.code}</span>
              <span>
                <strong>{country.name}</strong>
                <small>
                  {country.continent} · {country.kind.replace("_", " ")}
                </small>
              </span>
              <span
                className={`status ${country.visited ? "success" : country.wishlisted ? "info" : ""}`}
              >
                {country.visited
                  ? `${country.visitCount} visits`
                  : country.wishlisted
                    ? "Wishlist"
                    : "Not visited"}
              </span>
              <span className="chevron">›</span>
            </button>
          ))}
        </section>
      )}
    </>
  );
}
function CitiesPage({
  revision,
  onAdd,
}: {
  revision: number;
  onAdd: () => void;
}) {
  const [search, setSearch] = useState("");
  const resource = useResource<City[]>(
    `/api/v1/cities?search=${encodeURIComponent(search)}`,
    revision,
  );
  return (
    <>
      <PageHead
        eyebrow="Places"
        title="Cities"
        description="Custom places remain visible even when coordinates are unknown."
        actions={
          <button className="button tonal" onClick={onAdd}>
            <Icon name="plus" />
            Add city
          </button>
        }
      />
      <div className="toolbar">
        <label className="search-field">
          <span>Search cities</span>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="City or region"
          />
        </label>
      </div>
      {resource.error ? (
        <ErrorState message={resource.error} />
      ) : !resource.data ? (
        <Loading />
      ) : resource.data.length ? (
        <section className="card-grid">
          {resource.data.map((city) => (
            <button
              className="place-card"
              key={city.id}
              onClick={() => go(`/cities/${city.id}`)}
            >
              <span className="place-mark">
                <Icon name="cities" />
              </span>
              <span>
                <strong>{city.name}</strong>
                <small>
                  {city.countryName}
                  {city.admin1 && ` · ${city.admin1}`}
                </small>
              </span>
              <b>{city.visitCount}</b>
              <small>
                {city.latitude == null ? "Coordinates unknown" : "Mapped"}
              </small>
            </button>
          ))}
        </section>
      ) : (
        <Empty
          title="No cities found"
          message="Add a city manually; coordinates are always optional."
          action={
            <button className="button tonal" onClick={onAdd}>
              Add city
            </button>
          }
        />
      )}
    </>
  );
}
function TripsPage({
  revision,
  onAdd,
}: {
  revision: number;
  onAdd: () => void;
}) {
  const resource = useResource<Trip[]>("/api/v1/trips", revision);
  return (
    <>
      <PageHead
        eyebrow="Journeys"
        title="Trips"
        description="Group visits when a journey needs its own story."
        actions={
          <button className="button tonal" onClick={onAdd}>
            <Icon name="plus" />
            Create trip
          </button>
        }
      />
      {!resource.data ? (
        <Loading />
      ) : resource.data.length ? (
        <section className="card-grid">
          {resource.data.map((t) => (
            <button
              className="place-card"
              key={t.id}
              onClick={() => go(`/trips/${t.id}`)}
            >
              <span className="place-mark">
                <Icon name="trips" />
              </span>
              <span>
                <strong>{t.name}</strong>
                <small>
                  {readableDate(t.startDate, t.datePrecision)} ·{" "}
                  {t.countryCount} countries
                </small>
              </span>
              <b>{t.visitCount}</b>
              <small>visits</small>
            </button>
          ))}
        </section>
      ) : (
        <Empty
          title="No trips grouped yet"
          message="Visits work perfectly without a trip. Create one when grouping helps."
          action={
            <button className="button tonal" onClick={onAdd}>
              Create trip
            </button>
          }
        />
      )}
    </>
  );
}

function CountryDetail({
  code,
  revision,
  onChanged,
}: {
  code: string;
  revision: number;
  onChanged: (s: string) => void;
}) {
  const r = useResource<Country & { visits: Visit[]; cities: City[] }>(
    `/api/v1/countries/${code}`,
    revision,
  );
  if (!r.data) return r.error ? <ErrorState message={r.error} /> : <Loading />;
  const c = r.data;
  const wishlist = async () => {
    if (c.wishlisted) {
      const items =
        await api<{ id: string; countryCode: string; cityId: null }[]>(
          "/api/v1/wishlist",
        );
      const item = items.find((i) => i.countryCode === c.code && !i.cityId);
      if (item) await api(`/api/v1/wishlist/${item.id}`, { method: "DELETE" });
      onChanged("Removed from wishlist.");
    } else {
      await api("/api/v1/wishlist", {
        method: "POST",
        body: JSON.stringify({ countryCode: c.code }),
      });
      onChanged("Added to wishlist.");
    }
  };
  return (
    <>
      <button className="back-link" onClick={() => go("/countries")}>
        ← Countries
      </button>
      <PageHead
        eyebrow={c.continent}
        title={c.name}
        description={`${c.code} · ${c.kind.replace("_", " ")}`}
        actions={
          <button className="button outlined" onClick={wishlist}>
            {c.wishlisted ? "Remove wishlist" : "Add to wishlist"}
          </button>
        }
      />
      <section className="metrics">
        <Metric
          label="Status"
          value={c.visited ? "Visited" : "Not yet"}
          hint="derived from visits"
        />
        <Metric label="Visits" value={c.visitCount} hint="individual records" />
        <Metric label="Cities" value={c.cityCount} hint="with visits" />
        <Metric
          label="Last visit"
          value={readableDate(c.lastVisit)}
          hint="latest known date"
        />
      </section>
      <div className="detail-grid">
        <section className="card">
          <h2>Visit history</h2>
          {c.visits.length ? (
            c.visits.map((v) => (
              <VisitRow
                key={v.id}
                visit={v}
                onDelete={async () => {
                  if (confirm("Delete this visit?")) {
                    await api(`/api/v1/visits/${v.id}`, { method: "DELETE" });
                    onChanged("Visit deleted.");
                  }
                }}
              />
            ))
          ) : (
            <Empty
              title="No visits yet"
              message="A country-only visit is enough to mark this place as visited."
            />
          )}
        </section>
        <section className="card">
          <h2>Cities</h2>
          {c.cities.length ? (
            c.cities.map((city) => (
              <button
                className="country-chip"
                key={city.id}
                onClick={() => go(`/cities/${city.id}`)}
              >
                {city.name}
                <b>{city.visitCount}</b>
              </button>
            ))
          ) : (
            <p className="muted">No cities saved in this country.</p>
          )}
        </section>
      </div>
    </>
  );
}
function CityDetail({
  id,
  revision,
  onChanged,
}: {
  id: string;
  revision: number;
  onChanged: (s: string) => void;
}) {
  const r = useResource<City & { visits: Visit[] }>(
      `/api/v1/cities/${id}`,
      revision,
    ),
    cities = useResource<City[]>("/api/v1/cities", revision);
  const [target, setTarget] = useState("");
  if (!r.data) return r.error ? <ErrorState message={r.error} /> : <Loading />;
  const c = r.data;
  const mergeCandidates =
    cities.data?.filter(
      (city) => city.id !== id && city.countryCode === c.countryCode,
    ) ?? [];
  return (
    <>
      <button className="back-link" onClick={() => go("/cities")}>
        ← Cities
      </button>
      <PageHead
        eyebrow={c.countryName}
        title={c.name}
        description={c.admin1 || "Custom city"}
        actions={
          <button
            className="button danger"
            onClick={async () => {
              if (
                confirm("Keep its visits as country-only and delete this city?")
              ) {
                await api(`/api/v1/cities/${id}?mode=country_only`, {
                  method: "DELETE",
                });
                onChanged("City deleted; visits kept as country-only.");
                go("/cities");
              }
            }}
          >
            Delete city
          </button>
        }
      />
      <section className="metrics">
        <Metric
          label="Visits"
          value={c.visitCount}
          hint="repeat visits included"
        />
        <Metric
          label="First visit"
          value={readableDate(c.firstVisit)}
          hint="earliest known date"
        />
        <Metric
          label="Last visit"
          value={readableDate(c.lastVisit)}
          hint="latest known date"
        />
        <Metric
          label="Map"
          value={c.latitude == null ? "Not placed" : "Placed"}
          hint={
            c.latitude == null
              ? "add coordinates later"
              : `${c.latitude}, ${c.longitude}`
          }
        />
      </section>
      <section className="card">
        <h2>Visit history</h2>
        {c.visits.length ? (
          c.visits.map((v) => <VisitRow key={v.id} visit={v} />)
        ) : (
          <Empty
            title="City not visited yet"
            message="Saved cities only count as visited after a visit points to them."
          />
        )}
      </section>
      {mergeCandidates.length > 0 && (
        <section className="card">
          <h2>Merge a duplicate</h2>
          <p className="muted">
            All visits and wishlist references move to the city you keep. This
            city is then deleted.
          </p>
          <div className="form-actions">
            <label className="compact-field">
              Keep city
              <select
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              >
                <option value="">Choose a city</option>
                {mergeCandidates.map((city) => (
                  <option key={city.id} value={city.id}>
                    {city.name}
                    {city.admin1 && ` · ${city.admin1}`}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="button outlined"
              disabled={!target}
              onClick={async () => {
                const chosen = mergeCandidates.find(
                  (city) => city.id === target,
                );
                if (chosen && confirm(`Merge ${c.name} into ${chosen.name}?`)) {
                  await api(`/api/v1/cities/${id}/merge`, {
                    method: "POST",
                    body: JSON.stringify({ targetCityId: target }),
                  });
                  onChanged("Cities merged.");
                  go(`/cities/${target}`);
                }
              }}
            >
              Merge cities
            </button>
          </div>
        </section>
      )}
    </>
  );
}
function TripDetail({
  id,
  revision,
  onChanged,
}: {
  id: string;
  revision: number;
  onChanged: (s: string) => void;
}) {
  const r = useResource<Trip & { visits: Visit[] }>(
    `/api/v1/trips/${id}`,
    revision,
  );
  if (!r.data) return r.error ? <ErrorState message={r.error} /> : <Loading />;
  const t = r.data;
  return (
    <>
      <button className="back-link" onClick={() => go("/trips")}>
        ← Trips
      </button>
      <PageHead
        eyebrow="Trip"
        title={t.name}
        description={`${readableDate(t.startDate, t.datePrecision)} · ${t.countryCount} countries`}
        actions={
          <button
            className="button danger"
            onClick={async () => {
              if (confirm("Delete this trip? Its visits will be kept.")) {
                await api(`/api/v1/trips/${id}`, { method: "DELETE" });
                onChanged("Trip deleted; visits kept.");
                go("/trips");
              }
            }}
          >
            Delete trip
          </button>
        }
      />
      {t.notes && (
        <section className="card">
          <h2>Notes</h2>
          <p className="prewrap">{t.notes}</p>
        </section>
      )}
      <section className="card">
        <h2>Visits</h2>
        {t.visits.length ? (
          t.visits.map((v) => <VisitRow key={v.id} visit={v} />)
        ) : (
          <Empty
            title="No visits in this trip"
            message="Assign visits from the visit editor."
          />
        )}
      </section>
    </>
  );
}

function Insights({ revision }: { revision: number }) {
  const summary = useResource<Summary>("/api/v1/stats/summary", revision),
    timeline = useResource<
      { year: string; visits: number; countries: number }[]
    >("/api/v1/stats/timeline", revision),
    rankings = useResource<{
      countries: { code: string; name: string; visits: number }[];
      cities: {
        id: string;
        name: string;
        countryName: string;
        visits: number;
      }[];
    }>("/api/v1/stats/rankings", revision);
  if (!summary.data || !timeline.data || !rankings.data) return <Loading />;
  const max = Math.max(1, ...timeline.data.map((y) => y.visits));
  return (
    <>
      <PageHead
        eyebrow="Insights"
        title="Travel patterns"
        description="Informative totals without scores, streaks or rankings against others."
      />
      <section className="metrics">
        <Metric
          label="Countries"
          value={summary.data.countryCount}
          hint="unique visited"
        />
        <Metric
          label="Cities"
          value={summary.data.cityCount}
          hint="unique visited"
        />
        <Metric
          label="Visits"
          value={summary.data.visitCount}
          hint="all records"
        />
        <Metric
          label="Trips"
          value={summary.data.tripCount}
          hint="optional groups"
        />
      </section>
      <div className="detail-grid">
        <section className="card">
          <h2>Visits by year</h2>
          {timeline.data.length ? (
            <div className="bar-chart">
              {timeline.data.map((y) => (
                <div key={y.year}>
                  <span>{y.year}</span>
                  <i style={{ width: `${(y.visits / max) * 100}%` }} />
                  <b>{y.visits}</b>
                </div>
              ))}
            </div>
          ) : (
            <Empty
              title="No dated visits"
              message="Unknown-date visits count in totals but not in the timeline."
            />
          )}
        </section>
        <section className="card">
          <h2>Most revisited countries</h2>
          {rankings.data.countries.map((c) => (
            <button
              className="country-chip"
              key={c.code}
              onClick={() => go(`/countries/${c.code}`)}
            >
              <span>{c.code}</span>
              {c.name}
              <b>{c.visits}</b>
            </button>
          ))}
        </section>
      </div>
    </>
  );
}

function DataPage({ onChanged }: { onChanged: (s: string) => void }) {
  const [preview, setPreview] = useState<any>(null),
    [restore, setRestore] = useState<any>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const readCsv = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      setPreview(
        await api("/api/v1/import/csv/preview", {
          method: "POST",
          body: JSON.stringify({ csv: await file.text() }),
        }),
      );
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  const readBackup = async (file: File) => {
    setBusy(true);
    setError("");
    try {
      setRestore(
        await api("/api/v1/restore/preview", {
          method: "POST",
          body: JSON.stringify({ backup: JSON.parse(await file.text()) }),
        }),
      );
    } catch (e) {
      setError((e as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <PageHead
        eyebrow="Data"
        title="Import, export and backup"
        description="Portable files, explicit previews and transactional changes."
      />
      {error && (
        <p className="banner danger" role="alert">
          {error}
        </p>
      )}
      <div className="detail-grid">
        <section className="card">
          <h2>Import visits from CSV</h2>
          <p>
            Canonical English headers, UTF-8, comma, semicolon or tab. The 2 MiB
            file is parsed without temporary storage.
          </p>
          <label className="file-drop">
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) =>
                e.target.files?.[0] && readCsv(e.target.files[0])
              }
            />
            <span>{busy ? "Reading file…" : "Choose CSV file"}</span>
          </label>
          {preview && (
            <div className="preview">
              <h3>Import preview</h3>
              <p>
                {preview.summary.rows} rows · {preview.summary.valid} valid ·{" "}
                {preview.summary.errors} errors · {preview.summary.warnings}{" "}
                warnings
              </p>
              {preview.errors?.map((e: any) => (
                <p className="form-error" key={`${e.row}${e.message}`}>
                  Row {e.row}: {e.message}
                </p>
              ))}
              <button
                className="button filled"
                disabled={preview.summary.errors > 0}
                onClick={async () => {
                  const result: any = await api("/api/v1/import/csv/commit", {
                    method: "POST",
                    body: JSON.stringify({ previewId: preview.previewId }),
                  });
                  setPreview(null);
                  onChanged(`Imported ${result.createdVisits} visits.`);
                }}
              >
                Commit import
              </button>
            </div>
          )}
        </section>
        <section className="card">
          <h2>Export portable data</h2>
          <p>
            Spreadsheet-safe CSV exports and a full-fidelity JSON backup stay on
            your device.
          </p>
          <div className="button-stack">
            <button
              className="button tonal"
              onClick={() =>
                download("/api/v1/export/visits.csv", "ryoiku-visits.csv")
              }
            >
              Export visits CSV
            </button>
            <button
              className="button tonal"
              onClick={() =>
                download("/api/v1/export/cities.csv", "ryoiku-cities.csv")
              }
            >
              Export cities CSV
            </button>
            <button
              className="button tonal"
              onClick={() =>
                download("/api/v1/export/countries.csv", "ryoiku-countries.csv")
              }
            >
              Export countries CSV
            </button>
            <button
              className="button outlined"
              onClick={() =>
                download("/api/v1/backup.json", "ryoiku-backup.json")
              }
            >
              Download JSON backup
            </button>
          </div>
        </section>
        <section className="card">
          <h2>Restore JSON backup</h2>
          <p>
            Review counts first. Replace mode deletes only this account's travel
            data inside one transaction.
          </p>
          <label className="file-drop">
            <input
              type="file"
              accept=".json,application/json"
              onChange={(e) =>
                e.target.files?.[0] && readBackup(e.target.files[0])
              }
            />
            <span>Choose backup file</span>
          </label>
          {restore && (
            <div className="preview">
              <h3>Restore preview</h3>
              <p>
                {restore.summary.visits} visits · {restore.summary.cities}{" "}
                cities · {restore.summary.trips} trips
              </p>
              <button
                className="button danger"
                onClick={async () => {
                  if (
                    confirm("Replace all current travel data with this backup?")
                  ) {
                    await api("/api/v1/restore/commit", {
                      method: "POST",
                      body: JSON.stringify({
                        previewId: restore.previewId,
                        mode: "replace_travel_data",
                      }),
                    });
                    setRestore(null);
                    onChanged("Backup restored.");
                  }
                }}
              >
                Replace travel data
              </button>
            </div>
          )}
        </section>
      </div>
    </>
  );
}

function Editor({
  kind,
  revision,
  close,
  onChanged,
}: {
  kind: Exclude<Modal, null>;
  revision: number;
  close: () => void;
  onChanged: (s: string) => void;
}) {
  const countries = useResource<Country[]>("/api/v1/countries", revision),
    trips = useResource<Trip[]>("/api/v1/trips", revision);
  const [country, setCountry] = useState(""),
    [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    if (kind === "visit" && String(f.get("placeSearch") ?? "").trim() && !selectedPlace) {
      setMessage("Choose a place from the suggestions, or clear the search for a country-only visit.");
      setBusy(false);
      return;
    }
    try {
      let notice = kind === "visit" ? "Visit added." : kind === "city" ? "City added." : "Trip created.";
      if (kind === "visit")
        await api("/api/v1/visits", {
          method: "POST",
          body: JSON.stringify({
            countryCode: f.get("countryCode"),
            cityId: selectedPlace?.cityId ?? null,
            placeId: selectedPlace?.placeId ?? null,
            tripId: f.get("tripId") || null,
            startDate: f.get("startDate") || null,
            endDate: f.get("endDate") || null,
            datePrecision: f.get("datePrecision"),
            notes: f.get("notes") || null,
          }),
        });
      if (kind === "city") {
        const result = await api<{ duplicateOf: string | null }>("/api/v1/cities", {
          method: "POST",
          body: JSON.stringify({
            countryCode: f.get("countryCode"),
            name: f.get("name"),
            admin1: f.get("admin1") || null,
            latitude: f.get("latitude") ? Number(f.get("latitude")) : null,
            longitude: f.get("longitude") ? Number(f.get("longitude")) : null,
          }),
        });
        if (result.duplicateOf) notice = "City added. A possible duplicate was found; open either city to merge them.";
      }
      if (kind === "trip")
        await api("/api/v1/trips", {
          method: "POST",
          body: JSON.stringify({
            name: f.get("name"),
            startDate: f.get("startDate") || null,
            endDate: f.get("endDate") || null,
            datePrecision: f.get("datePrecision"),
            notes: f.get("notes") || null,
          }),
        });
      onChanged(notice);
    } catch (err) {
      setMessage((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  };
  const title =
    kind === "visit"
      ? "Add a visit"
      : kind === "city"
        ? "Add a city"
        : "Create a trip";
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
    >
      <section
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <div className="sheet-head">
          <div>
            <span className="eyebrow">
              {kind === "visit" ? "Travel history" : "Places"}
            </span>
            <h2 id="editor-title">{title}</h2>
          </div>
          <button className="icon-button" aria-label="Close" onClick={close}>
            <Icon name="close" />
          </button>
        </div>
        <form className="editor-form" onSubmit={submit}>
          {kind === "trip" ? (
            <>
              <label>
                Trip name
                <input name="name" required maxLength={180} autoFocus />
              </label>
            </>
          ) : (
            <>
              {kind === "visit" && (
                <PlaceCombobox
                  onSelect={(place) => {
                    setSelectedPlace(place);
                    if (place) setCountry(place.countryCode);
                  }}
                />
              )}
              <label>
                Country
                <select
                  name="countryCode"
                  required
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  disabled={Boolean(selectedPlace)}
                  autoFocus={kind === "city"}
                >
                  <option value="">Choose a country</option>
                  {countries.data?.map((c) => (
                    <option value={c.code} key={c.code}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              {selectedPlace && <input type="hidden" name="countryCode" value={country} />}
              {kind === "city" ? (
                <>
                  <label>
                    City name
                    <input name="name" required maxLength={180} />
                  </label>
                  <label>
                    Region (optional)
                    <input name="admin1" maxLength={180} />
                  </label>
                  <div className="form-grid">
                    <label>
                      Latitude
                      <input
                        name="latitude"
                        type="number"
                        min="-90"
                        max="90"
                        step="any"
                      />
                    </label>
                    <label>
                      Longitude
                      <input
                        name="longitude"
                        type="number"
                        min="-180"
                        max="180"
                        step="any"
                      />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <label>
                    Trip (optional)
                    <select name="tripId">
                      <option value="">No trip</option>
                      {trips.data?.map((t) => (
                        <option value={t.id} key={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
            </>
          )}
          {kind !== "city" && (
            <>
              <div className="form-grid">
                <label>
                  Start date
                  <input name="startDate" type="date" />
                </label>
                <label>
                  End date
                  <input name="endDate" type="date" />
                </label>
              </div>
              <label>
                Date precision
                <select name="datePrecision" defaultValue="unknown">
                  <option value="unknown">Unknown</option>
                  <option value="year">Year</option>
                  <option value="month">Month</option>
                  <option value="day">Day</option>
                </select>
              </label>
              <label>
                Notes (optional)
                <textarea name="notes" maxLength={10000} rows={4} />
              </label>
            </>
          )}
          {message && (
            <p className="form-error" role="alert">
              {message}
            </p>
          )}
          <div className="form-actions">
            <button type="button" className="button text" onClick={close}>
              Cancel
            </button>
            <button type="submit" className="button filled" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function TravelPreferences({ notify }: { notify: (message: string) => void }) {
  const resource = useResource<{
    countryCountingMode: "un195" | "iso3166" | "custom";
    customCountryTotal: number;
  }>("/api/v1/settings");
  const [mode, setMode] = useState<"un195" | "iso3166" | "custom">("un195");
  const [total, setTotal] = useState(195);
  useEffect(() => {
    if (resource.data) {
      setMode(resource.data.countryCountingMode);
      setTotal(resource.data.customCountryTotal);
    }
  }, [resource.data]);
  return (
    <form
      className="preference-form"
      onSubmit={async (event) => {
        event.preventDefault();
        await api("/api/v1/settings", {
          method: "PATCH",
          body: JSON.stringify({
            countryCountingMode: mode,
            customCountryTotal: total,
          }),
        });
        notify("Country counting saved.");
      }}
    >
      <label>
        Country definition
        <select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}>
          <option value="un195">UN 195</option>
          <option value="iso3166">ISO 3166</option>
          <option value="custom">Custom total</option>
        </select>
      </label>
      {mode === "custom" && (
        <label>
          Custom country total
          <input type="number" min={1} max={999} value={total} onChange={(event) => setTotal(Number(event.target.value))} />
        </label>
      )}
      <button className="button text" type="submit" disabled={!resource.data}>
        Save counting
      </button>
    </form>
  );
}

function Settings({
  user,
  close,
  logout,
  notify,
}: {
  user: User;
  close: () => void;
  logout: () => void;
  notify: (s: string) => void;
}) {
  const [theme, setTheme] = useState(
      localStorage.getItem("ryoiku-theme") || "lavender",
    ),
    [mode, setMode] = useState(localStorage.getItem("ryoiku-mode") || "system"),
    manifest = useResource<any>("/api/manifest"),
    admin = useResource<any>("/api/v1/admin/info");
  const apply = (nextTheme: string, nextMode: string) => {
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.dataset.mode = nextMode;
    document.documentElement.dataset.resolvedMode =
      nextMode === "system" &&
      matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : nextMode === "system"
          ? "light"
          : nextMode;
    localStorage.setItem("ryoiku-theme", nextTheme);
    localStorage.setItem("ryoiku-mode", nextMode);
    setTheme(nextTheme);
    setMode(nextMode);
    notify("Appearance saved.");
  };
  return (
    <div
      className="sheet-backdrop"
      onMouseDown={(e) => e.target === e.currentTarget && close()}
      onKeyDown={(e) => e.key === "Escape" && close()}
    >
      <div
        className="settings-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
      >
        <div className="sheet-head">
          <div>
            <span className="eyebrow">Profile</span>
            <h2 id="settings-title">Settings</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Close settings"
            onClick={close}
          >
            <Icon name="close" />
          </button>
        </div>
        <section>
          <h3>{user.displayName || user.username}</h3>
          <p className="muted">
            {user.username} · {user.role}
          </p>
        </section>
        <section>
          <h3>Appearance</h3>
          <fieldset>
            <legend>Theme</legend>
            <div className="theme-grid">
              {["lavender", "mint", "sky", "amber", "rose", "graphite"].map(
                (t) => (
                  <button
                    key={t}
                    className={`theme-option ${theme === t ? "active" : ""}`}
                    onClick={() => apply(t, mode)}
                  >
                    <i data-swatch={t} />
                    {t[0]!.toUpperCase() + t.slice(1)}
                  </button>
                ),
              )}
            </div>
          </fieldset>
          <fieldset>
            <legend>Mode</legend>
            <div className="segmented">
              {["system", "light", "dark"].map((m) => (
                <button
                  key={m}
                  className={mode === m ? "active" : ""}
                  onClick={() => apply(theme, m)}
                >
                  {m[0]!.toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </fieldset>
        </section>
        <section>
          <h3>Travel preferences</h3>
          <TravelPreferences notify={notify} />
        </section>
        <section>
          <h3>Data</h3>
          <button
            className="settings-link"
            onClick={() => {
              close();
              go("/import");
            }}
          >
            Import, export and backup <span>›</span>
          </button>
          <button
            className="settings-link"
            onClick={() => {
              close();
              go("/insights");
            }}
          >
            Travel insights <span>›</span>
          </button>
        </section>
        <section>
          <h3>Administration</h3>
          <dl className="info-list">
            <div>
              <dt>Service</dt>
              <dd>{admin.data ? "Ready" : "Checking…"}</dd>
            </div>
            <div>
              <dt>Database</dt>
              <dd>{admin.data?.database || "—"}</dd>
            </div>
            <div>
              <dt>Countries</dt>
              <dd>{admin.data?.countryRows || "—"}</dd>
            </div>
            <div>
              <dt>Offline places</dt>
              <dd>{admin.data?.placeRows?.toLocaleString("en") || "—"}</dd>
            </div>
          </dl>
        </section>
        <section>
          <h3>About</h3>
          <dl className="info-list">
            <div>
              <dt>Version</dt>
              <dd>{manifest.data?.version || "—"}</dd>
            </div>
            <div>
              <dt>Build</dt>
              <dd>{manifest.data?.buildDate || "—"}</dd>
            </div>
            <div>
              <dt>Revision</dt>
              <dd>{manifest.data?.gitSha || "—"}</dd>
            </div>
            <div>
              <dt>License</dt>
              <dd>{manifest.data?.license || "—"}</dd>
            </div>
            <div>
              <dt>Place data</dt>
              <dd>{manifest.data?.placeDataset || "—"}</dd>
            </div>
          </dl>
        </section>
        <button className="button outlined full" onClick={logout}>
          Sign out
        </button>
      </div>
    </div>
  );
}

const savedTheme = localStorage.getItem("ryoiku-theme") || "lavender",
  savedMode = localStorage.getItem("ryoiku-mode") || "system";
document.documentElement.dataset.theme = savedTheme;
document.documentElement.dataset.mode = savedMode;
document.documentElement.dataset.resolvedMode =
  savedMode === "system" && matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : savedMode === "system"
      ? "light"
      : savedMode;
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Access />
  </React.StrictMode>,
);
