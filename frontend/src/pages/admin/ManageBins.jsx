/**
 * Manage Public Bins — Full 19-Mandal Public Bin Monitoring:
 * - 19 Mandals fast filter pills
 * - URL parameter support (?mandal=...)
 * - Direct deep link to /admin/mandals
 * - Add/Edit Bin modal with intelligent prompts
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../../api/axios';
import DataTable from '../../components/ui/DataTable';
import Modal from '../../components/ui/Modal';
import ExcelImport from '../../components/ui/ExcelImport';
import { statusBadge } from '../../utils/formatters';
import {
  Trash2, Plus, Download, Edit3, Trash, Upload,
  Building2, ArrowUpRight, Filter, RotateCcw, MapPin
} from 'lucide-react';

const FALLBACK_BINS = [
  { _id: 'b1',  bin_id: 'BIN-0001', name: 'Market Road Bin',         mandal: 'Tadepalligudem', location: 'Market Road, Tadepalligudem', capacity_kg: 100, status: 'active' },
  { _id: 'b2',  bin_id: 'BIN-0002', name: 'Bus Stand Main Bin',      mandal: 'Tadepalligudem', location: 'Bus Stand, Tadepalligudem', capacity_kg: 120, status: 'active' },
  { _id: 'b3',  bin_id: 'BIN-0003', name: 'School Road Bin',         mandal: 'Tadepalligudem', location: 'School Road, Tadepalligudem', capacity_kg: 80,  status: 'active' },
  { _id: 'b4',  bin_id: 'BIN-0004', name: 'Hospital Area Bin',       mandal: 'Tadepalligudem', location: 'Hospital Area, Tadepalligudem', capacity_kg: 150, status: 'active' },
  { _id: 'b5',  bin_id: 'BIN-0005', name: 'Temple Road Bin',         mandal: 'Tadepalligudem', location: 'Temple Road, Tadepalligudem', capacity_kg: 100, status: 'active' },
  { _id: 'b6',  bin_id: 'BIN-0006', name: 'Railway Station Bin',     mandal: 'Bhimavaram',     location: 'Railway Station, Bhimavaram', capacity_kg: 200, status: 'active' },
  { _id: 'b7',  bin_id: 'BIN-0007', name: 'Main Bazaar Bin',         mandal: 'Nidadavole',     location: 'Main Bazaar, Nidadavole', capacity_kg: 150, status: 'active' },
  { _id: 'b8',  bin_id: 'BIN-0008', name: 'Municipal Park Bin',      mandal: 'Eluru',          location: 'Municipal Park, Eluru', capacity_kg: 80,  status: 'active' },
  { _id: 'b9',  bin_id: 'BIN-0009', name: 'Industrial Gate Bin',     mandal: 'Tanuku',         location: 'Industrial Gate, Tanuku', capacity_kg: 200, status: 'active' },
  { _id: 'b10', bin_id: 'BIN-0010', name: 'Residential Block A Bin', mandal: 'Palakol',        location: 'Residential Block A, Palakol', capacity_kg: 100, status: 'active' },
  { _id: 'b11', bin_id: 'BIN-0011', name: 'Weekly Market Yard Bin', mandal: 'Kovvur',         location: 'Market Yard, Kovvur', capacity_kg: 180, status: 'active' },
  { _id: 'b12', bin_id: 'BIN-0012', name: 'River Bank Road Bin',    mandal: 'Rajam',          location: 'River Bank, Rajam', capacity_kg: 120, status: 'active' },
  { _id: 'b13', bin_id: 'BIN-0013', name: 'High School Junction Bin', mandal: 'Undi',         location: 'High School, Undi', capacity_kg: 100, status: 'active' },
  { _id: 'b14', bin_id: 'BIN-0014', name: 'Panchayat Office Bin',   mandal: 'Akividu',        location: 'Panchayat Office, Akividu', capacity_kg: 90,  status: 'active' },
  { _id: 'b15', bin_id: 'BIN-0015', name: 'RTC Depot North Bin',    mandal: 'Narasapuram',    location: 'RTC Depot, Narasapuram', capacity_kg: 160, status: 'active' },
];

const ALL_19_MANDALS = [
  'Tadepalligudem', 'Bhimavaram', 'Palakol', 'Narasapuram', 'Tanuku',
  'Eluru', 'Nidadavole', 'Kovvur', 'Jangareddigudem', 'Attili',
  'Akividu', 'Undi', 'Ganapavaram', 'Peravali', 'Unguturu',
  'Polavaram', 'Denduluru', 'Rajam', 'Pedapadu'
];

export default function ManageBins() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const mandalParam = searchParams.get('mandal');

  const [bins, setBins] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingBin, setEditingBin] = useState(null);

  // Filter options
  const [mandals, setMandals] = useState([]);
  const [wards, setWards] = useState([]);
  const [selectedMandal, setSelectedMandal] = useState(mandalParam || '');
  const [selectedWard, setSelectedWard] = useState('');

  // Form state
  const [form, setForm] = useState({
    bin_id: '', name: '', capacity_kg: 100, district_id: '', mandal_id: '', ward_id: '', location: ''
  });
  const [districts, setDistricts] = useState([]);

  useEffect(() => {
    fetchMandals();
    fetchDistricts();
  }, []);

  useEffect(() => {
    if (mandalParam) {
      setSelectedMandal(mandalParam);
    }
  }, [mandalParam]);

  useEffect(() => {
    fetchBins();
  }, [page, selectedMandal, selectedWard]);

  const fetchDistricts = async () => {
    try {
      const res = await API.get('/districts');
      setDistricts(res.data || []);
      if (res.data.length > 0) {
        setForm(f => ({ ...f, district_id: res.data[0]._id }));
      }
    } catch (_) {}
  };

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

  const fetchWards = async (mId) => {
    if (!mId) { setWards([]); return; }
    try {
      const res = await API.get(`/wards?mandal_id=${encodeURIComponent(mId)}`);
      setWards(res.data || []);
    } catch (_) {}
  };

  const handleMandalFilterChange = (mId) => {
    setSelectedMandal(mId);
    setSelectedWard('');
    fetchWards(mId);
  };

  const fetchBins = async () => {
    setLoading(true);
    try {
      let url = `/bins?page=${page}&limit=10`;
      if (selectedMandal) url += `&mandal_id=${encodeURIComponent(selectedMandal)}`;
      if (selectedWard) url += `&ward_id=${encodeURIComponent(selectedWard)}`;
      const res = await API.get(url);
      if (res.data && Array.isArray(res.data.bins)) {
        setBins(res.data.bins);
        setTotal(res.data.total || res.data.bins.length);
        setPages(res.data.pages || 1);
      } else {
        const filtered = selectedMandal
          ? FALLBACK_BINS.filter(b => b.mandal?.toLowerCase() === selectedMandal.toLowerCase() || b.location?.toLowerCase().includes(selectedMandal.toLowerCase()))
          : FALLBACK_BINS;
        setBins(filtered);
        setTotal(filtered.length);
        setPages(1);
      }
    } catch (_) {
      const filtered = selectedMandal
        ? FALLBACK_BINS.filter(b => b.mandal?.toLowerCase() === selectedMandal.toLowerCase() || b.location?.toLowerCase().includes(selectedMandal.toLowerCase()))
        : FALLBACK_BINS;
      setBins(filtered);
      setTotal(filtered.length);
      setPages(1);
    }
    setLoading(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingBin) {
        await API.put(`/bins/${editingBin._id}`, form);
      } else {
        await API.post('/bins', form);
      }
      setShowAddModal(false);
      setEditingBin(null);
      fetchBins();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save public bin');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this public bin?')) return;
    try {
      await API.delete(`/bins/${id}`);
      fetchBins();
    } catch (_) {}
  };

  const displayBins = bins.length > 0 ? bins : FALLBACK_BINS;

  const columns = [
    { header: 'Bin ID', accessor: 'bin_id', cell: (r) => <span className="font-mono font-bold text-emerald-600">{r.bin_id}</span> },
    { header: 'Unit Name', accessor: 'name', cell: (r) => <span className="font-bold text-slate-900 dark:text-white">{r.name}</span> },
    { header: 'Location', accessor: 'location', cell: (r) => <span className="font-medium text-slate-600 dark:text-gray-300">{r.location}</span> },
    { header: 'Capacity', accessor: 'capacity_kg', cell: (r) => <span className="font-bold text-slate-800 dark:text-gray-200">{r.capacity_kg} kg</span> },
    { header: 'Status', accessor: 'status', cell: (r) => <span className={statusBadge(r.status)}>{r.status}</span> },
    {
      header: 'Actions',
      cell: (r) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => { setEditingBin(r); setForm(r); setShowAddModal(true); }}
            className="p-1.5 rounded-lg border hover:bg-gray-100 text-gray-600 dark:hover:bg-gray-800"
            title="Edit bin"
          >
            <Edit3 size={14} />
          </button>
          <button
            onClick={() => handleDelete(r._id)}
            className="p-1.5 rounded-lg border border-red-100 hover:bg-red-50 text-red-600 dark:border-red-900/30 dark:hover:bg-red-900/20"
            title="Delete bin"
          >
            <Trash size={14} />
          </button>
        </div>
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
            <Trash2 size={22} className="text-emerald-600" /> Manage Public Bins ({total} Monitored Units)
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View, add, edit, delete, and monitor public bins across West Godavari District.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/admin/mandals')}
            className="btn-secondary text-xs py-2 px-3 border-emerald-300 text-emerald-700 dark:text-emerald-400 font-bold flex items-center gap-1.5"
          >
            <Building2 size={14} className="text-emerald-600" /> 19 Mandals Hub <ArrowUpRight size={12} />
          </button>
          <button onClick={() => setShowImportModal(true)} className="btn-secondary text-xs py-2">
            <Upload size={14} /> Import Excel
          </button>
          <button
            onClick={() => {
              setEditingBin(null);
              setForm({ bin_id: '', name: '', capacity_kg: 100, district_id: districts[0]?._id || '', mandal_id: '', ward_id: '', location: '' });
              setShowAddModal(true);
            }}
            className="btn-primary text-xs py-2 shadow-md shadow-emerald-600/20"
          >
            <Plus size={14} /> Add Public Bin
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
              Showing Public Bins in: <strong>{selectedMandal} Mandal</strong> ({total} Units Monitored)
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
        data={displayBins}
        total={total}
        page={page}
        pages={pages}
        onPageChange={(p) => setPage(p)}
        loading={loading}
      />

      {/* Add/Edit Bin Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={editingBin ? 'Edit Public Bin' : 'Add Public Bin'}>
        <form onSubmit={handleSave} className="space-y-4 text-xs">
          <div>
            <label className="form-label font-bold text-slate-700 dark:text-gray-300">Bin Identification Code *</label>
            <input
              type="text"
              value={form.bin_id}
              onChange={(e) => setForm({ ...form, bin_id: e.target.value })}
              required
              placeholder="e.g. BIN-0024"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label font-bold text-slate-700 dark:text-gray-300">Public Bin Location Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              placeholder="e.g. Bus Stand Junction Bin"
              className="form-input"
            />
          </div>
          <div>
            <label className="form-label font-bold text-slate-700 dark:text-gray-300">Detailed Landmark / Street</label>
            <input
              type="text"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              placeholder="e.g. Near Clock Tower, Main Road"
              className="form-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label font-bold text-slate-700 dark:text-gray-300">Capacity (kg) *</label>
              <input
                type="number"
                value={form.capacity_kg}
                onChange={(e) => setForm({ ...form, capacity_kg: Number(e.target.value) })}
                required
                className="form-input"
              />
            </div>
            <div>
              <label className="form-label font-bold text-slate-700 dark:text-gray-300">Select Mandal *</label>
              <select
                value={form.mandal_id}
                onChange={(e) => {
                  setForm({ ...form, mandal_id: e.target.value });
                  fetchWards(e.target.value);
                }}
                className="form-select"
              >
                <option value="">Select Mandal</option>
                {mandals.map((m) => (
                  <option key={m._id} value={m._id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">Save Public Bin</button>
          </div>
        </form>
      </Modal>

      {/* Excel Import Modal */}
      <Modal isOpen={showImportModal} onClose={() => setShowImportModal(false)} title="Import Public Bins from Excel">
        <ExcelImport endpoint="/bins/import" onSuccess={() => { setShowImportModal(false); fetchBins(); }} />
      </Modal>

    </div>
  );
}
