import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Search, CheckCircle2, Clock, AlertTriangle, ShieldAlert,
  MapPin, ExternalLink, Calendar, User, ArrowLeft, RefreshCw,
  XCircle, RotateCcw, Image as ImageIcon, Shield, Sparkles
} from 'lucide-react';
import Logo from '../../components/ui/Logo';
import {
  getComplaintById,
  calculateSlaStatus,
  reopenComplaint,
  getCurrentTime,
  getComplaints
} from '../../utils/complaintStorage';

export default function PublicComplaintTracker() {
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const [searchId, setSearchId] = useState(routeId || '');
  const [ticket, setTicket] = useState(null);
  const [searched, setSearched] = useState(false);
  const [reopenText, setReopenText] = useState('');
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenMsg, setReopenMsg] = useState('');

  // Sample recent tickets for quick demonstration
  const [sampleTickets, setSampleTickets] = useState([]);

  useEffect(() => {
    const list = getComplaints();
    setSampleTickets(list.slice(0, 5));

    if (routeId) {
      handleLookup(routeId);
    }
  }, [routeId]);

  const handleLookup = (idToFind) => {
    const target = idToFind || searchId;
    if (!target.trim()) return;

    const found = getComplaintById(target.trim());
    setTicket(found);
    setSearched(true);
    setSearchId(target.trim().toUpperCase());
  };

  const handleReopenSubmit = (e) => {
    e.preventDefault();
    if (!ticket) return;

    if (!reopenText.trim()) {
      alert('Please provide a brief reason for reopening.');
      return;
    }

    const updated = reopenComplaint(ticket.id, reopenText.trim());
    setTicket(updated);
    setShowReopenModal(false);
    setReopenText('');
    setReopenMsg('Complaint has been successfully reopened and queued for supervisor re-inspection.');
  };

  const sla = ticket ? calculateSlaStatus(ticket, getCurrentTime()) : null;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5"><CheckCircle2 size={13} /> Resolved</span>;
      case 'in_progress':
        return <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5"><RefreshCw size={13} className="animate-spin" /> In Progress</span>;
      case 'escalated':
        return <span className="px-3 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5"><ShieldAlert size={13} /> Escalated</span>;
      case 'reopened':
        return <span className="px-3 py-1 rounded-full bg-purple-100 text-purple-900 dark:bg-purple-950/80 dark:text-purple-300 border border-purple-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5"><RotateCcw size={13} /> Reopened</span>;
      case 'assigned':
        return <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-900 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5"><Clock size={13} /> Assigned to Worker</span>;
      case 'rejected':
        return <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border border-gray-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5"><XCircle size={13} /> Rejected</span>;
      default:
        return <span className="px-3 py-1 rounded-full bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 font-black text-xs uppercase tracking-wider flex items-center gap-1.5"><Clock size={13} /> Submitted</span>;
    }
  };

  const getEscalationPill = (level) => {
    switch (level) {
      case 1:
        return <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400 text-amber-700 dark:text-amber-300 text-xs font-bold">Level 1: Sanitation Supervisor</span>;
      case 2:
        return <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 border border-purple-400 text-purple-700 dark:text-purple-300 text-xs font-bold">Level 2: Mandal Officer</span>;
      case 3:
        return <span className="px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-400 text-red-700 dark:text-red-300 text-xs font-bold animate-pulse">Level 3: District Administrator</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 text-xs font-bold">Level 0: Assigned Field Worker</span>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-100 dark:from-[#060e14] dark:via-[#09151c] dark:to-[#060e14] p-4 sm:p-6 md:p-10 select-none">
      
      {/* Top Header */}
      <div className="max-w-4xl mx-auto flex items-center justify-between pb-6 border-b border-slate-200/80 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Logo size="md" showText={true} />
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/complaints/new"
            className="px-3.5 py-1.5 rounded-xl border border-emerald-300 dark:border-emerald-700/60 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 hover:bg-emerald-100 transition-all shadow-xs"
          >
            <span>+ Report Problem</span>
          </Link>
          <Link
            to="/login"
            className="px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            Staff Login
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-4xl mx-auto my-6 space-y-6">
        
        {/* Search Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-black uppercase tracking-wider border border-emerald-300">
            <Shield size={12} className="text-emerald-600" /> Citizen Transparency Portal
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Track Garbage Complaint Status
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-gray-400 max-w-xl mx-auto">
            Enter your unique Complaint ID (e.g. <strong className="font-mono text-emerald-700 dark:text-emerald-400">TKT-WG-9041</strong>) to check live municipal cleanup progress, SLA countdowns, and escalation status.
          </p>
        </div>

        {/* Search Input Bar */}
        <div className="max-w-xl mx-auto">
          <form
            onSubmit={(e) => { e.preventDefault(); handleLookup(); }}
            className="flex items-center gap-2 p-1.5 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-md"
          >
            <div className="pl-3 text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.toUpperCase())}
              placeholder="Enter Complaint ID (e.g. TKT-WG-9041)"
              required
              className="flex-1 px-2 py-2 text-xs sm:text-sm font-mono font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none uppercase"
            />
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
            >
              Track
            </button>
          </form>

          {/* Quick Demo Suggestions */}
          {sampleTickets.length > 0 && (
            <div className="mt-3 flex items-center justify-center gap-1.5 flex-wrap text-[11px] text-slate-400">
              <span>Quick Demo IDs:</span>
              {sampleTickets.map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => { setSearchId(st.id); handleLookup(st.id); }}
                  className="px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-emerald-100 dark:hover:bg-emerald-950 font-mono text-slate-700 dark:text-gray-300 font-bold transition-colors"
                >
                  {st.id}
                </button>
              ))}
            </div>
          )}
        </div>

        {reopenMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-300 text-emerald-800 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span>{reopenMsg}</span>
          </div>
        )}

        {/* Search Results Display */}
        {ticket ? (
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fade-in">
            
            {/* Top Status Banner */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-gray-800 pb-5">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-xl font-black font-mono text-slate-900 dark:text-white">
                    {ticket.id}
                  </h2>
                  {getStatusBadge(ticket.status)}
                  {ticket.escalation_level > 0 && getEscalationPill(ticket.escalation_level)}
                </div>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
                  Submitted: <strong>{new Date(ticket.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>
                </p>
              </div>

              {/* SLA Status Pill */}
              {sla && (
                <div className={`px-4 py-2 rounded-2xl border text-right ${sla.badgeClass}`}>
                  <div className="flex items-center gap-1.5 justify-end">
                    <Clock size={14} />
                    <span className="text-xs font-black uppercase tracking-wider">{sla.label}</span>
                  </div>
                  <p className="text-[11px] font-bold mt-0.5">{sla.timeText}</p>
                </div>
              )}
            </div>

            {/* Core Ticket Information Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Left Column: Complaint Details */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-gray-700/60 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Complaint Details</span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white leading-snug">
                    {ticket.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {ticket.description}
                  </p>
                  <div className="pt-2 flex items-center gap-2 flex-wrap text-xs">
                    <span className="px-2.5 py-1 rounded-xl bg-slate-200/80 dark:bg-gray-700 font-bold text-slate-700 dark:text-gray-300">
                      {ticket.problem_type_label || ticket.problem_type}
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-100 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold">
                      {ticket.sla_hours} Hours Response SLA
                    </span>
                  </div>
                </div>

                {/* Location & Coordinates */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-gray-700/60 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Location &amp; Jurisdiction</span>
                  <div className="space-y-1 text-xs">
                    <p className="font-bold text-slate-800 dark:text-gray-200 flex items-center gap-1.5">
                      <MapPin size={14} className="text-emerald-600 flex-shrink-0" />
                      <span>{ticket.address}</span>
                    </p>
                    <p className="text-slate-500 pl-5">
                      {ticket.ward}, {ticket.mandal} Mandal, West Godavari District
                    </p>
                    {ticket.coordinates && (
                      <div className="pl-5 pt-1 flex items-center gap-2 font-mono text-[11px] text-emerald-700 dark:text-emerald-400">
                        <span>Lat: {ticket.coordinates.lat}, Lng: {ticket.coordinates.lng}</span>
                        <a
                          href={`https://www.openstreetmap.org/?mlat=${ticket.coordinates.lat}&mlon=${ticket.coordinates.lng}#map=16/${ticket.coordinates.lat}/${ticket.coordinates.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 underline text-emerald-600 hover:text-emerald-800"
                        >
                          <span>Open Map</span>
                          <ExternalLink size={10} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Photo Evidence if Present */}
                {ticket.photo_url && (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Reported Photo Evidence</span>
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-700 max-w-sm">
                      <img src={ticket.photo_url} alt="Reported garbage" className="w-full h-48 object-cover" />
                    </div>
                  </div>
                )}

              </div>

              {/* Right Column: Resolution & Status Progression */}
              <div className="space-y-4">
                
                {/* Resolution Status Box (if resolved) */}
                {ticket.status === 'resolved' ? (
                  <div className="p-5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700/60 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        Municipal Clearance Completed
                      </span>
                      <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-bold">
                        {new Date(ticket.resolved_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 dark:text-gray-200 italic bg-white/70 dark:bg-gray-800/70 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800">
                      &ldquo;{ticket.resolution_remarks || 'The garbage dump was inspected, cleared, and transported to the designated municipal processing yard.'}&rdquo;
                    </p>

                    {ticket.resolution_photo_url && (
                      <div className="space-y-1">
                        <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300">After-Cleanup Proof Photograph</span>
                        <img src={ticket.resolution_photo_url} alt="After cleanup" className="w-full h-44 object-cover rounded-xl border border-emerald-300" />
                      </div>
                    )}

                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => setShowReopenModal(true)}
                        className="px-3.5 py-1.5 rounded-xl border border-emerald-400 bg-white dark:bg-gray-800 hover:bg-emerald-50 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <RotateCcw size={12} />
                        <span>Problem Not Solved? Reopen Ticket</span>
                      </button>
                    </div>
                  </div>
                ) : ticket.status === 'rejected' ? (
                  <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-300 text-xs space-y-2">
                    <span className="font-bold text-red-800 dark:text-red-300 flex items-center gap-1.5">
                      <XCircle size={16} /> Complaint Rejected
                    </span>
                    <p className="text-slate-700 dark:text-gray-300 italic">
                      Reason: {ticket.rejection_reason || 'Does not fall within public municipal boundaries or duplicate entry.'}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-300/80 dark:border-amber-700/60 text-xs space-y-2">
                    <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                      <Clock size={15} /> Active Resolution Pipeline
                    </span>
                    <p className="text-slate-600 dark:text-gray-300">
                      Assigned to Local Sanitation Team in <strong>{ticket.ward}</strong>. The municipal worker has an active SLA deadline of:
                    </p>
                    <p className="font-mono text-sm font-black text-amber-700 dark:text-amber-300">
                      {new Date(ticket.sla_deadline).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}

                {/* Status Timeline */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-gray-700/60 space-y-3">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Workflow &amp; Escalation Timeline</span>
                  <div className="space-y-3 pl-2 border-l-2 border-emerald-500/40 ml-2 text-xs">
                    {ticket.status_history?.map((h, i) => (
                      <div key={i} className="relative pl-3 space-y-0.5">
                        <span className="absolute -left-[19px] top-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-gray-900" />
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-800 dark:text-gray-200 capitalize">
                            {h.status.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(h.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400">
                          {h.remarks}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>

          </div>
        ) : searched ? (
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl p-8 shadow-sm text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-gray-800 text-slate-400 flex items-center justify-center mx-auto">
              <Search size={22} />
            </div>
            <h3 className="text-base font-bold text-slate-800 dark:text-white">
              No Complaint Found with ID &ldquo;{searchId}&rdquo;
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Please double check the Complaint ID format (e.g. TKT-WG-9041). If you just filed a complaint on another browser, note that demo records exist in the reporting browser.
            </p>
            <div className="pt-2">
              <Link
                to="/complaints/new"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500 transition-all"
              >
                File a New Complaint
              </Link>
            </div>
          </div>
        ) : null}

        {/* Prototype Demo Banner */}
        <div className="p-4 rounded-2xl bg-slate-100/70 dark:bg-gray-800/40 border border-slate-200 dark:border-gray-700/60 text-center text-xs text-slate-500 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-gray-300">
            📌 Static Demonstration Prototype Notice
          </p>
          <p className="text-[11px] opacity-80 max-w-2xl mx-auto">
            This public tracking interface simulates real-time municipal responses within West Godavari District. Demonstration tickets are stored safely in local browser persistence without sending live government SMS or notifications.
          </p>
        </div>

      </div>

      {/* Reopen Modal */}
      {showReopenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-purple-600 flex items-center gap-1.5">
                <RotateCcw size={14} /> Request Re-inspection / Reopen
              </span>
              <button
                type="button"
                onClick={() => setShowReopenModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <XCircle size={18} />
              </button>
            </div>

            <form onSubmit={handleReopenSubmit} className="space-y-4 text-xs">
              <p className="text-slate-600 dark:text-gray-300">
                If the garbage problem has returned or was not cleared satisfactorily, specify the details below. This will notify the Sanitation Supervisor immediately.
              </p>

              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Reason for Reopening *
                </label>
                <textarea
                  value={reopenText}
                  onChange={(e) => setReopenText(e.target.value)}
                  rows={3}
                  required
                  placeholder="e.g. Garbage remains on curb, or fresh dumping occurred immediately after collection..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReopenModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-md"
                >
                  Submit Reopen Request
                </button>
              </div>
            </form>
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
