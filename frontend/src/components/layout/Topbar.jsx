/**
 * Topbar — Stitch-Grade Header:
 * Left: "District Administration Dashboard" title + subtitle
 * Right: date badge, manual refresh with spin, theme toggle, notification bell with count, user profile pill, and logout
 * Mobile: hamburger menu
 */
import { useState, useEffect } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { ROLE_LABELS } from '../../utils/constants';
import { Bell, LogOut, Calendar, Menu, RefreshCw, Moon, Sun, Shield } from 'lucide-react';
import API from '../../api/axios';
import { useNavigate } from 'react-router-dom';

function formatDate(date) {
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function Topbar({ onRefresh, onMobileMenuToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unreadCount, setUnreadCount] = useState(0);
  const [darkMode, setDarkMode] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const today = formatDate(new Date());

  useEffect(() => {
    fetchNotificationCount();
    const id = setInterval(fetchNotificationCount, 60000);
    return () => clearInterval(id);
  }, []);

  const fetchNotificationCount = async () => {
    try {
      const res = await API.get('/notifications');
      setUnreadCount(res.data.overflow?.length || 0);
    } catch (_) {}
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    if (onRefresh) await onRefresh();
    await fetchNotificationCount();
    setTimeout(() => setRefreshing(false), 600);
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <header className="h-[68px] bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-slate-100 dark:border-gray-800 px-4 md:px-7 flex items-center justify-between sticky top-0 z-20 shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
      {/* Left: hamburger (mobile) + title */}
      <div className="flex items-center gap-3.5 min-w-0">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>

        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700/60 rounded-xl shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs sm:text-sm font-black text-emerald-800 dark:text-emerald-300 tracking-tight whitespace-nowrap">
              WEST GODAVARI DISTRICT
            </span>
          </div>

          <div className="min-w-0 hidden md:block">
            <h1 className="text-xs font-bold text-slate-700 dark:text-gray-300 leading-none truncate">
              Sanitation &amp; Waste Management System (DSMS)
            </h1>
            <p className="text-[10px] font-semibold text-slate-400 dark:text-gray-500 truncate mt-0.5">
              Government of Andhra Pradesh • Clean District Operations
            </p>
          </div>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2.5 flex-shrink-0">
        {/* Date badge */}
        <div className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-50 dark:bg-gray-800/90 rounded-xl border border-slate-200/60 dark:border-gray-700 text-xs font-semibold text-slate-600 dark:text-gray-300 shadow-sm">
          <Calendar size={13} className="text-emerald-600" />
          {today}
        </div>

        {/* Refresh */}
        <button
          onClick={handleManualRefresh}
          className="p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-all hover:scale-105"
          title="Refresh data"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin text-emerald-600' : ''} />
        </button>

        {/* Dark mode */}
        <button
          onClick={toggleDarkMode}
          className="hidden sm:flex p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-all hover:scale-105"
          title="Toggle theme"
        >
          {darkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
        </button>

        {/* Notification bell with live pulse count badge */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 rounded-xl text-slate-500 hover:bg-slate-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-all hover:scale-105"
          title="Notifications"
        >
          <Bell size={17} />
          {unreadCount > 0 && (
            <span className="absolute 0 top-0.5 right-0.5 min-w-[18px] h-[18px] bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center px-1 shadow-md shadow-rose-600/30 animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        <div className="h-6 w-px bg-slate-200 dark:bg-gray-800 mx-1 hidden md:block" />

        {/* User profile pill */}
        <div className="flex items-center gap-2.5 pl-1">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-xs flex-shrink-0 shadow-md shadow-emerald-600/20">
            {user?.full_name?.[0] || user?.username?.[0] || 'R'}
          </div>
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 dark:text-gray-200 leading-tight">
              {user?.full_name || user?.username || 'Ravi Kumar (Dist Admin)'}
            </p>
            <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">{ROLE_LABELS[user?.role] || 'District Administrator'}</p>
          </div>
        </div>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="hidden md:flex items-center gap-1.5 px-3 py-1.5 ml-1.5 rounded-xl border border-slate-200 dark:border-gray-700 text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:border-rose-900 transition-all hover:scale-102 shadow-sm"
        >
          <LogOut size={13} /> Logout
        </button>
      </div>
    </header>
  );
}
