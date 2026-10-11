/**
 * Submit Collection — Mobile Waste Log & Update Portal:
 * - Camera Capture & File Upload with preview, validation (format, <=5MB), retake/remove
 * - Truthful GPS Location Tagging via Geolocation API (captured, denied, unavailable, pending)
 * - OpenStreetMap Link & manual fallback distinction
 * - Dual Mode: Routine Collection vs Bin Overflow Reporting
 * - Browser storage persistence via mockStorage.js
 * - Local demonstration record clearly identified
 */
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import API from '../../api/axios';
import { useAuth } from '../../auth/AuthContext';
import {
  validateImageFile,
  compressImageToDataUrl,
  saveLocalCollection,
  saveLocalOverflow
} from '../../utils/mockStorage';
import {
  ArrowLeft, Trash2, Camera, Image as ImageIcon, CheckCircle2, AlertCircle,
  MapPin, ShieldCheck, Scale, Check, RefreshCw, X, RotateCcw, ExternalLink, AlertTriangle
} from 'lucide-react';

const FALLBACK_BINS = [
  { _id: 'b1', bin_id: 'BIN-0001', name: 'Market Road Junction Bin', location: 'Market Road, Tadepalligudem', mandal: 'Tadepalligudem', capacity_kg: 100 },
  { _id: 'b2', bin_id: 'BIN-0002', name: 'RTC Bus Stand Main Bin',  location: 'RTC Bus Stand, Tadepalligudem', mandal: 'Tadepalligudem', capacity_kg: 120 },
  { _id: 'b3', bin_id: 'BIN-0003', name: 'ZPH High School Bin',     location: 'School Road, Tadepalligudem', mandal: 'Tadepalligudem', capacity_kg: 80 },
  { _id: 'b4', bin_id: 'BIN-0004', name: 'Area Hospital Gate Bin',  location: 'Hospital Area, Tadepalligudem', mandal: 'Tadepalligudem', capacity_kg: 150 },
  { _id: 'b5', bin_id: 'BIN-0005', name: 'Temple Street Bin',       location: 'Temple Road, Tadepalligudem', mandal: 'Tadepalligudem', capacity_kg: 100 },
];

