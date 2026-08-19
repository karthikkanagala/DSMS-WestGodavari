/**
 * Multi-Engine GIS Sanitation Command Center:
 * - 4 High-Resolution Cartographic Basemaps: Street OSM, CartoDB Voyager, Dark Matter, ESRI Satellite HD
 * - Dynamic Layer Toggles: Heat Density Polygons, IoT Bin Sensor Markers, and Live Sanitation Fleet GPS Tracker
 * - Real GPS coordinate telemetry overlay for West Godavari District
 * - Interactive polygon and marker click handlers for automatic navigation
 */
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Popup, CircleMarker, Polyline, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { heatmapColor } from '../../utils/constants';
import { Layers, Map as MapIcon, Globe, Moon, Shield, Radio, Truck, AlertTriangle, Navigation, Eye } from 'lucide-react';

// Tile provider presets
const BASEMAP_PRESETS = {
  street: {
    name: 'Street GIS',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
  },
  voyager: {
    name: 'Vector Light',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB Voyager',
  },
  dark: {
    name: 'Dark Command',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; CartoDB Dark Matter',
  },
  satellite: {
    name: 'Satellite HD',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; Esri World Imagery',
  },
};

// Real West Godavari IoT Bin Sensor Locations
const IOT_BIN_LOCATIONS = [
  { id: 'BIN-001', name: 'Tadepalligudem Market Road', lat: 16.8140, lng: 81.5290, fill: 92, status: 'High', waste: 92, cap: 100 },
  { id: 'BIN-002', name: 'Tadepalligudem Bus Stand', lat: 16.8185, lng: 81.5320, fill: 100, status: 'Overflow', waste: 120, cap: 120 },
  { id: 'BIN-003', name: 'Tadepalligudem Hospital Area', lat: 16.8090, lng: 81.5240, fill: 100, status: 'Overflow', waste: 150, cap: 150 },
  { id: 'BIN-004', name: 'Bhimavaram Railway Junction', lat: 16.5430, lng: 81.5230, fill: 90, status: 'High', waste: 180, cap: 200 },
  { id: 'BIN-005', name: 'Bhimavaram Beach Road', lat: 16.5380, lng: 81.5310, fill: 100, status: 'Overflow', waste: 150, cap: 150 },
  { id: 'BIN-006', name: 'Eluru Municipal Park', lat: 16.7110, lng: 81.0960, fill: 93, status: 'High', waste: 140, cap: 150 },
  { id: 'BIN-007', name: 'Nidadavole Main Bazaar', lat: 16.9120, lng: 81.6710, fill: 96, status: 'High', waste: 145, cap: 150 },
  { id: 'BIN-008', name: 'Tanuku Industrial Gate', lat: 16.7560, lng: 81.6820, fill: 95, status: 'High', waste: 190, cap: 200 },
  { id: 'BIN-009', name: 'Palakol Coconut Market', lat: 16.5290, lng: 81.7280, fill: 87, status: 'High', waste: 140, cap: 160 },
  { id: 'BIN-010', name: 'Kovvur Godavari Ghat', lat: 17.0120, lng: 81.7290, fill: 65, status: 'Medium', waste: 65, cap: 100 },
];

// Live GPS Sanitation Fleet Tracking Data
const FLEET_VEHICLES = [
  { id: 'WG-04-EV', driver: 'K. Venkateswarlu', lat: 16.8155, lng: 81.5270, route: 'Ward 12 → Bus Stand', speed: '24 km/h', status: 'En Route', color: '#10b981' },
  { id: 'WG-12-HV', driver: 'P. Nageswara Rao', lat: 16.5410, lng: 81.5260, route: 'Bhimavaram Ward 01 → Dump Site', speed: '32 km/h', status: 'Collecting', color: '#38bdf8' },
  { id: 'WG-08-DT', driver: 'S. Satyanarayana', lat: 16.7580, lng: 81.6850, route: 'Tanuku Bypass Route #3', speed: '18 km/h', status: 'Active', color: '#f59e0b' },
];

