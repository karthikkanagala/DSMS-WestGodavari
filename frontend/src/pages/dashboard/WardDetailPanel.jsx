import React, { useEffect, useState } from 'react';
import { X, Trash2, AlertTriangle, CheckCircle, UserCheck } from 'lucide-react';
import API from '../../api/axios';
import { fmt } from '../../utils/formatters';

export default function WardDetailPanel({ ward, onClose }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ward?.ward_id) {
      fetchWardDetails(ward.ward_id);
    }
  }, [ward]);

  const fetchWardDetails = async (id) => {
    setLoading(true);
    try {
      const res = await API.get(`/analytics/ward/${id}`);
      setDetails(res.data);
    } catch (_) {}
    setLoading(false);
  };

  if (!ward) return null;

  return (
    <div className="card space-y-4 animate-slide-in">
      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
        <div>
          <span className="badge badge-blue mb-1">Ward Summary</span>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {ward.ward_name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <X size={18} />
        </button>
      </div>

      {loading ? (
        <div className="py-8 text-center text-xs text-gray-400">Loading details...</div>
      ) : (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center gap-2">
              <Trash2 size={16} className="text-primary-600" />
              <div>
                <p className="text-gray-400">Total Bins</p>
                <p className="font-bold text-gray-900 dark:text-white">{details?.total_bins || 0}</p>
              </div>
            </div>

            <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              <div>
                <p className="text-gray-400">Completed</p>
                <p className="font-bold text-gray-900 dark:text-white">{details?.completed || 0}</p>
              </div>
            </div>

            <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center gap-2">
              <AlertTriangle size={16} className="text-red-600" />
              <div>
                <p className="text-gray-400">Overflows</p>
                <p className="font-bold text-red-600">{details?.overflow_count || 0}</p>
              </div>
            </div>

            <div className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-lg flex items-center gap-2">
              <span className="font-bold text-primary-600 text-sm">kg</span>
              <div>
                <p className="text-gray-400">Total Waste</p>
                <p className="font-bold text-gray-900 dark:text-white">{fmt.kg(details?.total_waste)}</p>
              </div>
            </div>
          </div>

          {/* Assigned Collectors */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1.5">
              <UserCheck size={14} className="text-primary-600" /> Assigned Collectors:
            </p>
            {details?.collectors?.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {details.collectors.map((c) => (
                  <span key={c._id} className="badge badge-gray">
                    {c.full_name || c.username}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">No collector assigned</p>
            )}
          </div>

          <p className="text-[11px] text-gray-400 border-t border-gray-100 dark:border-gray-800 pt-2">
            Last Updated: {fmt.datetime(details?.last_updated)}
          </p>
        </div>
      )}
    </div>
  );
}
