import { useMemo, useState } from "react";
import {
  CalendarDays,
  Clock3,
  Compass,
  LocateFixed,
  MapPinned,
  Search,
  ShieldAlert,
  Sun,
  Sunrise,
  Sunset,
} from "lucide-react";
import { CesiumSunViewer } from "./components/CesiumSunViewer";
import { DEFAULT_LOCATION, formatCoordinate, parseCoordinate } from "./lib/coordinates";
import { geocodeAddress } from "./lib/googleGeocode";
import {
  getDaylightAppearance,
  getSolarDayForDate,
  getSunPosition,
  getZonedSimulationTime,
} from "./lib/solar";
import type { MapMode, PropertyLocation, ShadowQuality } from "./types";

const initialDate = "2026-06-21";
const initialTime = "15:30";
const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim();

function numberFormat(value: number): string {
  return value.toFixed(1);
}

function timeToRangeValue(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

function rangeValueToTime(value: number): string {
  const hours = Math.floor(value / 60).toString().padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function modeLabel(mode: MapMode): string {
  return mode === "google-photorealistic"
    ? "Google Photorealistic 3D Tiles"
    : "Local simulation scene";
}

export function App() {
  const [location, setLocation] = useState<PropertyLocation>(DEFAULT_LOCATION);
  const [address, setAddress] = useState("");
  const [latitudeInput, setLatitudeInput] = useState(
    DEFAULT_LOCATION.latitude.toString()
  );
  const [longitudeInput, setLongitudeInput] = useState(
    DEFAULT_LOCATION.longitude.toString()
  );
  const [dateValue, setDateValue] = useState(initialDate);
  const [timeValue, setTimeValue] = useState(initialTime);
  const [shadowsEnabled, setShadowsEnabled] = useState(true);
  const [quality, setQuality] = useState<ShadowQuality>("balanced");
  const [mapMode, setMapMode] = useState<MapMode>("local-simulation");
  const [viewerStatus, setViewerStatus] = useState("Preparing 3D sunlight scene.");
  const [formMessage, setFormMessage] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);

  const simulationTime = useMemo(
    () =>
      getZonedSimulationTime(
        dateValue,
        timeValue,
        location.latitude,
        location.longitude
      ),
    [dateValue, location.latitude, location.longitude, timeValue]
  );
  const simulationDate = simulationTime.date;
  const sunPosition = useMemo(
    () => getSunPosition(simulationDate, location.latitude, location.longitude),
    [location.latitude, location.longitude, simulationDate]
  );
  const solarDay = useMemo(
    () =>
      getSolarDayForDate(
        dateValue,
        location.latitude,
        location.longitude,
        simulationTime.timeZone
      ),
    [dateValue, location.latitude, location.longitude, simulationTime.timeZone]
  );
  const daylightAppearance = useMemo(
    () => getDaylightAppearance(sunPosition.elevationDeg),
    [sunPosition.elevationDeg]
  );

  function applyCoordinates() {
    try {
      const latitude = parseCoordinate(latitudeInput, "latitude");
      const longitude = parseCoordinate(longitudeInput, "longitude");
      setLocation({
        label: "Manual coordinate property",
        latitude,
        longitude,
        confidence: "manual-coordinate",
      });
      setFormMessage("Coordinates applied.");
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Invalid coordinate input.");
    }
  }

  async function applyAddress() {
    setIsGeocoding(true);
    setFormMessage("");

    try {
      const result = await geocodeAddress(address, googleMapsApiKey);
      setLocation(result);
      setLatitudeInput(result.latitude.toFixed(6));
      setLongitudeInput(result.longitude.toFixed(6));
      setFormMessage("Address resolved.");
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Address lookup failed.");
    } finally {
      setIsGeocoding(false);
    }
  }

  function applyPreset(time: string) {
    setTimeValue(time);
  }

  return (
    <main className="app-shell">
      <CesiumSunViewer
        location={location}
        simulationDate={simulationDate}
        shadowsEnabled={shadowsEnabled}
        quality={quality}
        daylightAppearance={daylightAppearance}
        onModeChange={setMapMode}
        onStatusChange={setViewerStatus}
      />

      <section className="workspace" aria-label="Sunlight simulator controls">
        <header className="top-bar">
          <div>
            <h1>Sunlight Simulator</h1>
            <p>{modeLabel(mapMode)}</p>
          </div>
          <div className="status-pill" data-testid="viewer-status">
            <MapPinned aria-hidden="true" size={18} />
            <span>{viewerStatus}</span>
          </div>
        </header>

        <div className="control-dock">
          <section className="panel location-panel" aria-label="Property location">
            <div className="panel-title">
              <LocateFixed aria-hidden="true" size={18} />
              <h2>Property</h2>
            </div>

            <div className="field-row address-row">
              <label htmlFor="address">Address</label>
              <div className="inline-control">
                <input
                  id="address"
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="123 Main St, city"
                  autoComplete="street-address"
                />
                <button
                  type="button"
                  className="icon-button"
                  onClick={() => void applyAddress()}
                  aria-label="Search address"
                  title="Search address"
                  disabled={isGeocoding}
                >
                  <Search aria-hidden="true" size={18} />
                </button>
              </div>
            </div>

            <div className="coordinate-grid">
              <label htmlFor="latitude">Latitude</label>
              <input
                id="latitude"
                inputMode="decimal"
                value={latitudeInput}
                onChange={(event) => setLatitudeInput(event.target.value)}
              />
              <label htmlFor="longitude">Longitude</label>
              <input
                id="longitude"
                inputMode="decimal"
                value={longitudeInput}
                onChange={(event) => setLongitudeInput(event.target.value)}
              />
            </div>

            <button type="button" className="primary-button" onClick={applyCoordinates}>
              <LocateFixed aria-hidden="true" size={18} />
              <span>Apply coordinates</span>
            </button>

            {formMessage ? (
              <p className="form-message" role="status">
                {formMessage}
              </p>
            ) : null}

            <dl className="location-readout">
              <div>
                <dt>Selected</dt>
                <dd>{location.label}</dd>
              </div>
              <div>
                <dt>Lat / Lng</dt>
                <dd>
                  {formatCoordinate(location.latitude)}, {formatCoordinate(location.longitude)}
                </dd>
              </div>
              <div>
                <dt>Time zone</dt>
                <dd>{simulationTime.timeZone}</dd>
              </div>
            </dl>
          </section>

          <section className="panel time-panel" aria-label="Simulation time">
            <div className="panel-title">
              <CalendarDays aria-hidden="true" size={18} />
              <h2>Time</h2>
            </div>

            <div className="time-grid">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={dateValue}
                onChange={(event) => setDateValue(event.target.value)}
              />
              <label htmlFor="time">Clock</label>
              <input
                id="time"
                type="time"
                value={timeValue}
                onChange={(event) => setTimeValue(event.target.value)}
              />
            </div>

            <label className="range-label" htmlFor="time-range">
              <Clock3 aria-hidden="true" size={17} />
              <span>Time of day</span>
              <strong>{timeValue}</strong>
            </label>
            <input
              id="time-range"
              type="range"
              min="300"
              max="1260"
              step="10"
              value={timeToRangeValue(timeValue)}
              onChange={(event) => setTimeValue(rangeValueToTime(Number(event.target.value)))}
            />

            <div className="preset-row" aria-label="Sun presets">
              <button
                type="button"
                className="icon-text-button"
                onClick={() => solarDay.sunrise && applyPreset(solarDay.sunrise)}
                disabled={!solarDay.sunrise}
              >
                <Sunrise aria-hidden="true" size={17} />
                <span>Sunrise</span>
              </button>
              <button
                type="button"
                className="icon-text-button"
                onClick={() => applyPreset(solarDay.solarNoon)}
              >
                <Sun aria-hidden="true" size={17} />
                <span>Noon</span>
              </button>
              <button
                type="button"
                className="icon-text-button"
                onClick={() => solarDay.sunset && applyPreset(solarDay.sunset)}
                disabled={!solarDay.sunset}
              >
                <Sunset aria-hidden="true" size={17} />
                <span>Sunset</span>
              </button>
            </div>
          </section>

          <section className="panel sun-panel" aria-label="Sunlight readout">
            <div className="panel-title">
              <Compass aria-hidden="true" size={18} />
              <h2>Sun</h2>
            </div>

            <dl className="metric-grid">
              <div>
                <dt>Azimuth</dt>
                <dd>{numberFormat(sunPosition.azimuthDeg)}°</dd>
              </div>
              <div>
                <dt>Elevation</dt>
                <dd>{numberFormat(sunPosition.elevationDeg)}°</dd>
              </div>
              <div>
                <dt>Light</dt>
                <dd>{daylightAppearance.label}</dd>
              </div>
              <div>
                <dt>Solar noon</dt>
                <dd>{solarDay.solarNoon}</dd>
              </div>
            </dl>

            <div className="sun-compass" aria-label="Sun azimuth compass">
              <div
                className="sun-compass-needle"
                style={{ transform: `rotate(${sunPosition.azimuthDeg}deg)` }}
              />
              <span className="compass-north">N</span>
              <span className="compass-east">E</span>
              <span className="compass-south">S</span>
              <span className="compass-west">W</span>
            </div>
          </section>

          <section className="panel settings-panel" aria-label="Rendering settings">
            <div className="panel-title">
              <Sun aria-hidden="true" size={18} />
              <h2>Rendering</h2>
            </div>

            <label className="toggle-row" htmlFor="shadow-toggle">
              <span>Dynamic shadows</span>
              <input
                id="shadow-toggle"
                type="checkbox"
                checked={shadowsEnabled}
                onChange={(event) => setShadowsEnabled(event.target.checked)}
              />
            </label>

            <label className="select-row" htmlFor="quality">
              <span>Quality</span>
              <select
                id="quality"
                value={quality}
                onChange={(event) => setQuality(event.target.value as ShadowQuality)}
              >
                <option value="balanced">Balanced</option>
                <option value="high">High</option>
                <option value="battery">Battery</option>
              </select>
            </label>

            <div className="caveat">
              <ShieldAlert aria-hidden="true" size={18} />
              <p>
                Approximate sunlight visualization. 3D imagery can be dated, trees and
                construction may differ, and Google tile textures may contain baked shadows.
              </p>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
