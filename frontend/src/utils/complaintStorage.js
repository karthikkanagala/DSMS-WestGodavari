/**
 * complaintStorage.js — Public Garbage Complaint Tickets, SLA Calculation & Multi-Tier Escalation
 * 
 * Features:
 * - 100% Client-Side Local Storage Persistence
 * - Dynamic SLA Tracking (Default 3 Hours, Configurable 2 or 3 Hours)
 * - Time calculations based on ISO timestamps
 * - Automated 4-Level Escalation:
 *     Level 0: Assigned Field Worker (Collector)
 *     Level 1: Sanitation Supervisor (Triggered when SLA expires)
 *     Level 2: Mandal Officer (Triggered 1h past Level 1)
 *     Level 3: District Administrator (Triggered 1h past Level 2)
 * - Controllable Test Clock (Simulate +15m, +1h, +2h, +3h for demonstration/testing)
 * - Realistic West Godavari District Mandals, Wards, Workers & Seed Complaints
 */

export const COMPLAINT_STORAGE_KEY = 'dsms_public_complaints';
export const SLA_CONFIG_STORAGE_KEY = 'dsms_sla_config';
export const TEST_CLOCK_STORAGE_KEY = 'dsms_test_clock_offset_ms';

export const PROBLEM_TYPES = [
  { id: 'overflowing_bin', label: 'Overflowing Public Bin', icon: 'Trash2', priority: 'high', defaultHours: 3 },
  { id: 'accumulated_road', label: 'Garbage Accumulated on Road', icon: 'AlertTriangle', priority: 'medium', defaultHours: 3 },
  { id: 'uncollected_garbage', label: 'Uncollected Door-to-Door Garbage', icon: 'Truck', priority: 'medium', defaultHours: 3 },
  { id: 'open_dumping', label: 'Open Dumping / Illegal Waste Dump', icon: 'Flame', priority: 'urgent', defaultHours: 2 },
  { id: 'other_sanitation', label: 'Other Public Sanitation Issue', icon: 'HelpCircle', priority: 'standard', defaultHours: 3 },
];

export const WEST_GODAVARI_MANDALS = [
  'Tadepalligudem', 'Bhimavaram', 'Eluru', 'Tanuku', 'Palakollu',
  'Narsapur', 'Jangareddygudem', 'Kovvur', 'Chintalapudi', 'Akividu',
  'Attili', 'Denduluru', 'Kamavarapukota', 'Mogalthur', 'Pentapadu',
  'Polavaram', 'Undi', 'Veeravasaram', 'Devarapalli'
];

export const MANDAL_WARDS_MAP = {
  'Tadepalligudem': [
    'Ward 01 - Market Center',
    'Ward 04 - Housing Board Colony',
    'Ward 07 - Subba Rao Peta',
    'Ward 12 - Railway Station Road',
    'Ward 15 - K.N. Road Commercial Zone',
    'Ward 18 - RTC Bus Stand Circle'
  ],
  'Bhimavaram': [
    'Ward 01 - Someswara Temple Area',
    'Ward 03 - Balusumoodi Junction',
    'Ward 08 - Sunday Vegetable Market',
    'Ward 14 - Mavullamma Temple Street',
    'Ward 21 - J.P. Road Commercial Corridor',
    'Ward 24 - DNR College Road'
  ],
  'Eluru': [
    'Ward 03 - Fire Station Road',
    'Ward 09 - Powerpet Railway Gate',
    'Ward 14 - Old Bus Stand Area',
    'Ward 22 - Collectorate Enclave'
  ],
  'Tanuku': [
    'Ward 02 - Rashtrapati Road',
    'Ward 05 - Velpuru Road Junction',
    'Ward 09 - Cinema Hall Street'
  ],
  'Palakollu': [
    'Ward 01 - Ksheera Ramalingeswara Temple',
    'Ward 04 - Gandhi Bomma Center',
    'Ward 07 - Main Bazaar'
  ],
  'Narsapur': [
    'Ward 02 - Ferry Point Road',
    'Ward 06 - Dutch Building Area',
    'Ward 10 - Steamer Road'
  ],
  'Jangareddygudem': [
    'Ward 01 - Bus Stand Road',
    'Ward 04 - Agency Market Yard',
    'Ward 08 - Cinema Road'
  ]
};

export const MUNICIPAL_WORKERS = [
  { id: 'u_collector', username: 'collector', name: 'K. Venkateswarlu', role: 'collector', mandal: 'Tadepalligudem', ward: 'Ward 12 - Railway Station Road', phone: '+91 94401 23401' },
  { id: 'u_collector1', username: 'collector1', name: 'M. Appa Rao', role: 'collector', mandal: 'Bhimavaram', ward: 'Ward 08 - Sunday Vegetable Market', phone: '+91 94401 23402' },
  { id: 'u_collector2', username: 'collector2', name: 'P. Srinivasa Rao', role: 'collector', mandal: 'Eluru', ward: 'Ward 09 - Powerpet Railway Gate', phone: '+91 94401 23403' },
  { id: 'u_collector3', username: 'collector3', name: 'S. Rajesh', role: 'collector', mandal: 'Tanuku', ward: 'Ward 02 - Rashtrapati Road', phone: '+91 94401 23404' },
];

