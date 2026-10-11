/**
 * Manage Collections — Full 19-Mandal Sanitation Collection Records:
 * - 19 Mandals fast filter pills
 * - URL parameter support (?mandal=...)
 * - Direct deep link to /admin/mandals
 * - Verification audit workflow
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../../api/axios';
import DataTable from '../../components/ui/DataTable';
import { fmt, statusBadge } from '../../utils/formatters';
import { getLocalCollections } from '../../utils/mockStorage';
import {
  ClipboardList, CheckCircle2, RotateCcw, Building2,
  ArrowUpRight, MapPin, Scale, Camera, ExternalLink, X
} from 'lucide-react';

const FALLBACK_COLLECTIONS = [
  { _id: 'c1',  bin_ref: 'BIN-0001', mandal: 'Tadepalligudem', collector_name: 'K. Venkateswarlu', waste_kg: 92.5, fill_level: 92.5, status: 'completed', timestamp: new Date(Date.now() - 10 * 60000).toISOString(), verified: true },
  { _id: 'c2',  bin_ref: 'BIN-0002', mandal: 'Tadepalligudem', collector_name: 'P. Nageswara Rao', waste_kg: 120.0, fill_level: 100.0, status: 'overflow',  timestamp: new Date(Date.now() - 25 * 60000).toISOString(), verified: false },
  { _id: 'c3',  bin_ref: 'BIN-0003', mandal: 'Tadepalligudem', collector_name: 'M. Rambabu',       waste_kg: 54.0, fill_level: 67.5, status: 'in_progress', timestamp: new Date(Date.now() - 40 * 60000).toISOString(), verified: false },
  { _id: 'c4',  bin_ref: 'BIN-0004', mandal: 'Bhimavaram',     collector_name: 'S. Satyanarayana', waste_kg: 150.0, fill_level: 100.0, status: 'overflow',  timestamp: new Date(Date.now() - 60 * 60000).toISOString(), verified: true },
  { _id: 'c5',  bin_ref: 'BIN-0005', mandal: 'Bhimavaram',     collector_name: 'B. Appa Rao',      waste_kg: 35.0, fill_level: 35.0, status: 'completed', timestamp: new Date(Date.now() - 85 * 60000).toISOString(), verified: true },
  { _id: 'c6',  bin_ref: 'BIN-0006', mandal: 'Bhimavaram',     collector_name: 'K. Venkateswarlu', waste_kg: 180.0, fill_level: 90.0, status: 'completed', timestamp: new Date(Date.now() - 110 * 60000).toISOString(), verified: false },
  { _id: 'c7',  bin_ref: 'BIN-0007', mandal: 'Nidadavole',     collector_name: 'P. Nageswara Rao', waste_kg: 145.0, fill_level: 96.6, status: 'completed', timestamp: new Date(Date.now() - 140 * 60000).toISOString(), verified: true },
  { _id: 'c8',  bin_ref: 'BIN-0008', mandal: 'Eluru',          collector_name: 'M. Rambabu',       waste_kg: 20.0, fill_level: 25.0, status: 'completed', timestamp: new Date(Date.now() - 170 * 60000).toISOString(), verified: true },
  { _id: 'c9',  bin_ref: 'BIN-0009', mandal: 'Tanuku',         collector_name: 'S. Satyanarayana', waste_kg: 200.0, fill_level: 100.0, status: 'overflow',  timestamp: new Date(Date.now() - 200 * 60000).toISOString(), verified: false },
  { _id: 'c10', bin_ref: 'BIN-0010', mandal: 'Palakol',        collector_name: 'B. Appa Rao',      waste_kg: 65.0, fill_level: 65.0, status: 'in_progress', timestamp: new Date(Date.now() - 240 * 60000).toISOString(), verified: false },
  { _id: 'c11', bin_ref: 'BIN-0011', mandal: 'Kovvur',         collector_name: 'K. Venkateswarlu', waste_kg: 175.0, fill_level: 97.2, status: 'completed', timestamp: new Date(Date.now() - 280 * 60000).toISOString(), verified: true },
  { _id: 'c12', bin_ref: 'BIN-0012', mandal: 'Narasapuram',    collector_name: 'P. Nageswara Rao', waste_kg: 110.0, fill_level: 91.6, status: 'completed', timestamp: new Date(Date.now() - 320 * 60000).toISOString(), verified: true },
];

const ALL_19_MANDALS = [
  'Tadepalligudem', 'Bhimavaram', 'Palakol', 'Narasapuram', 'Tanuku',
  'Eluru', 'Nidadavole', 'Kovvur', 'Jangareddigudem', 'Attili',
  'Akividu', 'Undi', 'Ganapavaram', 'Peravali', 'Unguturu',
  'Polavaram', 'Denduluru', 'Rajam', 'Pedapadu'
];

export default function ManageCollections() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mandalParam = searchParams.get('mandal');

  const [collections, setCollections] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState(null);

  // Filters
  const [mandals, setMandals] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedMandal, setSelectedMandal] = useState(mandalParam || '');
  const [selectedWard, setSelectedWard] = useState('');
  const [selectedDate, setSelectedDate] = useState('');

  useEffect(() => {
    fetchMandals();
  }, []);

  useEffect(() => {
    if (mandalParam) {
      setSelectedMandal(mandalParam);
    }
  }, [mandalParam]);

  useEffect(() => {
    fetchCollections();
  }, [page, selectedMandal, selectedWard, selectedDate]);

  const fetchMandals = async () => {
    try {
      const res = await API.get('/mandals');
      if (res.data && res.data.length > 0) {
        setMandals(res.data);
      } else {
        setMandals(ALL_19_MANDALS.map((name, i) => ({ _id: `m${i+1}`, name })));
      }
    } catch (_) {
      setMandals(ALL_19_MANDALS.map((name, i) => ({ _id: `m${i+1}`, name })));
    }
  };

  const handleMandalFilterChange = async (mid) => {
    setSelectedMandal(mid);
    setSelectedWard('');
    if (mid) {
      try {
        const res = await API.get(`/wards?mandal_id=${encodeURIComponent(mid)}`);
        setWards(res.data || []);
      } catch (_) {}
    } else {
      setWards([]);
    }
  };

  const fetchCollections = async () => {
    setLoading(true);
    const localCols = getLocalCollections().filter(c => {
      if (!selectedMandal) return true;
      return c.mandal?.toLowerCase() === selectedMandal.toLowerCase();
    });

    try {
      let url = `/collections?page=${page}&limit=10`;
      if (selectedMandal) url += `&mandal_id=${encodeURIComponent(selectedMandal)}`;
      if (selectedWard) url += `&ward_id=${encodeURIComponent(selectedWard)}`;
      if (selectedDate) url += `&date=${selectedDate}`;

      const res = await API.get(url);
      if (res.data && Array.isArray(res.data.collections)) {
        setCollections([...localCols, ...res.data.collections]);
        setTotal((res.data.total || res.data.collections.length) + localCols.length);
        setPages(res.data.pages || 1);
      } else {
        const filtered = selectedMandal
          ? FALLBACK_COLLECTIONS.filter(c => c.mandal?.toLowerCase() === selectedMandal.toLowerCase())
          : FALLBACK_COLLECTIONS;
        setCollections([...localCols, ...filtered]);
        setTotal(filtered.length + localCols.length);
        setPages(1);
      }
    } catch (_) {
      const filtered = selectedMandal
        ? FALLBACK_COLLECTIONS.filter(c => c.mandal?.toLowerCase() === selectedMandal.toLowerCase())
        : FALLBACK_COLLECTIONS;
      setCollections([...localCols, ...filtered]);
      setTotal(filtered.length + localCols.length);
      setPages(1);
    }
    setLoading(false);
  };

  const handleVerify = async (id) => {
    try {
      await API.post(`/collections/${id}/verify`);
      fetchCollections();
    } catch (_) {}
  };

  const displayCollections = collections.length > 0 ? collections : FALLBACK_COLLECTIONS;

  const columns = [
    {
      header: 'Bin Reference',
      accessor: 'bin_ref',
      cell: (r) => (
        <span className="font-mono font-bold text-emerald-600 flex items-center gap-1.5 flex-wrap">
          {r.bin_ref || r.bin_id?.bin_id || 'BIN-001'}
          {r.is_local && (
            <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[9px] font-bold px-1.5 py-0.2 rounded border border-amber-300">
              Demo
            </span>
          )}
        </span>
      ),
    },
    {
      header: 'Photo Proof',
      cell: (r) =>
        r.image_url ? (
          <div
            onClick={() => setPreviewImage(r.image_url)}
            className="w-9 h-9 rounded-xl overflow-hidden border border-slate-200 dark:border-gray-700 cursor-pointer hover:opacity-85 transition-opacity bg-black/10 relative group"
            title="Click to view full photo"
          >
            <img src={r.image_url} alt="Proof" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white">
              <Camera size={12} />
            </div>
          </div>
        ) : (
          <span className="text-slate-400 text-xs">—</span>
        ),
    },
    {
      header: 'Jurisdiction Mandal',
      cell: (r) => (
        <button
          onClick={() => navigate('/admin/mandals')}
          className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <Building2 size={12} /> {r.mandal || r.ward_id?.mandal_id?.name || selectedMandal || 'West Godavari'}
        </button>
      ),
    },
    {
      header: 'Location & GPS',
      cell: (r) => (
        <div className="text-xs space-y-0.5">
          <p className="text-slate-700 dark:text-gray-300 truncate max-w-[140px]">{r.location || 'Bin Site'}</p>
          {r.latitude && r.longitude ? (
            <a
              href={`https://www.openstreetmap.org/?mlat=${r.latitude}&mlon=${r.longitude}#map=16/${r.latitude}/${r.longitude}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-emerald-600 hover:underline flex items-center gap-0.5 font-bold font-mono"
            >
              OSM Pin ({Number(r.latitude).toFixed(3)}, {Number(r.longitude).toFixed(3)}) <ExternalLink size={9} />
            </a>
          ) : (
            <span className="text-[10px] text-slate-400">Stationary Site</span>
          )}
        </div>
      ),
    },
    {
      header: 'Assigned Collector',
      accessor: 'collector_name',
      cell: (r) => <span className="font-bold text-slate-800 dark:text-gray-200">{r.collector_name || 'Sanitation Worker'}</span>,
    },
    {
      header: 'Waste Cleared',
      accessor: 'waste_kg',
      cell: (r) => <span className="font-black text-slate-900 dark:text-white">{r.waste_kg} kg</span>,
    },
    {
      header: 'Fill Level',
      accessor: 'fill_level',
      cell: (r) => (
        <span className={`font-bold ${r.fill_level >= 100 ? 'text-rose-600' : r.fill_level >= 80 ? 'text-orange-500' : 'text-emerald-600'}`}>
          {r.fill_level}%
        </span>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      cell: (r) => <span className={statusBadge(r.status)}>{r.status}</span>,
    },
    {
      header: 'Logged Time',
      accessor: 'timestamp',
      cell: (r) => <span className="text-slate-500 text-xs">{fmt.datetime(r.timestamp)}</span>,
    },
    {
      header: 'Verification Audit',
      cell: (r) =>
        r.verified ? (
          <span className="inline-flex items-center gap-1 text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
            <CheckCircle2 size={13} /> Verified
          </span>
        ) : (
          <button
            onClick={() => handleVerify(r._id)}
            className="btn-secondary text-[11px] py-1 px-2.5 font-bold hover:bg-emerald-50"
          >
            Verify Round
          </button>
        ),
    },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header with District Badge & Mandals Link */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
              West Godavari District
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2 tracking-tight">
            <ClipboardList size={22} className="text-emerald-600" /> Waste Collection Records ({total} Logged Rounds)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor real-time sanitation submissions, waste volumes, and verify supervisor audits across West Godavari District.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/mandals')}
            className="btn-secondary text-xs py-2 px-3 border-emerald-300 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5"
          >
            <Building2 size={14} className="text-emerald-600" /> 19 Mandals Hub <ArrowUpRight size={12} />
          </button>
        </div>
      </div>

      {/* 19 Mandals Fast Filter Toolbar */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-slate-100 dark:border-gray-800 p-3.5 shadow-sm space-y-2.5">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin text-xs">
          <span className="text-[10px] font-extrabold text-slate-400 dark:text-gray-500 uppercase tracking-wider whitespace-nowrap flex-shrink-0 mr-1">
            Filter by Mandal:
          </span>

          <button
            onClick={() => handleMandalFilterChange('')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
              !selectedMandal
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            All 19 Mandals
          </button>

          {ALL_19_MANDALS.map((mName) => (
            <button
              key={mName}
              onClick={() => handleMandalFilterChange(mName)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                selectedMandal?.toLowerCase() === mName.toLowerCase()
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm ring-2 ring-emerald-400/40'
                  : 'bg-slate-100 hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {mName}
            </button>
          ))}
        </div>

        {selectedMandal && (
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center justify-between gap-3 text-xs">
            <span className="text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Showing Collection Records in: <strong>{selectedMandal} Mandal</strong> ({total} Records Logged)
            </span>
            <button
              onClick={() => handleMandalFilterChange('')}
              className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline"
            >
              ✕ Clear Filter
            </button>
          </div>
        )}
      </div>

      <DataTable
        columns={columns}
        data={displayCollections}
        total={total}
        page={page}
        pages={pages}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Photo Lightbox Modal */}
      {previewImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-3xl p-4 max-w-lg w-full shadow-2xl relative space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-gray-800">
              <span className="font-bold text-xs text-slate-800 dark:text-white flex items-center gap-1.5">
                <Camera size={14} className="text-emerald-600" /> Collection Verification Photo Proof
              </span>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500"
              >
                <X size={18} />
              </button>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black/5 max-h-[70vh] flex items-center justify-center">
              <img src={previewImage} alt="Verification Photo" className="w-full h-auto max-h-[70vh] object-contain" />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
