import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import ProtectedRoute from './auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';
import OpeningAnimation from './components/ui/OpeningAnimation';

import Login from './pages/Login';
import Dashboard from './pages/dashboard/Dashboard';
import BinDetails from './pages/BinDetails';
import SetupWizard from './pages/setup/SetupWizard';

import ManageMandals from './pages/admin/ManageMandals';
import ManageWards from './pages/admin/ManageWards';
import ManageBins from './pages/admin/ManageBins';
import ManageUsers from './pages/admin/ManageUsers';
import CollectorAssignment from './pages/admin/CollectorAssignment';
import ManageCollections from './pages/admin/ManageCollections';

import CollectorDashboard from './pages/collector/CollectorDashboard';
import SubmitCollection from './pages/collector/SubmitCollection';
import History from './pages/collector/History';

import Reports from './pages/reports/Reports';
import Notifications from './pages/notifications/Notifications';
import Settings from './pages/Settings';

export default function App() {
  const [showIntro, setShowIntro] = useState(() => {
    // Show on initial visit per session
    return !sessionStorage.getItem('dsms_intro_shown');
  });

  const handleIntroComplete = () => {
    sessionStorage.setItem('dsms_intro_shown', 'true');
    setShowIntro(false);
  };

  return (
    <AuthProvider>
      {showIntro && <OpeningAnimation onComplete={handleIntroComplete} />}
      <BrowserRouter>
        <Routes>
          {/* Public Login Route */}
          <Route path="/login" element={<Login />} />

          {/* Authenticated Layout */}
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Default Dashboard */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/bin/:id" element={<BinDetails />} />

            {/* System Setup Wizard (SysAdmin only) */}
            <Route
              path="/setup"
              element={
                <ProtectedRoute roles={['system_admin']}>
                  <SetupWizard />
                </ProtectedRoute>
              }
            />

            {/* Administration Routes */}
            <Route path="/admin/mandals" element={<ManageMandals />} />
            <Route path="/admin/wards" element={<ManageWards />} />
            <Route path="/admin/bins" element={<ManageBins />} />
            <Route path="/admin/users" element={<ManageUsers />} />
            <Route path="/admin/assignments" element={<CollectorAssignment />} />
            <Route path="/admin/collections" element={<ManageCollections />} />

            {/* Collector Portal Routes */}
            <Route path="/collector" element={<CollectorDashboard />} />
            <Route path="/collector/submit" element={<SubmitCollection />} />
            <Route path="/collector/history" element={<History />} />

            {/* Reports, Notifications & Settings */}
            <Route path="/reports" element={<Reports />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          {/* Fallback Catch-all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