export const DEFAULT_SLA_CONFIG = {
  default_sla_hours: 3,         // Standard resolution SLA
  urgent_sla_hours: 2,          // Urgent category SLA
  warning_threshold_mins: 30,   // "Approaching Deadline" warning window
  level1_interval_mins: 0,      // Level 1 (Supervisor): Instant when SLA expires
  level2_interval_mins: 60,     // Level 2 (Mandal Officer): +60m after Level 1
  level3_interval_mins: 60,     // Level 3 (District Admin): +60m after Level 2
};

// ---------------------------------------------------------------------------
// Controllable Test Clock Utilities (Supports instant time advancement)
// ---------------------------------------------------------------------------
export function getTestClockOffsetMs() {
  try {
    const raw = localStorage.getItem(TEST_CLOCK_STORAGE_KEY);
    return raw ? parseInt(raw, 10) || 0 : 0;
  } catch (_) {
    return 0;
  }
}

export function setTestClockOffsetMs(offsetMs) {
  try {
    localStorage.setItem(TEST_CLOCK_STORAGE_KEY, String(offsetMs));
  } catch (_) {}
}

export function advanceTestClock(hoursToAdd) {
  const current = getTestClockOffsetMs();
  const addedMs = hoursToAdd * 60 * 60 * 1000;
  setTestClockOffsetMs(current + addedMs);
  evaluateAllTickets();
}

export function resetTestClock() {
  setTestClockOffsetMs(0);
  evaluateAllTickets();
}

export function getCurrentTime() {
  return Date.now() + getTestClockOffsetMs();
}

