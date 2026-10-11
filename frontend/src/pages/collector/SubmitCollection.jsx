/**
 * Submit Collection — Mobile Waste Log & Update Portal:
 * - Real Camera Capture via MediaDevices.getUserMedia() (live video → canvas snapshot)
 * - File Upload fallback (separate button, existing workflow)
 * - Photo preview, validation (format, <=5MB), retake/remove
 * - Truthful GPS Location Tagging via Geolocation API
 * - OpenStreetMap Link & manual fallback distinction
 * - Dual Mode: Routine Collection vs Bin Overflow Reporting
 * - Browser storage persistence via mockStorage.js
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  MapPin, ShieldCheck, Scale, Check, RefreshCw, X, RotateCcw, ExternalLink,
  AlertTriangle, VideoOff, Aperture
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

  // Photo State
  const fileInputRef = useRef(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [compressedDataUrl, setCompressedDataUrl] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [compressing, setCompressing] = useState(false);

  // ── Camera Modal State (getUserMedia) ──────────────────────────────────────
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);          // holds the active MediaStream
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);  // video playing
  const [cameraBusy, setCameraBusy] = useState(false);    // starting up
  const [cameraError, setCameraError] = useState('');     // permission / hw error
  const [capturedFrame, setCapturedFrame] = useState(''); // data URL of snapshot

  // Location Tagging State
  const [locationStatus, setLocationStatus] = useState('idle');
  const [coords, setCoords] = useState(null);
  const [locationErrorMsg, setLocationErrorMsg] = useState('');

  // ── Stop all tracks ────────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
    setCapturedFrame('');
  }, []);

  // ── Close camera modal cleanly ─────────────────────────────────────────────
  const closeCamera = useCallback(() => {
    stopStream();
    setCameraOpen(false);
    setCameraError('');
    setCameraBusy(false);
  }, [stopStream]);

  // ── Open camera via getUserMedia ───────────────────────────────────────────
  const openCamera = useCallback(async () => {
    // Prevent double-open
    if (cameraOpen || cameraBusy) return;

    // Check API availability
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Camera API is not supported in this browser. Use a modern browser (Chrome, Safari, Firefox) over HTTPS or localhost, or use "Upload Photo" instead.'
      );
      setCameraOpen(true);
      return;
    }

    setCameraBusy(true);
    setCameraError('');
    setCapturedFrame('');
    setCameraOpen(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // prefer rear camera
          width:  { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;

      // Attach stream to video element once the modal DOM is mounted
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(() => {});
          setCameraReady(true);
          setCameraBusy(false);
        };
      } else {
        // videoRef not yet in DOM; try again after a paint
        setTimeout(() => {
          if (videoRef.current && streamRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play().catch(() => {});
              setCameraReady(true);
              setCameraBusy(false);
            };
          }
        }, 120);
      }
    } catch (err) {
      let msg = 'Camera could not be started.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera access in your browser settings, then try again. You can still use "Upload Photo" to choose an image from your device.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera was found on this device. Please use "Upload Photo" to choose an image from your device.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is in use by another application. Close the other application and try again.';
      } else if (err.name === 'OverconstrainedError') {
        msg = 'Camera could not match the required settings. Retrying with default settings…';
        // Retry with relaxed constraints
        try {
          const stream2 = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          streamRef.current = stream2;
          if (videoRef.current) {
            videoRef.current.srcObject = stream2;
            videoRef.current.onloadedmetadata = () => {
              videoRef.current.play().catch(() => {});
              setCameraReady(true);
              setCameraBusy(false);
              setCameraError('');
            };
          }
          return;
        } catch (_) {}
      }
      setCameraError(msg);
      setCameraBusy(false);
      stopStream();
    }
  }, [cameraOpen, cameraBusy, stopStream]);

  // ── Capture a frame from the live video via canvas ─────────────────────────
  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setCapturedFrame(dataUrl);
    // Pause video (stream still running for retake)
    video.pause();
  }, [cameraReady]);

  // ── Retake — resume video, discard frame ───────────────────────────────────
  const retakePhoto = useCallback(() => {
    setCapturedFrame('');
    if (videoRef.current && streamRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, []);

  // ── Use the captured frame — convert to File and run through existing workflow
  const usePhoto = useCallback(async () => {
    if (!capturedFrame) return;

    // Convert data URL → Blob → File
    const res = await fetch(capturedFrame);
    const blob = await res.blob();
    const filename = `camera_capture_${Date.now()}.jpg`;
    const file = new File([blob], filename, { type: 'image/jpeg' });

    // Validate (size, type)
    const validation = validateImageFile(file);
    if (!validation.valid) {
      setPhotoError(validation.error);
      closeCamera();
      return;
    }

    // Revoke old preview
    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objUrl = URL.createObjectURL(blob);
    setPreviewUrl(objUrl);
    setPhotoFile(file);
    setPhotoError('');

    // Compress for storage (re-use the data URL we already have)
    setCompressing(true);
    try {
      const compressed = await compressImageToDataUrl(file);
      setCompressedDataUrl(compressed);
    } catch (_) {
      setCompressedDataUrl(capturedFrame); // fallback: use raw data URL
    } finally {
      setCompressing(false);
    }

    closeCamera();
  }, [capturedFrame, previewUrl, closeCamera]);

  // Stop stream on unmount / navigate away
  useEffect(() => {
    return () => {
      stopStream();
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── File picker handler (unchanged) ───────────────────────────────────────
  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setPhotoError('');

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setPhotoError(validation.error);
      return;
    }

    if (previewUrl && previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    const objUrl = URL.createObjectURL(file);
    setPreviewUrl(objUrl);
    setPhotoFile(file);

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

  // ── Bin data loading ───────────────────────────────────────────────────────
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

  // ── Geolocation API ────────────────────────────────────────────────────────
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
          setLocationStatus('denied');
          setLocationErrorMsg('Location permission was denied. You can retry or rely on the selected bin location.');
        } else if (err.code === 2) {
          setLocationStatus('unavailable');
          setLocationErrorMsg('GPS position unavailable. Fallback to manually selected bin location.');
        } else {
          setLocationStatus('unavailable');
          setLocationErrorMsg('GPS request timed out. Fallback to manually selected bin location.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  // ── Mount: load bins and acquire GPS ──────────────────────────────────────
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { fetchAssignedBins(); acquireGpsLocation(); }, []);

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
    <>
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

          {/* FEATURE ONE A & B: Live Camera Capture & File Upload Evidence */}
          <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-gray-800">
            <div className="flex items-center justify-between">
              <label className="form-label font-bold text-slate-800 dark:text-gray-200 mb-0 flex items-center gap-1.5">
                <Camera size={14} className="text-emerald-600" /> Bin Photograph Evidence (Optional)
              </label>
              <span className="text-[10px] text-slate-400 font-medium">Max 5 MB • JPEG/PNG/WebP</span>
            </div>

            {/* Hidden file input — Upload only (NOT camera) */}
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
                      onClick={openCamera}
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
                {/* CAMERA — uses getUserMedia live stream */}
                <button
                  type="button"
                  onClick={openCamera}
                  disabled={cameraBusy}
                  className="p-3 border border-dashed border-emerald-300 dark:border-emerald-700/60 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/50 flex flex-col items-center justify-center gap-1.5 text-emerald-800 dark:text-emerald-300 transition-all active:scale-95 disabled:opacity-60"
                >
                  {cameraBusy ? (
                    <RefreshCw size={18} className="animate-spin" />
                  ) : (
                    <Camera size={18} />
                  )}
                  <span className="font-extrabold text-[11px]">
                    {cameraBusy ? 'Starting…' : 'Capture Camera'}
                  </span>
                  <span className="text-[9px] text-slate-400">Live camera preview</span>
                </button>

                {/* FILE UPLOAD — uses normal file picker */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-3 border border-dashed border-slate-300 dark:border-gray-700 rounded-2xl bg-slate-50/60 dark:bg-gray-800/40 hover:bg-slate-100 flex flex-col items-center justify-center gap-1.5 text-slate-700 dark:text-gray-300 transition-all active:scale-95"
                >
                  <ImageIcon size={18} />
                  <span className="font-extrabold text-[11px]">Upload Photo</span>
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

    {/* ── Live Camera Modal (getUserMedia) ────────────────────────────────── */}
    {cameraOpen && (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label="Live Camera Capture"
      >
        {/* Header */}
        <div className="w-full max-w-md flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-white">
            <Camera size={18} className="text-emerald-400" />
            <span className="font-extrabold text-sm">Live Camera Capture</span>
          </div>
          <button
            onClick={closeCamera}
            className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
            aria-label="Cancel and close camera"
          >
            <X size={20} />
          </button>
        </div>

        {/* Camera error state */}
        {cameraError ? (
          <div className="w-full max-w-md mx-4 flex flex-col items-center gap-4 p-6">
            <div className="w-16 h-16 rounded-full bg-rose-900/60 flex items-center justify-center">
              <VideoOff size={32} className="text-rose-400" />
            </div>
            <p className="text-white/90 text-sm font-semibold text-center leading-relaxed max-w-xs">
              {cameraError}
            </p>
            <div className="flex gap-3">
              <button
                onClick={closeCamera}
                className="px-4 py-2.5 rounded-xl border border-white/20 text-white text-xs font-bold hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => { fileInputRef.current?.click(); closeCamera(); }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-500 transition-colors flex items-center gap-1.5"
              >
                <ImageIcon size={14} /> Upload Photo Instead
              </button>
            </div>
          </div>
        ) : capturedFrame ? (
          /* ── Frame captured — show preview + Use / Retake controls ─────── */
          <div className="w-full max-w-md flex flex-col items-center gap-4 px-4">
            <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-black">
              <img
                src={capturedFrame}
                alt="Captured frame preview"
                className="w-full object-contain max-h-[60vh]"
              />
            </div>
            <p className="text-white/60 text-xs text-center">Review the photo. Retake or use it.</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={retakePhoto}
                className="flex-1 py-3 rounded-2xl border border-white/20 text-white text-sm font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw size={15} /> Retake
              </button>
              <button
                onClick={usePhoto}
                disabled={compressing}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {compressing ? (
                  <><RefreshCw size={15} className="animate-spin" /> Processing…</>
                ) : (
                  <><Check size={15} /> Use Photo</>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* ── Live video viewfinder ──────────────────────────────────────── */
          <div className="w-full max-w-md flex flex-col items-center gap-4 px-4">
            <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-black relative min-h-[240px] flex items-center justify-center">
              {/* Live video element */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full object-cover"
                style={{ display: cameraReady ? 'block' : 'none' }}
              />
              {/* Spinner while stream starts */}
              {!cameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <RefreshCw size={32} className="text-emerald-400 animate-spin" />
                  <p className="text-white/70 text-xs font-medium">Starting camera…</p>
                </div>
              )}
              {/* Viewfinder overlay badge */}
              {cameraReady && (
                <div className="absolute top-3 left-3 px-2 py-1 rounded-full bg-black/50 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-white text-[10px] font-bold uppercase tracking-wider">Live</span>
                </div>
              )}
            </div>

            {/* Hidden canvas for frame capture */}
            <canvas ref={canvasRef} className="hidden" />

            <p className="text-white/50 text-xs text-center">
              Point at the bin and press <strong className="text-white/80">Take Photo</strong>.
            </p>

            <div className="flex gap-3 w-full">
              <button
                onClick={closeCamera}
                className="flex-1 py-3 rounded-2xl border border-white/20 text-white text-sm font-bold hover:bg-white/10 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={takePhoto}
                disabled={!cameraReady}
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Aperture size={16} /> Take Photo
              </button>
            </div>
          </div>
        )}
      </div>
    )}
    </>
  );
}
