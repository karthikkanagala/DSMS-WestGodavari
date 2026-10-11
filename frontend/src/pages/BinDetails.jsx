import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { fmt, statusBadge } from '../utils/formatters';
import { getLocalCollections } from '../utils/mockStorage';
import { ArrowLeft, Trash2, MapPin, User, Calendar, AlertTriangle, ExternalLink } from 'lucide-react';

const FALLBACK_BINS = [
  { _id: 'b1', bin_id: 'BIN-0001', name: 'Market Road Bin',         mandal: 'Tadepalligudem', location: 'Market Road, Tadepalligudem', capacity_kg: 100, status: 'active', latitude: 16.8123, longitude: 81.5276 },
  { _id: 'b2', bin_id: 'BIN-0002', name: 'Bus Stand Main Bin',      mandal: 'Tadepalligudem', location: 'Bus Stand, Tadepalligudem', capacity_kg: 120, status: 'active', latitude: 16.8095, longitude: 81.5332 },
  { _id: 'b3', bin_id: 'BIN-0003', name: 'School Road Bin',         mandal: 'Tadepalligudem', location: 'School Road, Tadepalligudem', capacity_kg: 80,  status: 'active', latitude: 16.8041, longitude: 81.5298 },
  { _id: 'b4', bin_id: 'BIN-0004', name: 'Hospital Area Bin',       mandal: 'Tadepalligudem', location: 'Hospital Area, Tadepalligudem', capacity_kg: 150, status: 'active', latitude: 16.8164, longitude: 81.5355 },
  { _id: 'b5', bin_id: 'BIN-0005', name: 'Temple Road Bin',         mandal: 'Tadepalligudem', location: 'Temple Road, Tadepalligudem', capacity_kg: 100, status: 'active', latitude: 16.8012, longitude: 81.5264 },
  { _id: 'b6', bin_id: 'BIN-0006', name: 'Railway Station Bin',     mandal: 'Bhimavaram',     location: 'Railway Station, Bhimavaram', capacity_kg: 200, status: 'active', latitude: 16.5412, longitude: 81.5233 },
];

const FALLBACK_HISTORY = [
  { _id: 'h1', bin_ref: 'BIN-0001', collector_name: 'K. Venkateswarlu', waste_kg: 92.5, fill_level: 92.5, status: 'completed', timestamp: new Date(Date.now() - 30 * 60000).toISOString(), remarks: 'Route 1 cleared' },
  { _id: 'h2', bin_ref: 'BIN-0001', collector_name: 'P. Nageswara Rao', waste_kg: 78.0, fill_level: 78.0, status: 'completed', timestamp: new Date(Date.now() - 1440 * 60000).toISOString(), remarks: 'Daily clearance' },
];

export default function BinDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bin, setBin] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBinDetails();
  }, [id]);

  const fetchBinDetails = async () => {
    setLoading(true);
    const localCols = getLocalCollections().filter(
      (c) => c.bin_id === id || c.bin_ref === id || c.bin_ref === `BIN-${id.slice(-4).toUpperCase()}`
    );

    try {
      const bRes = await API.get(`/bins/${id}`);
      setBin(bRes.data);

      const hRes = await API.get(`/collections?bin_id=${id}`);
      const apiCols = hRes.data?.data || hRes.data?.collections || [];
      setHistory([...localCols, ...(apiCols.length > 0 ? apiCols : FALLBACK_HISTORY)]);
    } catch (_) {
      const found = FALLBACK_BINS.find((b) => b._id === id || b.bin_id === id);
      if (found) {
        setBin(found);
      } else {
        setBin({
          _id: id,
          bin_id: id.startsWith('BIN-') ? id : `BIN-0001`,
          name: `Municipal Waste Bin (${id})`,
          location: 'West Godavari Municipal Zone',
          mandal: 'Tadepalligudem',
          capacity_kg: 100,
          status: 'active',
          latitude: 16.8073,
          longitude: 81.5316,
        });
      }
      setHistory([...localCols, ...FALLBACK_HISTORY]);
    }
    setLoading(false);
  };

  if (loading) return <div className="p-8 text-center text-sm text-gray-400">Loading Bin details...</div>;
  if (!bin) return <div className="p-8 text-center text-sm text-red-500">Bin not found.</div>;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="btn-secondary p-2">
          <ArrowLeft size={16} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trash2 size={20} className="text-primary-600" /> Bin Details: {bin.bin_id}
          </h2>
          <p className="text-xs text-gray-400">{bin.name} • {bin.location}</p>
        </div>
      </div>

      {/* Meta Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card space-y-1">
          <p className="text-xs text-gray-400">Maximum Capacity</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{bin.capacity_kg} kg</p>
        </div>
        <div className="card space-y-1">
          <p className="text-xs text-gray-400">Status</p>
          <span className={statusBadge(bin.status)}>{bin.status?.toUpperCase()}</span>
        </div>
        <div className="card space-y-1">
          <p className="text-xs text-gray-400">Coordinates</p>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 font-mono">
              {bin.latitude ? `${bin.latitude}, ${bin.longitude}` : 'Not set'}
            </p>
            {bin.latitude && bin.longitude && (
              <a
                href={`https://www.openstreetmap.org/?mlat=${bin.latitude}&mlon=${bin.longitude}#map=16/${bin.latitude}/${bin.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-emerald-600 hover:underline flex items-center gap-1 font-bold"
              >
                OSM <ExternalLink size={11} />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Collection History */}
      <div className="card space-y-4">
        <h3 className="text-sm font-bold text-gray-800 dark:text-white">Collection History</h3>
        <div className="table-container">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="table-header">Timestamp</th>
                <th className="table-header">Collector</th>
                <th className="table-header">Waste (kg)</th>
                <th className="table-header">Fill Level</th>
                <th className="table-header">Status</th>
                <th className="table-header">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-400">No collections recorded yet</td>
                </tr>
              ) : (
                history.map((rec) => (
                  <tr key={rec._id} className="table-row">
                    <td className="table-cell font-mono">{fmt.datetime(rec.timestamp)}</td>
                    <td className="table-cell font-medium">{rec.collector_name}</td>
                    <td className="table-cell font-bold">{rec.waste_kg} kg</td>
                    <td className="table-cell">{rec.fill_level}%</td>
                    <td className="table-cell"><span className={statusBadge(rec.status)}>{rec.status}</span></td>
                    <td className="table-cell text-gray-500">{rec.remarks || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
