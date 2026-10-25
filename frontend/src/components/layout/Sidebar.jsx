/**
 * Sidebar — Stitch-Grade Navigation Bar:
 * Logo top-left, full nav with unique non-duplicate routes per role, user avatar+online dot at bottom.
 */
import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS, ROLES } from '../../utils/constants';
import {
  LayoutDashboard, Layers, Map, Trash2, ClipboardList,
  AlertTriangle, BarChart2, Activity, Bell, Users,
  Settings, Database, ChevronRight, ChevronLeft,
  LogOut, Wrench, ShieldCheck, X, Home, Leaf
} from 'lucide-react';
import Logo from '../ui/Logo';

const navConfig = {
  [ROLES.SYSADMIN]: [
    { label: 'Dashboard',         icon: LayoutDashboard, to: '/dashboard', exact: true },
    { label: 'Public Complaints', icon: AlertTriangle,   to: '/complaints' },
    { label: 'Setup Wizard',      icon: Wrench,          to: '/setup', exact: true },
    { label: 'Hierarchy',         icon: Layers,          children: [
      { label: 'Mandals',         to: '/admin/mandals' },
      { label: 'Wards / Villages',to: '/admin/wards' },
      { label: 'Public Bins',     to: '/admin/bins' },
    ]},
    { label: 'Collection Records',icon: ClipboardList,   to: '/admin/collections' },
    { label: 'Users',             icon: Users,           to: '/admin/users' },
    { label: 'Assignments',       icon: ShieldCheck,     to: '/admin/assignments' },
    { label: 'Reports',           icon: BarChart2,       to: '/reports' },
    { label: 'Notifications',     icon: Bell,            to: '/notifications' },
    { label: 'Settings',          icon: Settings,        to: '/settings' },
  ],
  [ROLES.DISTRICT_ADMIN]: [
    { label: 'Dashboard',         icon: LayoutDashboard, to: '/dashboard', exact: true },
    { label: 'Complaints & SLA',  icon: AlertTriangle,   to: '/complaints' },
    { label: 'Hierarchy',         icon: Layers,          children: [
      { label: 'Mandals',         to: '/admin/mandals' },
      { label: 'Wards / Villages',to: '/admin/wards' },
      { label: 'Public Bins',     to: '/admin/bins' },
    ]},
    { label: 'Collection Records',icon: ClipboardList,   to: '/admin/collections' },
    { label: 'Reports & Analytics',icon: BarChart2,      to: '/reports' },
    { label: 'Notifications',     icon: Bell,            to: '/notifications' },
    { label: 'Users',             icon: Users,           to: '/admin/users' },
    { label: 'Assignments',       icon: ShieldCheck,     to: '/admin/assignments' },
    { label: 'Settings',          icon: Settings,        to: '/settings' },
  ],
  [ROLES.MANDAL_OFFICER]: [
    { label: 'Dashboard',         icon: LayoutDashboard, to: '/dashboard', exact: true },
    { label: 'Public Complaints', icon: AlertTriangle,   to: '/complaints' },
    { label: 'Wards / Villages',  icon: Map,             to: '/admin/wards' },
    { label: 'Public Bins',       icon: Trash2,          to: '/admin/bins' },
    { label: 'Collection Records',icon: ClipboardList,   to: '/admin/collections' },
    { label: 'Reports',           icon: BarChart2,       to: '/reports' },
    { label: 'Notifications',     icon: Bell,            to: '/notifications' },
  ],
  [ROLES.SUPERVISOR]: [
    { label: 'Dashboard',         icon: LayoutDashboard, to: '/dashboard', exact: true },
    { label: 'Escalations & Tickets', icon: AlertTriangle, to: '/complaints' },
    { label: 'Collection Records',icon: ClipboardList,   to: '/admin/collections' },
    { label: 'Reports',           icon: BarChart2,       to: '/reports' },
    { label: 'Notifications',     icon: Bell,            to: '/notifications' },
  ],
  [ROLES.COLLECTOR]: [
    { label: 'My Dashboard',      icon: Home,            to: '/collector', exact: true },
    { label: 'My Complaints',     icon: AlertTriangle,   to: '/complaints', exact: true },
    { label: 'Daily Collection',  icon: Trash2,          to: '/collector/submit', exact: true },
    { label: 'Collection History',icon: ClipboardList,   to: '/collector/history', exact: true },
    { label: 'Notifications',     icon: Bell,            to: '/notifications', exact: true },
    { label: 'Reports',           icon: BarChart2,       to: '/reports', exact: true },
  ],
};

