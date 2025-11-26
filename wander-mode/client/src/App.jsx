import { useState } from "react";
import "./App.css";

const API_BASE = "http://localhost:5000";

// Simple city presets for search
const CITY_PRESETS = {
  london: { label: "London, UK", lat: 51.5074, lng: -0.1278 },
  paris: { label: "Paris, France", lat: 48.8566, lng: 2.3522 },
  toronto: { label: "Toronto, Canada", lat: 43.65107, lng: -79.347015 },
  "new york": { label: "New York, USA", lat: 40.7128, lng: -74.006 },
  tokyo: { label: "Tokyo, Japan", lat: 35.6762, lng: 139.6503 },
  rome: { label: "Rome, Italy", lat: 41.9028, lng: 12.4964 },
};

function App() {
  const [coords, setCoords] = useState(null);
  const [streetUrl, setStreetUrl] = useState("");
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(false);
  const [streetError, setStreetError] = useState("");
  const [placesError, setPlacesError] = useState("");
  const [cityInput, setCityInput] = useState("");
  const [cityError, setCityError] = useState("");

  async function loadLocation(lat, lng) {
    try {
      setLoading(true);
      setStreetUrl("");
      setPlaces([]);
      setStreetError("");
      setPlacesError("");

      // 1) Street View
      const svRes = await fetch(
        `${API_BASE}/streetview?lat=${lat}&lng=${lng}`
      );
      const svData = await svRes.json();
      console.log("StreetView data:", svData);

      if (svRes.ok && svData.url) {
        setStreetUrl(svData.url);
      } else {
        setStreetError(svData.error || "Street View failed.");
      }

      // 2) Nearby places (Google Places via backend)
      const placesRes = await fetch(
        `${API_BASE}/places?lat=${lat}&lng=${lng}&type=cafe`
      );
      const placesData = await placesRes.json();
      console.log("Places data:", placesData);

      if (placesRes.ok && Array.isArray(placesData)) {
        setPlaces(placesData);
      } else if (!placesRes.ok) {
        setPlacesError(
          placesData.error ||
            "Places API failed (check server console for details)."
        );
      } else {
        setPlacesError("Unexpected response from /places");
      }
    } catch (err) {
      console.error("loadLocation error:", err);
      setStreetError("Something went wrong talking to the server.");
    } finally {
      setLoading(false);
    }
  }

  async function teleport() {
    setCityError("");
    try {
      setLoading(true);
      setCoords(null);
      setStreetUrl("");
      setPlaces([]);
      setStreetError("");
      setPlacesError("");

      const coordRes = await fetch(`${API_BASE}/teleport`);
      const coordData = await coordRes.json();
      console.log("Teleport coords:", coordData);
      setCoords(coordData);

      const { lat, lng } = coordData;
      await loadLocation(lat, lng);
    } catch (err) {
      console.error("Teleport error:", err);
      setStreetError("Something went wrong talking to the server.");
    } finally {
      setLoading(false);
    }
  }

  async function searchCity() {
    const term = cityInput.trim().toLowerCase();
    setCityError("");
    setStreetError("");
    setPlacesError("");

    if (!term) {
      setCityError("Type a city name first.");
      return;
    }

    const preset = CITY_PRESETS[term];
    if (!preset) {
      setCityError(
        "City not found. Try: London, Paris, Toronto, New York, Tokyo, or Rome."
      );
      return;
    }

    const { lat, lng, label } = preset;
    console.log("Searching city preset:", label, { lat, lng });
    setCoords({ lat, lng });

    await loadLocation(lat, lng);
  }

  // Click a café to teleport there
  async function handlePlaceClick(place) {
    if (!place.lat || !place.lng) {
      console.warn("Place has no lat/lng, cannot teleport", place);
      return;
    }

    const lat = place.lat;
    const lng = place.lng;
    console.log("Teleporting to place:", place.name, { lat, lng });

    setCoords({ lat, lng });
    await loadLocation(lat, lng);
  }

  return (
    <div className="app-root">
      <div className="app-shell">
        {/* Top bar */}
        <header className="app-header">
          <div className="brand">
            <div className="brand-mark">W</div>
            <div>
              <div className="brand-title">Wander Mode</div>
              <div className="brand-subtitle">
                Explore random streets and discover nearby cafés.
              </div>
            </div>
          </div>

          <div className="header-actions">
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="Search city (London, Paris, Toronto...)"
              className="search-input"
            />
            <button
              onClick={searchCity}
              disabled={loading}
              className="btn btn-secondary"
            >
              Search
            </button>
            <button
              onClick={teleport}
              disabled={loading}
              className={`btn btn-primary ${loading ? "btn-disabled" : ""}`}
            >
              {loading ? "Loading..." : "Teleport"}
            </button>
          </div>
        </header>

        {cityError && <p className="error-text">{cityError}</p>}

        {coords && (
          <p className="coords-text">
            {coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </p>
        )}

        {/* Main: full-width Street View, suggestions below */}
        <main className="app-main">
          <section className="street-pane">
            {streetError && (
              <p className="error-text">Street View error: {streetError}</p>
            )}

            {!streetError && !streetUrl && !loading && (
              <p className="muted-text">
                Use Teleport or Search to jump into a city and explore the
                street.
              </p>
            )}

            {streetUrl && (
              <iframe
                src={streetUrl}
                title="Street View"
                className="street-iframe"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            )}
          </section>

          <section className="places-pane">
            <h2 className="section-title">Nearby cafés (Google Places)</h2>

            {placesError && <p className="error-text">{placesError}</p>}

            {places.length === 0 && !loading && !placesError && (
              <p className="muted-text">
                No places loaded yet. Teleport or search to see suggestions.
              </p>
            )}

            <div className="places-list">
              {places.map((p) => (
                <div
                  key={p.id}
                  className="place-card"
                  onClick={() => handlePlaceClick(p)}
                >
                  <div className="place-header">
                    <span className="place-name">{p.name}</span>
                  </div>
                  {p.categories && (
                    <div className="place-meta">{p.categories}</div>
                  )}
                  {p.distance != null && (
                    <div className="place-meta">
                      ~{Math.round(p.distance)} m away
                    </div>
                  )}
                  {p.address && (
                    <div className="place-address">{p.address}</div>
                  )}
                  <div className="place-hint">Click to teleport here</div>
                </div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default App;
