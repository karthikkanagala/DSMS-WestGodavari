import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../auth/AuthContext';
import {
  AlertTriangle, CheckCircle2, Clock, MapPin, Search, Filter,
  ShieldAlert, RefreshCw, ChevronRight, User, Eye, ArrowUpRight,
  Truck, Flame, HelpCircle, Trash2, X, Send, Camera, Upload,
  ExternalLink, RotateCcw, XCircle, Sliders, Settings
} from 'lucide-react';
import {
  getComplaints,
  calculateSlaStatus,
  updateComplaintStatus,
  reassignComplaint,
  resolveComplaint,
  rejectComplaint,
  getCurrentTime,
  MUNICIPAL_WORKERS,
  WEST_GODAVARI_MANDALS,
  getSlaConfig,
  setSlaConfig
} from '../../utils/complaintStorage';
import TestClockControls from '../../components/complaints/TestClockControls';
import { validateImageFile, compressImageToDataUrl } from '../../utils/mockStorage';

export default function ManageComplaints() {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [filterTab, setFilterTab] = useState('all'); // all, urgent, escalated, resolved, in_progress
  const [searchQuery, setSearchQuery] = useState('');
  const [mandalFilter, setMandalFilter] = useState('all');

  // Modals
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);

  // Form Inputs
  const [resolveRemarks, setResolveRemarks] = useState('');
  const [resolvePhoto, setResolvePhoto] = useState(null);
  const [reassignWorker, setReassignWorker] = useState('collector');
  const [reassignRemarks, setReassignRemarks] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [actionError, setActionError] = useState('');

  // SLA Config state (SysAdmin)
  const [configForm, setConfigForm] = useState(getSlaConfig());

  const refreshData = () => {
    const list = getComplaints();
    setComplaints(list);
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 15000);
    return () => clearInterval(interval);
  }, []);

  // Filter complaints based on user's authorized role and selected filters
  const filteredComplaints = useMemo(() => {
    const now = getCurrentTime();

    return complaints.filter((item) => {
      // Role-based scope restrictions
      if (user?.role === 'collector') {
        // Collector sees complaints assigned to them or in their mandal
        const isAssigned = item.assigned_worker?.username === user.username;
        const matchesMandal = item.mandal?.toLowerCase() === (user.mandal || 'tadepalligudem').toLowerCase();
        if (!isAssigned && !matchesMandal) return false;
      } else if (user?.role === 'mandal_officer') {
        // Mandal officer restricted to their mandal
        if (user.mandal && item.mandal?.toLowerCase() !== user.mandal.toLowerCase()) {
          return false;
        }
      }

      // Mandal filter dropdown
      if (mandalFilter !== 'all' && item.mandal !== mandalFilter) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesQuery =
          item.id.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          item.ward.toLowerCase().includes(q) ||
          item.address.toLowerCase().includes(q) ||
          item.mandal.toLowerCase().includes(q);
        if (!matchesQuery) return false;
      }

      // Tab filters
      const sla = calculateSlaStatus(item, now);
      if (filterTab === 'in_progress') {
        return item.status === 'in_progress' || item.status === 'assigned';
      }
      if (filterTab === 'urgent') {
        return sla.status === 'approaching_deadline';
      }
      if (filterTab === 'escalated') {
        return item.escalation_level > 0 || sla.status === 'overdue';
      }
      if (filterTab === 'resolved') {
        return item.status === 'resolved';
      }

      return true;
    });
  }, [complaints, user, filterTab, searchQuery, mandalFilter]);

  // Summary Metrics
  const stats = useMemo(() => {
    const now = getCurrentTime();
    let total = complaints.length;
    let inProgress = 0;
    let approaching = 0;
    let overdue = 0;
    let resolved = 0;
    let resolvedOnTime = 0;

    complaints.forEach((c) => {
      const sla = calculateSlaStatus(c, now);
      if (c.status === 'in_progress' || c.status === 'assigned') inProgress++;
      if (sla.status === 'approaching_deadline') approaching++;
      if (sla.status === 'overdue' || c.escalation_level > 0) overdue++;
      if (c.status === 'resolved') {
        resolved++;
        if (sla.resolvedOnTime) resolvedOnTime++;
      }
    });

    const complianceRate = resolved > 0 ? Math.round((resolvedOnTime / resolved) * 100) : 100;

    return { total, inProgress, approaching, overdue, resolved, resolvedOnTime, complianceRate };
  }, [complaints]);

  // Action Handlers
  const handleStartWork = (ticket) => {
    updateComplaintStatus(ticket.id, 'in_progress', 'Collector acknowledged ticket and commenced on-site sanitation.', user);
    refreshData();
  };

  const handleOpenResolve = (ticket) => {
    setSelectedTicket(ticket);
    setResolveRemarks('');
    setResolvePhoto(null);
    setActionError('');
    setShowResolveModal(true);
  };

  const handleConfirmResolve = (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      resolveComplaint(selectedTicket.id, resolveRemarks, resolvePhoto, user);
      setShowResolveModal(false);
      refreshData();
    } catch (err) {
      setActionError(err.message || 'Failed to resolve complaint.');
    }
  };

  const handleOpenReassign = (ticket) => {
    setSelectedTicket(ticket);
    setReassignWorker(ticket.assigned_worker?.username || 'collector');
    setReassignRemarks('');
    setActionError('');
    setShowReassignModal(true);
  };

  const handleConfirmReassign = (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      reassignComplaint(selectedTicket.id, reassignWorker, reassignRemarks, user);
      setShowReassignModal(false);
      refreshData();
    } catch (err) {
      setActionError(err.message || 'Failed to reassign.');
    }
  };

  const handleOpenReject = (ticket) => {
    setSelectedTicket(ticket);
    setRejectReason('');
    setActionError('');
    setShowRejectModal(true);
  };

  const handleConfirmReject = (e) => {
    e.preventDefault();
    if (!selectedTicket) return;
    try {
      rejectComplaint(selectedTicket.id, rejectReason, user);
      setShowRejectModal(false);
      refreshData();
    } catch (err) {
      setActionError(err.message || 'Failed to reject.');
    }
  };

  const handleSaveConfig = (e) => {
    e.preventDefault();
    setSlaConfig(configForm);
    setShowConfigModal(false);
    refreshData();
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'resolved':
        return <span className="badge badge-green">Resolved</span>;
      case 'in_progress':
        return <span className="badge badge-yellow">In Progress</span>;
      case 'escalated':
        return <span className="badge badge-red animate-pulse">Escalated</span>;
      case 'assigned':
        return <span className="badge badge-blue">Assigned</span>;
      case 'reopened':
        return <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold text-[10px]">Reopened</span>;
      case 'rejected':
        return <span className="badge badge-gray">Rejected</span>;
      default:
        return <span className="badge badge-gray">Submitted</span>;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in select-none">
      
      {/* Test Clock Simulation Toolbar */}
      <TestClockControls onClockChange={refreshData} />

      {/* Header and Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <Trash2 className="text-emerald-600" size={24} />
              {user?.role === 'collector'
                ? 'My Assigned Complaints'
                : user?.role === 'supervisor'
                ? 'Supervisor Grievance & Escalation Desk'
                : user?.role === 'mandal_officer'
                ? `Mandal Complaints (${user.mandal || 'Tadepalligudem'})`
                : 'District Garbage Complaints & SLA Center'}
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
            Real-time citizen reporting with automated 2–3 hour SLA deadlines and multi-tier escalation hierarchy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {user?.role === 'system_admin' && (
            <button
              type="button"
              onClick={() => { setConfigForm(getSlaConfig()); setShowConfigModal(true); }}
              className="px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 font-bold text-xs flex items-center gap-1.5 transition-all shadow-xs"
            >
              <Sliders size={14} />
              <span>SLA Settings</span>
            </button>
          )}

          <a
            href="/complaints/new"
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <span>+ Public Report Page</span>
            <ExternalLink size={12} />
          </a>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-xs">
          <span className="text-[10px] font-black uppercase text-slate-400 block tracking-wider">Total Tickets</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{stats.total}</span>
            <span className="text-[10px] font-bold text-emerald-600">Active</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-xs">
          <span className="text-[10px] font-black uppercase text-amber-500 block tracking-wider">In Progress</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">{stats.inProgress}</span>
            <span className="text-[10px] font-bold text-slate-400">On field</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-amber-300/80 dark:border-amber-700/60 shadow-xs bg-amber-50/20">
          <span className="text-[10px] font-black uppercase text-amber-700 dark:text-amber-400 block tracking-wider">&lt;30m Remaining</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-amber-700 dark:text-amber-300 font-mono">{stats.approaching}</span>
            <span className="text-[10px] font-extrabold text-amber-600">Urgent</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-red-300/80 dark:border-red-800 shadow-xs bg-red-50/20">
          <span className="text-[10px] font-black uppercase text-red-600 block tracking-wider">Escalated / Overdue</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-red-600 dark:text-red-400 font-mono">{stats.overdue}</span>
            <span className="text-[10px] font-bold text-red-500 animate-pulse">Breached</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-xs">
          <span className="text-[10px] font-black uppercase text-emerald-600 block tracking-wider">Resolved</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{stats.resolved}</span>
            <span className="text-[10px] font-bold text-slate-400">{stats.resolvedOnTime} on-time</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 shadow-xs">
          <span className="text-[10px] font-black uppercase text-indigo-500 block tracking-wider">SLA Compliance</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">{stats.complianceRate}%</span>
            <span className="text-[10px] font-bold text-emerald-600">Target 90%+</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-3xl p-4 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
            <button
              type="button"
              onClick={() => setFilterTab('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterTab === 'all'
                  ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200'
              }`}
            >
              All ({complaints.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('in_progress')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterTab === 'in_progress'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200'
              }`}
            >
              Active / In Progress ({stats.inProgress})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('urgent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterTab === 'urgent'
                  ? 'bg-amber-700 text-white'
                  : 'bg-amber-100/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 hover:bg-amber-200/60'
              }`}
            >
              ⚠️ &lt;30m Deadline ({stats.approaching})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('escalated')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterTab === 'escalated'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-100/60 dark:bg-red-950/40 text-red-900 dark:text-red-300 hover:bg-red-200/60'
              }`}
            >
              🚨 Overdue &amp; Escalated ({stats.overdue})
            </button>
            <button
              type="button"
              onClick={() => setFilterTab('resolved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                filterTab === 'resolved'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200'
              }`}
            >
              Resolved ({stats.resolved})
            </button>
          </div>

          {/* Search & Mandal Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-60">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ticket, ward, address..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {user?.role !== 'mandal_officer' && (
              <select
                value={mandalFilter}
                onChange={(e) => setMandalFilter(e.target.value)}
                className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 text-xs font-semibold focus:outline-none"
              >
                <option value="all">All Mandals</option>
                {WEST_GODAVARI_MANDALS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
          </div>

        </div>
      </div>

      {/* Complaints List Table / Responsive Cards */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-3xl overflow-hidden shadow-xs">
        {filteredComplaints.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500/60" />
            <p className="text-sm font-bold text-slate-600 dark:text-gray-300">No complaints matching current filter</p>
            <p className="text-xs">All citizen sanitation grievances in this scope are cleared or within acceptable SLA.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/70 dark:bg-gray-800/50 border-b border-slate-200/80 dark:border-gray-800 text-slate-500 dark:text-gray-400 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Ticket ID</th>
                  <th className="py-3 px-4">Problem &amp; Location</th>
                  <th className="py-3 px-4">Assigned Worker</th>
                  <th className="py-3 px-4">SLA Countdown &amp; Status</th>
                  <th className="py-3 px-4">Escalation</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {filteredComplaints.map((item) => {
                  const sla = calculateSlaStatus(item, getCurrentTime());
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-50/50 dark:hover:bg-gray-850/50 transition-colors"
                    >
                      {/* Ticket ID & Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-xs">
                          {item.id}
                        </div>
                        <span className="text-[10px] text-slate-400 font-semibold block">
                          {new Date(item.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <div className="pt-1">{getStatusBadge(item.status)}</div>
                      </td>

                      {/* Problem & Location */}
                      <td className="py-3 px-4 min-w-[200px] max-w-[280px]">
                        <p className="font-bold text-slate-900 dark:text-white leading-tight truncate">
                          {item.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate flex items-center gap-1 mt-0.5">
                          <MapPin size={11} className="text-emerald-600 flex-shrink-0" />
                          <span>{item.ward}, {item.mandal}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">{item.address}</p>
                      </td>

                      {/* Assigned Worker */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <User size={12} className="text-slate-400" />
                          <span className="font-semibold text-slate-800 dark:text-gray-200">
                            {item.assigned_worker?.name || 'Unassigned'}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400 pl-4 block">
                          {item.assigned_ward || item.ward}
                        </span>
                      </td>

                      {/* SLA Countdown & Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[11px] font-bold ${sla.badgeClass}`}>
                          <Clock size={12} />
                          <span>{sla.timeText}</span>
                        </div>
                        <span className="block text-[10px] text-slate-400 mt-0.5">
                          Deadline: {new Date(item.sla_deadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Escalation Level */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.escalation_level === 0 ? (
                          <span className="text-[11px] text-slate-500 font-semibold">Level 0 (Worker)</span>
                        ) : item.escalation_level === 1 ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 font-bold text-[10px] border border-amber-300">
                            L1: Supervisor
                          </span>
                        ) : item.escalation_level === 2 ? (
                          <span className="px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300 font-bold text-[10px] border border-purple-300">
                            L2: Mandal Officer
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 font-black text-[10px] border border-red-300 animate-pulse">
                            L3: District Collector
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          
                          {/* View Detail Button */}
                          <button
                            type="button"
                            onClick={() => { setSelectedTicket(item); setShowDetailModal(true); }}
                            className="p-1.5 rounded-lg border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-300 transition-colors"
                            title="View Full Ticket Details & Timeline"
                          >
                            <Eye size={13} />
                          </button>

                          {/* Worker Start Work */}
                          {item.status === 'assigned' && (
                            <button
                              type="button"
                              onClick={() => handleStartWork(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] transition-all shadow-xs"
                              title="Begin work on site"
                            >
                              Start Work
                            </button>
                          )}

                          {/* Resolve Button (for workers or supervisors) */}
                          {item.status !== 'resolved' && item.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleOpenResolve(item)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-all shadow-xs flex items-center gap-1"
                            >
                              <CheckCircle2 size={12} />
                              <span>Resolve</span>
                            </button>
                          )}

                          {/* Supervisor / Admin Reassign */}
                          {(user?.role === 'supervisor' || user?.role === 'mandal_officer' || user?.role === 'system_admin' || user?.role === 'district_admin') && item.status !== 'resolved' && (
                            <button
                              type="button"
                              onClick={() => handleOpenReassign(item)}
                              className="px-2 py-1.5 rounded-lg border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-700 dark:text-gray-300 font-bold text-[11px]"
                              title="Reassign to another municipal collector"
                            >
                              Reassign
                            </button>
                          )}

                          {/* Reject Option */}
                          {(user?.role === 'supervisor' || user?.role === 'system_admin') && item.status !== 'resolved' && item.status !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleOpenReject(item)}
                              className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
                              title="Reject invalid or duplicate complaint"
                            >
                              <XCircle size={13} />
                            </button>
                          )}

                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Detail View Modal */}
      {showDetailModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-slate-900 dark:text-white shadow-2xl">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">{selectedTicket.id}</span>
                {getStatusBadge(selectedTicket.status)}
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-5 text-xs">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">{selectedTicket.title}</h3>
                <p className="text-slate-600 dark:text-gray-300 whitespace-pre-wrap">{selectedTicket.description}</p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-800/60 border border-slate-100 dark:border-gray-700/60">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Mandal</span>
                  <span className="font-semibold">{selectedTicket.mandal}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Ward / Area</span>
                  <span className="font-semibold">{selectedTicket.ward}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">SLA Target</span>
                  <span className="font-semibold text-emerald-600">{selectedTicket.sla_hours} Hours</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Created</span>
                  <span className="font-semibold">{new Date(selectedTicket.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Deadline</span>
                  <span className="font-semibold text-amber-600">{new Date(selectedTicket.sla_deadline).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Assigned Staff</span>
                  <span className="font-semibold">{selectedTicket.assigned_worker?.name || 'Unassigned'}</span>
                </div>
              </div>

              {selectedTicket.coordinates && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50 flex items-center justify-between">
                  <span className="font-mono text-[11px] text-emerald-800 dark:text-emerald-300">
                    GPS: {selectedTicket.coordinates.lat}, {selectedTicket.coordinates.lng} ({selectedTicket.gps_source})
                  </span>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${selectedTicket.coordinates.lat}&mlon=${selectedTicket.coordinates.lng}#map=16/${selectedTicket.coordinates.lat}/${selectedTicket.coordinates.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-emerald-600 hover:text-emerald-800 font-bold underline"
                  >
                    <span>View Map</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Photos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedTicket.photo_url && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase block">Reported Photo</span>
                    <img src={selectedTicket.photo_url} alt="Reported" className="w-full h-40 object-cover rounded-xl border" />
                  </div>
                )}
                {selectedTicket.resolution_photo_url && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 uppercase block">After-Cleanup Photo</span>
                    <img src={selectedTicket.resolution_photo_url} alt="Resolved" className="w-full h-40 object-cover rounded-xl border border-emerald-400" />
                  </div>
                )}
              </div>

              {selectedTicket.resolution_remarks && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-slate-800 dark:text-gray-200 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Resolution Remarks</span>
                  <p className="italic">&ldquo;{selectedTicket.resolution_remarks}&rdquo;</p>
                </div>
              )}

              {/* Status and Escalation Timeline */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Complete Audit Timeline</span>
                <div className="space-y-2 pl-3 border-l-2 border-slate-200 dark:border-gray-700 ml-1">
                  {selectedTicket.status_history?.map((sh, idx) => (
                    <div key={idx} className="relative pl-3 text-[11px]">
                      <span className="absolute -left-[18px] top-1 w-2 h-2 rounded-full bg-slate-400" />
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-gray-200">{sh.updated_by}</span>
                        <span className="text-[10px] text-slate-400">{new Date(sh.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p className="text-slate-500">{sh.remarks}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            <div className="p-4 border-t border-slate-100 dark:border-gray-800 flex justify-end gap-2">
              <button onClick={() => setShowDetailModal(false)} className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-gray-800 font-bold text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Resolve Modal */}
      {showResolveModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                <CheckCircle2 size={16} /> Mark Complaint Resolved ({selectedTicket.id})
              </span>
              <button onClick={() => setShowResolveModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <p className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{actionError}</p>
            )}

            <form onSubmit={handleConfirmResolve} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Resolution Remarks * (Mandatory)
                </label>
                <textarea
                  value={resolveRemarks}
                  onChange={(e) => setResolveRemarks(e.target.value)}
                  rows={3}
                  required
                  placeholder="e.g. Garbage cleared using mini tipper, disinfected with bleaching powder. Site clean."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  After-Cleanup Proof Photograph (Optional)
                </label>
                {resolvePhoto ? (
                  <div className="relative inline-block border rounded-xl overflow-hidden">
                    <img src={resolvePhoto} alt="After cleanup" className="w-48 h-32 object-cover" />
                    <button
                      type="button"
                      onClick={() => setResolvePhoto(null)}
                      className="absolute top-1 right-1 p-1 rounded-full bg-red-600 text-white"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const compressed = await compressImageToDataUrl(file, 800, 0.7);
                      setResolvePhoto(compressed);
                    }}
                    className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-emerald-50 file:text-emerald-700 file:font-bold hover:file:bg-emerald-100"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowResolveModal(false)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md">
                  Confirm Resolution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Reassign Modal */}
      {showReassignModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                <Truck size={16} /> Reassign Worker ({selectedTicket.id})
              </span>
              <button onClick={() => setShowReassignModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleConfirmReassign} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Assign to Municipal Worker *
                </label>
                <select
                  value={reassignWorker}
                  onChange={(e) => setReassignWorker(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 font-semibold focus:outline-none"
                >
                  {MUNICIPAL_WORKERS.map((w) => (
                    <option key={w.username} value={w.username}>
                      {w.name} ({w.mandal} - {w.ward})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Reassignment Instructions / Remarks
                </label>
                <textarea
                  value={reassignRemarks}
                  onChange={(e) => setReassignRemarks(e.target.value)}
                  rows={2}
                  placeholder="e.g. Dispatched replacement compactor due to high volume..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 resize-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowReassignModal(false)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md">
                  Confirm Reassignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Reject Modal */}
      {showRejectModal && selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-red-600 flex items-center gap-1.5">
                <XCircle size={16} /> Reject Complaint ({selectedTicket.id})
              </span>
              <button onClick={() => setShowRejectModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <p className="p-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-semibold">{actionError}</p>
            )}

            <form onSubmit={handleConfirmReject} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Mandatory Rejection Reason *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  rows={3}
                  required
                  placeholder="e.g. Site falls outside public municipal jurisdiction (private railway land) or duplicate report..."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 resize-none font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowRejectModal(false)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold shadow-md">
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: SLA Configuration Settings (SysAdmin) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-3xl w-full max-w-md p-6 text-slate-900 dark:text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-gray-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                <Settings size={16} /> Configure Prototype SLA Parameters
              </span>
              <button onClick={() => setShowConfigModal(false)} className="p-1 rounded-lg text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Default Resolution SLA (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={configForm.default_sla_hours}
                  onChange={(e) => setConfigForm({ ...configForm, default_sla_hours: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 font-semibold"
                />
                <span className="text-[10px] text-slate-400">Standard resolution time (3 hours recommended)</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Approaching Deadline Warning Window (Minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="60"
                  value={configForm.warning_threshold_mins}
                  onChange={(e) => setConfigForm({ ...configForm, warning_threshold_mins: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 font-semibold"
                />
                <span className="text-[10px] text-slate-400">Triggers amber warning before deadline (default 30 mins)</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Level 2 Mandal Escalation Interval (Minutes past Level 1)
                </label>
                <input
                  type="number"
                  min="15"
                  max="240"
                  value={configForm.level2_interval_mins}
                  onChange={(e) => setConfigForm({ ...configForm, level2_interval_mins: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 font-semibold"
                />
                <span className="text-[10px] text-slate-400">Default 120 minutes (2 full hours after Level 1)</span>
              </div>

              <div>
                <label className="block font-bold text-slate-700 dark:text-gray-300 mb-1">
                  Level 3 District Escalation Interval (Minutes past Level 2)
                </label>
                <input
                  type="number"
                  min="15"
                  max="240"
                  value={configForm.level3_interval_mins}
                  onChange={(e) => setConfigForm({ ...configForm, level3_interval_mins: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 font-semibold"
                />
                <span className="text-[10px] text-slate-400">Default 120 minutes (2 full hours after Level 2)</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowConfigModal(false)} className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 font-semibold">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-md">
                  Save SLA Config
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