export default function Sidebar({ collapsed, setCollapsed, onMobileClose }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});
  const items = navConfig[user?.role] || [];

  const handleLogout = async () => { await logout(); navigate('/login'); };
  const toggleGroup = (label) => setExpanded(p => ({ ...p, [label]: !p[label] }));
  const handleNavClick = () => { if (onMobileClose) onMobileClose(); };

  return (
    <aside
      className={`
        flex flex-col bg-[#0b1329] text-white h-screen sticky top-0 z-40
        transition-all duration-300 ease-in-out flex-shrink-0 select-none border-r border-slate-800/60
        ${collapsed ? 'w-16' : 'w-[250px]'}
      `}
    >
      {/* Logo bar */}
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10 min-h-[68px]">
        <Logo size="md" textLight={true} showText={!collapsed} />
        {!collapsed && onMobileClose && (
          <button onClick={onMobileClose} className="lg:hidden ml-auto p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2.5 space-y-1">
        {items.map((item) => {
          if (item.children) {
            const isOpen = expanded[item.label];
            return (
              <div key={item.label}>
                <button
                  onClick={() => !collapsed && toggleGroup(item.label)}
                  className="nav-item w-full justify-between group"
                  title={collapsed ? item.label : undefined}
                >
                  <span className="flex items-center gap-3">
                    <item.icon size={17} className="flex-shrink-0" />
                    {!collapsed && <span className="text-xs font-semibold">{item.label}</span>}
                  </span>
                  {!collapsed && (
                    <ChevronRight size={13} className={`transition-transform duration-200 text-slate-500 group-hover:text-white ${isOpen ? 'rotate-90' : ''}`} />
                  )}
                </button>
                {!collapsed && isOpen && (
                  <div className="ml-5 mt-1 border-l border-slate-700/60 pl-3 space-y-1">
                    {item.children.map(child => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={handleNavClick}
                        className={({ isActive }) =>
                          `flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer
                          ${isActive ? 'text-white bg-gradient-to-r from-emerald-600 to-teal-600 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-800/60'}`
                        }
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current opacity-50" />
                        {child.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          }
          return (
            <NavLink
              key={item.to + item.label}
              to={item.to}
              end={item.exact}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `nav-item ${isActive ? 'active' : ''}`
              }
              title={collapsed ? item.label : undefined}
            >
              <item.icon size={17} className="flex-shrink-0" />
              {!collapsed && <span className="text-xs font-semibold">{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="border-t border-white/10 p-3 space-y-1">
        {!collapsed && (
          <div className="flex items-center gap-3 px-2.5 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 mb-1.5">
            <div className="relative flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-xs shadow-md shadow-emerald-900/30">
                {user?.full_name?.[0] || user?.username?.[0] || 'R'}
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-400 border-2 border-[#0b1329] rounded-full" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user?.full_name || user?.username}</p>
              <p className="text-[10px] text-slate-400 font-medium truncate">{ROLE_LABELS[user?.role]}</p>
            </div>
          </div>
        )}

        <button
          onClick={handleLogout}
          className="nav-item w-full text-rose-400 hover:text-rose-300 hover:bg-rose-950/30"
          title="Logout"
        >
          <LogOut size={16} className="flex-shrink-0" />
          {!collapsed && <span className="text-xs font-semibold">Logout</span>}
        </button>

        {/* Desktop-only collapse */}
        <button
          onClick={() => setCollapsed(p => !p)}
          className="nav-item w-full hidden lg:flex"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight size={16} />
            : <><ChevronLeft size={16} /><span className="text-xs font-semibold">Collapse Menu</span></>
          }
        </button>
      </div>
    </aside>
  );
}
