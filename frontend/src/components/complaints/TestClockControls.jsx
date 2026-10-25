import React, { useState, useEffect } from 'react';
import { Clock, FastForward, RotateCcw, AlertTriangle, ShieldAlert, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getCurrentTime,
  getTestClockOffsetMs,
  advanceTestClock,
  resetTestClock,
  resetComplaintsToDemo,
  formatDuration
} from '../../utils/complaintStorage';

export default function TestClockControls({ onClockChange }) {
  const [offsetMs, setOffsetMs] = useState(getTestClockOffsetMs());
  const [collapsed, setCollapsed] = useState(true);
  const [currentTimeStr, setCurrentTimeStr] = useState('');

  const updateDisplay = () => {
    const current = getCurrentTime();
    setOffsetMs(getTestClockOffsetMs());
    setCurrentTimeStr(new Date(current).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  useEffect(() => {
    updateDisplay();
    const interval = setInterval(updateDisplay, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAdvance = (hours) => {
    advanceTestClock(hours);
    updateDisplay();
    if (onClockChange) onClockChange();
  };

  const handleResetClock = () => {
    resetTestClock();
    updateDisplay();
    if (onClockChange) onClockChange();
  };

  const handleResetDemoData = () => {
    if (window.confirm('Reset all demo complaints and SLA test clock to default demonstration state?')) {
      resetComplaintsToDemo();
      updateDisplay();
      if (onClockChange) onClockChange();
    }
  };

  const hasOffset = offsetMs !== 0;

  return (
    <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-700/50 rounded-2xl p-3 shadow-lg text-white mb-5 transition-all select-none">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
            <Clock size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black tracking-wide uppercase text-indigo-300">
                SLA &amp; Escalation Test Clock
              </span>
              {hasOffset ? (
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-[10px] font-bold animate-pulse">
                  Simulated (+{formatDuration(offsetMs)})
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-[10px] font-bold">
                  Real-Time
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-300">
              Simulated Evaluation Time: <strong className="text-white font-mono">{currentTimeStr}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleAdvance(0.25)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-200 transition-all flex items-center gap-1 active:scale-95"
            title="Fast forward 15 minutes to test approaching deadline (<30m) warnings"
          >
            <FastForward size={12} className="text-amber-400" /> +15m
          </button>
          <button
            type="button"
            onClick={() => handleAdvance(1)}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-900/80 hover:bg-indigo-800 border border-indigo-500/60 text-xs font-bold text-indigo-200 transition-all flex items-center gap-1 active:scale-95"
            title="Advance 1 Hour (Triggers Level 1 Supervisor Escalation)"
          >
            <AlertTriangle size={12} className="text-amber-400" /> +1h (L1)
          </button>
          <button
            type="button"
            onClick={() => handleAdvance(2)}
            className="px-2.5 py-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-500/60 text-xs font-bold text-purple-200 transition-all flex items-center gap-1 active:scale-95"
            title="Advance 2 Hours (Triggers Level 2 Mandal Officer Escalation)"
          >
            <ShieldAlert size={12} className="text-purple-300" /> +2h (L2)
          </button>
          <button
            type="button"
            onClick={() => handleAdvance(3)}
            className="px-2.5 py-1.5 rounded-xl bg-red-900/80 hover:bg-red-800 border border-red-500/60 text-xs font-bold text-red-200 transition-all flex items-center gap-1 active:scale-95"
            title="Advance 3 Hours (Triggers Level 3 District Admin Escalation)"
          >
            <ShieldAlert size={12} className="text-red-400" /> +3h (L3)
          </button>

          {hasOffset && (
            <button
              type="button"
              onClick={handleResetClock}
              className="px-2.5 py-1.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/50 text-xs font-bold text-amber-200 transition-all flex items-center gap-1 active:scale-95"
              title="Reset test clock back to real system time"
            >
              <RotateCcw size={12} /> Reset Clock
            </button>
          )}

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
            title={collapsed ? 'Show Simulation Guide' : 'Hide Guide'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 pt-3 border-t border-indigo-800/60 text-[11px] text-slate-300 space-y-1.5 animate-fade-in">
          <p className="font-semibold text-indigo-200">
            💡 How to test the 2–3 Hour SLA and Escalations deterministically:
          </p>
          <ul className="list-disc pl-5 space-y-1 opacity-90 text-[10.5px]">
            <li><strong>Standard SLA:</strong> 3 hours resolution window from submission timestamp.</li>
            <li><strong>Approaching Deadline:</strong> Automatically triggers when remaining time &le; 30 minutes.</li>
            <li><strong>Level 1 Escalation:</strong> At 3 hours without resolution, ticket is automatically escalated to <em>Sanitation Supervisor</em>.</li>
            <li><strong>Level 2 Escalation:</strong> At +1 hr past Level 1, ticket escalates to <em>Mandal Officer</em>.</li>
            <li><strong>Level 3 Escalation:</strong> At +2 hrs past Level 1, ticket escalates to <em>District Administrator</em>.</li>
          </ul>
          <div className="pt-1 flex items-center justify-between">
            <span className="text-[10px] text-slate-400">Deterministic local state • Reload-safe</span>
            <button
              type="button"
              onClick={handleResetDemoData}
              className="text-xs text-rose-300 hover:text-rose-100 underline font-semibold transition-colors"
            >
              Reset Demo Complaints Data
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
