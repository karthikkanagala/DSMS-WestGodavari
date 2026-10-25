import React, { useState, useEffect } from 'react';
import { Clock, FastForward, RotateCcw, AlertTriangle, ShieldAlert, Sparkles, ChevronDown, ChevronUp, ArrowRight } from 'lucide-react';
import {
  getCurrentTime,
  getTestClockOffsetMs,
  advanceTestClock,
  setTestClockOffsetMs,
  resetTestClock,
  resetComplaintsToDemo,
  formatDuration,
  evaluateAllTickets
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

  const handleSetExactHours = (hours) => {
    setTestClockOffsetMs(hours * 60 * 60 * 1000);
    evaluateAllTickets();
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
                SLA &amp; 2-Hour Escalation Test Clock
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

        {/* Step Buttons for Testing Incremental & Boundary Conditions */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => handleAdvance(0.25)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-xs font-bold text-slate-200 transition-all flex items-center gap-1 active:scale-95"
            title="Fast forward 15 minutes to test approaching deadline (<30m) warning"
          >
            <FastForward size={12} className="text-amber-400" /> +15m
          </button>

          <button
            type="button"
            onClick={() => handleAdvance(1)}
            className="px-2.5 py-1.5 rounded-xl bg-indigo-950/80 hover:bg-indigo-900 border border-indigo-600 text-xs font-bold text-indigo-200 transition-all flex items-center gap-1 active:scale-95"
            title="Step +1 Hour (Use to verify that 1 hour past Level 1 or 2 does NOT trigger premature escalation)"
          >
            <Clock size={12} className="text-indigo-400" /> +1h Step
          </button>

          <button
            type="button"
            onClick={() => handleAdvance(2)}
            className="px-2.5 py-1.5 rounded-xl bg-purple-900/80 hover:bg-purple-800 border border-purple-500/60 text-xs font-bold text-purple-200 transition-all flex items-center gap-1 active:scale-95"
            title="Advance +2 Hours (Triggers next 2-hour escalation interval)"
          >
            <ShieldAlert size={12} className="text-purple-300" /> +2h Stage
          </button>

          <button
            type="button"
            onClick={() => handleAdvance(3)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 border border-emerald-500/60 text-xs font-bold text-emerald-200 transition-all flex items-center gap-1 active:scale-95"
            title="Advance +3 Hours (Reach standard 3h initial SLA deadline -> Triggers Level 1)"
          >
            <AlertTriangle size={12} className="text-amber-400" /> +3h SLA
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
            title={collapsed ? 'Show 2-Hour Escalation Guide & Jump Shortcuts' : 'Hide Guide'}
          >
            {collapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className="mt-3 pt-3 border-t border-indigo-800/60 text-[11px] text-slate-300 space-y-2.5 animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <p className="font-bold text-indigo-200 flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber-400" />
              <span>Deterministic 2-Hour SLA Escalation Verification Protocol:</span>
            </p>
            {/* Direct Jump Shortcuts */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mr-1">Direct Jumps:</span>
              <button
                type="button"
                onClick={() => handleSetExactHours(3)}
                className="px-2 py-0.5 rounded-lg bg-indigo-900/60 hover:bg-indigo-800 border border-indigo-400/40 text-[10px] font-bold text-indigo-200"
                title="Jump directly to +3h (Initial SLA -> Level 1: Supervisor)"
              >
                Level 1 (+3h)
              </button>
              <button
                type="button"
                onClick={() => handleSetExactHours(5)}
                className="px-2 py-0.5 rounded-lg bg-purple-900/60 hover:bg-purple-800 border border-purple-400/40 text-[10px] font-bold text-purple-200"
                title="Jump directly to +5h (2h past L1 -> Level 2: Mandal Officer)"
              >
                Level 2 (+5h)
              </button>
              <button
                type="button"
                onClick={() => handleSetExactHours(7)}
                className="px-2 py-0.5 rounded-lg bg-red-900/60 hover:bg-red-800 border border-red-400/40 text-[10px] font-bold text-red-200"
                title="Jump directly to +7h (2h past L2 -> Level 3: District Admin)"
              >
                Level 3 (+7h)
              </button>
            </div>
          </div>

          <div className="bg-slate-950/50 p-2.5 rounded-xl border border-indigo-900/60 text-[10.5px] space-y-1">
            <div className="text-slate-200 font-semibold">Step-by-step verification checklist:</div>
            <ol className="list-decimal pl-5 space-y-1 opacity-90 text-slate-300">
              <li><strong>Initial SLA:</strong> Configurable 2 or 3 hours (default 3h) from submission timestamp.</li>
              <li><strong>Level 1 Escalation:</strong> When initial SLA deadline expires &rarr; Escalates to <em>Sanitation Supervisor</em>.</li>
              <li><strong>Intermediate Check (+1h):</strong> 1 hour after Level 1 &rarr; <em>Remains at Level 1</em> (no premature escalation).</li>
              <li><strong>Level 2 Escalation (+2h after L1):</strong> 2 full hours after Level 1 &rarr; Escalates to <em>Mandal Officer</em>.</li>
              <li><strong>Intermediate Check (+1h):</strong> 1 hour after Level 2 &rarr; <em>Remains at Level 2</em> (no premature escalation).</li>
              <li><strong>Level 3 Escalation (+2h after L2):</strong> 2 full hours after Level 2 &rarr; Escalates to <em>District Administrator</em>.</li>
            </ol>
          </div>

          <div className="pt-1 flex items-center justify-between text-[10px]">
            <span className="text-slate-400">Consistent source of truth • Reload-safe &bull; No duplicate history</span>
            <button
              type="button"
              onClick={handleResetDemoData}
              className="text-rose-300 hover:text-rose-100 underline font-semibold transition-colors"
            >
              Reset Seeded Demo Complaints
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
