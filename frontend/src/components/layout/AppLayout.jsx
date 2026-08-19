import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import MobileBottomNav from './MobileBottomNav';

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const location = useLocation();

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  const handleRefresh = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-950 overflow-hidden">
      {/* Mobile overlay backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar — hidden on mobile unless mobileOpen, always visible on lg+ */}
      <div
        className={`
          fixed inset-y-0 left-0 z-40 lg:relative lg:z-auto
          transition-transform duration-300 ease-in-out flex-shrink-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        <Sidebar
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          onMobileClose={() => setMobileOpen(false)}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Topbar
          onRefresh={handleRefresh}
          onMobileMenuToggle={() => setMobileOpen((v) => !v)}
        />
        {/* pb-16 leaves room for the mobile bottom nav bar */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 lg:pb-6 flex flex-col justify-between">
          <div>
            <Outlet context={{ refreshTrigger, handleRefresh }} />
          </div>

          {/* Global High-Visibility Footer */}
          <footer className="mt-8 pt-4 pb-2 border-t border-slate-200/70 dark:border-gray-800 text-xs text-slate-500 dark:text-gray-400 flex flex-col sm:flex-row items-center justify-between gap-2 select-none">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-emerald-700 dark:text-emerald-400">West Godavari District Administration</span>
              <span className="text-slate-300 dark:text-gray-700 hidden sm:inline">•</span>
              <span>District Sanitation Monitoring System (DSMS)</span>
            </div>
            <div>
              <span>Designed &amp; Developed by <strong className="text-slate-900 dark:text-white font-black text-emerald-700 dark:text-emerald-400">Karthik Kanagala</strong></span>
            </div>
          </footer>
        </main>
      </div>

      {/* Mobile bottom tab bar */}
      <MobileBottomNav />
    </div>
  );
}
