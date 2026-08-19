export const fmt = {
  kg: (v) => v == null ? '—' : `${Number(v).toLocaleString('en-IN', { maximumFractionDigits: 1 })} kg`,
  num: (v) => v == null ? '—' : Number(v).toLocaleString('en-IN'),
  pct: (v) => v == null ? '—' : `${Number(v).toFixed(1)}%`,
  date: (v) => v ? new Date(v).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—',
  time: (v) => v ? new Date(v).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '—',
  datetime: (v) => v ? new Date(v).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—',
  reltime: (v) => {
    if (!v) return '—';
    const diff = Date.now() - new Date(v).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Just now';
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  },
};

export function statusBadge(status) {
  const map = {
    completed:   'badge-green',
    in_progress: 'badge-yellow',
    overflow:    'badge-red',
    open:        'badge-red',
    resolved:    'badge-green',
    active:      'badge-green',
    inactive:    'badge-gray',
  };
  return map[status] || 'badge-gray';
}
