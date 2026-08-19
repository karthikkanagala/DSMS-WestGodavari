import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../api/axios';
import { fmt, statusBadge } from '../utils/formatters';
import { ArrowLeft, Trash2, MapPin, User, Calendar, AlertTriangle } from 'lucide-react';

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
    try {
      const bRes = await API.get(`/bins/${id}`);
      setBin(bRes.data);

      const hRes = await API.get(`/collections?bin_id=${id}`);
      setHistory(hRes.data.data || []);
    } catch (_) {}
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
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {bin.latitude ? `${bin.latitude}, ${bin.longitude}` : 'Not set'}
          </p>
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
