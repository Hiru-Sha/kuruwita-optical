/* eslint-disable */
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('ko_token');
    const saved = localStorage.getItem('ko_user');
    if (token && saved) {
      try {
        const parsed = JSON.parse(saved);
        setUser(parsed);
        // Verify token still valid by fetching /me
        const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        fetch(`${BASE}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json())
          .then(data => {
            if (data.id) {
              // Update user with fresh data including role
              const fresh = { id: data.id, username: data.username, name: data.name, role: data.role || 'admin' };
              setUser(fresh);
              localStorage.setItem('ko_user', JSON.stringify(fresh));
            } else {
              // Token invalid
              localStorage.removeItem('ko_token');
              localStorage.removeItem('ko_user');
              setUser(null);
            }
          })
          .catch(() => {
            // Network error — keep cached user
          })
          .finally(() => setLoading(false));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username, password) => {
    const BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const res  = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('ko_token', data.token);
    localStorage.setItem('ko_user',  JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('ko_token');
    localStorage.removeItem('ko_user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
