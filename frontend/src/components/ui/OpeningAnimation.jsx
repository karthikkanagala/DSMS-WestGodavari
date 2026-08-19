/**
 * OpeningAnimation & Refresh Sequence Component
 * High-tech cinematic startup and data sync animation for DSMS:
 * - Official AP Poorna Kumbham & Municipal Sanitation Vehicle Emblem
 * - Animated satellite calibration & Mandal telemetry linking
 * - Supports both "startup" (full boot) and "refresh" (fast sync) modes
 */
import React, { useState, useEffect } from 'react';
import Logo from './Logo';
import { Sparkles, ShieldCheck, RefreshCw, CheckCircle2, Truck } from 'lucide-react';

const STARTUP_STEPS = [
  'Calibrating Andhra Pradesh Spatial Cartography...',
  'Linking 19 Administrative Mandals & 357 Wards...',
  'Streaming Telemetry from 2,857 Monitored Public Bins...',
  'Tracking Municipal Sanitation Vehicle GPS Routes...',
  'DSMS Command Center Ready'
];

export default function OpeningAnimation({ mode = 'startup', onComplete }) {
  const isRefresh = mode === 'refresh';
  const [stepIndex, setStepIndex] = useState(0);
  const [progress, setProgress] = useState(isRefresh ? 30 : 15);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    const duration = isRefresh ? 900 : 2000;
    const stepTime = isRefresh ? 200 : 400;

    const stepInterval = setInterval(() => {
      setStepIndex((prev) => {
        if (prev < STARTUP_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, stepTime);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + (isRefresh ? 25 : 12);
      });
    }, isRefresh ? 80 : 120);

    const timer = setTimeout(() => {
      setFading(true);
      setTimeout(() => {
        if (onComplete) onComplete();
      }, 400);
    }, duration);

    return () => {
      clearInterval(stepInterval);
      clearInterval(progressInterval);
      clearTimeout(timer);
    };
  }, [isRefresh, onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[99999] bg-gradient-to-br from-slate-950 via-[#041d16] to-slate-950 flex flex-col items-center justify-center p-6 text-white transition-opacity duration-400 select-none ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Radial Ambient Glow Effects */}
      <div className="absolute w-[500px] h-[500px] bg-emerald-500/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute w-[300px] h-[300px] bg-teal-400/10 rounded-full blur-2xl pointer-events-none" />

      {/* Main Center Content */}
      <div className="relative z-10 flex flex-col items-center text-center space-y-4 max-w-lg w-full">
        
        {/* Animated Glowing Logo */}
        <div className="p-4 rounded-3xl bg-emerald-950/50 border border-emerald-500/40 shadow-[0_0_60px_-10px_rgba(16,185,129,0.5)]">
          <Logo size={isRefresh ? 'lg' : 'hero'} showText={false} animated={true} />
        </div>

        {/* State & District Badges */}
        <div className="space-y-1 pt-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-900/80 border border-emerald-400/50 text-emerald-300 text-[11px] font-black uppercase tracking-wider shadow-md">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Government of Andhra Pradesh</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight pt-1">
            {isRefresh ? 'SYNCHRONIZING DISTRICT TELEMETRY' : 'DISTRICT SANITATION MONITORING SYSTEM'}
          </h1>

          <p className="text-xs sm:text-sm font-extrabold text-emerald-400 tracking-wide flex items-center justify-center gap-1.5">
            <span>West Godavari District Administration</span>
            <Sparkles size={14} className="text-amber-400 animate-spin" />
          </p>
        </div>

        {/* Progress Bar & Status Text */}
        <div className="w-full space-y-3 pt-3 max-w-sm">
          <div className="w-full bg-slate-900/90 rounded-full h-2.5 overflow-hidden border border-emerald-900/80 p-0.5 shadow-inner">
            <div
              className="bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-300 h-full rounded-full transition-all duration-200 shadow-[0_0_15px_rgba(16,185,129,0.9)]"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="h-6 flex items-center justify-center text-xs font-mono text-emerald-300/90 gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="truncate">{STARTUP_STEPS[stepIndex]}</span>
          </div>
        </div>

        {/* Skip button on startup */}
        {!isRefresh && (
          <button
            onClick={() => {
              setFading(true);
              setTimeout(() => {
                if (onComplete) onComplete();
              }, 200);
            }}
            className="text-[11px] text-slate-400 hover:text-white underline pt-2 transition-colors"
          >
            Skip Intro →
          </button>
        )}

      </div>

      {/* Developer Credit */}
      <div className="absolute bottom-6 text-center text-[10px] text-slate-500 font-medium">
        Swachh Andhra Pradesh • Designed &amp; Developed by <strong className="text-emerald-400 font-black">Karthik Kanagala</strong>
      </div>
    </div>
  );
}
