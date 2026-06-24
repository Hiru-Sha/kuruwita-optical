// ============================================================
//  AuthContext.js — Login state, persists across tab changes
//  Fixed: JWT expiry is now checked on app load.
//         If the token is expired the user is logged out
//         immediately instead of appearing logged in until
//         the first API call fails.
// ============================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../api';

const AuthContext = createContext();

// Decode a JWT and check if it's expired (no library needed)
function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // payload.exp is in seconds; Date.now() is in milliseconds
    return payload.exp * 1000 < Date.now();
  } catch (e) {
    return true; // If we can't parse the token, treat it as expired
  }
}

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load — restore from localStorage and validate token
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ko_user');
      const token = localStorage.getItem('ko_token');

      if (saved && token) {
        // Fixed: check token expiry before restoring session
        if (isTokenExpired(token)) {
          // Token is expired — clear storage and force re-login
          localStorage.removeItem('ko_token');
          localStorage.removeItem('ko_user');
        } else {
          setUser(JSON.parse(saved));
        }
      }
    } catch (e) {
      localStorage.removeItem('ko_user');
      localStorage.removeItem('ko_token');
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res      = await apiLogin({ username, password });
    const token    = res.data.token;
    const userData = res.data.user;
    localStorage.setItem('ko_token', token);
    localStorage.setItem('ko_user', JSON.stringify(userData));
    setUser(userData);
    return userData;
  };

  const logout = () => {
    localStorage.removeItem('ko_token');
    localStorage.removeItem('ko_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);