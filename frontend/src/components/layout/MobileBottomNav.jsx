/**
 * MobileBottomNav — bottom tab bar visible on mobile (< lg) only.
 * Shows role-appropriate quick-access tabs.
 */
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { ROLES } from '../../utils/constants';
import {
  LayoutDashboard, Trash2, ClipboardList, Bell, BarChart2,
  Map, Users, Wrench, AlertTriangle,
} from 'lucide-react';

const mobileNavConfig = {
  [ROLES.COLLECTOR]: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/collector' },
    { label: 'Submit', icon: Trash2, to: '/collector/submit' },
    { label: 'History', icon: ClipboardList, to: '/collector/history' },
    { label: 'Alerts', icon: Bell, to: '/notifications' },
  ],
  [ROLES.SUPERVISOR]: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Collections', icon: ClipboardList, to: '/admin/collections' },
    { label: 'Overflow', icon: AlertTriangle, to: '/notifications' },
    { label: 'Alerts', icon: Bell, to: '/notifications' },
  ],
  [ROLES.MANDAL_OFFICER]: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Wards', icon: Map, to: '/admin/wards' },
    { label: 'Bins', icon: Trash2, to: '/admin/bins' },
    { label: 'Reports', icon: BarChart2, to: '/reports' },
  ],
  [ROLES.DISTRICT_ADMIN]: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Mandals', icon: Map, to: '/admin/mandals' },
    { label: 'Reports', icon: BarChart2, to: '/reports' },
    { label: 'Alerts', icon: Bell, to: '/notifications' },
  ],
  [ROLES.SYSADMIN]: [
    { label: 'Dashboard', icon: LayoutDashboard, to: '/dashboard' },
    { label: 'Setup', icon: Wrench, to: '/setup' },
    { label: 'Users', icon: Users, to: '/admin/users' },
    { label: 'Alerts', icon: Bell, to: '/notifications' },
  ],
};

export default function MobileBottomNav() {
  const { user } = useAuth();
  const items = mobileNavConfig[user?.role] || [];

  if (items.length === 0) return null;

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 safe-area-bottom">
      <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/collector' || item.to === '/dashboard'}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors
              ${isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <item.icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span>{item.label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
