// ============================================================
//  AuthContext.js — Login state, persists across tab changes
//  Fixed:
//    - JWT expiry checked on app load (existing fix)
//    - Bug #19 Fix: auto-refresh timer — every 30 minutes the
//      app silently calls POST /auth/refresh if the token will
//      expire within 2 hours. This keeps staff logged in through
//      full working days without an unexpected logout mid-session.
// ============================================================
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { login as apiLogin, refreshToken, tokenExpiresWithin } from '../api';

const AuthContext = createContext();

// Decode a JWT and check if it's expired (no library needed)
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true;
  }
}

const TWO_HOURS_MS   = 2 * 60 * 60 * 1000;
const REFRESH_INTERVAL_MS = 30 * 60 * 1000; // check every 30 minutes

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);
  const refreshTimer = useRef(null);

  // ── Refresh logic ─────────────────────────────────────────
  const tryRefresh = async () => {
    const token = localStorage.getItem('ko_token');
    if (!token || isTokenExpired(token)) return; // already expired — nothing to refresh
    // Only refresh if token expires within the next 2 hours
    if (!tokenExpiresWithin(token, TWO_HOURS_MS)) return;
    try {
      const res     = await refreshToken();
      const newToken = res.data.token;
      const newUser  = res.data.user;
      localStorage.setItem('ko_token', newToken);
      localStorage.setItem('ko_user',  JSON.stringify(newUser));
      setUser(newUser);
    } catch (e) {
      // If refresh fails (server error etc.) just leave the existing token
      console.warn('Token refresh failed silently:', e.message);
    }
  };

  // ── Start the refresh timer ────────────────────────────────
  const startRefreshTimer = () => {
    if (refreshTimer.current) clearInterval(refreshTimer.current);
    refreshTimer.current = setInterval(tryRefresh, REFRESH_INTERVAL_MS);
  };

  const stopRefreshTimer = () => {
    if (refreshTimer.current) {
      clearInterval(refreshTimer.current);
      refreshTimer.current = null;
    }
  };

  // On app load — restore from localStorage and validate token
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ko_user');
      const token = localStorage.getItem('ko_token');

      if (saved && token) {
        if (isTokenExpired(token)) {
          localStorage.removeItem('ko_token');
          localStorage.removeItem('ko_user');
        } else {
          setUser(JSON.parse(saved));
          startRefreshTimer();
        }
      }
    } catch (e) {
      localStorage.removeItem('ko_user');
      localStorage.removeItem('ko_token');
    }
    setLoading(false);

    return () => stopRefreshTimer();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (username, password) => {
    const res      = await apiLogin({ username, password });
    const token    = res.data.token;
    const userData = res.data.user;
    localStorage.setItem('ko_token', token);
    localStorage.setItem('ko_user', JSON.stringify(userData));
    setUser(userData);
    startRefreshTimer();
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('ko_token');
    localStorage.removeItem('ko_user');
    setUser(null);
    stopRefreshTimer();
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);