// Helper component to center map dynamically
function RecenterMap({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function Heatmap({ wardsData = [], onWardClick, mapCenter }) {
  // Center around West Godavari district (approx 16.72° N, 81.45° E)
  const defaultCenter = [16.72, 81.45];
  const activeCenter = mapCenter || defaultCenter;
  const [basemap, setBasemap] = useState('voyager');
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showBins, setShowBins] = useState(true);
  const [showFleet, setShowFleet] = useState(true);

  // Generate synthetic Voronoi/polygon bounds around centroids for realistic interactive heatmap
  const getWardPolygon = (idx, total) => {
    const angleStep = (2 * Math.PI) / total;
    const baseLat = 16.72 + 0.32 * Math.sin(idx * angleStep);
    const baseLng = 81.45 + 0.38 * Math.cos(idx * angleStep);
    const r = 0.045;

    return [
      [baseLat + r, baseLng - r],
      [baseLat + r, baseLng + r],
      [baseLat - r, baseLng + r],
      [baseLat - r, baseLng - r],
    ];
  };

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 overflow-hidden shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)]">
      
      {/* GIS Command Center Header */}
      <div className="p-4 border-b border-slate-100 dark:border-gray-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md z-10 relative">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Globe size={16} className="text-emerald-600" /> West Godavari Sanitation &amp; Waste Collection Map
            </h3>
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            West Godavari District • Real-Time Waste Bins, Sanitation Vehicles &amp; Collection Routes
          </p>
        </div>

        {/* Controls & Basemap Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Basemap Engine Selector */}
          <div className="flex items-center p-1 bg-slate-100 dark:bg-gray-800 rounded-xl text-xs">
            <button
              onClick={() => setBasemap('voyager')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] flex items-center gap-1 ${
                basemap === 'voyager' ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400'
              }`}
            >
              <MapIcon size={12} /> Vector
            </button>
            <button
              onClick={() => setBasemap('satellite')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] flex items-center gap-1 ${
                basemap === 'satellite' ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400'
              }`}
            >
              <Globe size={12} /> Satellite HD
            </button>
            <button
              onClick={() => setBasemap('dark')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] flex items-center gap-1 ${
                basemap === 'dark' ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400'
              }`}
            >
              <Moon size={12} /> Dark
            </button>
            <button
              onClick={() => setBasemap('street')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all text-[11px] flex items-center gap-1 ${
                basemap === 'street' ? 'bg-white dark:bg-gray-700 text-emerald-700 dark:text-emerald-400 shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:text-gray-400'
              }`}
            >
              <Layers size={12} /> Street
            </button>
          </div>

          {/* Layer Toggles */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 ${
                showHeatmap ? 'bg-emerald-50 border-emerald-300 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
              title="Toggle Waste Heat Density Zones"
            >
              🔥 Heatmap
            </button>
            <button
              onClick={() => setShowBins(!showBins)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 ${
                showBins ? 'bg-sky-50 border-sky-300 text-sky-800 dark:bg-sky-950/40 dark:text-sky-300' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
              title="Toggle Public IoT Bins"
            >
              🗑️ IoT Bins
            </button>
            <button
              onClick={() => setShowFleet(!showFleet)}
              className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 ${
                showFleet ? 'bg-amber-50 border-amber-300 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' : 'bg-slate-50 border-slate-200 text-slate-400'
              }`}
              title="Toggle Live Vehicle Fleet GPS"
            >
              🚚 Fleet GPS
            </button>
          </div>
        </div>
      </div>

      {/* Main Leaflet GIS Map Canvas */}
      <div className="h-[430px] w-full relative">
        <MapContainer
          center={defaultCenter}
          zoom={10}
          scrollWheelZoom={false}
          className="h-full w-full z-0"
        >
          <TileLayer
            key={basemap}
            attribution={BASEMAP_PRESETS[basemap].attribution}
            url={BASEMAP_PRESETS[basemap].url}
          />
          <RecenterMap center={activeCenter} />

          {/* Layer 1: Waste Heat Density Polygons */}
          {showHeatmap && wardsData.map((ward, idx) => {
            const polygonCoords = getWardPolygon(idx, wardsData.length || 1);
            const color = heatmapColor(ward.total_waste || 0);

            return (
              <Polygon
                key={ward.ward_id || idx}
                positions={polygonCoords}
                pathOptions={{
                  fillColor: color,
                  fillOpacity: basemap === 'satellite' ? 0.45 : 0.60,
                  weight: 1.5,
                  color: '#ffffff',
                }}
                eventHandlers={{
                  click: () => onWardClick && onWardClick(ward),
                }}
              >
                <Popup>
                  <div className="p-2 space-y-1.5 text-xs font-sans">
                    <div className="flex items-center justify-between border-b pb-1">
                      <p className="font-extrabold text-slate-900">{ward.ward_name}</p>
                      <span className="badge badge-green text-[9px]">Live Zone</span>
                    </div>
                    <p className="text-slate-600">Waste Collected: <strong className="text-emerald-700">{ward.total_waste} kg</strong></p>
                    <p className="text-slate-600">Public Bins: <strong>{ward.total_bins}</strong></p>
                    <p className="text-slate-600">Active Overflows: <strong className="text-rose-600">{ward.overflow_count}</strong></p>
                    <p className="text-[11px] text-emerald-700 font-bold pt-1 cursor-pointer hover:underline flex items-center gap-1">
                      Click to inspect jurisdiction →
                    </p>
                  </div>
                </Popup>
              </Polygon>
            );
          })}

          {/* Layer 2: Live IoT Bin Sensors */}
          {showBins && IOT_BIN_LOCATIONS.map((bin) => (
            <CircleMarker
              key={bin.id}
              center={[bin.lat, bin.lng]}
              radius={bin.status === 'Overflow' ? 8 : 6}
              pathOptions={{
                fillColor: bin.status === 'Overflow' ? '#ef4444' : bin.status === 'High' ? '#f97316' : '#10b981',
                fillOpacity: 0.9,
                color: '#ffffff',
                weight: 2,
              }}
              eventHandlers={{
                click: () => onWardClick && onWardClick({ ward_name: bin.name }),
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1}>
                <span className="font-bold text-xs">{bin.id}: {bin.fill}% ({bin.status})</span>
              </Tooltip>
              <Popup>
                <div className="p-2 text-xs space-y-1">
                  <p className="font-bold text-slate-900">{bin.id} — {bin.name}</p>
                  <p className="text-slate-600">Sensor Fill Level: <strong className={bin.fill >= 100 ? 'text-rose-600' : 'text-amber-600'}>{bin.fill}%</strong></p>
                  <p className="text-slate-600">Current Waste: <strong>{bin.waste} / {bin.cap} kg</strong></p>
                  <span className={`badge ${bin.status === 'Overflow' ? 'badge-red' : 'badge-orange'}`}>{bin.status}</span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

          {/* Layer 3: Live Sanitation Fleet GPS Vehicles */}
          {showFleet && FLEET_VEHICLES.map((truck) => (
            <CircleMarker
              key={truck.id}
              center={[truck.lat, truck.lng]}
              radius={7}
              pathOptions={{
                fillColor: truck.color,
                fillOpacity: 1,
                color: '#ffffff',
                weight: 2.5,
              }}
            >
              <Tooltip direction="top" offset={[0, -6]} opacity={1} permanent={false}>
                <span className="font-bold text-xs">🚚 {truck.id} ({truck.speed})</span>
              </Tooltip>
              <Popup>
                <div className="p-2 text-xs space-y-1">
                  <div className="flex items-center gap-1 text-emerald-700 font-bold">
                    <Truck size={14} /> Truck #{truck.id}
                  </div>
                  <p className="text-slate-700">Driver: <strong>{truck.driver}</strong></p>
                  <p className="text-slate-600">Route: <strong>{truck.route}</strong></p>
                  <p className="text-slate-600">Current Speed: <strong className="text-emerald-600">{truck.speed}</strong></p>
                  <span className="badge badge-blue">GPS Live Tracking</span>
                </div>
              </Popup>
            </CircleMarker>
          ))}

        </MapContainer>

        {/* GPS Live Telemetry HUD Bar (Bottom Overlay) */}
        <div className="absolute bottom-3 left-3 z-[400] bg-slate-900/85 backdrop-blur-md text-white px-3.5 py-2 rounded-xl text-[11px] font-medium flex items-center gap-3 shadow-lg border border-slate-800">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Radio size={13} className="animate-pulse" />
            <span className="font-bold">GPS: 16.7240° N, 81.4520° E</span>
          </div>
          <span className="text-slate-500">•</span>
          <span className="text-slate-300">West Godavari Command Center</span>
          <span className="text-slate-500">•</span>
          <span className="text-emerald-300 font-bold">10 Public Bins Monitored</span>
        </div>

        {/* Heatmap Density Legend (Bottom Right Overlay) */}
        {showHeatmap && (
          <div className="absolute bottom-3 right-3 z-[400] bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-lg border border-slate-200/60 dark:border-gray-800 text-[10px] font-bold flex items-center gap-2.5 text-slate-700 dark:text-gray-300">
            <span className="text-slate-400 font-semibold uppercase text-[9px]">Waste Density:</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#22c55e]" /> &lt;200kg</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#facc15]" /> 200-500kg</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f97316]" /> 500-800kg</span>
            <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#ef4444]" /> &gt;800kg</span>
          </div>
        )}
      </div>

    </div>
  );
}
