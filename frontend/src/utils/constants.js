/**
 * App-wide constants — edit here to retune behaviour.
 */

// Heatmap breakpoints (kg). Matches colours: green → yellow → orange → red
export const HEATMAP_BREAKS = {
  LOW:    200,   // 0–200 kg   → green
  MEDIUM: 500,   // 201–500 kg → yellow
  HIGH:   800,   // 501–800 kg → orange
  // > 800 kg    → red
};

export function heatmapColor(waste_kg) {
  if (waste_kg <= HEATMAP_BREAKS.LOW)    return '#22c55e';
  if (waste_kg <= HEATMAP_BREAKS.MEDIUM) return '#facc15';
  if (waste_kg <= HEATMAP_BREAKS.HIGH)   return '#f97316';
  return '#ef4444';
}

// Roles
export const ROLES = {
  SYSADMIN:       'system_admin',
  DISTRICT_ADMIN: 'district_admin',
  MANDAL_OFFICER: 'mandal_officer',
  SUPERVISOR:     'supervisor',
  COLLECTOR:      'collector',
};

export const ROLE_LABELS = {
  system_admin:    'System Administrator',
  district_admin:  'District Administrator',
  mandal_officer:  'Mandal Officer',
  supervisor:      'Sanitation Supervisor',
  collector:       'Waste Collector',
};

// Poll interval
export const POLL_INTERVAL = 30000;
