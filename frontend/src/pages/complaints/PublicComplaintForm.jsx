import React, { useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Trash2, AlertTriangle, MapPin, Camera, Upload, CheckCircle2,
  Clock, Shield, ArrowRight, X, ExternalLink, RefreshCw, Send,
  HelpCircle, Flame, Truck, User, Phone, Mail, Sparkles
} from 'lucide-react';
import Logo from '../../components/ui/Logo';
import {
  PROBLEM_TYPES,
  WEST_GODAVARI_MANDALS,
  MANDAL_WARDS_MAP,
  createComplaint,
  getSlaConfig
} from '../../utils/complaintStorage';
import { validateImageFile, compressImageToDataUrl } from '../../utils/mockStorage';

export default function PublicComplaintForm() {
  const navigate = useNavigate();
  const slaConfig = getSlaConfig();

  // Form State
  const [title, setTitle] = useState('');
  const [problemType, setProblemType] = useState('overflowing_bin');
  const [description, setDescription] = useState('');
  const [mandal, setMandal] = useState('Tadepalligudem');
  const [ward, setWard] = useState('Ward 01 - Market Center');
  const [customWard, setCustomWard] = useState('');
  const [address, setAddress] = useState('');
  const [slaHours, setSlaHours] = useState(3);

  // Reporter (Optional)
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [reporterEmail, setReporterEmail] = useState('');

  // GPS Location State
  const [coords, setCoords] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState('');

  // Photo State
  const [photoDataUrl, setPhotoDataUrl] = useState(null);
  const [photoError, setPhotoError] = useState('');
  const [compressing, setCompressing] = useState(false);
  const fileInputRef = useRef(null);

  // Camera Modal State (getUserMedia)
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdTicket, setCreatedTicket] = useState(null);

  // Ward options based on selected mandal
  const availableWards = MANDAL_WARDS_MAP[mandal] || [
    'Ward 01 - Center Area',
    'Ward 02 - Market Road',
    'Ward 03 - Residential Zone',
    'Ward 04 - Station Area',
    'Other Village / Ward'
  ];

  // Geolocation handler
  const handleAcquireLocation = () => {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    setLocating(true);
    setLocError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(6)),
          lng: Number(pos.coords.longitude.toFixed(6)),
          accuracy: Math.round(pos.coords.accuracy),
        });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setLocError(err.message || 'Unable to retrieve location. Please check browser permissions.');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Stop camera stream safely
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  // Open device camera via getUserMedia
  const handleOpenCamera = useCallback(async () => {
    setCameraError('');
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Camera API is not supported in this browser. Please use "Upload Photo" instead.');
      setCameraOpen(true);
      return;
    }

    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().then(() => setCameraReady(true)).catch(() => {});
        };
      }
    } catch (_) {
      try {
        const streamFallback = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = streamFallback;
        if (videoRef.current) {
          videoRef.current.srcObject = streamFallback;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current.play().then(() => setCameraReady(true)).catch(() => {});
          };
        }
      } catch (err) {
        setCameraError(err.name === 'NotAllowedError' ? 'Camera access was denied. Please allow camera permissions or upload a file.' : 'Could not access device camera.');
      }
    }
  }, []);

  // Capture still from video stream
  const handleCaptureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
    setPhotoDataUrl(dataUrl);
    stopStream();
    setCameraOpen(false);
  };

  // Handle file picker selection
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      setPhotoError(validation.error);
      return;
    }

    setPhotoError('');
    setCompressing(true);
    try {
      const dataUrl = await compressImageToDataUrl(file, 1024, 0.75);
      setPhotoDataUrl(dataUrl);
    } catch (err) {
      setPhotoError('Failed to process image file.');
    } finally {
      setCompressing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Handle Form Submission
  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!title.trim()) {
      setSubmitError('Please enter a brief complaint title.');
      return;
    }
    if (!description.trim()) {
      setSubmitError('Please provide a description of the garbage issue.');
      return;
    }
    if (!address.trim()) {
      setSubmitError('Please enter a specific street address or landmark.');
      return;
    }

    const selectedWard = ward === 'Other Village / Ward' && customWard.trim() ? customWard.trim() : ward;

    setSubmitting(true);
    try {
      const ticket = createComplaint({
        title: title.trim(),
        problem_type: problemType,
        description: description.trim(),
        district: 'West Godavari',
        mandal,
        ward: selectedWard,
        address: address.trim(),
        coordinates: coords,
        gps_source: coords ? 'Browser Geolocation' : null,
        photo_url: photoDataUrl,
        reporter_name: reporterName,
        reporter_phone: reporterPhone,
        reporter_email: reporterEmail,
        sla_hours: Number(slaHours),
      });

      setCreatedTicket(ticket);
    } catch (err) {
      setSubmitError(err.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // If already submitted, show confirmation screen
  if (createdTicket) {
    const deadlineStr = new Date(createdTicket.sla_deadline).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
    });

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-100 dark:from-[#060e14] dark:via-[#09151c] dark:to-[#060e14] p-4 sm:p-6 md:p-10 flex flex-col items-center justify-center select-none">
        <div className="max-w-xl w-full bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800/60 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 animate-fade-in">
          
          <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mx-auto shadow-inner">
            <CheckCircle2 size={36} />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider">
              Complaint Registered Successfully
            </span>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">
              Municipal Ticket Generated
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400">
              Government of Andhra Pradesh • District Sanitation Monitoring System (DSMS)
            </p>
          </div>

          {/* Ticket ID Box */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/80 border border-slate-200 dark:border-gray-700 text-left space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-gray-700 pb-2">
              <span className="text-xs text-slate-500 font-semibold">Complaint Tracking ID</span>
              <strong className="text-base font-black font-mono text-emerald-600 dark:text-emerald-400">
                {createdTicket.id}
              </strong>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Location</span>
                <span className="font-semibold text-slate-800 dark:text-gray-200 truncate block">
                  {createdTicket.ward}, {createdTicket.mandal}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Guaranteed SLA</span>
                <span className="font-bold text-amber-600 dark:text-amber-400 block">
                  {createdTicket.sla_hours} Hours Response
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Resolution Deadline</span>
                <span className="font-semibold text-slate-800 dark:text-gray-200 block">
                  {deadlineStr}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">Assigned Worker</span>
                <span className="font-semibold text-slate-800 dark:text-gray-200 block">
                  {createdTicket.assigned_worker?.name || 'Local Ward Collector'}
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-gray-400 italic pt-1 border-t border-slate-200 dark:border-gray-700">
              ⚡ If this ticket is not resolved within {createdTicket.sla_hours} hours, it will automatically escalate to the Sanitation Supervisor (Level 1), and then at 2-hour intervals to the Mandal Officer (Level 2) and District Administrator (Level 3).
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={() => navigate(`/complaints/track/${createdTicket.id}`)}
              className="flex-1 py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
            >
              <span>Track Ticket Status</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedTicket(null);
                setTitle('');
                setDescription('');
                setAddress('');
                setPhotoDataUrl(null);
                setCoords(null);
              }}
              className="py-3 px-4 rounded-2xl border border-slate-300 dark:border-gray-700 hover:bg-slate-50 dark:hover:bg-gray-800 text-slate-700 dark:text-gray-300 font-bold text-xs transition-all"
            >
              Submit Another Report
            </button>
          </div>

        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-100 dark:from-[#060e14] dark:via-[#09151c] dark:to-[#060e14] p-4 sm:p-6 md:p-10 select-none">
      
      {/* Top Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-slate-200/80 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Logo size="md" showText={true} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/complaints/track"
            className="px-3.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-100 transition-all shadow-xs"
          >
            <Clock size={13} />
            <span>Track Complaint</span>
          </Link>
          <Link
            to="/login"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            Staff Login
          </Link>
        </div>
      </div>

      {/* Main Content Form */}
      <div className="max-w-4xl mx-auto my-6">
        
        <div className="mb-6 space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-300">
            <Shield size={12} className="text-emerald-600" /> Public Citizen Grievance Redressal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Report Garbage or Sanitation Problem
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400">
            Report overflowing bins, illegal roadside dumping, or uncollected garbage across West Godavari. Your report enters an automated <strong>2–3 hour resolution SLA</strong> with tiered municipal escalation.
          </p>
        </div>

        {submitError && (
          <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-800 dark:text-red-300 text-xs font-semibold flex items-center gap-2 mb-6">
            <AlertTriangle size={16} className="flex-shrink-0 text-red-600" />
            <span>{submitError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Complaint Details */}
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2 border-b border-slate-100 dark:border-gray-800 pb-2">
              <AlertTriangle size={16} className="text-amber-500" />
              1. Garbage Problem Details
            </h3>

            {/* Problem Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-2">
                Problem Category *
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {PROBLEM_TYPES.map((type) => {
                  const isSelected = problemType === type.id;
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => {
                        setProblemType(type.id);
                        if (type.defaultHours) setSlaHours(type.defaultHours);
                      }}
                      className={`p-3 rounded-2xl border text-left flex items-start gap-3 transition-all ${
                        isSelected
                          ? 'border-emerald-500 bg-emerald-50/70 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-sm ring-1 ring-emerald-500/30'
                          : 'border-slate-200 dark:border-gray-800 hover:border-slate-300 dark:hover:border-gray-700 text-slate-700 dark:text-gray-300'
                      }`}
                    >
                      <div className={`p-2 rounded-xl flex-shrink-0 ${isSelected ? 'bg-emerald-600 text-white' : 'bg-slate-100 dark:bg-gray-800 text-slate-500'}`}>
                        {type.id === 'overflowing_bin' && <Trash2 size={16} />}
                        {type.id === 'accumulated_road' && <AlertTriangle size={16} />}
                        {type.id === 'uncollected_garbage' && <Truck size={16} />}
                        {type.id === 'open_dumping' && <Flame size={16} />}
                        {type.id === 'other_sanitation' && <HelpCircle size={16} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight">{type.label}</p>
                        <span className={`text-[10px] inline-block mt-1 font-extrabold uppercase ${type.priority === 'urgent' ? 'text-red-600 dark:text-red-400' : 'text-slate-400'}`}>
                          {type.defaultHours}h SLA Resolution
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                Complaint Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Heavy garbage accumulation spilling across Railway Road"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                Detailed Problem Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Describe the severity, waste type (wet vegetable, plastic, debris), and any immediate public health hazards..."
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none"
              />
            </div>

            {/* SLA Priority Option */}
            <div className="pt-2 flex items-center justify-between flex-wrap gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-200/80 dark:border-gray-700">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-slate-800 dark:text-gray-200 flex items-center gap-1.5">
                  <Clock size={13} className="text-emerald-600" /> Guaranteed Resolution SLA
                </span>
                <p className="text-[11px] text-slate-500">
                  Target response time within which the municipal worker must complete clearance.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSlaHours(3)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    slaHours === 3
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-gray-300'
                  }`}
                >
                  Standard (3 Hours)
                </button>
                <button
                  type="button"
                  onClick={() => setSlaHours(2)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    slaHours === 2
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-gray-300'
                  }`}
                >
                  Urgent Hazard (2 Hours)
                </button>
              </div>
            </div>

          </div>

          {/* Section 2: Location Information */}
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-5">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2 border-b border-slate-100 dark:border-gray-800 pb-2">
              <MapPin size={16} className="text-emerald-600" />
              2. Location &amp; Landmark
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* District (Fixed) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  District
                </label>
                <input
                  type="text"
                  value="West Godavari"
                  disabled
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-800 text-xs font-bold text-slate-500 cursor-not-allowed"
                />
              </div>

              {/* Mandal */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Mandal *
                </label>
                <select
                  value={mandal}
                  onChange={(e) => {
                    const nextMandal = e.target.value;
                    setMandal(nextMandal);
                    const wards = MANDAL_WARDS_MAP[nextMandal] || [];
                    setWard(wards[0] || 'Ward 01 - Center Area');
                  }}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {WEST_GODAVARI_MANDALS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Ward */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Ward or Village *
                </label>
                <select
                  value={ward}
                  onChange={(e) => setWard(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {availableWards.map((w) => (
                    <option key={w} value={w}>{w}</option>
                  ))}
                </select>
              </div>
            </div>

            {ward === 'Other Village / Ward' && (
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Specify Village / Ward Name *
                </label>
                <input
                  type="text"
                  value={customWard}
                  onChange={(e) => setCustomWard(e.target.value)}
                  placeholder="e.g. Kondruprolu Village"
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold"
                />
              </div>
            )}

            {/* Address / Landmark */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                Specific Landmark or Street Address *
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. Opposite State Bank, Near Platform 4, Market Junction"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* GPS Geolocation Capture */}
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                  <MapPin size={14} className="text-emerald-600" />
                  GPS Geotagging (Optional but Recommended)
                </span>
                <p className="text-[11px] text-slate-500 dark:text-gray-400">
                  Captures exact coordinates from your device so municipal sanitation trucks can navigate directly to the site.
                </p>
                {coords && (
                  <div className="flex items-center gap-2 pt-1 font-mono text-[11px] text-emerald-700 dark:text-emerald-400 font-bold">
                    <span>Lat: {coords.lat}, Lng: {coords.lng} (Accuracy: &plusmn;{coords.accuracy}m)</span>
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${coords.lat}&mlon=${coords.lng}#map=16/${coords.lat}/${coords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 underline text-emerald-600 hover:text-emerald-800"
                    >
                      <span>View Map</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
                {locError && (
                  <p className="text-[11px] text-red-600 font-semibold pt-0.5">{locError}</p>
                )}
              </div>

              <button
                type="button"
                onClick={handleAcquireLocation}
                disabled={locating}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 font-bold text-xs hover:bg-emerald-100/50 transition-all flex items-center gap-1.5 flex-shrink-0 disabled:opacity-50"
              >
                {locating ? <RefreshCw size={14} className="animate-spin" /> : <MapPin size={14} />}
                <span>{coords ? 'Update GPS Location' : 'Detect My Location'}</span>
              </button>
            </div>

          </div>

          {/* Section 3: Optional Photograph */}
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2 border-b border-slate-100 dark:border-gray-800 pb-2">
              <Camera size={16} className="text-teal-600" />
              3. Photo Evidence (Optional)
            </h3>

            <p className="text-xs text-slate-500">
              Photographs help municipal field supervisors assess cleanup volume and dispatch the correct compactor or tipper vehicle.
            </p>

            {photoDataUrl ? (
              <div className="relative inline-block border-2 border-emerald-500 rounded-2xl overflow-hidden shadow-md">
                <img src={photoDataUrl} alt="Complaint Photo Preview" className="w-64 h-44 object-cover" />
                <button
                  type="button"
                  onClick={() => setPhotoDataUrl(null)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-md transition-transform hover:scale-105"
                  title="Remove photo"
                >
                  <X size={14} />
                </button>
                <div className="absolute bottom-0 inset-x-0 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-1 text-center">
                  Photo Attached
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleOpenCamera}
                  className="p-4 rounded-2xl border border-dashed border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20 hover:bg-emerald-100/50 flex flex-col items-center justify-center gap-2 text-emerald-800 dark:text-emerald-300 transition-all active:scale-95"
                >
                  <Camera size={22} className="text-emerald-600" />
                  <span className="text-xs font-bold">Take Live Photo</span>
                  <span className="text-[10px] text-slate-400">Opens device camera</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={compressing}
                  className="p-4 rounded-2xl border border-dashed border-slate-300 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-750 flex flex-col items-center justify-center gap-2 text-slate-700 dark:text-gray-300 transition-all active:scale-95"
                >
                  <Upload size={22} className="text-slate-500" />
                  <span className="text-xs font-bold">{compressing ? 'Processing Image...' : 'Upload from Device'}</span>
                  <span className="text-[10px] text-slate-400">JPEG, PNG, WebP up to 5MB</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                />
              </div>
            )}

            {photoError && (
              <p className="text-xs text-red-600 font-semibold">{photoError}</p>
            )}
          </div>

          {/* Section 4: Reporter Details (Optional) */}
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-5 sm:p-7 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-2">
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-700 dark:text-gray-300 flex items-center gap-2">
                <User size={16} className="text-indigo-500" />
                4. Citizen Contact Details (Optional)
              </h3>
              <span className="text-[11px] text-slate-400 font-bold">Anonymous reports accepted</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={reporterName}
                    onChange={(e) => setReporterName(e.target.value)}
                    placeholder="e.g. S. Kameswara Rao"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Mobile Number
                </label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    value={reporterPhone}
                    onChange={(e) => setReporterPhone(e.target.value)}
                    placeholder="e.g. 98480 12345"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    value={reporterEmail}
                    onChange={(e) => setReporterEmail(e.target.value)}
                    placeholder="e.g. citizen@example.com"
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action Bar */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-60"
            >
              {submitting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  <span>Registering Complaint Ticket...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Submit Garbage Complaint ({slaHours}-Hour SLA)</span>
                </>
              )}
            </button>
            <p className="text-[11px] text-center text-slate-400 pt-2">
              By submitting, your complaint enters the West Godavari automated sanitation monitoring pipeline.
            </p>
          </div>

        </form>

      </div>

      {/* Camera Modal */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Camera size={14} /> Live Camera Capture
              </span>
              <button
                type="button"
                onClick={() => { stopStream(); setCameraOpen(false); }}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            {cameraError ? (
              <div className="p-4 rounded-2xl bg-red-950/50 border border-red-800 text-red-300 text-xs space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <AlertTriangle size={14} /> Camera Unavailable
                </p>
                <p>{cameraError}</p>
                <button
                  type="button"
                  onClick={() => { stopStream(); setCameraOpen(false); fileInputRef.current?.click(); }}
                  className="mt-2 px-3 py-1.5 rounded-xl bg-white text-slate-900 font-bold text-xs"
                >
                  Upload File Instead
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <canvas ref={canvasRef} className="hidden" />
                  {!cameraReady && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-slate-300 text-xs gap-2">
                      <RefreshCw size={20} className="animate-spin text-emerald-400" />
                      <span>Initializing device camera...</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCaptureSnapshot}
                    disabled={!cameraReady}
                    className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    <Camera size={14} /> Take Photo
                  </button>
                  <button
                    type="button"
                    onClick={() => { stopStream(); setCameraOpen(false); }}
                    className="px-4 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-bold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="max-w-4xl mx-auto pt-8 pb-4 text-center text-xs text-slate-400 border-t border-slate-200/80 dark:border-gray-800 mt-10">
        West Godavari District Administration • District Sanitation Monitoring System (DSMS) • Designed by Karthik Kanagala
      </footer>

    </div>
  );
}
