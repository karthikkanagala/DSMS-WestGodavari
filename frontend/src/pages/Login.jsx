/**
 * Government of Andhra Pradesh — DSMS Official Landing & Access Portal:
 * - Official Poorna Kumbham & Sanitation Vehicle AP Emblem (Logo.jsx)
 * - Real-time District Telemetry Highlights (19 Mandals, 357 Wards, 2,857 Bins, 96.2% Cleanliness)
 * - 1-Click Role Accounts (District Admin, System Admin, Mandal Officer, Supervisor, Collector)
 * - Interactive Sanitation Fleet Vector Illustration
 * - Watch Operations Video Tour Modal Integration
 * - Developer Attribution: "Designed & Developed by Karthik Kanagala"
 */
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import VideoPlayerModal from '../components/ui/VideoPlayerModal';
import Logo from '../components/ui/Logo';
import {
  Lock, User, Eye, EyeOff, ShieldCheck, Sparkles, Video, Play,
  ArrowRight, CheckCircle2, Building2, MapPin, Trash2, Truck, Activity
} from 'lucide-react';

const DEMO_ROLES = [
  {
    role: 'district_admin',
    u: 'distadmin',
    label: 'District Admin',
    desc: 'Full 19 Mandals Command Dashboard',
    icon: Building2,
    badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300'
  },
  {
    role: 'system_admin',
    u: 'admin',
    label: 'System Admin',
    desc: 'DB Backups, Users & Setup Wizard',
    icon: ShieldCheck,
    badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border-blue-300'
  },
  {
    role: 'mandal_officer',
    u: 'mandal_tpg',
    label: 'Mandal Officer',
    desc: 'Tadepalligudem / Bhimavaram Scope',
    icon: MapPin,
    badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 border-teal-300'
  },
  {
    role: 'supervisor',
    u: 'supervisor',
    label: 'Supervisor',
    desc: 'Verify Collections & Field Audits',
    icon: CheckCircle2,
    badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/80 dark:text-indigo-300 border-indigo-300'
  },
  {
    role: 'collector',
    u: 'collector',
    label: 'Field Collector',
    desc: 'Mobile Route App & Weight Logger',
    icon: Truck,
    badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300'
  },
];