// ---------------------------------------------------------------------------
// SLA Configuration Storage
// ---------------------------------------------------------------------------
export function getSlaConfig() {
  try {
    const raw = localStorage.getItem(SLA_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_SLA_CONFIG;
    return { ...DEFAULT_SLA_CONFIG, ...JSON.parse(raw) };
  } catch (_) {
    return DEFAULT_SLA_CONFIG;
  }
}

export function setSlaConfig(newConfig) {
  try {
    const updated = { ...getSlaConfig(), ...newConfig };
    localStorage.setItem(SLA_CONFIG_STORAGE_KEY, JSON.stringify(updated));
    evaluateAllTickets();
    return updated;
  } catch (_) {
    return DEFAULT_SLA_CONFIG;
  }
}

// ---------------------------------------------------------------------------
// Dynamic SLA Status Calculation
// ---------------------------------------------------------------------------
export function calculateSlaStatus(ticket, now = getCurrentTime()) {
  if (!ticket) {
    return {
      status: 'unknown',
      badgeClass: 'badge-gray',
      label: 'Unknown',
      timeText: '—',
      remainingMs: 0,
      overdueMs: 0,
      percentElapsed: 0,
      isOverdue: false,
    };
  }

  const createdTime = new Date(ticket.created_at).getTime();
  const deadlineTime = new Date(ticket.sla_deadline).getTime();
  const totalDurationMs = Math.max(deadlineTime - createdTime, 1);
  const isResolved = ticket.status === 'resolved';
  const isRejected = ticket.status === 'rejected';

  if (isRejected) {
    return {
      status: 'rejected',
      badgeClass: 'bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border-rose-300',
      label: 'Rejected',
      timeText: 'Complaint Rejected',
      remainingMs: 0,
      overdueMs: 0,
      percentElapsed: 100,
      isOverdue: false,
    };
  }

  if (isResolved) {
    const resolvedTime = ticket.resolved_at ? new Date(ticket.resolved_at).getTime() : now;
    const resolvedOnTime = resolvedTime <= deadlineTime;
    return {
      status: resolvedOnTime ? 'resolved_on_time' : 'resolved_late',
      badgeClass: resolvedOnTime
        ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300'
        : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300',
      label: resolvedOnTime ? 'Resolved On-Time' : 'Resolved Late',
      timeText: resolvedOnTime
        ? `Completed within ${formatDuration(resolvedTime - createdTime)}`
        : `Completed late (overdue by ${formatDuration(resolvedTime - deadlineTime)})`,
      remainingMs: 0,
      overdueMs: resolvedOnTime ? 0 : resolvedTime - deadlineTime,
      percentElapsed: 100,
      isOverdue: !resolvedOnTime,
      resolvedOnTime,
    };
  }

  const remainingMs = deadlineTime - now;
  const elapsedMs = now - createdTime;
  const percentElapsed = Math.min(Math.max(Math.round((elapsedMs / totalDurationMs) * 100), 0), 100);
  const config = getSlaConfig();
  const warningWindowMs = (config.warning_threshold_mins || 30) * 60 * 1000;

  if (remainingMs <= 0) {
    const overdueMs = Math.abs(remainingMs);
    return {
      status: 'overdue',
      badgeClass: 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border-red-300 animate-pulse',
      label: 'SLA Overdue',
      timeText: `Overdue by ${formatDuration(overdueMs)}`,
      remainingMs: 0,
      overdueMs,
      percentElapsed: 100,
      isOverdue: true,
    };
  }

  if (remainingMs <= warningWindowMs) {
    return {
      status: 'approaching_deadline',
      badgeClass: 'bg-amber-100 text-amber-900 dark:bg-amber-950/80 dark:text-amber-300 border-amber-300',
      label: 'Approaching Deadline',
      timeText: `${formatDuration(remainingMs)} remaining (Urgent)`,
      remainingMs,
      overdueMs: 0,
      percentElapsed,
      isOverdue: false,
    };
  }

  return {
    status: 'within_sla',
    badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-emerald-300',
    label: 'Within SLA',
    timeText: `${formatDuration(remainingMs)} remaining`,
    remainingMs,
    overdueMs: 0,
    percentElapsed,
    isOverdue: false,
  };
}

export function formatDuration(ms) {
  if (ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

// ---------------------------------------------------------------------------
// Multi-Tier Escalation Evaluation
// ---------------------------------------------------------------------------
export function evaluateTicketEscalation(ticket, now = getCurrentTime(), config = getSlaConfig()) {
  if (!ticket || ticket.status === 'resolved' || ticket.status === 'rejected') {
    return { updated: false, ticket };
  }

  const deadlineTime = new Date(ticket.sla_deadline).getTime();
  let currentLevel = ticket.escalation_level || 0;
  let targetLevel = currentLevel;
  let reasonsToAdd = [];

  const l2ThresholdMs = deadlineTime + (config.level2_interval_mins || 60) * 60 * 1000;
  const l3ThresholdMs = l2ThresholdMs + (config.level3_interval_mins || 60) * 60 * 1000;

  // Level 1: When SLA deadline passes
  if (now > deadlineTime && currentLevel < 1) {
    targetLevel = 1;
    reasonsToAdd.push({
      level: 1,
      timestamp: new Date(deadlineTime).toISOString(),
      reason: `SLA resolution deadline (${ticket.sla_hours || 3} hours) expired without resolution. Automatically escalated to Sanitation Supervisor.`,
      target_role: 'supervisor',
      actor: 'DSMS Automated SLA Engine',
    });
  }

  // Level 2: When +1h past Level 1 passes
  if (now > l2ThresholdMs && currentLevel < 2) {
    targetLevel = 2;
    reasonsToAdd.push({
      level: 2,
      timestamp: new Date(l2ThresholdMs).toISOString(),
      reason: 'Unresolved 1 hour past Level 1 escalation. Automatically escalated to Mandal Officer for direct mandal-level intervention.',
      target_role: 'mandal_officer',
      actor: 'DSMS Automated SLA Engine',
    });
  }

  // Level 3: When +1h past Level 2 passes
  if (now > l3ThresholdMs && currentLevel < 3) {
    targetLevel = 3;
    reasonsToAdd.push({
      level: 3,
      timestamp: new Date(l3ThresholdMs).toISOString(),
      reason: 'Critical SLA default: Unresolved 2 hours past supervisor escalation. Escalated to District Administrator for district-wide action.',
      target_role: 'district_admin',
      actor: 'DSMS Automated SLA Engine',
    });
  }

  if (targetLevel > currentLevel) {
    const updatedHistory = [...(ticket.escalation_history || []), ...reasonsToAdd];
    const newStatus = ticket.status === 'submitted' || ticket.status === 'assigned' ? 'escalated' : ticket.status;

    const updatedTicket = {
      ...ticket,
      escalation_level: targetLevel,
      status: newStatus,
      is_overdue: true,
      last_escalated_at: new Date(now).toISOString(),
      escalation_history: updatedHistory,
      status_history: [
        ...(ticket.status_history || []),
        {
          status: newStatus,
          timestamp: new Date(now).toISOString(),
          updated_by: 'DSMS Automated SLA Engine',
          remarks: `Automated escalation to Level ${targetLevel} (${reasonsToAdd[reasonsToAdd.length - 1]?.target_role})`,
        },
      ],
    };
    return { updated: true, ticket: updatedTicket };
  }

  return { updated: false, ticket };
}

export function evaluateAllTickets() {
  const tickets = getStoredComplaintsRaw();
  if (!tickets || tickets.length === 0) return [];
  const now = getCurrentTime();
  const config = getSlaConfig();
  let hasChanges = false;

  const evaluated = tickets.map((t) => {
    const res = evaluateTicketEscalation(t, now, config);
    if (res.updated) hasChanges = true;
    return res.ticket;
  });

  if (hasChanges) {
    saveStoredComplaintsRaw(evaluated);
  }
  return evaluated;
}

// ---------------------------------------------------------------------------
// LocalStorage Low-Level Handlers
// ---------------------------------------------------------------------------
function getStoredComplaintsRaw() {
  try {
    const raw = localStorage.getItem(COMPLAINT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (_) {
    return null;
  }
}

function saveStoredComplaintsRaw(list) {
  try {
    localStorage.setItem(COMPLAINT_STORAGE_KEY, JSON.stringify(list));
    return true;
  } catch (err) {
    console.warn('[complaintStorage] Storage quota issue', err);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Seed Data Initialization
// ---------------------------------------------------------------------------
export function getInitialDemoComplaints() {
  const now = Date.now();
  const h = 60 * 60 * 1000;

  return [
    {
      id: 'TKT-WG-9041',
      title: 'Overflowing Public Bin near RTC Bus Stand',
      problem_type: 'overflowing_bin',
      problem_type_label: 'Overflowing Public Bin',
      description: 'Heavy market waste spilling onto the main walkway near bay 4. Stray animals scattering plastic bags.',
      district: 'West Godavari',
      mandal: 'Tadepalligudem',
      ward: 'Ward 18 - RTC Bus Stand Circle',
      address: 'Near Platform 4 Entry, RTC Bus Complex, Tadepalligudem',
      coordinates: { lat: 16.8145, lng: 81.5284 },
      gps_source: 'Browser Geolocation',
      photo_url: null,
      reporter: { name: 'S. Kameswara Rao', phone: '+91 98480 11223', is_anonymous: false },
      created_at: new Date(now - 0.25 * h).toISOString(),
      sla_hours: 3,
      sla_deadline: new Date(now + 2.75 * h).toISOString(),
      status: 'submitted',
      escalation_level: 0,
      assigned_worker: null,
      assigned_ward: 'Ward 18 - RTC Bus Stand Circle',
      status_history: [
        { status: 'submitted', timestamp: new Date(now - 0.25 * h).toISOString(), updated_by: 'Public Citizen', remarks: 'Complaint submitted via Public Web Portal' }
      ],
      escalation_history: [],
      resolution_remarks: null,
      resolution_photo_url: null,
      resolved_at: null,
      rejection_reason: null,
    },
    {
      id: 'TKT-WG-9042',
      title: 'Commercial Waste Dump on Railway Station Road',
      problem_type: 'accumulated_road',
      problem_type_label: 'Garbage Accumulated on Road',
      description: 'Several sacks of commercial cardboard, wet vegetable waste and plastic bags dumped along the curb.',
      district: 'West Godavari',
      mandal: 'Tadepalligudem',
      ward: 'Ward 12 - Railway Station Road',
      address: 'Opposite State Bank Branch, Railway Station Road',
      coordinates: { lat: 16.8172, lng: 81.5310 },
      gps_source: 'Browser Geolocation',
      photo_url: null,
      reporter: { name: 'M. Lakshmi', phone: '+91 99890 33445', is_anonymous: false },
      created_at: new Date(now - 1.8 * h).toISOString(),
      sla_hours: 3,
      sla_deadline: new Date(now + 1.2 * h).toISOString(),
      status: 'in_progress',
      escalation_level: 0,
      assigned_worker: { username: 'collector', name: 'K. Venkateswarlu', phone: '+91 94401 23401' },
      assigned_ward: 'Ward 12 - Railway Station Road',
      status_history: [
        { status: 'submitted', timestamp: new Date(now - 1.8 * h).toISOString(), updated_by: 'Public Citizen', remarks: 'Complaint submitted' },
        { status: 'assigned', timestamp: new Date(now - 1.5 * h).toISOString(), updated_by: 'Sanitation Supervisor', remarks: 'Assigned to K. Venkateswarlu (Route 3)' },
        { status: 'in_progress', timestamp: new Date(now - 0.6 * h).toISOString(), updated_by: 'K. Venkateswarlu', remarks: 'Mini tipper dispatched to site. Cleanup in progress.' }
      ],
      escalation_history: [],
      resolution_remarks: null,
      resolution_photo_url: null,
      resolved_at: null,
      rejection_reason: null,
    },
    {
      id: 'TKT-WG-9043',
      title: 'Uncollected Wet Waste near Sunday Vegetable Market',
      problem_type: 'uncollected_garbage',
      problem_type_label: 'Uncollected Door-to-Door Garbage',
      description: 'Rotting vegetable heaps near market entrance. Strong foul odor affecting nearby residences. Urgent clearance needed.',
      district: 'West Godavari',
      mandal: 'Bhimavaram',
      ward: 'Ward 08 - Sunday Vegetable Market',
      address: 'Gate 2, Sunday Vegetable Market, Bhimavaram Town',
      coordinates: { lat: 16.5412, lng: 81.5245 },
      gps_source: 'Browser Geolocation',
      photo_url: null,
      reporter: { name: 'Ch. Prasad', phone: '+91 94405 55667', is_anonymous: false },
      created_at: new Date(now - 2.65 * h).toISOString(),
      sla_hours: 3,
      sla_deadline: new Date(now + 0.35 * h).toISOString(), // ~21 mins remaining (Approaching Deadline!)
      status: 'in_progress',
      escalation_level: 0,
      assigned_worker: { username: 'collector1', name: 'M. Appa Rao', phone: '+91 94401 23402' },
      assigned_ward: 'Ward 08 - Sunday Vegetable Market',
      status_history: [
        { status: 'submitted', timestamp: new Date(now - 2.65 * h).toISOString(), updated_by: 'Public Citizen', remarks: 'Complaint submitted' },
        { status: 'assigned', timestamp: new Date(now - 2.2 * h).toISOString(), updated_by: 'Sanitation Supervisor', remarks: 'Assigned to M. Appa Rao' },
        { status: 'in_progress', timestamp: new Date(now - 1.0 * h).toISOString(), updated_by: 'M. Appa Rao', remarks: 'Compact compactor en-route' }
      ],
      escalation_history: [],
      resolution_remarks: null,
      resolution_photo_url: null,
      resolved_at: null,
      rejection_reason: null,
    },
    {
      id: 'TKT-WG-9044',
      title: 'Open Dumping near Subba Rao Peta Drainage Canal',
      problem_type: 'open_dumping',
      problem_type_label: 'Open Dumping / Illegal Waste Dump',
      description: 'Construction debris mixed with municipal garbage blocking stormwater drain channel.',
      district: 'West Godavari',
      mandal: 'Tadepalligudem',
      ward: 'Ward 07 - Subba Rao Peta',
      address: 'Canal Bund Road, Subba Rao Peta',
      coordinates: { lat: 16.8190, lng: 81.5210 },
      gps_source: 'Manual / Map Pin',
      photo_url: null,
      reporter: { name: 'G. Satyanarayana', phone: '+91 98481 77889', is_anonymous: false },
      created_at: new Date(now - 3.7 * h).toISOString(),
      sla_hours: 3,
      sla_deadline: new Date(now - 0.7 * h).toISOString(), // Overdue by 42m (Level 1 Escalated!)
      status: 'escalated',
      escalation_level: 1,
      assigned_worker: { username: 'collector', name: 'K. Venkateswarlu', phone: '+91 94401 23401' },
      assigned_ward: 'Ward 07 - Subba Rao Peta',
      status_history: [
        { status: 'submitted', timestamp: new Date(now - 3.7 * h).toISOString(), updated_by: 'Public Citizen', remarks: 'Complaint submitted' },
        { status: 'assigned', timestamp: new Date(now - 3.2 * h).toISOString(), updated_by: 'Supervisor', remarks: 'Assigned to Ward 07 Team' },
        { status: 'escalated', timestamp: new Date(now - 0.7 * h).toISOString(), updated_by: 'DSMS Automated SLA Engine', remarks: 'Escalated to Sanitation Supervisor due to SLA breach' }
      ],
      escalation_history: [
        {
          level: 1,
          timestamp: new Date(now - 0.7 * h).toISOString(),
          reason: '3-hour SLA deadline expired without resolution. Escalated to Sanitation Supervisor.',
          target_role: 'supervisor',
          actor: 'DSMS Automated SLA Engine',
        }
      ],
      resolution_remarks: null,
      resolution_photo_url: null,
      resolved_at: null,
      rejection_reason: null,
    },
    {
      id: 'TKT-WG-9045',
      title: 'Uncleared Fish Market Waste on Balusumoodi Junction',
      problem_type: 'accumulated_road',
      problem_type_label: 'Garbage Accumulated on Road',
      description: 'Fish market offal abandoned on road. High contamination and vulture nuisance reported by shop owners.',
      district: 'West Godavari',
      mandal: 'Bhimavaram',
      ward: 'Ward 03 - Balusumoodi Junction',
      address: 'Balusumoodi Main Road, near Old Fish Market',
      coordinates: { lat: 16.5450, lng: 81.5290 },
      gps_source: 'Browser Geolocation',
      photo_url: null,
      reporter: { name: 'B. Venkat Rao', phone: '+91 91770 99881', is_anonymous: false },
      created_at: new Date(now - 4.6 * h).toISOString(),
      sla_hours: 3,
      sla_deadline: new Date(now - 1.6 * h).toISOString(), // Overdue by 1h 36m (Level 2 Escalated!)
      status: 'escalated',
      escalation_level: 2,
      assigned_worker: { username: 'collector1', name: 'M. Appa Rao', phone: '+91 94401 23402' },
      assigned_ward: 'Ward 03 - Balusumoodi Junction',
      status_history: [
        { status: 'submitted', timestamp: new Date(now - 4.6 * h).toISOString(), updated_by: 'Citizen', remarks: 'Reported' },
        { status: 'assigned', timestamp: new Date(now - 4.1 * h).toISOString(), updated_by: 'Supervisor', remarks: 'Assigned' },
        { status: 'escalated', timestamp: new Date(now - 1.6 * h).toISOString(), updated_by: 'DSMS SLA Engine', remarks: 'Level 1 escalation to Supervisor' },
        { status: 'escalated', timestamp: new Date(now - 0.6 * h).toISOString(), updated_by: 'DSMS SLA Engine', remarks: 'Level 2 escalation to Mandal Officer' }
      ],
      escalation_history: [
        {
          level: 1,
          timestamp: new Date(now - 1.6 * h).toISOString(),
          reason: '3-hour SLA deadline expired without resolution.',
          target_role: 'supervisor',
          actor: 'DSMS Automated SLA Engine',
        },
        {
          level: 2,
          timestamp: new Date(now - 0.6 * h).toISOString(),
          reason: 'Unresolved 1 hour past Level 1. Escalated to Mandal Officer for executive intervention.',
          target_role: 'mandal_officer',
          actor: 'DSMS Automated SLA Engine',
        }
      ],
      resolution_remarks: null,
      resolution_photo_url: null,
      resolved_at: null,
      rejection_reason: null,
    },
    {
      id: 'TKT-WG-9046',
      title: 'Hazardous Waste Dump near Fire Station Road',
      problem_type: 'open_dumping',
      problem_type_label: 'Open Dumping / Illegal Waste Dump',
      description: 'Commercial waste, glass bottles, and chemical packaging dumped across 50 meters near fire station.',
      district: 'West Godavari',
      mandal: 'Eluru',
      ward: 'Ward 03 - Fire Station Road',
      address: 'Fire Station Road, Opposite Government High School, Eluru',
      coordinates: { lat: 16.7110, lng: 81.0965 },
      gps_source: 'Browser Geolocation',
      photo_url: null,
      reporter: { name: 'K. Subba Rao', phone: '+91 94900 12345', is_anonymous: false },
      created_at: new Date(now - 5.8 * h).toISOString(),
      sla_hours: 3,
      sla_deadline: new Date(now - 2.8 * h).toISOString(), // Overdue by 2h 48m (Level 3 Escalated to District Admin!)
      status: 'escalated',
      escalation_level: 3,
      assigned_worker: { username: 'collector2', name: 'P. Srinivasa Rao', phone: '+91 94401 23403' },
      assigned_ward: 'Ward 03 - Fire Station Road',
      status_history: [
        { status: 'submitted', timestamp: new Date(now - 5.8 * h).toISOString(), updated_by: 'Citizen', remarks: 'Complaint submitted' },
        { status: 'assigned', timestamp: new Date(now - 5.0 * h).toISOString(), updated_by: 'Supervisor', remarks: 'Assigned to Ward 03 worker' },
        { status: 'escalated', timestamp: new Date(now - 2.8 * h).toISOString(), updated_by: 'DSMS SLA Engine', remarks: 'Level 1 escalation to Supervisor' },
        { status: 'escalated', timestamp: new Date(now - 1.8 * h).toISOString(), updated_by: 'DSMS SLA Engine', remarks: 'Level 2 escalation to Mandal Officer' },
        { status: 'escalated', timestamp: new Date(now - 0.8 * h).toISOString(), updated_by: 'DSMS SLA Engine', remarks: 'Level 3 escalation to District Administrator' }
      ],
      escalation_history: [
        { level: 1, timestamp: new Date(now - 2.8 * h).toISOString(), reason: '3-hour SLA expired without resolution.', target_role: 'supervisor', actor: 'DSMS SLA Engine' },
        { level: 2, timestamp: new Date(now - 1.8 * h).toISOString(), reason: 'Overdue +1h past supervisor notice.', target_role: 'mandal_officer', actor: 'DSMS SLA Engine' },
        { level: 3, timestamp: new Date(now - 0.8 * h).toISOString(), reason: 'Critical unresolved delay: Escalated to District Collector & Magistrate.', target_role: 'district_admin', actor: 'DSMS SLA Engine' }
      ],
      resolution_remarks: null,
      resolution_photo_url: null,
      resolved_at: null,
      rejection_reason: null,
    },
    {
      id: 'TKT-WG-9047',
      title: 'Housing Board Colony Overflowing Waste Bin Cleared',
      problem_type: 'overflowing_bin',
      problem_type_label: 'Overflowing Public Bin',
      description: 'Public community bin BIN-0004 overflowing with dry plastic packaging and household refuse.',
      district: 'West Godavari',
      mandal: 'Tadepalligudem',
      ward: 'Ward 04 - Housing Board Colony',
      address: 'Park Lane, Phase 2, Housing Board Colony',
      coordinates: { lat: 16.8120, lng: 81.5240 },
      gps_source: 'Browser Geolocation',
      photo_url: null,
      reporter: { name: 'A. Rambabu', phone: '+91 98492 44556', is_anonymous: false },
      created_at: new Date(now - 4.0 * h).toISOString(),
      sla_hours: 3,
      sla_deadline: new Date(now - 1.0 * h).toISOString(),
      status: 'resolved',
      escalation_level: 0,
      assigned_worker: { username: 'collector', name: 'K. Venkateswarlu', phone: '+91 94401 23401' },
      assigned_ward: 'Ward 04 - Housing Board Colony',
      status_history: [
        { status: 'submitted', timestamp: new Date(now - 4.0 * h).toISOString(), updated_by: 'Citizen', remarks: 'Reported' },
        { status: 'assigned', timestamp: new Date(now - 3.5 * h).toISOString(), updated_by: 'Supervisor', remarks: 'Assigned' },
        { status: 'in_progress', timestamp: new Date(now - 2.5 * h).toISOString(), updated_by: 'K. Venkateswarlu', remarks: 'Vehicle on site' },
        { status: 'resolved', timestamp: new Date(now - 1.8 * h).toISOString(), updated_by: 'K. Venkateswarlu', remarks: 'Site cleared and sanitized with bleaching powder' }
      ],
      escalation_history: [],
      resolution_remarks: 'Bin cleared and emptied into compact vehicle. Bleaching powder disinfected over area. Area clean.',
      resolution_photo_url: null,
      resolved_at: new Date(now - 1.8 * h).toISOString(), // Resolved in 2.2h (Within 3h SLA!)
      rejection_reason: null,
    },
    {
      id: 'TKT-WG-9048',
      title: 'Reopened: Mavullamma Temple Street Littering',
      problem_type: 'accumulated_road',
      problem_type_label: 'Garbage Accumulated on Road',
      description: 'Morning festival flower waste was partially removed, but heavy trash residue still remains near the temple entrance.',
      district: 'West Godavari',
      mandal: 'Bhimavaram',
      ward: 'Ward 14 - Mavullamma Temple Street',
      address: 'North Archway, Mavullamma Temple Street',
      coordinates: { lat: 16.5401, lng: 81.5262 },
      gps_source: 'Browser Geolocation',
      photo_url: null,
      reporter: { name: 'V. Srimannarayana', phone: '+91 99491 88776', is_anonymous: false },
      created_at: new Date(now - 3.2 * h).toISOString(),
      sla_hours: 3,
      sla_deadline: new Date(now - 0.2 * h).toISOString(),
      status: 'reopened',
      escalation_level: 1,
      assigned_worker: { username: 'collector1', name: 'M. Appa Rao', phone: '+91 94401 23402' },
      assigned_ward: 'Ward 14 - Mavullamma Temple Street',
      status_history: [
        { status: 'submitted', timestamp: new Date(now - 3.2 * h).toISOString(), updated_by: 'Citizen', remarks: 'Submitted' },
        { status: 'resolved', timestamp: new Date(now - 1.5 * h).toISOString(), updated_by: 'M. Appa Rao', remarks: 'Marked resolved' },
        { status: 'reopened', timestamp: new Date(now - 0.5 * h).toISOString(), updated_by: 'Public Citizen', remarks: 'Citizen requested re-inspection: Residue not fully cleared.' }
      ],
      escalation_history: [
        { level: 1, timestamp: new Date(now - 0.2 * h).toISOString(), reason: 'Reopened complaint crossed original SLA window. Escalated to Supervisor for verification.', target_role: 'supervisor', actor: 'DSMS Automated SLA Engine' }
      ],
      resolution_remarks: null,
      resolution_photo_url: null,
      resolved_at: null,
      rejection_reason: null,
    }
  ];
}

// ---------------------------------------------------------------------------
// High-Level Complaints API
// ---------------------------------------------------------------------------
export function getComplaints() {
  let list = getStoredComplaintsRaw();
  if (!list || list.length === 0) {
    list = getInitialDemoComplaints();
    saveStoredComplaintsRaw(list);
  }
  return evaluateAllTickets();
}

export function getComplaintById(id) {
  if (!id) return null;
  const list = getComplaints();
  const normalized = id.trim().toUpperCase();
  return list.find((c) => c.id.toUpperCase() === normalized) || null;
}

export function createComplaint(formData) {
  const existing = getComplaints();
  const config = getSlaConfig();
  const now = getCurrentTime();

  const slaHours = formData.sla_hours || (formData.priority === 'urgent' ? config.urgent_sla_hours : config.default_sla_hours);
  const deadlineMs = now + slaHours * 60 * 60 * 1000;
  
  // Format unique ticket ID: TKT-WG-XXXX
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const ticketId = `TKT-WG-${randomSuffix}`;

  // Auto-assign worker based on mandal
  const matchedWorker = MUNICIPAL_WORKERS.find((w) => w.mandal.toLowerCase() === (formData.mandal || '').toLowerCase()) || MUNICIPAL_WORKERS[0];

  const newTicket = {
    id: ticketId,
    title: formData.title.trim(),
    problem_type: formData.problem_type,
    problem_type_label: PROBLEM_TYPES.find(p => p.id === formData.problem_type)?.label || 'General Sanitation Issue',
    description: formData.description.trim(),
    district: 'West Godavari',
    mandal: formData.mandal || 'Tadepalligudem',
    ward: formData.ward || 'Ward 01 - Market Center',
    address: formData.address.trim(),
    coordinates: formData.coordinates || null,
    gps_source: formData.coordinates ? (formData.gps_source || 'Browser Geolocation') : 'None',
    photo_url: formData.photo_url || null,
    reporter: {
      name: formData.reporter_name?.trim() || 'Anonymous Citizen',
      phone: formData.reporter_phone?.trim() || '',
      email: formData.reporter_email?.trim() || '',
      is_anonymous: !formData.reporter_name,
    },
    created_at: new Date(now).toISOString(),
    sla_hours: slaHours,
    sla_deadline: new Date(deadlineMs).toISOString(),
    status: 'assigned',
    escalation_level: 0,
    assigned_worker: {
      username: matchedWorker.username,
      name: matchedWorker.name,
      phone: matchedWorker.phone,
    },
    assigned_ward: formData.ward || 'Ward 01 - Market Center',
    status_history: [
      {
        status: 'submitted',
        timestamp: new Date(now).toISOString(),
        updated_by: formData.reporter_name ? `${formData.reporter_name} (Citizen)` : 'Anonymous Citizen',
        remarks: 'Complaint registered via Public Portal',
      },
      {
        status: 'assigned',
        timestamp: new Date(now).toISOString(),
        updated_by: 'DSMS Automated Dispatch Engine',
        remarks: `Assigned to Field Collector ${matchedWorker.name} (${matchedWorker.ward})`,
      }
    ],
    escalation_history: [],
    resolution_remarks: null,
    resolution_photo_url: null,
    resolved_at: null,
    rejection_reason: null,
  };

  const updatedList = [newTicket, ...existing];
  saveStoredComplaintsRaw(updatedList);
  return newTicket;
}

export function updateComplaint(id, updates) {
  const existing = getComplaints();
  const index = existing.findIndex((c) => c.id.toUpperCase() === id.trim().toUpperCase());
  if (index === -1) return null;

  const current = existing[index];
  const updatedTicket = { ...current, ...updates };
  existing[index] = updatedTicket;
  saveStoredComplaintsRaw(existing);
  return updatedTicket;
}

export function updateComplaintStatus(id, newStatus, remarks = '', user = null, additionalFields = {}) {
  const ticket = getComplaintById(id);
  if (!ticket) return null;

  const now = getCurrentTime();
  const updatedBy = user?.full_name || user?.username || 'Municipal Staff';

  const historyEntry = {
    status: newStatus,
    timestamp: new Date(now).toISOString(),
    updated_by: updatedBy,
    remarks: remarks || `Status transitioned to ${newStatus}`,
  };

  const updates = {
    ...additionalFields,
    status: newStatus,
    status_history: [...(ticket.status_history || []), historyEntry],
  };

  return updateComplaint(id, updates);
}

export function reassignComplaint(id, workerUsername, remarks = '', user = null) {
  const ticket = getComplaintById(id);
  if (!ticket) return null;

  const worker = MUNICIPAL_WORKERS.find((w) => w.username === workerUsername) || {
    username: workerUsername,
    name: workerUsername,
    phone: '',
  };

  const now = getCurrentTime();
  const updaterName = user?.full_name || user?.username || 'Sanitation Supervisor';

  const historyEntry = {
    status: ticket.status,
    timestamp: new Date(now).toISOString(),
    updated_by: updaterName,
    remarks: `Reassigned to ${worker.name}. ${remarks}`.trim(),
  };

  const updates = {
    assigned_worker: {
      username: worker.username,
      name: worker.name,
      phone: worker.phone,
    },
    status_history: [...(ticket.status_history || []), historyEntry],
  };

  return updateComplaint(id, updates);
}

export function resolveComplaint(id, remarks, resolutionPhotoUrl = null, user = null) {
  const ticket = getComplaintById(id);
  if (!ticket) return null;

  if (!remarks || remarks.trim().length < 5) {
    throw new Error('Resolution remarks (minimum 5 characters) are mandatory.');
  }

  const now = getCurrentTime();
  const updaterName = user?.full_name || user?.username || 'Municipal Collector';

  const historyEntry = {
    status: 'resolved',
    timestamp: new Date(now).toISOString(),
    updated_by: updaterName,
    remarks: `Resolution confirmed: ${remarks.trim()}`,
  };

  const updates = {
    status: 'resolved',
    resolved_at: new Date(now).toISOString(),
    resolution_remarks: remarks.trim(),
    resolution_photo_url: resolutionPhotoUrl || ticket.resolution_photo_url || null,
    status_history: [...(ticket.status_history || []), historyEntry],
  };

  return updateComplaint(id, updates);
}

export function rejectComplaint(id, rejectionReason, user = null) {
  if (!rejectionReason || rejectionReason.trim().length < 5) {
    throw new Error('A mandatory rejection reason (minimum 5 characters) must be provided.');
  }

  const ticket = getComplaintById(id);
  if (!ticket) return null;

  const now = getCurrentTime();
  const updaterName = user?.full_name || user?.username || 'Sanitation Officer';

  const historyEntry = {
    status: 'rejected',
    timestamp: new Date(now).toISOString(),
    updated_by: updaterName,
    remarks: `Complaint Rejected. Reason: ${rejectionReason.trim()}`,
  };

  const updates = {
    status: 'rejected',
    rejection_reason: rejectionReason.trim(),
    status_history: [...(ticket.status_history || []), historyEntry],
  };

  return updateComplaint(id, updates);
}

export function reopenComplaint(id, citizenRemarks) {
  const ticket = getComplaintById(id);
  if (!ticket) return null;

  const now = getCurrentTime();
  const historyEntry = {
    status: 'reopened',
    timestamp: new Date(now).toISOString(),
    updated_by: 'Public Citizen',
    remarks: `Reopened by Citizen: ${citizenRemarks || 'Problem persists or was not satisfactorily cleared.'}`,
  };

  const updates = {
    status: 'reopened',
    resolved_at: null,
    resolution_remarks: null,
    status_history: [...(ticket.status_history || []), historyEntry],
  };

  return updateComplaint(id, updates);
}

export function resetComplaintsToDemo() {
  const initial = getInitialDemoComplaints();
  saveStoredComplaintsRaw(initial);
  resetTestClock();
  return initial;
}
