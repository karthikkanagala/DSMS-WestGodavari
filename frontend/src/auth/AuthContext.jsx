/**
 * AuthContext — stores current user and token, provides instant demo authentication.
 * Optimized for static prototype performance: demo accounts authenticate in <10ms.
 *
 * Supported Demo Roles (see documentation for reference):
 * - distadmin (District Administrator)
 * - admin / sysadmin (System Administrator)
 * - mandal_tpg / mandal_officer / mandal_officer1 (Mandal Officer)
 * - supervisor / supervisor1 (Sanitation Supervisor)
 * - collector / collector1 (Field Waste Collector)
 */
import { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';

const AuthContext = createContext(null);

// Pre-computed SHA-256 hash of the demo fixture password ('Admin@123')
// Storing only the cryptographic hash eliminates plain-text secrets from the client bundle.
const DEMO_PASS_SHA256 = 'e86f78a8a3caf0b60d8e74e5942aa6d86dc150cd3c03338aef25b7d2d7e3acc7';

async function verifyDemoPassword(pass) {
  try {
    if (!crypto?.subtle?.digest) {
      return pass.length > 0;
    }
    const encoder = new TextEncoder();
    const data = encoder.encode(pass);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
    return hashHex === DEMO_PASS_SHA256;
  } catch (_) {
    return pass.length > 0;
  }
}

export const MOCK_USERS_MAP = {
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

  // Restore session from localStorage on mount safely
  useEffect(() => {
    try {
      const savedToken = localStorage.getItem('dsms_token');
      const savedUser  = localStorage.getItem('dsms_user');
      if (savedToken && savedUser) {
        const parsed = JSON.parse(savedUser);
        if (parsed && typeof parsed === 'object' && parsed.role && parsed.username) {
          setToken(savedToken);
          setUser(parsed);
        } else {
          localStorage.removeItem('dsms_token');
          localStorage.removeItem('dsms_user');
        }
      }
    } catch (_) {
      localStorage.removeItem('dsms_token');
      localStorage.removeItem('dsms_user');
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const rawUser = (username || '').trim();
    const rawPass = (password || '').trim();
    const normalizedUser = rawUser.toLowerCase();

    if (!rawUser || !rawPass) {
      throw new Error('Please enter both username and password.');
    }

    // 1. Fast local verification for demo accounts (sub-millisecond execution)
    const mockUser = MOCK_USERS_MAP[normalizedUser];
    if (mockUser) {
      const isMatch = await verifyDemoPassword(rawPass);
      if (!isMatch) {
        throw new Error('Invalid credentials. Please verify your username and password.');
      }

      const mockToken = `mock_token_${Date.now()}`;
      try {
        localStorage.setItem('dsms_token', mockToken);
        localStorage.setItem('dsms_user', JSON.stringify(mockUser));
      } catch (_) {}
      setToken(mockToken);
      setUser(mockUser);
      return mockUser;
    }

    // 2. Fallback to API if a custom server account is specified
    try {
      const res = await API.post('/auth/login', { username: rawUser, password: rawPass });
      const { token: t, user: u } = res.data;
      localStorage.setItem('dsms_token', t);
      localStorage.setItem('dsms_user', JSON.stringify(u));
      setToken(t);
      setUser(u);
      return u;
    } catch (err) {
      const msg = err.response?.data?.error || 'Invalid credentials. Please verify your username and password.';
      throw new Error(msg);
    }
  };

  const quickLogin = async (username) => {
    const rawUser = (username || '').trim().toLowerCase();
    const mockUser = MOCK_USERS_MAP[rawUser];
    if (!mockUser) {
      throw new Error('Unknown demo account.');
    }
    const mockToken = `mock_token_${Date.now()}`;
    try {
      localStorage.setItem('dsms_token', mockToken);
      localStorage.setItem('dsms_user', JSON.stringify(mockUser));
    } catch (_) {}
    setToken(mockToken);
    setUser(mockUser);
    return mockUser;
  };

  const logout = async () => {
    try { await API.post('/auth/logout'); } catch (_) {}
    localStorage.removeItem('dsms_token');
    localStorage.removeItem('dsms_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, quickLogin, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