export default function Login() {
  const { login, quickLogin } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('distadmin');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('district_admin');
  const [showPassword, setShowPassword] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      if (user?.role === 'collector') navigate('/collector');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please verify your username and password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demo) => {
    if (loading) return;
    setUsername(demo.u);
    setPassword('');
    setRole(demo.role);
    setError('');
    setLoading(true);
    try {
      const user = await quickLogin(demo.u);
      if (user?.role === 'collector' || demo.role === 'collector') navigate('/collector');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to authenticate demo account.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-100 dark:from-[#060e14] dark:via-[#09151c] dark:to-[#060e14] flex flex-col justify-between p-4 sm:p-6 md:p-10 select-none overflow-x-hidden">
      
      {/* Main Centered Grid Container */}
      <div className="max-w-7xl mx-auto w-full my-auto py-6 sm:py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        
        {/* Left Column: Brand Hero & Vector Graphic */}
        <div className="lg:col-span-7 space-y-6 text-left animate-fade-in-up">
          
          <div className="space-y-3.5">
            <Logo size="hero" showText={false} animated={true} />

            <div className="pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-900 dark:text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-300/80 shadow-sm">
                <ShieldCheck size={14} className="text-emerald-600" /> Government of Andhra Pradesh
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-slate-900 dark:text-white leading-tight max-w-2xl tracking-tight">
              District Sanitation Monitoring &amp; Waste Management System
            </h1>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <p className="text-sm sm:text-base font-extrabold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                <span>Swachh Andhra Pradesh • West Godavari District</span>
                <Sparkles size={16} className="text-amber-400 animate-bounce" />
              </p>

              <button
                onClick={() => setShowVideoModal(true)}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all hover:scale-105 active:scale-95"
              >
                <Play size={12} className="fill-white" />
                <span>Watch Operations Video</span>
              </button>
            </div>
          </div>

          {/* High-End Vector Illustration of Sanitation Truck, Worker, Green & Blue Bins */}
          <div className="pt-2 hidden sm:block">
            <svg
              viewBox="0 0 720 320"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="w-full max-w-xl h-auto drop-shadow-xl"
            >
              {/* Background City Silhouette */}
              <path d="M40 260V140H80V170H110V100H150V190H180V120H230V260H40Z" fill="#cbd5e1" fillOpacity="0.3" />
              <path d="M230 260V80H280V130H320V90H370V170H400V110H450V260H230Z" fill="#94a3b8" fillOpacity="0.25" />
              <path d="M450 260V130H500V180H540V120H580V260H450Z" fill="#cbd5e1" fillOpacity="0.3" />

              {/* Road Line with Grass Accent */}
              <rect x="20" y="260" width="680" height="24" rx="12" fill="#1e293b" />
              <line x1="40" y1="272" x2="680" y2="272" stroke="#facc15" strokeWidth="3" strokeDasharray="16 16" />
              <rect x="20" y="256" width="680" height="4" fill="#10b981" />

              {/* Sanitation Truck Body */}
              <g id="truck">
                <rect x="180" y="130" width="220" height="110" rx="16" fill="#047857" />
                <rect x="180" y="145" width="220" height="25" fill="#065f46" />
                <path d="M195 140H385" stroke="#34d399" strokeWidth="4" strokeLinecap="round" strokeDasharray="8 8" />
                
                {/* Truck Cabin */}
                <path d="M400 160H480L510 195V240H400V160Z" fill="#10b981" />
                <path d="M415 170H475L495 195H415V170Z" fill="#bae6fd" />
                <circle cx="505" cy="215" r="5" fill="#facc15" />

                {/* Truck Wheels */}
                <circle cx="230" cy="245" r="22" fill="#0f172a" stroke="#64748b" strokeWidth="5" />
                <circle cx="230" cy="245" r="9" fill="#facc15" />
                <circle cx="340" cy="245" r="22" fill="#0f172a" stroke="#64748b" strokeWidth="5" />
                <circle cx="340" cy="245" r="9" fill="#facc15" />
                <circle cx="470" cy="245" r="22" fill="#0f172a" stroke="#64748b" strokeWidth="5" />
                <circle cx="470" cy="245" r="9" fill="#facc15" />

                {/* Leaf Decal */}
                <circle cx="290" cy="185" r="24" fill="#ffffff" fillOpacity="0.2" />
                <path d="M290 170C282 170 278 178 278 186C278 194 286 200 290 200C294 200 302 194 302 186C302 178 298 170 290 170Z" fill="#34d399" />
              </g>

              {/* Sanitation Worker */}
              <g id="worker">
                <circle cx="575" cy="165" r="14" fill="#fed7aa" />
                <path d="M560 160C560 152 566 146 575 146C584 146 590 152 590 160H560Z" fill="#0284c7" />
                <path d="M562 179H588L592 225H558L562 179Z" fill="#10b981" />
                <rect x="565" y="225" width="8" height="28" rx="3" fill="#1e293b" />
                <rect x="577" y="225" width="8" height="28" rx="3" fill="#1e293b" />
              </g>

              {/* Bio Bins */}
              <g id="green-bin">
                <rect x="625" y="185" width="34" height="65" rx="5" fill="#10b981" stroke="#059669" strokeWidth="2" />
                <rect x="621" y="180" width="42" height="7" rx="3" fill="#047857" />
                <circle cx="632" cy="245" r="6" fill="#1e293b" />
                <circle cx="652" cy="245" r="6" fill="#1e293b" />
              </g>
            </svg>
          </div>

        </div>

        {/* Right Column: High-End Login & Instant Role Switcher Card */}
        <div className="lg:col-span-5 w-full max-w-md mx-auto animate-fade-in-up">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.12)] border border-slate-100 dark:border-gray-800 p-6 sm:p-7 space-y-4">
            
            <div className="space-y-1">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Officer Portal Login
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Enter your credentials or click any demo account below for 1-click access.
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl text-xs text-rose-700 dark:text-rose-300 font-bold">
                <span>⚠</span> {error}
              </div>
            )}

            {/* Citizen Public Grievance Portal Box */}
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800/60 flex items-center justify-between gap-2 shadow-xs">
              <div className="space-y-0.5 min-w-0">
                <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-300 tracking-wider flex items-center gap-1">
                  <Sparkles size={11} className="text-emerald-600" /> Public Citizen Service
                </span>
                <p className="text-xs font-bold text-slate-800 dark:text-gray-200 truncate">
                  Report Garbage &amp; Overflowing Bins
                </p>
                <p className="text-[10px] text-slate-500 truncate">2–3 hr SLA guarantee • No login required</p>
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                <Link
                  to="/complaints/new"
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] shadow-sm text-center transition-all hover:scale-102"
                >
                  File Report
                </Link>
                <Link
                  to="/complaints/track"
                  className="px-3 py-1 rounded-xl border border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold text-[10px] text-center hover:bg-emerald-100/60"
                >
                  Track Status
                </Link>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="form-label font-bold text-xs text-slate-700 dark:text-gray-300 mb-1">
                  Username / Officer ID
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    placeholder="e.g. distadmin, admin, mandal_tpg"
                    className="form-input pl-10 py-2.5 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="form-label font-bold text-xs text-slate-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••"
                    className="form-input pl-10 pr-10 py-2.5 text-xs font-semibold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] text-white font-black text-sm transition-all shadow-lg shadow-emerald-600/30 disabled:opacity-50 mt-1 gap-2"
              >
                {loading ? (
                  <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Authenticating...</>
                ) : (
                  <><span>Sign In to Dashboard</span> <ArrowRight size={15} /></>
                )}
              </button>
            </form>

            {/* 1-Click Fast Role Switcher */}
            <div className="pt-3 border-t border-slate-100 dark:border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  ⚡ 1-Click Demo Logins
                </p>
                <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                  All Roles Ready
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {DEMO_ROLES.map((demo) => {
                  const Icon = demo.icon;
                  return (
                    <button
                      key={demo.u}
                      type="button"
                      onClick={() => handleQuickLogin(demo)}
                      className={`p-2 rounded-xl border flex items-center gap-2 text-left transition-all hover:scale-102 shadow-sm ${demo.badgeColor}`}
                    >
                      <Icon size={14} className="flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="font-extrabold text-[11px] truncate leading-tight">{demo.label}</p>
                        <p className="text-[9px] opacity-80 truncate">{demo.u}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* Official State Footer */}
      <footer className="text-center text-xs text-slate-500 dark:text-gray-400 py-3 space-y-0.5">
        <p className="font-bold text-slate-700 dark:text-gray-300">
          Government of Andhra Pradesh • West Godavari District Administration
        </p>
        <p className="text-[11px] text-slate-400">
          District Sanitation Monitoring System (DSMS) • Designed &amp; Developed by <strong className="text-emerald-700 dark:text-emerald-400 font-black">Karthik Kanagala</strong>
        </p>
      </footer>

      {/* Video Modal */}
      <VideoPlayerModal isOpen={showVideoModal} onClose={() => setShowVideoModal(false)} />

    </div>
  );
}
