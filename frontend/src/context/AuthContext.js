// ============================================================
//  AuthContext.js — Login state, persists across tab changes
// ============================================================
import React, { createContext, useContext, useState, useEffect } from 'react';
import { login as apiLogin } from '../api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  // On app load — restore from localStorage ONLY, never re-fetch
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ko_user');
      const token = localStorage.getItem('ko_token');
      if (saved && token) {
        setUser(JSON.parse(saved));
      }
    } catch(e) {
      localStorage.removeItem('ko_user');
      localStorage.removeItem('ko_token');
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const res = await apiLogin({ username, password });
    const token = res.data.token;
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