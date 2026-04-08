import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cv_user')); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('cv_token');
    if (token) {
      api.get('/auth/me')
        .then(r => { setUser(r.data); localStorage.setItem('cv_user', JSON.stringify(r.data)); })
        .catch(() => { localStorage.clear(); setUser(null); })
        .finally(() => setLoading(false));
    } else setLoading(false);
  }, []);

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('cv_token', data.token);
    localStorage.setItem('cv_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => { localStorage.clear(); setUser(null); };
  const refreshUser = async () => {
    const r = await api.get('/auth/me');
    setUser(r.data);
    localStorage.setItem('cv_user', JSON.stringify(r.data));
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, setUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