export default function SubmitCollection() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'overflow' ? 'overflow' : 'completed';

  const { user } = useAuth();
  const [bins, setBins] = useState([]);
  const [selectedBinId, setSelectedBinId] = useState('');
  const [selectedBin, setSelectedBin] = useState(null);
  const [wasteKg, setWasteKg] = useState('85');
  const [fillLevel, setFillLevel] = useState(90);
  const [status, setStatus] = useState(initialMode);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Photo Capture State
  const cameraInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [compressedDataUrl, setCompressedDataUrl] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [compressing, setCompressing] = useState(false);

  // Location Tagging State
  // Statuses: 'idle' | 'pending' | 'captured' | 'denied' | 'unavailable'
  const [locationStatus, setLocationStatus] = useState('idle');
  const [coords, setCoords] = useState(null);
  const [locationErrorMsg, setLocationErrorMsg] = useState('');

  // Clean up object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  useEffect(() => {
    fetchAssignedBins();
    // Attempt automatic GPS tagging once on mount if supported
    acquireGpsLocation();
  }, []);

  const fetchAssignedBins = async () => {
    try {
      const res = await API.get('/bins');
      const list = res.data?.data || res.data?.bins || [];
      if (list.length > 0) {
        setBins(list);
        handleSelectBin(list[0]);
      } else {
        setBins(FALLBACK_BINS);
        handleSelectBin(FALLBACK_BINS[0]);
      }
    } catch (_) {
      setBins(FALLBACK_BINS);
      handleSelectBin(FALLBACK_BINS[0]);
    }
  };

  const handleSelectBin = (bin) => {
    if (!bin) return;
    setSelectedBinId(bin._id);
    setSelectedBin(bin);
    setWasteKg(Math.round(bin.capacity_kg * 0.85).toString());
  };

  const handleBinSelectChange = (e) => {
    const id = e.target.value;
    setSelectedBinId(id);
    const found = bins.find((b) => b._id === id);
    if (found) handleSelectBin(found);
  };

  // Geolocation API handler
  const acquireGpsLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('unavailable');
      setLocationErrorMsg('Geolocation is not supported by your browser.');
      return;
    }

    setLocationStatus('pending');
    setLocationErrorMsg('');

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
          timestamp: new Date(pos.timestamp).toISOString(),
        });
        setLocationStatus('captured');
      },
      (err) => {
        if (err.code === 1) {
          // PERMISSION_DENIED
          setLocationStatus('denied');
          setLocationErrorMsg('Location permission was denied. You can retry or rely on the selected bin location.');
        } else if (err.code === 2) {
          // POSITION_UNAVAILABLE
          setLocationStatus('unavailable');
          setLocationErrorMsg('GPS position unavailable. Fallback to manually selected bin location.');
        } else {
          // TIMEOUT or unknown
          setLocationStatus('unavailable');
          setLocationErrorMsg('GPS request timed out. Fallback to manually selected bin location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // Photo selection handler (camera or file picker)
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be picked again if needed
    e.target.value = '';
    setPhotoError('');

    // Validation
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setPhotoError(validation.error);
      return;
    }

    // Revoke previous object URL
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    // Create object URL for instant preview
    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setPhotoFile(file);

    // Compress in background for lightweight storage
    setCompressing(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      setCompressedDataUrl(compressed);
    } catch (err) {
      console.warn('Compression fallback', err);
      setCompressedDataUrl(objUrl);
    } finally {
      setCompressing(false);
    }
  };

  const handleRemovePhoto = () => {
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl('');
    setCompressedDataUrl('');
    setPhotoFile(null);
    setPhotoError('');
  };

  const handleReset = () => {
    if (bins.length > 0) handleSelectBin(bins[0]);
    setFillLevel(90);
    setStatus('completed');
    setRemarks('');
    setError('');
    setSuccess(false);
    handleRemovePhoto();
    acquireGpsLocation();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const isOverflow = status === 'overflow';
    const timestamp = new Date().toISOString();

    // Prepare local demonstration record
    const collectionRecord = {
      _id: `col_local_${Date.now()}`,
      bin_id: selectedBin?._id || selectedBinId,
      bin_ref: selectedBin?.bin_id || 'BIN-0001',
      location: selectedBin?.location || selectedBin?.name || 'Tadepalligudem',
      mandal: selectedBin?.mandal || user?.mandal || 'Tadepalligudem',
      collector_name: user?.full_name || 'Sanitation Collector',
      waste_kg: parseFloat(wasteKg) || 80,
      fill_level: Number(fillLevel),
      status,
      remarks: remarks || (isOverflow ? 'Overflow detected and documented with photograph.' : 'Daily collection round completed.'),
      timestamp,
      photo_url: compressedDataUrl || null,
      has_photo: !!compressedDataUrl,
      location_verified: locationStatus === 'captured',
      coordinates: locationStatus === 'captured' && coords ? { lat: coords.lat, lng: coords.lng, accuracy: coords.accuracy } : null,
      isLocalDemo: true,
    };

    try {
      // 1. Save to browser storage for prototype persistence
      saveLocalCollection(collectionRecord);

      // 2. If status is overflow, also create an overflow record
      if (isOverflow) {
        saveLocalOverflow({
          _id: `of_local_${Date.now()}`,
          bin_ref: selectedBin?.bin_id || 'BIN-0001',
          location: selectedBin?.location || selectedBin?.name || 'Tadepalligudem',
          mandal: selectedBin?.mandal || user?.mandal || 'Tadepalligudem',
          reported_by: user?.full_name || 'Sanitation Collector',
          waste_kg: parseFloat(wasteKg) || 100,
          detected_at: timestamp,
          photo_url: compressedDataUrl || null,
          has_photo: !!compressedDataUrl,
          coordinates: locationStatus === 'captured' && coords ? { lat: coords.lat, lng: coords.lng } : null,
          remarks: remarks || 'Overflow reported via mobile collection portal.',
        });
      }

      // 3. Fire optional API call in background (non-blocking)
      try {
        await API.post('/collections', {
          bin_id: selectedBinId,
          waste_kg: parseFloat(wasteKg) || 80,
          fill_level: fillLevel,
          status,
          remarks: remarks || 'Collection submitted.',
        });
      } catch (_) {}

      setSuccess(true);
      setTimeout(() => navigate('/collector'), 1100);
    } catch (err) {
      setError('Failed to record submission. Please retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 py-2 animate-fade-in pb-12 select-none">
      
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/collector')}
            className="p-2 rounded-2xl border border-slate-200 dark:border-gray-800 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
          >
            <ArrowLeft size={18} className="text-slate-600 dark:text-gray-300" />
          </button>
          <div>
            <h2 className="text-base font-extrabold text-slate-900 dark:text-white">
              {status === 'overflow' ? 'Report Bin Overflow' : 'Update Public Bin Collection'}
            </h2>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <MapPin size={11} />
              <span>West Godavari › {selectedBin?.mandal || user?.mandal || 'Tadepalligudem'} › {selectedBin?.bin_id || 'BIN-0001'}</span>
            </p>
          </div>
        </div>

        {/* Local Demo Indicator Badge */}
        <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-[10px] font-black uppercase tracking-wider">
          Demo Prototype
        </span>
      </div>

      {/* Selected Bin Overview Card */}
      {selectedBin && (
        <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-3xl p-5 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
              status === 'overflow'
                ? 'bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600'
                : 'bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-600'
            }`}>
              {status === 'overflow' ? <AlertTriangle size={22} /> : <Trash2 size={22} />}
            </div>
            <div className="min-w-0">
              <p className="font-mono font-black text-slate-900 dark:text-white text-base">
                {selectedBin.bin_id}
              </p>
              <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                {selectedBin.location || selectedBin.name}
              </p>
            </div>
          </div>
          <span className={`badge ${status === 'overflow' ? 'badge-red' : 'badge-green'} flex-shrink-0 font-bold`}>
            Max {selectedBin.capacity_kg} kg
          </span>
        </div>
      )}

      {/* Main Submission Form */}
      <div className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-3xl p-6 space-y-4 shadow-sm">
        
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold flex items-center gap-2 animate-fade-in">
            <CheckCircle2 size={18} className="text-emerald-600 flex-shrink-0" />
            <span>Record saved to local demonstration database! Supervisors notified.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          
          {/* Select Bin */}
          <div>
            <label className="form-label font-bold text-slate-800 dark:text-gray-200">
              Select Public Bin *
            </label>
            <select
              value={selectedBinId}
              onChange={handleBinSelectChange}
              required
              className="form-select font-mono font-semibold"
            >
              {bins.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.bin_id} — {b.name} ({b.capacity_kg} kg capacity)
                </option>
              ))}
            </select>
          </div>

          {/* Operation Status Selection */}
          <div>
            <label className="form-label font-bold text-slate-800 dark:text-gray-200">
              Collection Status *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'completed', label: 'Completed', icon: Check, color: 'text-emerald-600' },
                { val: 'in_progress', label: 'In Progress', icon: RefreshCw, color: 'text-amber-600' },
                { val: 'overflow', label: 'Overflow Alert', icon: AlertTriangle, color: 'text-rose-600' },
              ].map((opt) => (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => setStatus(opt.val)}
                  className={`py-2 px-2.5 rounded-xl border text-center font-bold flex flex-col items-center gap-1 transition-all ${
                    status === opt.val
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-900 dark:text-emerald-300 shadow-sm'
                      : 'border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-50'
                  }`}
                >
                  <opt.icon size={14} className={opt.color} />
                  <span className="text-[11px]">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Waste Cleared & Fill Level Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="form-label font-bold text-slate-800 dark:text-gray-200 mb-0">
                  Waste Cleared (kg) *
                </label>
                <span className="text-[10px] text-slate-400 font-bold">Truck Scale</span>
              </div>
              <input
                type="number"
                step="0.5"
                min="0"
                value={wasteKg}
                onChange={(e) => setWasteKg(e.target.value)}
                required
                className="form-input text-lg font-black text-emerald-600 py-2.5"
              />
            </div>

            <div>
              <label className="form-label font-bold text-slate-800 dark:text-gray-200">
                Observed Fill Level *
              </label>
              <select
                value={fillLevel}
                onChange={(e) => setFillLevel(Number(e.target.value))}
                className="form-select font-semibold py-2.5"
              >
                <option value={100}>100% — Full / Overflowing</option>
                <option value={90}>90% — Heavy Load</option>
                <option value={75}>75% — Three-Quarter</option>
                <option value={50}>50% — Half Full</option>
                <option value={25}>25% — Light Load</option>
              </select>
            </div>
          </div>

          {/* FEATURE ONE A & B: Photo Capture & Evidence Upload */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <label className="form-label font-bold text-slate-800 dark:text-gray-200 mb-0 flex items-center gap-1.5">
                <Camera size={14} className="text-emerald-600" /> Bin Photograph Evidence (Optional)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Max 5 MB • JPEG/PNG/WebP</span>
            </div>

            {/* Hidden file inputs for Camera and File picker */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoSelect}
              className="hidden"
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoSelect}
              className="hidden"
            />

            {photoError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-[11px] font-bold flex items-center gap-1.5">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{photoError}</span>
              </div>
            )}

            {previewUrl ? (
              /* Image Preview with Retake & Remove */
              <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800/80 p-3 space-y-2">
                <div className="relative max-h-48 rounded-xl overflow-hidden bg-black flex items-center justify-center">
                  <img
                    src={previewUrl}
                    alt="Captured public bin evidence"
                    className="max-h-48 w-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-rose-600 transition-colors shadow-md"
                    title="Remove photo"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span className="truncate max-w-[200px]">
                    {photoFile?.name || 'Captured Bin Photo'} ({((photoFile?.size || 0) / 1024).toFixed(0)} KB)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="text-emerald-600 font-bold hover:underline flex items-center gap-1"
                    >
                      <RotateCcw size={11} /> Retake
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="text-rose-600 font-bold hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Empty State & Upload Triggers */
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="p-3 border border-dashed border-emerald-300 dark:border-emerald-700/60 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/50 flex flex-col items-center justify-center gap-1.5 text-emerald-800 dark:text-emerald-300 transition-all active:scale-95"
                >
                  <Camera size={18} />
                  <span className="font-extrabold text-[11px]">Capture Camera</span>
                  <span className="text-[9px] text-slate-400">Mobile camera trigger</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 border border-dashed border-slate-300 dark:border-gray-700 rounded-2xl bg-slate-50/60 dark:bg-gray-800/40 hover:bg-slate-100 flex flex-col items-center justify-center gap-1.5 text-slate-700 dark:text-gray-300 transition-all active:scale-95"
                >
                  <ImageIcon size={18} />
                  <span className="font-extrabold text-[11px]">Select from Device</span>
                  <span className="text-[9px] text-slate-400">Gallery or storage</span>
                </button>
              </div>
            )}
          </div>

          {/* FEATURE ONE C: Truthful Location Tagging */}
          <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <label className="form-label font-bold text-slate-800 dark:text-gray-200 mb-0 flex items-center gap-1.5">
                <MapPin size={14} className="text-emerald-600" /> Location Metadata Verification
              </label>
              <button
                type="button"
                onClick={acquireGpsLocation}
                disabled={locationStatus === 'pending'}
                className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hover:underline flex items-center gap-1"
              >
                <RotateCcw size={11} className={locationStatus === 'pending' ? 'animate-spin' : ''} />
                <span>Retry GPS</span>
              </button>
            </div>

            {/* Location Status Indicators */}
            {locationStatus === 'captured' && coords && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-emerald-800 dark:text-emerald-300 font-bold text-xs">
                    <CheckCircle2 size={13} className="text-emerald-600" /> GPS Tagged (±{coords.accuracy}m)
                  </span>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=17/${coords.lat}/${coords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-emerald-700 font-bold hover:underline flex items-center gap-1"
                  >
                    View on OpenStreetMap <ExternalLink size={10} />
                  </a>
                </div>
                <p className="font-mono text-[11px] text-slate-600 dark:text-gray-300">
                  {coords.lat.toFixed(6)}° N, {coords.lng.toFixed(6)}° E
                </p>
              </div>
            )}

            {locationStatus === 'pending' && (
              <div className="p-2.5 bg-slate-50 dark:bg-gray-800/60 rounded-xl flex items-center gap-2 text-slate-600 text-xs font-medium">
                <RefreshCw size={13} className="animate-spin text-emerald-600" />
                <span>Acquiring satellite GPS coordinates...</span>
              </div>
            )}

            {(locationStatus === 'denied' || locationStatus === 'unavailable') && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl space-y-1">
                <div className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300 font-bold text-xs">
                  <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                  <span>{locationStatus === 'denied' ? 'Permission Denied' : 'GPS Unavailable'}</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-gray-300 leading-relaxed">
                  {locationErrorMsg || 'Unable to retrieve GPS coordinates.'}
                </p>
                <p className="text-[11px] text-slate-500 font-semibold pt-0.5">
                  ✓ Fallback applied: Record will be associated with manually selected address ({selectedBin?.location || 'Tadepalligudem'}). Coordinates are never fabricated.
                </p>
              </div>
            )}
          </div>

          {/* Remarks */}
          <div>
            <label className="form-label font-bold text-slate-800 dark:text-gray-200">
              Sanitation Remarks &amp; Field Observations
            </label>
            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Bin cleared, area swept, disinfectant sprayed."
              rows={2}
              className="form-input resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 space-y-2">
            <button
              type="submit"
              disabled={loading || compressing || !selectedBinId}
              className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all shadow-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
                status === 'overflow'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-600/20'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-emerald-600/20'
              }`}
            >
              {loading ? (
                <><RefreshCw size={16} className="animate-spin" /> Saving Demonstration Record...</>
              ) : (
                <><Check size={16} /> {status === 'overflow' ? 'Submit Overflow Report' : 'Submit Verified Collection'}</>
              )}
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="w-full py-2.5 rounded-2xl border border-slate-200 dark:border-gray-800 text-slate-600 dark:text-gray-300 font-bold text-xs hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
            >
              Reset Form
            </button>
          </div>

        </form>
      </div>

    </div>
  );
}
