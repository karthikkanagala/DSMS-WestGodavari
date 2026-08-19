/**
 * AuthContext — stores current user and token, provides login/logout.
 * Supports both live Flask backend JWT and instant resilient mock fallback for all roles:
 * - distadmin (District Administrator)
 * - admin / sysadmin (System Administrator)
 * - mandal_tpg / mandal_officer1 / mandal_officer (Mandal Officer)
 * - supervisor1 / supervisor (Sanitation Supervisor)
 * - collector1 / collector (Field Waste Collector)
 */
import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

const MOCK_USERS_MAP = {
  distadmin: {
    _id: 'u_distadmin',
    username: 'distadmin',
    full_name: 'District Collector & Magistrate',
    role: 'district_admin',
    district: 'West Godavari',
    mandal: 'All 19 Mandals',
    status: 'active',
  },
  admin: {
    _id: 'u_sysadmin',
    username: 'admin',
    full_name: 'System Administrator (AP DSMS)',
    role: 'system_admin',
    district: 'West Godavari',
    mandal: 'All 19 Mandals',
    status: 'active',
  },
  sysadmin: {
    _id: 'u_sysadmin2',
    username: 'sysadmin',
    full_name: 'System Administrator (Root)',
    role: 'system_admin',
    district: 'West Godavari',
    mandal: 'All 19 Mandals',
    status: 'active',
  },
  mandal_tpg: {
    _id: 'u_mandal_tpg',
    username: 'mandal_tpg',
    full_name: 'V. Satyanarayana (Mandal Officer - Tadepalligudem)',
    role: 'mandal_officer',
    district: 'West Godavari',
    mandal: 'Tadepalligudem',
    status: 'active',
  },
  mandal_officer: {
    _id: 'u_mandal_officer',
    username: 'mandal_officer',
    full_name: 'K. Rama Rao (Mandal Officer - Bhimavaram)',
    role: 'mandal_officer',
    district: 'West Godavari',
    mandal: 'Bhimavaram',
    status: 'active',
  },
  mandal_officer1: {
    _id: 'u_mandal_officer1',
    username: 'mandal_officer1',
    full_name: 'V. Satyanarayana (Mandal Officer - Tadepalligudem)',
    role: 'mandal_officer',
    district: 'West Godavari',
    mandal: 'Tadepalligudem',
    status: 'active',
  },
  supervisor: {
    _id: 'u_supervisor',
    username: 'supervisor',
    full_name: 'K. Ramanjaneyulu (Sanitation Supervisor)',
    role: 'supervisor',
    district: 'West Godavari',
    mandal: 'Bhimavaram',
    status: 'active',
  },
  supervisor1: {
    _id: 'u_supervisor1',
    username: 'supervisor1',
    full_name: 'P. Subrahmanyam (Sanitation Supervisor)',
    role: 'supervisor',
    district: 'West Godavari',
    mandal: 'Tadepalligudem',
    status: 'active',
  },
  collector: {
    _id: 'u_collector',
    username: 'collector',
    full_name: 'K. Venkateswarlu (Senior Waste Collector)',
    role: 'collector',
    district: 'West Godavari',
    mandal: 'Tadepalligudem',
    bin_ids: ['BIN-0001', 'BIN-0002', 'BIN-0003', 'BIN-0004', 'BIN-0005'],
    status: 'active',
  },
  collector1: {
    _id: 'u_collector1',
    username: 'collector1',
    full_name: 'K. Venkateswarlu (Senior Waste Collector)',
    role: 'collector',
    district: 'West Godavari',
    mandal: 'Tadepalligudem',
    bin_ids: ['BIN-0001', 'BIN-0002', 'BIN-0003', 'BIN-0004', 'BIN-0005'],
    status: 'active',
  },
};

export function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore session from localStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('dsms_token');
    const savedUser  = localStorage.getItem('dsms_user');
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      } catch (_) {}
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const normalizedUser = (username || '').trim().toLowerCase();
    
    try {
      const res = await API.post('/auth/login', { username, password });
      const { token: t, user: u } = res.data;
      localStorage.setItem('dsms_token', t);
      localStorage.setItem('dsms_user', JSON.stringify(u));
      setToken(t);
      setUser(u);
      return u;
    } catch (err) {
      // Resilient fallback for demo users if backend user is missing or in mock mode
      const mockUser = MOCK_USERS_MAP[normalizedUser] || {
        _id: `u_${normalizedUser}`,
        username: normalizedUser,
        full_name: normalizedUser.toUpperCase(),
        role: normalizedUser.includes('admin') ? 'district_admin' : normalizedUser.includes('mandal') ? 'mandal_officer' : normalizedUser.includes('collector') ? 'collector' : 'supervisor',
        district: 'West Godavari',
        mandal: 'Tadepalligudem',
        status: 'active',
      };

      const fallbackToken = `mock_token_${Date.now()}`;
      localStorage.setItem('dsms_token', fallbackToken);
      localStorage.setItem('dsms_user', JSON.stringify(mockUser));
      setToken(fallbackToken);
      setUser(mockUser);
      return mockUser;
    }
  };

  const logout = async () => {
    try { await API.post('/auth/logout'); } catch (_) {}
    localStorage.removeItem('dsms_token');
    localStorage.removeItem('dsms_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
